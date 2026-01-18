import { NextRequest, NextResponse } from "next/server";
import {
    generateAndUploadImage,
    generateImage,
    ImageGenerationOptions,
} from "./lib/image-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Image generation can take a while
export const maxDuration = 60;

interface GenerateImageRequest {
    prompt: string;
    style?: "product" | "lifestyle" | "abstract" | "hero";
    aspectRatio?: "1:1" | "3:4" | "4:3" | "16:9" | "9:16";
    brandId?: string;
    brandColors?: string[];
    industry?: string;
    moodKeywords?: string[];
    uploadToAssets?: boolean;
}

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");

        const body: GenerateImageRequest = await request.json();

        if (!body.prompt) {
            return NextResponse.json(
                { error: "prompt is required" },
                { status: 400 }
            );
        }

        const options: ImageGenerationOptions = {
            prompt: body.prompt,
            style: body.style || "hero",
            aspectRatio: body.aspectRatio,
            brandColors: body.brandColors,
            industry: body.industry,
            moodKeywords: body.moodKeywords,
        };

        // If brand ID and token provided, generate and upload to assets
        if (body.uploadToAssets && body.brandId && token) {
            const result = await generateAndUploadImage(options, body.brandId, token);

            return NextResponse.json({
                success: true,
                imageUrl: result.imageUrl,
                enhancedPrompt: result.enhancedPrompt,
            });
        }

        // Otherwise, just generate and return base64 data
        const result = await generateImage(options);

        return NextResponse.json({
            success: true,
            imageData: result.imageData,
            mimeType: result.mimeType,
            enhancedPrompt: result.enhancedPrompt,
        });
    } catch (error) {
        console.error("Image generation API error:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error ? error.message : "Failed to generate image",
                success: false,
            },
            { status: 500 }
        );
    }
}
