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

    const encoder = new TextEncoder();

    async function* generateStream() {
      let closed = false;

      // Keep connection alive during long AI steps
      const keepAlive = setInterval(() => {
        if (closed) return;
        // Yieldping doesn't work well within async generators without complex logic,
        // but the generator will yield Step events as they happen.
      }, 15000);

      const encodeEvent = (event: unknown) => {
        return encoder.encode(JSON.stringify(event) + "\n");
      };

      // Helper to execute synthetic steps inline
      // Instead of a wrapper function, we'll yield directly from the main generator

      try {
        // Send a large dummy space string to force the proxy to flush its initial buffer
        // Some proxies (like Envoy on Railway) wait for ~1-4KB of data before they begin
        // transmitting the stream to the client. If the first AI step takes >10s and we
        // haven't flushed the buffer, the proxy kills it.
        yield encoder.encode(" ".repeat(2048) + "\n");

        const workflow = mastra.getWorkflow("designer");

        console.log("[Designer API] Starting workflow with isDpa:", body.isDpa);
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
        yield encodeEvent({
          type: "init",
          steps: Object.keys(stepLabels).map((id) => ({
            id,
            label: stepLabels[id],
          })),
        });

        // 1. Analyzing Brand (Synthetic)
        yield encodeEvent({
          type: "step_start",
          stepId: "analyzing-brand",
          label: stepLabels["analyzing-brand"],
        });
        try {
          await new Promise((resolve) => setTimeout(resolve, 600));
          yield encodeEvent({
            type: "step_complete",
            stepId: "analyzing-brand",
            success: true,
          });
        } catch (e) {
          yield encodeEvent({
            type: "step_complete",
            stepId: "analyzing-brand",
            success: false,
          });
          throw e;
        }

        // 2. Reviewing Strategy (Synthetic)
        yield encodeEvent({
          type: "step_start",
          stepId: "reviewing-strategy",
          label: stepLabels["reviewing-strategy"],
        });
        try {
          await new Promise((resolve) => setTimeout(resolve, 600));
          yield encodeEvent({
            type: "step_complete",
            stepId: "reviewing-strategy",
            success: true,
          });
        } catch (e) {
          yield encodeEvent({
            type: "step_complete",
            stepId: "reviewing-strategy",
            success: false,
          });
          throw e;
        }

        // 3. Generate Creative (Real Mastra Workflow)
        yield encodeEvent({
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
          // Send ping to keep connection alive
          yield encodeEvent({ type: "ping" });

          // Forward real step events
          if (event.type === "workflow-step-start" && "payload" in event) {
            const payload = event.payload as Record<string, unknown>;
            const step = payload?.step as Record<string, unknown> | undefined;
            const stepId = (payload?.stepId || step?.id || payload?.id) as
              | string
              | undefined;

            if (stepId === "generate-creative") {
              yield encodeEvent({
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
              yield encodeEvent({
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

        yield encodeEvent({
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
          yield encodeEvent({
            type: "step_start",
            stepId: "generate-image",
            label: stepLabels["generate-image"],
          });
          try {
            const imagePrompt =
              creativeResult.creative.heroImagePrompt ||
              `Hero image for ${body.brandProfile.name} in ${body.brandProfile.industry || "general"} industry. Style: professional advertising. ${creativeResult.creative.moodKeywords?.join(", ") || ""}`;

            console.log("[Designer] Generating initial image:", imagePrompt);

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
            }
            yield encodeEvent({
              type: "step_complete",
              stepId: "generate-image",
              success: true,
            });
          } catch (e) {
            console.error("Image generation exception", e);
            yield encodeEvent({
              type: "step_complete",
              stepId: "generate-image",
              success: false,
            });
          }
        }

        yield encodeEvent({
          type: "complete",
          data: {
            ...workflowResult.result,
            imageUrl,
          },
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        if (
          errorMessage.includes("429") ||
          errorMessage.toLowerCase().includes("too many requests")
        ) {
          yield encodeEvent({
            type: "error",
            message:
              "AI is currently busy (Rate Limit). Please wait 30 seconds and try again.",
          });
        } else {
          yield encodeEvent({ type: "error", message: errorMessage });
        }
      } finally {
        closed = true;
        clearInterval(keepAlive);
      }
    }

    function iteratorToStream(iterator: any) {
      return new ReadableStream({
        async pull(controller) {
          const { value, done } = await iterator.next();
          if (done) {
            controller.close();
          } else {
            controller.enqueue(value);
          }
        },
      });
    }

    const stream = iteratorToStream(generateStream());

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
