import { NextRequest, NextResponse } from "next/server";
import { ScanResult } from "@/lib/shared/types";
import { getBrandScanWorkflow } from "@/mastra";
import { parseUrl } from "@/lib/shared/url-utils";

// Force Node.js runtime (Playwright doesn't work in Edge runtime)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/scan
 *
 * Scans a website URL and extracts comprehensive brand information using
 * the Mastra BrandScan workflow.
 *
 * Request body: { url: string }
 * Response: Streaming response with status updates and final result
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = await request.json();
    const normalizedUrl = parseUrl(body.url);

    if (!normalizedUrl) {
      return NextResponse.json(
        { error: "Invalid URL provided" },
        { status: 400 },
      );
    }

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const sendStatus = (step: string) => {
          const message = JSON.stringify({ type: "status", step }) + "\n";
          controller.enqueue(encoder.encode(message));
        };

        const sendError = (message: string) => {
          const errorMsg = JSON.stringify({ type: "error", message }) + "\n";
          controller.enqueue(encoder.encode(errorMsg));
        };

        try {
          // Get the workflow
          const workflow = getBrandScanWorkflow();

          // Send status updates as workflow progresses
          sendStatus("starting_scan");

          // Create a run
          const run = await workflow.createRun();

          sendStatus("extracting_text");

          // Start the workflow and stream events
          const streamResult = await run.stream({
            inputData: { url: normalizedUrl },
          });

          // Track which steps have completed for status updates
          const completedSteps = new Set<string>();

          // Process stream events
          for await (const event of streamResult.fullStream) {
            // Check for step START events to show progress as steps begin
            // Mastra workflow events use "workflow-step-start" type
            if (event.type === "workflow-step-start" && "payload" in event) {
              const payload = event.payload as Record<string, unknown>;
              // Try different possible locations for stepId
              const step = payload?.step as Record<string, unknown> | undefined;
              const stepId = (payload?.stepId || step?.id || payload?.id) as string | undefined;

              // Only send status once per step
              if (stepId && !completedSteps.has(stepId)) {
                completedSteps.add(stepId);

                // Map workflow steps to UI progress steps
                // Workflow order: launch-browser → extract-logo → capture-screenshot → extract-text → analyze-with-ai
                // UI order: extracting_text → extracting_logo → analyzing_colors → analyzing_ai
                // Note: extract-text happens after capture-screenshot, so we skip it to avoid going backwards
                const statusMap: Record<string, string> = {
                  "launch-browser": "extracting_text",
                  "extract-logo": "extracting_logo",
                  "capture-screenshot": "analyzing_colors",
                  // "extract-text" is skipped - happens after capture-screenshot but would map to step 1
                  "analyze-with-ai": "analyzing_ai",
                };

                if (statusMap[stepId]) {
                  sendStatus(statusMap[stepId]);
                }
              }
            }
          }

          // Get the final result
          const workflowResult = await streamResult.result;

          if (workflowResult.status === "success" && workflowResult.result) {
            const finalResult = workflowResult.result as ScanResult;
            const completeMessage =
              JSON.stringify({ type: "complete", data: finalResult }) + "\n";
            controller.enqueue(encoder.encode(completeMessage));
          } else {
            // Handle workflow failure
            const errorMessage =
              workflowResult.status === "failed"
                ? "Workflow failed to complete"
                : "Workflow completed but no result was returned";
            sendError(errorMessage);
          }

          controller.close();
        } catch (error) {
          // Check for rate limit errors
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          if (
            errorMessage.includes("429") ||
            errorMessage.toLowerCase().includes("too many requests")
          ) {
            sendError(
              "AI is currently busy (Rate Limit). Please wait 30 seconds and try again.",
            );
          } else {
            sendError(errorMessage);
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 },
    );
  }
}
