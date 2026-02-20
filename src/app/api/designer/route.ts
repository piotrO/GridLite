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
        const startTime = Date.now();
        console.log(`[Designer Stream] Started at ${new Date().toISOString()}`);

        const encodeEvent = (event: unknown) => {
          if (closed) return;
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
            );
          } catch (e) {
            console.error("[Designer Stream] Error enqueuing event:", e);
          }
        };

        const closeStream = () => {
          if (closed) return;
          closed = true;
          clearInterval(keepAlive);
          try {
            controller.close();
            const closeTime = Math.round((Date.now() - startTime) / 1000);
            console.log(`[Designer Stream] Stream closed at ${closeTime}s.`);
          } catch {
            // ignore
          }
        };

        // Keep connection alive during long AI steps
        const keepAlive = setInterval(() => {
          if (closed) return;
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          console.log(`[Designer Stream] Interval ping at ${elapsed}s`);
          encodeEvent({ type: "ping" });
        }, 5000);

        try {
          console.log(`[Designer Stream] Sending initial buffer flush...`);
          // Force proxy to flush buffer
          if (!closed)
            controller.enqueue(encoder.encode(" ".repeat(2048) + "\n\n"));

          console.log(`[Designer Stream] Initializing Mastra workflow...`);
          const workflow = mastra.getWorkflow("designer");
          const stepLabels = {
            "analyzing-brand": "Analyzing brand identity",
            "reviewing-strategy": "Reviewing campaign strategy",
            "generate-creative": "Writing display ad copy",
            "generate-image": "Generating stunning visuals",
          };

          encodeEvent({
            type: "init",
            steps: Object.keys(stepLabels).map((id) => ({
              id,
              label: stepLabels[id as keyof typeof stepLabels],
            })),
          });

          // 1. Analyzing Brand (Synthetic)
          console.log(`[Designer Stream] Step: analyzing-brand`);
          encodeEvent({
            type: "step_start",
            stepId: "analyzing-brand",
            label: stepLabels["analyzing-brand"],
          });
          try {
            await new Promise((resolve) => setTimeout(resolve, 600));
            encodeEvent({
              type: "step_complete",
              stepId: "analyzing-brand",
              success: true,
            });
          } catch (e) {
            encodeEvent({
              type: "step_complete",
              stepId: "analyzing-brand",
              success: false,
            });
            throw e;
          }

          // 2. Reviewing Strategy (Synthetic)
          console.log(`[Designer Stream] Step: reviewing-strategy`);
          encodeEvent({
            type: "step_start",
            stepId: "reviewing-strategy",
            label: stepLabels["reviewing-strategy"],
          });
          try {
            await new Promise((resolve) => setTimeout(resolve, 600));
            encodeEvent({
              type: "step_complete",
              stepId: "reviewing-strategy",
              success: true,
            });
          } catch (e) {
            encodeEvent({
              type: "step_complete",
              stepId: "reviewing-strategy",
              success: false,
            });
            throw e;
          }

          console.log(`[Designer Stream] Creating workflow run...`);
          const run = await workflow.createRun();
          const streamResult = await run.stream({
            inputData: {
              brandProfile: body.brandProfile,
              strategy: body.strategy,
              campaignData: body.campaignData || null,
              isDpa: body.isDpa,
            },
          });

          console.log(`[Designer Stream] Starting execution of AI creative...`);
          for await (const event of streamResult.fullStream) {
            if (closed) break;
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            console.log(
              `[Designer Stream] Received workflow event at ${elapsed}s:`,
              event.type,
            );

            if (event.type === "workflow-step-start" && "payload" in event) {
              const payload = event.payload as Record<string, unknown>;
              const step = payload?.step as Record<string, unknown> | undefined;
              const stepId = (payload?.stepId || step?.id || payload?.id) as
                | string
                | undefined;

              if (stepId === "generate-creative") {
                console.log(
                  `[Designer Stream]   -> Step Start: generate-creative`,
                );
                encodeEvent({
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

              const result = payload?.result as any;
              const success = result?.success !== false;

              if (stepId === "generate-creative") {
                console.log(
                  `[Designer Stream]   -> Step Complete: generate-creative: success=${success}`,
                );
                encodeEvent({
                  type: "step_complete",
                  stepId: "generate-creative",
                  success,
                });
              }
            }
          }

          if (closed) return;
          console.log(`[Designer Stream] Waiting for AI creative result...`);
          const workflowResult = await streamResult.result;

          if (
            !workflowResult ||
            workflowResult.status !== "success" ||
            !workflowResult.result
          ) {
            throw new Error("Failed to generate creative content");
          }

          const creativeResult = workflowResult.result as any;
          let imageUrl: string | undefined;

          if (body.brandId && !SKIP_IMAGE_GENERATION) {
            console.log(`[Designer Stream] Generating initial image...`);
            encodeEvent({
              type: "step_start",
              stepId: "generate-image",
              label: stepLabels["generate-image"],
            });
            try {
              const imagePrompt =
                creativeResult?.creative?.heroImagePrompt ||
                `Hero image for ${body.brandProfile.name} in ${body.brandProfile.industry || "general"} industry. Style: professional advertising. ${creativeResult?.creative?.moodKeywords?.join(", ") || ""}`;

              console.log("[Designer Stream] Prompt:", imagePrompt);

              const imageResult = await generateImage({
                prompt: imagePrompt,
                style: body.isDpa ? "abstract" : "hero",
                industry: body.brandProfile.industry,
                moodKeywords: creativeResult?.creative?.moodKeywords,
              });

              if (imageResult.success && imageResult.result) {
                imageUrl = getImageDataUrl(imageResult.result);
              } else {
                console.error(
                  "[Designer Stream] Image generation failed",
                  imageResult.error,
                );
              }
              encodeEvent({
                type: "step_complete",
                stepId: "generate-image",
                success: true,
              });
            } catch (e) {
              console.error("[Designer Stream] Image generation exception", e);
              encodeEvent({
                type: "step_complete",
                stepId: "generate-image",
                success: false,
              });
            }
          }

          if (closed) return;
          const totalTime = Math.round((Date.now() - startTime) / 1000);
          console.log(
            `[Designer Stream] Success! Sending complete event at ${totalTime}s.`,
          );

          encodeEvent({
            type: "complete",
            data: {
              ...(creativeResult?.creative || {}),
              imageUrl: imageUrl || "",
            },
          });
        } catch (error) {
          const errorTime = Math.round((Date.now() - startTime) / 1000);
          console.error(
            `[Designer Stream] Exception caught at ${errorTime}s:`,
            error,
          );

          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          if (
            errorMessage.includes("429") ||
            errorMessage.toLowerCase().includes("too many requests")
          ) {
            encodeEvent({
              type: "error",
              message:
                "AI is currently busy (Rate Limit). Please wait 30 seconds and try again.",
            });
          } else {
            encodeEvent({
              type: "error",
              message: errorMessage,
            });
          }
        } finally {
          closeStream();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
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
