import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Options for image generation
 */
export interface ImageGenerationOptions {
    /** The prompt describing the image to generate */
    prompt: string;
    /** Visual style guidance */
    style?: "product" | "lifestyle" | "abstract" | "hero";
    /** Aspect ratio for the image */
    aspectRatio?: "1:1" | "3:4" | "4:3" | "16:9" | "9:16";
    /** Brand colors to incorporate (hex values) */
    brandColors?: string[];
    /** Industry context for visual style */
    industry?: string;
    /** Additional style keywords */
    moodKeywords?: string[];
}

/**
 * Response from image generation
 */
export interface ImageGenerationResult {
    /** Base64 encoded image data */
    imageData: string;
    /** MIME type of the image */
    mimeType: string;
    /** The prompt that was used (may be enhanced) */
    enhancedPrompt: string;
}

/**
 * Build an enhanced prompt for product/advertising imagery
 */
function buildEnhancedPrompt(options: ImageGenerationOptions): string {
    const parts: string[] = [];

    // Core prompt
    parts.push(options.prompt);

    // Add style-specific guidance
    switch (options.style) {
        case "product":
            parts.push(
                "Professional product photography style",
                "Clean and minimal composition",
                "Soft studio lighting",
                "High-end commercial quality"
            );
            break;
        case "lifestyle":
            parts.push(
                "Lifestyle photography style",
                "Natural and authentic feel",
                "Warm ambient lighting"
            );
            break;
        case "abstract":
            parts.push(
                "Abstract digital art style",
                "Modern and dynamic composition",
                "Bold visual elements"
            );
            break;
        case "hero":
        default:
            parts.push(
                "Hero image for digital advertising",
                "Eye-catching and professional",
                "Clean composition suitable for text overlay"
            );
            break;
    }

    // Add industry context if provided
    if (options.industry) {
        parts.push(`Suitable for ${options.industry} industry`);
    }

    // Add mood keywords if provided
    if (options.moodKeywords && options.moodKeywords.length > 0) {
        parts.push(`Mood: ${options.moodKeywords.join(", ")}`);
    }

    // Always request no background or simple background for transparency
    parts.push(
        "Subject should be the main focus",
        "Simple or plain background that can be easily removed",
        "No text or watermarks in the image"
    );

    return parts.join(". ") + ".";
}

/**
 * Generate an image using Google Imagen via Gemini API
 * 
 * Note: This uses Gemini's image generation capabilities.
 * For production with Imagen 3 specifically, you may need to use Vertex AI directly.
 */
