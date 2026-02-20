import { NextRequest, NextResponse } from "next/server";
import { mastra } from "@/mastra";
import { generateImage, getImageDataUrl } from "@/mastra/tools";
import { generateDesignerChatResponse } from "@/lib/design/designer";
import type {
  BrandProfile,
  StrategyDocument as StrategyData,
  CampaignData,
  CreativeData,
} from "@/lib/shared/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // Allow extra time for image generation

const SKIP_IMAGE_GENERATION = false;

interface DesignerRequest {
  // Brand profile (required)
  brandProfile: BrandProfile;
  // Brand ID for image upload (optional)
  brandId?: string;

  // Strategy from Phase 2 (required for initial)
  strategy?: StrategyData;

  // Campaign data from Phase 2 (optional)
  campaignData?: CampaignData;

  // DPA mode flag
  isDpa?: boolean;

  // For chat continuation
  mode?: "initial" | "chat";
  userMessage?: string;
  currentCreative?: CreativeData;
  currentContent?: { headline: string; bodyCopy: string; ctaText: string };
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
        body.currentContent,
      );

      // Check if the response includes an image generation request
      let imageUrl: string | undefined;
      if (response.imageGenerationRequest && !SKIP_IMAGE_GENERATION) {
        try {
          console.log(
            "[Designer] Generating image:",
            response.imageGenerationRequest.prompt,
          );
          const imageResult = await generateImage({
            prompt: response.imageGenerationRequest.prompt,
            style: response.imageGenerationRequest.style || "hero",
            industry: body.brandProfile.industry,
            moodKeywords: body.currentCreative?.moodKeywords,
          });

          if (imageResult.success && imageResult.result) {
            imageUrl = getImageDataUrl(imageResult.result);
            console.log("[Designer] Image generated successfully");
          } else {
            console.error(
              "[Designer] Image generation failed:",
              imageResult.error,
            );
          }
        } catch (imageError) {
          console.error("[Designer] Image generation failed:", imageError);
          // Continue without image - don't fail the whole request
        }
      }

      return NextResponse.json({
        type: "chat",
        message: response.message,
        updatedCreative: response.updatedCreative,
        layerModifications: response.layerModifications,
        imageUrl,
        needsClarification: response.needsClarification,
        clarificationContext: response.clarificationContext,
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
        let closed = false;

        // Keep connection alive during long AI/image generation steps
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
            // Already closed
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

        // Helper to simulate step execution
        const runSyntheticStep = async (
          id: string,
          label: string,
          action: () => Promise<void>,
        ) => {
          sendEvent({ type: "step_start", stepId: id, label });
          try {
            await action();
            sendEvent({ type: "step_complete", stepId: id, success: true });
          } catch (e) {
            sendEvent({ type: "step_complete", stepId: id, success: false });
            throw e;
          }
        };

        try {
          const workflow = mastra.getWorkflow("designer");

          console.log(
            "[Designer API] Starting workflow with isDpa:",
            body.isDpa,
          );
          console.log(
            "[Designer API] Strategy Recommendation:",
            body.strategy?.recommendation,
          );

          // Define step labels including synthetic ones
          const stepLabels: Record<string, string> = {
            "analyzing-brand": "Analyzing brand identity",
            "reviewing-strategy": "Reviewing campaign strategy",
            "generate-creative": "Crafting visual direction",
            ...(SKIP_IMAGE_GENERATION
              ? {}
              : { "generate-image": "Generating hero image" }),
          };

          // Send init event
          sendEvent({
            type: "init",
            steps: Object.keys(stepLabels).map((id) => ({
              id,
              label: stepLabels[id],
            })),
          });

          // 1. Analyzing Brand (Synthetic)
          await runSyntheticStep(
            "analyzing-brand",
            stepLabels["analyzing-brand"],
            async () => {
              await new Promise((resolve) => setTimeout(resolve, 600));
            },
          );

          // 2. Reviewing Strategy (Synthetic)
          await runSyntheticStep(
            "reviewing-strategy",
            stepLabels["reviewing-strategy"],
            async () => {
              await new Promise((resolve) => setTimeout(resolve, 600));
            },
          );

          // 3. Generate Creative (Real Mastra Workflow)
          // Explicitly send start event to ensure UI is updated immediately
          // before the actual Mastra workflow starts processing
          sendEvent({
            type: "step_start",
            stepId: "generate-creative",
            label: stepLabels["generate-creative"],
          });

          const run = await workflow.createRun();
          const streamResult = await run.stream({
            inputData: {
              brandProfile: body.brandProfile,
              strategy: body.strategy,
              campaignData: body.campaignData || null,
              isDpa: body.isDpa,
            },
          });

          for await (const event of streamResult.fullStream) {
            // Forward real step events using robust parsing
            if (event.type === "workflow-step-start" && "payload" in event) {
              const payload = event.payload as Record<string, unknown>;
              const step = payload?.step as Record<string, unknown> | undefined;
              const stepId = (payload?.stepId || step?.id || payload?.id) as
                | string
                | undefined;

              if (stepId === "generate-creative") {
                // We already sent the start event, so we can ignore this or send it again (idempotent)
                // Let's send it again just to be safe in case of re-connections or if timing was off
                sendEvent({
                  type: "step_start",
                  stepId: "generate-creative",
                  label: stepLabels["generate-creative"],
                });
              }
            }
            if (event.type === "workflow-step-finish" && "payload" in event) {
              const payload = event.payload as Record<string, unknown>;
              const step = payload?.step as Record<string, unknown> | undefined;
              const stepId = (payload?.stepId || step?.id || payload?.id) as
                | string
                | undefined;

              // Check success status from the result
              const result = payload?.result as any;
              const success = result?.success !== false;

              if (stepId === "generate-creative") {
                sendEvent({
                  type: "step_complete",
                  stepId: "generate-creative",
                  success,
                });
              }
            }
          }

          const workflowResult = await streamResult.result;

          if (workflowResult.status !== "success" || !workflowResult.result) {
            throw new Error("Creative generation workflow failed");
          }

          // Ensure generate-creative is marked as complete if the stream loop somehow missed it
          // This is a safety catch
          sendEvent({
            type: "step_complete",
            stepId: "generate-creative",
            success: true,
          });

          const creativeResult = workflowResult.result as {
            greeting: string;
            creative: CreativeData;
          };

          // 4. Generate Image (Synthetic)
          let imageUrl: string | undefined;

          if (body.brandId && !SKIP_IMAGE_GENERATION) {
            await runSyntheticStep(
              "generate-image",
              stepLabels["generate-image"],
              async () => {
                try {
                  const imagePrompt =
                    creativeResult.creative.heroImagePrompt ||
                    `Hero image for ${body.brandProfile.name} in ${body.brandProfile.industry || "general"} industry. Style: professional advertising. ${creativeResult.creative.moodKeywords?.join(", ") || ""}`;

                  console.log(
                    "[Designer] Generating initial image:",
                    imagePrompt,
                  );

                  const imageResult = await generateImage({
                    prompt: imagePrompt,
                    style: body.isDpa ? "abstract" : "hero",
                    industry: body.brandProfile.industry,
                    moodKeywords: creativeResult.creative.moodKeywords,
                  });

                  if (imageResult.success && imageResult.result) {
                    imageUrl = getImageDataUrl(imageResult.result);
                  } else {
                    console.error("Image generation failed", imageResult.error);
                    // We don't throw here to avoid failing the whole request
                  }
                } catch (e) {
                  console.error("Image generation exception", e);
                }
              },
            );
          }

          sendEvent({
            type: "complete",
            data: {
              ...workflowResult.result,
              imageUrl,
            },
          });

          closeController();
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
