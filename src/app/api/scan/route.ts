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

    console.log("POST /api/scan request:", {
      url: normalizedUrl,
    });

    if (!normalizedUrl) {
      return NextResponse.json(
        { error: "Invalid URL provided" },
        { status: 400 },
      );
    }

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: any) => {
          const message = JSON.stringify(event) + "\n";
          controller.enqueue(encoder.encode(message));
        };

        const sendError = (message: string) => {
          sendEvent({ type: "error", message });
        };

        try {
          // Get the workflow
          const workflow = getBrandScanWorkflow();

          // Define step labels for the UI
          const stepLabels: Record<string, string> = {
            "launch-browser": "Initializing secure browser session",
            "extract-fonts": "Analyzing typography and fonts",
            "extract-logo": "Locating brand identity assets",
            "capture-screenshot": "Capturing visual interface",
            "extract-text": "Reading website content and copy",
            "extract-colors-multi": "Extracting color palette",
            "determine-brand-colors": "Refining brand colors",
            "analyze-with-ai": "Generating meaningful insights",
          };

          // Send initial pending steps so UI knows what to expect
          sendEvent({
            type: "init",
            steps: Object.keys(stepLabels).map((id) => ({
              id,
              label: stepLabels[id],
            })),
          });

          // Create a run
          const run = await workflow.createRun();

          // Start the workflow and stream events
          const streamResult = await run.stream({
            inputData: { url: normalizedUrl },
          });

          // Process stream events
          for await (const event of streamResult.fullStream) {
            // Step Start
            if (event.type === "workflow-step-start" && "payload" in event) {
              const payload = event.payload as Record<string, unknown>;
              // Try different possible locations for stepId - Mastra structure can vary
              const step = payload?.step as Record<string, unknown> | undefined;
              const stepId = (payload?.stepId || step?.id || payload?.id) as
                | string
                | undefined;

              if (stepId && stepLabels[stepId]) {
                sendEvent({
                  type: "step_start",
                  stepId,
                  label: stepLabels[stepId],
                });
              }
            }

            // Step Complete
            if (
              (event.type === "workflow-step-completed" ||
                // @ts-ignore - Validating event type at runtime
                event.type === "workflow-step-finish") &&
              "payload" in event
            ) {
              const payload = event.payload as Record<string, unknown>;
              const step = payload?.step as Record<string, unknown> | undefined;
              const stepId = (payload?.stepId || step?.id || payload?.id) as
                | string
                | undefined;

              // Check success status from the result
              const result = payload?.result as any;
              const success = result?.success !== false; // Default to true unless explicitly false

              if (stepId && stepLabels[stepId]) {
                sendEvent({
                  type: "step_complete",
                  stepId,
                  success,
                });
              }
            }
          }

          // Get the final result
          const workflowResult = await streamResult.result;

          if (workflowResult.status === "success" && workflowResult.result) {
            const finalResult = workflowResult.result as ScanResult;
            sendEvent({ type: "complete", data: finalResult });
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
