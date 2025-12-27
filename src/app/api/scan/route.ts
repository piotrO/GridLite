import { NextRequest, NextResponse } from "next/server";
import { ScanResult } from "./lib/types";
import {
  createBrowserSession,
  captureScreenshot,
  closeBrowser,
} from "./lib/browser";
import { extractLogo } from "./lib/logo-extractor";
import { analyzeWithAI, isRateLimitError } from "./lib/ai-analyzer";
import { parseUrl } from "./lib/url-utils";
import { extractWebsiteText } from "./lib/text-extractor";

// Force Node.js runtime (Playwright doesn't work in Edge runtime)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = await request.json();
    const normalizedUrl = parseUrl(body.url);

    if (!normalizedUrl) {
      return NextResponse.json(
        { error: "Invalid URL provided" },
        { status: 400 }
      );
    }

    // Create a streaming response
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
          // STEP 1: Launch browser and navigate
          sendStatus("extracting_text");
          const session = await createBrowserSession(normalizedUrl);
          browser = session.browser;

          // STEP 2: Extract Logo
          sendStatus("extracting_logo");
          const logoUrl = await extractLogo(session.page, normalizedUrl);

          // STEP 3: Take screenshot for AI analysis
          sendStatus("analyzing_colors");
          const screenshotBuffer = await captureScreenshot(session.page);

          // STEP 3.5: Extract raw text for Strategy phase
          const rawWebsiteText = await extractWebsiteText(session.page);

          // Close browser before AI analysis
          await closeBrowser(browser);
          browser = null;

          // STEP 4: AI Analysis with Gemini
          sendStatus("analyzing_ai");
          const aiData = await analyzeWithAI(screenshotBuffer);

          // Ensure we have colors
          const finalColors =
            aiData.colors && aiData.colors.length > 0
              ? aiData.colors.slice(0, 4)
              : ["#4F46E5", "#F97316", "#10B981", "#8B5CF6"];

          // STEP 5: Send final result
          const finalData: ScanResult = {
            logo: logoUrl || "🚀",
            colors: finalColors,
            businessName: aiData.businessName,
            shortName: aiData.shortName,
            tagline: aiData.tagline || "Innovation meets excellence",
            voice: aiData.voice || ["Innovative", "Trustworthy", "Modern"],
            tone: aiData.tone || "Professional yet approachable",
            industry: aiData.industry,
            brandSummary: aiData.brandSummary,
            targetAudiences: aiData.targetAudiences,
            rawWebsiteText,
          };

          const completeMessage =
            JSON.stringify({ type: "complete", data: finalData }) + "\n";
          controller.enqueue(encoder.encode(completeMessage));
          controller.close();
        } catch (error) {
          await closeBrowser(browser);

          if (error instanceof Error && isRateLimitError(error)) {
            sendError(
              "AI is currently busy (Rate Limit). Please wait 30 seconds and try again."
            );
          } else {
            sendError(
              error instanceof Error ? error.message : "Unknown error occurred"
            );
          }
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
