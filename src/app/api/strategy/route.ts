import { NextRequest, NextResponse } from "next/server";
import { getStrategyWorkflow } from "@/mastra";
import {
  generateChatResponse,
  BrandProfileInput,
  StrategyDocument,
} from "./lib/strategist";

// Force Node.js runtime (Playwright doesn't work in Edge runtime)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StrategyRequest {
  // Brand profile (required)
  brandProfile: BrandProfileInput;

  // Option A: Pass raw website text from Phase 1 (Scan → Strategy flow)
  rawWebsiteText?: string;

  // Option B: URL for text-only rescan (Dashboard → Strategy flow)
  websiteUrl?: string;

  // For chat continuation
  mode?: "initial" | "chat";
  userMessage?: string;
  currentStrategy?: StrategyDocument;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body: StrategyRequest = await request.json();

    if (!body.brandProfile) {
      return NextResponse.json(
        { error: "brandProfile is required" },
        { status: 400 },
      );
    }

    // Handle chat mode (simple response, no streaming needed)
    if (body.mode === "chat" && body.userMessage && body.currentStrategy) {
      const response = await generateChatResponse(
        body.brandProfile,
        body.currentStrategy,
        body.userMessage,
        body.conversationHistory || [],
      );

      return NextResponse.json({
        type: "chat",
        message: response.message,
        updatedStrategy: response.updatedStrategy,
      });
    }

    // Initial strategy generation (streaming via Mastra workflow)
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
          const workflow = getStrategyWorkflow();

          sendStatus("scanning_website");

          const run = await workflow.createRunAsync();

          const streamResult = await run.stream({
            inputData: {
              brandProfile: body.brandProfile,
              rawWebsiteText: body.rawWebsiteText,
              websiteUrl: body.websiteUrl,
            },
          });

          // Track completed steps
          const completedSteps = new Set<string>();

          for await (const event of streamResult.fullStream) {
            // Mastra workflow events use "workflow-step-start" type
            if (event.type === "workflow-step-start" && "payload" in event) {
              const payload = event.payload as { stepId?: string };
              const stepId = payload?.stepId;

              if (stepId && !completedSteps.has(stepId)) {
                completedSteps.add(stepId);

                const statusMap: Record<string, string> = {
                  "fetch-website-text": "scanning_website",
                  "extract-campaign-data": "analyzing_content",
                  "generate-strategy": "generating_strategy",
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
            const completeMessage =
              JSON.stringify({
                type: "complete",
                data: workflowResult.result,
              }) + "\n";
            controller.enqueue(encoder.encode(completeMessage));
          } else {
            sendError("Strategy generation failed");
          }

          controller.close();
        } catch (error) {
          sendError(
            error instanceof Error ? error.message : "Unknown error occurred",
          );
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
