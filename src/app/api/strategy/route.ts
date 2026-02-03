import { NextRequest, NextResponse } from "next/server";
import { mastra } from "@/mastra";
import { BrandProfileInput, StrategyDocument } from "@/lib/strategy/strategist";

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
      const agent = mastra.getAgent("strategistChat");

      const contextSummary = `
Brand: ${body.brandProfile.name} (${body.brandProfile.industry || "Unknown industry"})
Brand Summary: ${body.brandProfile.brandSummary || "N/A"}
Tagline: ${body.brandProfile.tagline || "N/A"}

Current Strategy:
- Type: ${body.currentStrategy.recommendation}
- Campaign Angle: "${body.currentStrategy.campaignAngle}"
- Headline: "${body.currentStrategy.headline}"
- Subheadline: "${body.currentStrategy.subheadline}"
- CTA: "${body.currentStrategy.callToAction}"
`;

      const history = (body.conversationHistory || []).slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await agent.generate([
        { role: "user", content: `Context:\n${contextSummary}` },
        ...history,
        { role: "user", content: body.userMessage },
        { role: "user", content: "Respond as Sarah with JSON:" },
      ]);

      let parsed;
      try {
        const jsonMatch = result.text.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonString = jsonMatch ? jsonMatch[1].trim() : result.text.trim();
        parsed = JSON.parse(jsonString);
      } catch (e) {
        parsed = { message: result.text };
      }

      return NextResponse.json({
        type: "chat",
        message: parsed.message,
        updatedStrategy: parsed.updatedStrategy,
      });
    }

    // Initial strategy generation (streaming via Mastra workflow)
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
          const workflow = mastra.getWorkflow("strategy");

          // Define step labels for the UI
          const stepLabels: Record<string, string> = {
            "fetch-website-text": "Analyzing website content",
            "extract-campaign-data": "Identifying key selling points",
            "generate-strategy": "Formulating campaign strategy",
          };

          // Send initial pending steps so UI knows what to expect
          sendEvent({
            type: "init",
            steps: Object.keys(stepLabels).map((id) => ({
              id,
              label: stepLabels[id],
            })),
          });

          const run = await workflow.createRun();

          const streamResult = await run.stream({
            inputData: {
              brandProfile: body.brandProfile,
              rawWebsiteText: body.rawWebsiteText,
              websiteUrl: body.websiteUrl,
            },
          });

          for await (const event of streamResult.fullStream) {
            // Step Start
            if (event.type === "workflow-step-start" && "payload" in event) {
              const payload = event.payload as Record<string, unknown>;
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
                // @ts-ignore
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
              const success = result?.success !== false;

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
            sendEvent({ type: "complete", data: workflowResult.result });
          } else {
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
