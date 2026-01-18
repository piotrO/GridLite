import { NextRequest, NextResponse } from "next/server";
import { getDesignerWorkflow } from "@/mastra";
import {
  generateDesignerChatResponse,
  BrandProfile,
  StrategyData,
  CampaignData,
  CreativeDirection,
} from "./lib/designer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DesignerRequest {
  // Brand profile (required)
  brandProfile: BrandProfile;

  // Strategy from Phase 2 (required for initial)
  strategy?: StrategyData;

  // Campaign data from Phase 2 (optional)
  campaignData?: CampaignData;

  // For chat continuation
  mode?: "initial" | "chat";
  userMessage?: string;
  currentCreative?: CreativeDirection["creative"];
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body: DesignerRequest = await request.json();

    if (!body.brandProfile) {
      return NextResponse.json(
        { error: "brandProfile is required" },
        { status: 400 },
      );
    }

    // Handle chat mode
    if (body.mode === "chat" && body.userMessage && body.currentCreative) {
      const response = await generateDesignerChatResponse(
        body.brandProfile,
        body.currentCreative,
        body.userMessage,
        body.conversationHistory || [],
      );

      return NextResponse.json({
        type: "chat",
        message: response.message,
        updatedCreative: response.updatedCreative,
      });
    }

    // Initial creative generation (streaming via Mastra workflow)
    if (!body.strategy) {
      return NextResponse.json(
        { error: "strategy is required for initial creative generation" },
        { status: 400 },
      );
    }

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
          const workflow = getDesignerWorkflow();

          sendStatus("analyzing_brand");

          const run = await workflow.createRunAsync();

          // Small delay for UX (matches original behavior)
          await new Promise((resolve) => setTimeout(resolve, 500));
          sendStatus("reviewing_strategy");

          await new Promise((resolve) => setTimeout(resolve, 500));
          sendStatus("creating_visuals");

          const streamResult = await run.stream({
            inputData: {
              brandProfile: body.brandProfile,
              strategy: body.strategy,
              campaignData: body.campaignData || null,
            },
          });

          // Consume the stream
          for await (const _event of streamResult.fullStream) {
            // We already sent status updates manually
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
            sendError("Creative generation failed");
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
