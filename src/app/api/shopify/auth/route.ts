import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { storeState } from "@/lib/shopify-state";

/**
 * Shopify OAuth Authorization Route
 *
 * GET /api/shopify/auth?shop=mystore.myshopify.com
 *
 * Initiates the OAuth flow by redirecting to Shopify's authorization page.
 */

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || "";
const SHOPIFY_SCOPES = "read_products,read_inventory";
const REDIRECT_URI =
  process.env.SHOPIFY_REDIRECT_URI ||
  `${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/callback`;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get("shop");

    // Validate shop parameter
    if (!shop) {
      return NextResponse.json(
        { error: "Missing 'shop' parameter" },
        { status: 400 },
      );
    }

    // Validate shop domain format
    const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
    const cleanShop = shop.replace(/^https?:\/\//, "").replace(/\/$/, "");

    if (!shopRegex.test(cleanShop)) {
      return NextResponse.json(
        {
          error: "Invalid shop domain. Use format: your-store.myshopify.com",
        },
        { status: 400 },
      );
    }

    // Check for API key
    if (!SHOPIFY_API_KEY) {
      console.error("SHOPIFY_API_KEY not configured");
      return NextResponse.json(
        { error: "Shopify integration not configured" },
        { status: 500 },
      );
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString("hex");

    // Store state for validation in callback
    storeState(state, cleanShop);

    // Build OAuth URL
    const authUrl = new URL(`https://${cleanShop}/admin/oauth/authorize`);
    authUrl.searchParams.set("client_id", SHOPIFY_API_KEY);
    authUrl.searchParams.set("scope", SHOPIFY_SCOPES);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("state", state);

    // Return the auth URL (frontend will redirect)
    const response = NextResponse.json({ authUrl: authUrl.toString(), state });

    // Set state cookie for reliability
    response.cookies.set("shopify_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Shopify auth error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Shopify authorization" },
      { status: 500 },
    );
  }
}
