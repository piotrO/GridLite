import { NextRequest, NextResponse } from "next/server";
import { createBrowserSession, closeBrowser } from "../scan/lib/browser";
import { extractWebsiteText } from "../scan/lib/text-extractor";
import { parseUrl } from "../scan/lib/url-utils";
import { extractCampaignData, CampaignData } from "./lib/strategy-analyzer";
import {
  generateInitialStrategy,
  generateChatResponse,
  BrandProfileInput,
  StrategyDocument,
} from "./lib/strategist";

// Force Node.js runtime (Playwright doesn't work in Edge runtime)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StrategyRequest {
  // Brand profile (required)
  brandProfile: BrandProfileInput;

  // Option A: Pass raw website text from Phase 1 (Scan → Strategy flow)
  rawWebsiteText?: string;

  // Option B: URL for text-only rescan (Dashboard → Strategy flow)
  websiteUrl?: string;

  // For chat continuation
  mode?: "initial" | "chat";
  userMessage?: string;
  currentStrategy?: StrategyDocument;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body: StrategyRequest = await request.json();

    if (!body.brandProfile) {
      return NextResponse.json(
        { error: "brandProfile is required" },
        { status: 400 }
      );
    }

    // Handle chat mode (simple response, no streaming needed)
    if (body.mode === "chat" && body.userMessage && body.currentStrategy) {
      const response = await generateChatResponse(
        body.brandProfile,
        body.currentStrategy,
        body.userMessage,
        body.conversationHistory || []
      );

      return NextResponse.json({
        type: "chat",
        message: response.message,
        updatedStrategy: response.updatedStrategy,
      });
    }

    // Initial strategy generation (streaming)
    const stream = new ReadableStream({
      async start(controller) {
        let browser = null;

        const sendStatus = (step: string) => {
          const message = JSON.stringify({ type: "status", step }) + "\n";
          controller.enqueue(encoder.encode(message));
        };

        const sendError = (message: string) => {
          const errorMsg = JSON.stringify({ type: "error", message }) + "\n";
          controller.enqueue(encoder.encode(errorMsg));
        };

        try {
          let websiteText = body.rawWebsiteText;
          let campaignData: CampaignData;

          // If no raw text provided, do text-only rescan
          if (!websiteText && body.websiteUrl) {
            sendStatus("scanning_website");
            const normalizedUrl = parseUrl(body.websiteUrl);

            if (!normalizedUrl) {
              sendError("Invalid website URL");
              controller.close();
              return;
            }

            const session = await createBrowserSession(normalizedUrl);
            browser = session.browser;
            websiteText = await extractWebsiteText(session.page);
            await closeBrowser(browser);
            browser = null;
          }

          // If we still have no text, use brand info as fallback
          if (!websiteText) {
            websiteText = `${body.brandProfile.name}. ${
              body.brandProfile.brandSummary || ""
            } ${body.brandProfile.tagline || ""}`;
          }

          // Extract campaign data from website text
          sendStatus("analyzing_content");
          campaignData = await extractCampaignData(websiteText);

          // Generate strategy with Strategist persona
          sendStatus("generating_strategy");
          const result = await generateInitialStrategy(
            body.brandProfile,
            campaignData
          );

          // Send final result
          const completeMessage =
            JSON.stringify({
              type: "complete",
              data: {
                greeting: result.greeting,
                strategy: result.strategy,
                campaignData,
              },
            }) + "\n";
          controller.enqueue(encoder.encode(completeMessage));
          controller.close();
        } catch (error) {
          await closeBrowser(browser);
          sendError(
            error instanceof Error ? error.message : "Unknown error occurred"
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
      { status: 500 }
    );
  }
}