export async function generateImage(
    options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not set.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Use Gemini 2.5 Flash with image generation capability
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
            // Enable image generation in the response
            responseModalities: ["image"],
        } as any,
    });

    const enhancedPrompt = buildEnhancedPrompt(options);

    // Generate the image prompt
    const imagePrompt = `Generate a high-quality image for advertising use:

${enhancedPrompt}

Requirements:
- The image should be professional and suitable for digital display advertising
- Ensure the main subject is clearly visible and well-composed
- The background should be simple/plain to allow for easy background removal
- No text, logos, or watermarks should appear in the image
- High resolution and sharp details`;

    try {
        const result = await model.generateContent(imagePrompt);
        const response = result.response;

        // Extract image from the response
        const parts = response.candidates?.[0]?.content?.parts;
        if (!parts) {
            throw new Error("No content parts in response");
        }

        // Look for inline data (image)
        for (const part of parts) {
            const partData = part as { inlineData?: { mimeType: string; data: string } };
            if (partData.inlineData) {
                return {
                    imageData: partData.inlineData.data,
                    mimeType: partData.inlineData.mimeType,
                    enhancedPrompt,
                };
            }
        }

        throw new Error("No image data in response");
    } catch (error) {
        console.error("Image generation error:", error);
        throw new Error(
            `Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Remove background from an image using AI
 * This creates a version with transparent background
 */
export async function removeBackground(
    imageData: string,
    mimeType: string
): Promise<{ imageData: string; mimeType: string }> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not set.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Use Gemini with image editing capability
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-image",
        generationConfig: {
            responseModalities: ["image", "text"],
        } as unknown as Record<string, unknown>,
    });

    try {
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType,
                    data: imageData,
                },
            },
            {
                text: `Edit this image to remove the background completely, making it transparent. 
Keep only the main subject/product. 
The result should have a transparent/alpha background suitable for compositing over other content.
Maintain the exact quality and details of the original subject.`,
            },
        ]);

        const response = result.response;
        const parts = response.candidates?.[0]?.content?.parts;

        if (!parts) {
            throw new Error("No content parts in response");
        }

        // Look for inline data (edited image)
        for (const part of parts) {
            const partData = part as { inlineData?: { mimeType: string; data: string } };
            if (partData.inlineData) {
                return {
                    imageData: partData.inlineData.data,
                    mimeType: partData.inlineData.mimeType,
                };
            }
        }

        // If no edited image, return original
        console.warn("Background removal did not return edited image, using original");
        return { imageData, mimeType };
    } catch (error) {
        console.error("Background removal error:", error);
        // Return original image if background removal fails
        return { imageData, mimeType };
    }
}

/**
 * Upload an image to brand assets on Grid8
 */
export async function uploadToBrandAssets(
    imageData: string,
    mimeType: string,
    brandId: string,
    token: string,
    filename?: string
): Promise<string> {
    // Convert base64 to a blob
    const binaryData = Buffer.from(imageData, "base64");

    // Determine the file extension from mime type
    const extension = mimeType.includes("png") ? "png" : "jpg";
    const finalFilename = filename || `generated-${Date.now()}.${extension}`;

    // Create form data for upload
    const formData = new FormData();
    const blob = new Blob([binaryData], { type: mimeType });
    formData.append("image", blob, finalFilename);

    // Upload to Grid8 brand assets
    const response = await fetch(
        `https://grid8.bannerbros.net/api/asset/brand/${brandId}`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to upload to brand assets:", errorText);
        throw new Error(`Failed to upload image to brand assets: ${response.status}`);
    }

    const result = await response.json();

    // Return the URL of the uploaded image
    // The exact structure depends on Grid8's response format
    return result.url || result.assetUrl || `https://cdn.bannerbros.net/brand/${brandId}/${finalFilename}`;
}

/**
 * Generate an image and optionally upload it to brand assets
 * This is the main function that combines generation + upload
 * Falls back to data URL if upload fails
 */
export async function generateAndUploadImage(
    options: ImageGenerationOptions,
    brandId: string,
    token: string
): Promise<{ imageUrl: string; enhancedPrompt: string }> {
    // Step 1: Generate the image
    console.log("[ImageGenerator] Generating image with prompt:", options.prompt);
    const generatedImage = await generateImage(options);

    // Step 2: Skip background removal for now - let's just use the generated image
    // Background removal can be added back later once we verify generation works
    const processedImage = generatedImage;

    // Step 3: Try to upload to brand assets, fallback to data URL
    let imageUrl: string;

    try {
        console.log("[ImageGenerator] Attempting upload to brand assets...");
        imageUrl = await uploadToBrandAssets(
            processedImage.imageData,
            processedImage.mimeType,
            brandId,
            token
        );
        console.log("[ImageGenerator] Image uploaded successfully:", imageUrl);
    } catch (uploadError) {
        console.warn("[ImageGenerator] Upload failed, using data URL:", uploadError);
        // Fallback to data URL - this works in the browser for displaying images
        imageUrl = `data:${processedImage.mimeType};base64,${processedImage.imageData}`;
        console.log("[ImageGenerator] Using data URL (length:", imageUrl.length, ")");
    }

    return {
        imageUrl,
        enhancedPrompt: generatedImage.enhancedPrompt,
    };
}

/**
 * Build an image prompt from creative direction and brand context
 */
export function buildImagePromptFromContext(context: {
    brandName: string;
    industry?: string;
    campaignAngle?: string;
    imageDirection?: string;
    moodKeywords?: string[];
    headline?: string;
}): string {
    const parts: string[] = [];

    // Start with image direction if available
    if (context.imageDirection) {
        parts.push(context.imageDirection);
    }

    // Add brand context
    parts.push(`For ${context.brandName}`);

    // Add industry context
    if (context.industry) {
        parts.push(`in the ${context.industry} industry`);
    }

    // Add campaign angle for context
    if (context.campaignAngle) {
        parts.push(`Campaign theme: ${context.campaignAngle}`);
    }

    // If no specific direction, create a generic prompt
    if (parts.length < 2) {
        parts.push("Professional hero image for digital advertising");
        parts.push("Modern and eye-catching visual");
    }

    return parts.join(". ");
}
