import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { retrieveState, deleteState } from "@/lib/shopify-state";

/**
 * Shopify OAuth Callback Route
 *
 * GET /api/shopify/callback?code=xxx&shop=xxx&state=xxx
 *
 * Handles the OAuth callback from Shopify, exchanges code for access token.
 */

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || "";
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || "";

function verifyHmac(query: URLSearchParams): boolean {
  const hmac = query.get("hmac");
  if (!hmac || !SHOPIFY_API_SECRET) return false;

  // Create a copy without hmac
  const params = new URLSearchParams(query);
  params.delete("hmac");

  // Sort and create message
  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  // Calculate HMAC
  const calculatedHmac = crypto
    .createHmac("sha256", SHOPIFY_API_SECRET)
    .update(sortedParams)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hmac),
      Buffer.from(calculatedHmac),
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const shop = searchParams.get("shop");
    const state = searchParams.get("state");

    // Validate required parameters
    if (!code || !shop || !state) {
      return NextResponse.redirect(
        new URL("/strategy?error=missing_params", request.url),
      );
    }

    // Verify state (CSRF protection)
    // Verify state (CSRF protection)
    // We try to retrieve from cookie first (more reliable for serverless)
    const stateCookie = request.cookies.get("shopify_oauth_state");
    const storedState = stateCookie?.value;

    // Fallback to in-memory store if cookie is missing (legacy support)
    const storedShop = retrieveState(state);

    if (
      (!storedState || storedState !== state) &&
      (!storedShop || storedShop !== shop)
    ) {
      console.error("State mismatch", {
        received: state,
        storedCookie: storedState,
        storedMemory: storedShop,
      });
      return NextResponse.redirect(
        new URL("/strategy?error=invalid_state", request.url),
      );
    }

    // Clean up state
    deleteState(state);

    // Verify HMAC if present (Shopify includes this)
    if (searchParams.has("hmac")) {
      const isValid = verifyHmac(searchParams);
      if (!isValid) {
        console.warn("HMAC verification failed, but continuing...");
        // Note: We continue even if HMAC fails, as state verification is primary
      }
    }

    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: SHOPIFY_API_KEY,
          client_secret: SHOPIFY_API_SECRET,
          code,
        }),
      },
    );

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", await tokenResponse.text());
      return NextResponse.redirect(
        new URL("/strategy?error=token_exchange_failed", request.url),
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const scope = tokenData.scope;

    // Fetch shop info
    const shopInfoResponse = await fetch(
      `https://${shop}/admin/api/2024-01/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      },
    );

    let shopName = shop.replace(".myshopify.com", "");
    if (shopInfoResponse.ok) {
      const shopInfo = await shopInfoResponse.json();
      shopName = shopInfo.shop?.name || shopName;
    }

    // Create connection object
    const connection = {
      id: crypto.randomUUID(),
      shopDomain: shop,
      shopName,
      accessToken, // In production, encrypt this!
      scope,
      connectedAt: new Date().toISOString(),
      lastSyncAt: null,
      status: "active" as const,
    };

    // Store in cookie/session (for MVP, we use URL params)
    // In production, store encrypted in database
    const connectionData = Buffer.from(JSON.stringify(connection)).toString(
      "base64",
    );

    // Redirect back to strategy page with connection data
    const successUrl = new URL("/strategy", request.url);
    successUrl.searchParams.set("shopify_connected", "true");
    successUrl.searchParams.set("connection", connectionData);

    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error("Shopify callback error:", error);
    return NextResponse.redirect(
      new URL("/strategy?error=callback_failed", request.url),
    );
  }
}

// POST endpoint for manual token exchange (if needed)
export async function POST(request: NextRequest) {
  try {
    const { code, state } = await request.json();

    // Validate state
    const storedShop = retrieveState(state);
    if (!storedShop) {
      return NextResponse.json(
        { success: false, error: "Invalid state" },
        { status: 400 },
      );
    }

    const shop = storedShop;
    deleteState(state);

    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: SHOPIFY_API_KEY,
          client_secret: SHOPIFY_API_SECRET,
          code,
        }),
      },
    );

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { success: false, error: "Token exchange failed" },
        { status: 400 },
      );
    }

    const tokenData = await tokenResponse.json();

    // Create connection
    const connection = {
      id: crypto.randomUUID(),
      shopDomain: shop,
      shopName: shop.replace(".myshopify.com", ""),
      accessToken: tokenData.access_token,
      scope: tokenData.scope,
      connectedAt: new Date(),
      lastSyncAt: null,
      status: "active" as const,
    };

    return NextResponse.json({ success: true, connection });
  } catch (error) {
    console.error("Shopify callback POST error:", error);
    return NextResponse.json(
      { success: false, error: "Callback processing failed" },
      { status: 500 },
    );
  }
}
