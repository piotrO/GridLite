import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Zod schema for image generation options.
 */
const ImageGenerationOptionsSchema = z.object({
  prompt: z
    .string()
    .describe("Detailed prompt describing the image to generate"),
  style: z
    .enum(["product", "lifestyle", "abstract", "hero"])
    .optional()
    .default("hero")
    .describe("Visual style for the image"),
  industry: z.string().optional().describe("Industry context for visual style"),
  moodKeywords: z
    .array(z.string())
    .optional()
    .describe("Mood keywords to incorporate"),
});

/**
 * Zod schema for image generation result.
 */
const ImageGenerationResultSchema = z.object({
  imageData: z.string().describe("Base64 encoded image data"),
  mimeType: z.string().describe("MIME type of the image"),
  enhancedPrompt: z.string().describe("The prompt that was used"),
});

/**
 * Build an enhanced prompt for product/advertising imagery
 */
function buildEnhancedPrompt(
  prompt: string,
  style: string,
  industry?: string,
  moodKeywords?: string[],
): string {
  const parts: string[] = [prompt];

  // Add style-specific guidance
  switch (style) {
    case "product":
      parts.push(
        "Professional product photography style",
        "Clean and minimal composition",
        "Soft studio lighting",
        "High-end commercial quality",
      );
      break;
    case "lifestyle":
      parts.push(
        "Lifestyle photography style",
        "Natural and authentic feel",
        "Warm ambient lighting",
      );
      break;
    case "abstract":
      parts.push(
        "Abstract digital art style",
        "Modern and dynamic composition",
        "Bold visual elements",
      );
      break;
    case "hero":
    default:
      parts.push(
        "Hero image for digital advertising",
        "Eye-catching and professional",
        "Clean composition suitable for text overlay",
      );
      break;
  }

  if (industry) {
    parts.push(`Suitable for ${industry} industry`);
  }

  if (moodKeywords && moodKeywords.length > 0) {
    parts.push(`Mood: ${moodKeywords.join(", ")}`);
  }

  parts.push(
    "Subject should be the main focus",
    "Simple or plain background that can be easily removed",
    "No text or watermarks in the image",
  );

  return parts.join(". ") + ".";
}

/**
 * Tool to generate images using Google Gemini AI.
 * Creates high-quality images for advertising use.
 */
export const imageGeneratorTool = createTool({
  id: "image-generator",
  description:
    "Generates high-quality images using AI for advertising and marketing use. Supports different visual styles and can incorporate brand context.",
  inputSchema: ImageGenerationOptionsSchema,
  outputSchema: z.object({
    result: ImageGenerationResultSchema.nullable(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        result: null,
        success: false,
        error: "GEMINI_API_KEY environment variable is not set.",
      };
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);

      // Use Gemini with image generation capability
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-image",
        generationConfig: {
          responseModalities: ["image", "text"],
        } as unknown as Record<string, unknown>,
      });

      const enhancedPrompt = buildEnhancedPrompt(
        context.prompt,
        context.style || "hero",
        context.industry,
        context.moodKeywords,
      );

      const imagePrompt = `Generate a high-quality image for advertising use:

  ${enhancedPrompt}

  Requirements:
  - The image should be professional and suitable for digital display advertising
  - Ensure the main subject is clearly visible and well-composed
  - The background should be simple/plain to allow for easy background removal
  - No text, logos, or watermarks should appear in the image
  - High resolution and sharp details`;

      console.log(
        "[ImageGenerator Tool] Generating image with prompt:",
        context.prompt,
      );

      const result = await model.generateContent(imagePrompt);
      const response = result.response;

      // Extract image from the response
      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts) {
        return {
          result: null,
          success: false,
          error: "No content parts in response",
        };
      }

      // Look for inline data (image)
      for (const part of parts) {
        const partData = part as {
          inlineData?: { mimeType: string; data: string };
        };
        if (partData.inlineData) {
          console.log("[ImageGenerator Tool] Image generated successfully");
          return {
            result: {
              imageData: partData.inlineData.data,
              mimeType: partData.inlineData.mimeType,
              enhancedPrompt,
            },
            success: true,
          };
        }
      }

      return {
        result: null,
        success: false,
        error: "No image data in response",
      };
    } catch (error) {
      console.error("[ImageGenerator Tool] Error:", error);
      return {
        result: null,
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate image",
      };
    }
  },
});

/**
 * Direct image generation function for use outside of Mastra agent context.
 * Use this in API routes instead of calling imageGeneratorTool.execute() directly.
 */
export interface GenerateImageOptions {
  prompt: string;
  style?: "product" | "lifestyle" | "abstract" | "hero";
  industry?: string;
  moodKeywords?: string[];
}

export interface GenerateImageResult {
  imageData: string;
  mimeType: string;
  enhancedPrompt: string;
}

export async function generateImage(options: GenerateImageOptions): Promise<{
  result: GenerateImageResult | null;
  success: boolean;
  error?: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      result: null,
      success: false,
      error: "GEMINI_API_KEY environment variable is not set.",
    };
  }

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
      generationConfig: {
        responseModalities: ["image", "text"],
      } as unknown as Record<string, unknown>,
    });

    const enhancedPrompt = buildEnhancedPrompt(
      options.prompt,
      options.style || "hero",
      options.industry,
      options.moodKeywords,
    );

    const imagePrompt = `Generate a high-quality image for advertising use:

  ${enhancedPrompt}

  Requirements:
  - The image should be professional and suitable for digital display advertising
  - Ensure the main subject is clearly visible and well-composed
  - The background should be simple/plain to allow for easy background removal
  - No text, logos, or watermarks should appear in the image
  - High resolution and sharp details`;

    console.log(
      "[ImageGenerator] Generating image with prompt:",
      options.prompt,
    );

    const result = await model.generateContent(imagePrompt);
    const response = result.response;

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      return {
        result: null,
        success: false,
        error: "No content parts in response",
      };
    }

    for (const part of parts) {
      const partData = part as {
        inlineData?: { mimeType: string; data: string };
      };
      if (partData.inlineData) {
        console.log("[ImageGenerator] Image generated successfully");
        return {
          result: {
            imageData: partData.inlineData.data,
            mimeType: partData.inlineData.mimeType,
            enhancedPrompt,
          },
          success: true,
        };
      }
    }

    return {
      result: null,
      success: false,
      error: "No image data in response",
    };
  } catch (error) {
    console.error("[ImageGenerator] Error:", error);
    return {
      result: null,
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to generate image",
    };
  }
}

/**
 * Helper function to get a data URL from the image result.
 */
export function getImageDataUrl(result: {
  imageData: string;
  mimeType: string;
}): string {
  return `data:${result.mimeType};base64,${result.imageData}`;
}
