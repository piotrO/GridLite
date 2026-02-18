import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "Missing url parameter" },
      { status: 400 },
    );
  }

  // Security: Only allow fetching from our Grid8 CDN
  if (!url.startsWith("https://grid8.fra1.cdn.digitaloceanspaces.com")) {
    return NextResponse.json({ error: "Invalid URL domain" }, { status: 403 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json(
        { error: `Fetch failed: ${response.statusText}` },
        { status: response.status },
      );
    }

    const contentType = response.headers.get("Content-Type") || "text/plain";
    const data = await response.text();

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Optional: Add cache control
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
