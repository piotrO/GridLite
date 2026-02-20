import { NextRequest, NextResponse } from "next/server";
import { ScanResult } from "@/lib/shared/types";
import { getBrandScanWorkflow } from "@/mastra";
import { parseUrl } from "@/lib/shared/url-utils";

// Force Node.js runtime (Playwright doesn't work in Edge runtime)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Allow up to 5 minutes for brand scanning (Playwright + AI analysis)
export const maxDuration = 300;

// Type definitions for Mastra workflow events
interface WorkflowStepPayload {
  stepId?: string;
  step?: { id?: string };
  id?: string;
  result?: { success?: boolean };
}

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
        let closed = false;

        // Keep connection alive during long AI steps
        const keepAlive = setInterval(() => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode('{"type":"ping"}\n'));
          } catch {}
        }, 15000);

        const sendEvent = (event: any) => {
          if (closed) return;
          try {
            const message = JSON.stringify(event) + "\n";
            controller.enqueue(encoder.encode(message));
          } catch {
            // Controller already closed, ignore
          }
        };

        const sendError = (message: string) => {
          sendEvent({ type: "error", message });
        };

        const closeController = () => {
          if (closed) return;
          closed = true;
          clearInterval(keepAlive);
          try {
            controller.close();
          } catch {
            // Already closed
          }
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
              const payload = event.payload as WorkflowStepPayload;
              // Try different possible locations for stepId - Mastra structure can vary
              const step = payload?.step;
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
              const payload = event.payload as WorkflowStepPayload;
              const step = payload?.step;
              const stepId = (payload?.stepId || step?.id || payload?.id) as
                | string
                | undefined;

              // Check success status from the result
              const result = payload?.result;
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

          console.log("DEBUG: Workflow status:", workflowResult.status);
          if (workflowResult.status === "success") {
            console.log(
              "DEBUG: Workflow result keys:",
              Object.keys(workflowResult.result || {}),
            );
          }

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

          closeController();
        } catch (error) {
          // Check for rate limit errors
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          // Sanitize error message to not expose internal details
          let userMessage = errorMessage;
          if (
            errorMessage.includes("429") ||
            errorMessage.toLowerCase().includes("too many requests")
          ) {
            userMessage =
              "AI is currently busy (Rate Limit). Please wait 30 seconds and try again.";
          } else if (errorMessage.includes("ECONNREFUSED")) {
            userMessage =
              "Unable to connect to the website. Please check the URL.";
          } else if (errorMessage.includes("timeout")) {
            userMessage = "Request timed out. Please try again.";
          } else {
            // Generic error for unexpected issues
            userMessage =
              "An error occurred during scanning. Please try again.";
            console.error("[Scan API] Error details:", errorMessage);
          }

          sendError(userMessage);
          closeController();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
        Connection: "keep-alive",
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
