import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("[AssetUploadProxy] Received POST request");
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      console.log("[AssetUploadProxy] Missing auth token");
      return NextResponse.json(
        { error: "Authorization token required" },
        { status: 401 },
      );
    }

    console.log("[AssetUploadProxy] Processing form data...");
    const formData = await request.formData();
    console.log(
      "[AssetUploadProxy] Form data keys:",
      Array.from(formData.keys()),
    );

    const file = formData.get("file");
    const brandId = formData.get("brandId");
    console.log(
      "[AssetUploadProxy] File present:",
      !!file,
      "BrandId:",
      brandId,
    );

    // Correct endpoint confirmed by user trace:
    // POST https://grid8.bannerbros.net/api/asset/brand/{brandId}
    if (!brandId) {
      return NextResponse.json(
        { error: "brandId is required for this endpoint" },
        { status: 400 },
      );
    }

    const targetUrl = `https://grid8.bannerbros.net/api/asset/brand/${brandId}`;
    console.log(
      "[AssetUploadProxy] Forwarding to confirmed endpoint:",
      targetUrl,
    );

    // Reconstruct FormData to ensure clean transmission and remove potential "brandId" duplications
    const outgoingFormData = new FormData();
    const fileEntry = formData.get("file");

    if (fileEntry) {
      // BACKEND REQUIREMENT: The field name must be "asset", not "file"
      outgoingFormData.append("asset", fileEntry);
    }

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: outgoingFormData,
      // @ts-ignore - duplex is needed for Node environment with FormData
      duplex: "half",
    });

    console.log(
      "[AssetUploadProxy] Upstream response status:",
      response.status,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Asset Upload Proxy Error:", response.status, errorText);
      return NextResponse.json(
        {
          error: `Failed to upload asset: ${response.statusText}`,
          details: errorText,
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    console.log("[AssetUploadProxy] Upload success:", JSON.stringify(data));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Asset Upload API Proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error during upload" },
      { status: 500 },
    );
  }
}
