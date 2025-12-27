import { NextRequest, NextResponse } from "next/server";

// Force Node.js runtime for fetch operations
export const runtime = "nodejs";

/**
 * POST /api/brands/[id]/avatar
 * Uploads or proxies a logo image to Grid8's avatar endpoint
 *
 * Accepts:
 * - FormData with "image" file
 * - JSON with { logoUrl: string } to proxy from URL
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    let formData: FormData;

    if (contentType.includes("multipart/form-data")) {
      // Direct file upload
      formData = await request.formData();
    } else if (contentType.includes("application/json")) {
      // Proxy from URL - fetch the image and create FormData
      const body = await request.json();
      const { logoUrl } = body;

      if (!logoUrl || typeof logoUrl !== "string") {
        return NextResponse.json(
          { error: "logoUrl is required" },
          { status: 400 }
        );
      }

      // Skip if it's an emoji or invalid URL
      if (!logoUrl.startsWith("http")) {
        return NextResponse.json(
          { message: "Skipped - not a valid image URL" },
          { status: 200 }
        );
      }

      // Fetch the logo image
      const imageResponse = await fetch(logoUrl);
      if (!imageResponse.ok) {
        return NextResponse.json(
          { error: "Failed to fetch logo from URL" },
          { status: 400 }
        );
      }

      const blob = await imageResponse.blob();

      // Determine filename from URL or use default
      const urlPath = new URL(logoUrl).pathname;
      const filename = urlPath.split("/").pop() || "logo.png";

      formData = new FormData();
      formData.append("image", blob, filename);
    } else {
      return NextResponse.json(
        {
          error:
            "Invalid content type. Use multipart/form-data or application/json",
        },
        { status: 400 }
      );
    }

    // Forward to Grid8 API
    const grid8Response = await fetch(
      `https://grid8.bannerbros.net/api/asset/avatar/brand/${id}`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
        },
        body: formData,
      }
    );

    if (!grid8Response.ok) {
      const errorText = await grid8Response.text();
      console.error("Grid8 avatar upload failed:", errorText);
      return NextResponse.json(
        { error: "Failed to upload avatar to Grid8" },
        { status: grid8Response.status }
      );
    }

    const result = await grid8Response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
