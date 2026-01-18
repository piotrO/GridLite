import { NextRequest, NextResponse } from "next/server";
import { getDesignerWorkflow } from "@/mastra";
import { generateImage, getImageDataUrl } from "@/mastra/tools";
import { generateDesignerChatResponse } from "./lib/designer";
import type {
  BrandProfile,
  StrategyData,
  CampaignData,
  CreativeDirection,
} from "@/types/designer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // Allow extra time for image generation

interface DesignerRequest {
  // Brand profile (required)
  brandProfile: BrandProfile;
  // Brand ID for image upload (optional)
  brandId?: string;

  // Strategy from Phase 2 (required for initial)
  strategy?: StrategyData;

  // Campaign data from Phase 2 (optional)
  campaignData?: CampaignData;

  // For chat continuation
  mode?: "initial" | "chat";
  userMessage?: string;
  currentCreative?: CreativeDirection["creative"];
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
      if (response.imageGenerationRequest) {
        try {
          console.log(
            "[Designer] Generating image:",
            response.imageGenerationRequest.prompt
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
            console.error("[Designer] Image generation failed:", imageResult.error);
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
            const creativeResult = workflowResult.result as {
              greeting: string;
              creative: {
                heroImagePrompt?: string;
                imageDirection?: string;
                moodKeywords?: string[];
                [key: string]: unknown;
              };
            };

            // Generate an initial image based on the creative direction
            let imageUrl: string | undefined;

            if (body.brandId) {
              try {
                sendStatus("generating_image");

                // Use heroImagePrompt directly if available
                const imagePrompt = creativeResult.creative.heroImagePrompt ||
                  `Hero image for ${body.brandProfile.name} in ${body.brandProfile.industry || "general"} industry. Style: professional advertising. ${creativeResult.creative.moodKeywords?.join(", ") || ""}`;

                console.log("[Designer] Generating initial image:", imagePrompt);

                const imageResult = await generateImage({
                  prompt: imagePrompt,
                  style: "hero",
                  industry: body.brandProfile.industry,
                  moodKeywords: creativeResult.creative.moodKeywords,
                });

                if (imageResult.success && imageResult.result) {
                  imageUrl = getImageDataUrl(imageResult.result);
                  console.log("[Designer] Initial image generated successfully");
                } else {
                  console.error("[Designer] Initial image generation failed:", imageResult.error);
                }
              } catch (imageError) {
                console.error("[Designer] Initial image generation failed:", imageError);
                // Continue without image - don't fail the whole request
              }
            }

            console.log("[Designer] Sending complete message with imageUrl:", imageUrl ? "yes (length: " + imageUrl.length + ")" : "no");
            const completeMessage =
              JSON.stringify({
                type: "complete",
                data: {
                  ...workflowResult.result,
                  imageUrl, // Include generated image URL
                },
              }) + "\n";
            console.log("[Designer] Complete message size:", completeMessage.length);
            controller.enqueue(encoder.encode(completeMessage));
            console.log("[Designer] Complete message enqueued, closing stream");
          } else {
            console.error("[Designer] Workflow failed:", workflowResult);
            sendError("Creative generation failed");
          }

          controller.close();
          console.log("[Designer] Stream closed successfully");
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
