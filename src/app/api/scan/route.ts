import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { PlaywrightBlocker } from "@ghostery/adblocker-playwright";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Force Node.js runtime (Playwright doesn't work in Edge runtime)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ScanResult {
  logo: string;
  colors: string[];
  tagline: string;
  voice: string[];
  tone: string;
  logoDescription?: string;
  brandSummary?: string;
  visualKeyword?: string;
  headline?: string;
  sub?: string;
  cta?: string;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = await request.json();
    const { url } = body;

    // Validate URL
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Invalid URL provided" },
        { status: 400 }
      );
    }

    // Normalize URL
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

    // Validate URL format
    try {
      new URL(normalizedUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        let browser = null;

        try {
          // Helper function to send status updates
          const sendStatus = (step: string) => {
            const message = JSON.stringify({ type: "status", step }) + "\n";
            controller.enqueue(encoder.encode(message));
          };

          // STEP 1: Launch browser and navigate
          sendStatus("extracting_text");

          const userAgent =
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

          browser = await chromium.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
          });

          const context = await browser.newContext({
            userAgent,
            viewport: { width: 1920, height: 1080 },
            permissions: ["geolocation"],
            ignoreHTTPSErrors: true,
            javaScriptEnabled: true,
            locale: "en-US",
          });

          const page = await context.newPage();

          // Setup Ghostery adblocker - blocks trackers and cookie popups
          const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking();
          await blocker.enableBlockingInPage(page);

          // Navigate to the URL with domcontentloaded for faster results
          await page.goto(normalizedUrl, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          });

          // Wait for dynamic content and hydration
          await page.waitForTimeout(2000);

          // STEP 2: Extract Logo (enhanced version from scan route)
          sendStatus("extracting_logo");

          let logoUrl: string | null = null;

          // Try og:image first
          const ogImage = await page
            .$eval('meta[property="og:image"]', (el) =>
              el.getAttribute("content")
            )
            .catch(() => null);

          if (ogImage) {
            logoUrl = ogImage.startsWith("http")
              ? ogImage
              : new URL(ogImage, normalizedUrl).href;
          }

          // If no og:image, try favicon
          if (!logoUrl) {
            const favicon = await page
              .$eval('link[rel="icon"], link[rel="shortcut icon"]', (el) =>
                el.getAttribute("href")
              )
              .catch(() => null);

            if (favicon) {
              logoUrl = favicon.startsWith("http")
                ? favicon
                : new URL(favicon, normalizedUrl).href;
            }
          }

          // Enhanced: If still no logo, try finding img with "logo" in class or alt
          if (!logoUrl) {
            const logoImg = await page.evaluate(() => {
              const imgs = Array.from(document.querySelectorAll("img"));
              const logoImage = imgs.find(
                (img) =>
                  img.className.toLowerCase().includes("logo") ||
                  img.alt?.toLowerCase().includes("logo")
              );
              return logoImage?.src || "";
            });
            logoUrl = logoImg || null;
          }

          // STEP 3: Take screenshot for AI analysis
          sendStatus("analyzing_colors");

          const screenshotBuffer = await page.screenshot({
            type: "png",
            fullPage: false, // Top viewport only for better analysis
          });

          // Close browser before AI analysis
          await browser.close();
          browser = null;

          // STEP 4: AI Analysis with Gemini using screenshot
          sendStatus("analyzing_ai");

          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            throw new Error(
              "GEMINI_API_KEY environment variable is not set. Please add it to your .env.local file."
            );
          }

          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
          });

          // Convert screenshot to base64
          const base64Screenshot = screenshotBuffer.toString("base64");

          // Enhanced prompt combining both approaches
          const prompt = `
Role: You are an award-winning Creative Director and Direct-Response Copywriter.
Task: Analyze this website screenshot to extract brand information.

CRITICAL SAFETY INSTRUCTION:
If the screenshot contains text like "Access Denied", "Cloudflare", "Verify you are human", "Captcha", or "403 Forbidden":
1. IGNORE the screenshot visual content completely.
2. INSTEAD, infer the brand from the URL or create a generic, high-quality response for a "Premium Tech Brand".
3. DO NOT write content about "Verifying Humanity" or "Cookies".

Extract the following and return ONLY raw JSON:

1. "colors": The 3 dominant brand hex colors from the website.
2. "tagline": A concise brand tagline (max 10 words) based on the website content.
3. "voice": Array of 3 adjectives describing the brand voice.
4. "tone": Professional description of brand tone (max 50 words).
5. "logoDescription": Short description of logo style.
6. "brandSummary": What does this company sell/do? (1 sentence).
7. "visualKeyword": A vivid AI image prompt (3-5 words) for generating a background matching the brand's vibe (include mood/lighting/style).
8. "headline": A punchy, benefit-driven headline (max 6 words) - focus on user benefit, avoid generic greetings.
9. "sub": A supporting sentence (max 8 words) that clarifies the offer or adds social proof.
10. "cta": A high-conversion Call to Action button text (use strong verbs like "Start Free", "Get 50% Off").

Return only raw JSON in this exact format: 
{ "colors": ["#...", "#...", "#..."], "tagline": "...", "voice": ["...", "...", "..."], "tone": "...", "logoDescription": "...", "brandSummary": "...", "visualKeyword": "...", "headline": "...", "sub": "...", "cta": "..." }
`;

          // Send to Gemini with image
          const result = await model.generateContent([
            {
              inlineData: {
                mimeType: "image/png",
                data: base64Screenshot,
              },
            },
            prompt,
          ]);

          const responseText = result.response.text();

          // Parse JSON from response
          let aiData: {
            colors: string[];
            tagline: string;
            voice: string[];
            tone: string;
            logoDescription?: string;
            brandSummary?: string;
            visualKeyword?: string;
            headline?: string;
            sub?: string;
            cta?: string;
          };

          try {
            // Remove markdown code blocks if present
            const jsonMatch = responseText.match(
              /```(?:json)?\s*([\s\S]*?)```/
            );
            const jsonString = jsonMatch
              ? jsonMatch[1].trim()
              : responseText.trim();
            aiData = JSON.parse(jsonString);
          } catch {
            // Fallback if AI doesn't return valid JSON
            aiData = {
              colors: ["#4F46E5", "#F97316", "#10B981"],
              tagline: "Building the future, one pixel at a time",
              voice: ["Innovative", "Trustworthy", "Modern"],
              tone: "Professional yet approachable",
            };
          }

          // Ensure we have colors
          const finalColors =
            aiData.colors && aiData.colors.length > 0
              ? aiData.colors.slice(0, 4)
              : ["#4F46E5", "#F97316", "#10B981", "#8B5CF6"];

          // STEP 5: Send final result
          const finalData: ScanResult = {
            logo: logoUrl || "🚀",
            colors: finalColors,
            tagline: aiData.tagline || "Innovation meets excellence",
            voice: aiData.voice || ["Innovative", "Trustworthy", "Modern"],
            tone: aiData.tone || "Professional yet approachable",
            logoDescription: aiData.logoDescription,
            brandSummary: aiData.brandSummary,
            visualKeyword: aiData.visualKeyword,
            headline: aiData.headline,
            sub: aiData.sub,
            cta: aiData.cta,
          };

          const completeMessage =
            JSON.stringify({ type: "complete", data: finalData }) + "\n";
          controller.enqueue(encoder.encode(completeMessage));
          controller.close();
        } catch (error) {
          // Clean up browser if still open
          if (browser) {
            try {
              await browser.close();
            } catch {}
          }

          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";

          // Check for rate limit errors
          if (
            errorMessage.includes("429") ||
            errorMessage.toLowerCase().includes("too many requests")
          ) {
            const errorMsg =
              JSON.stringify({
                type: "error",
                message:
                  "AI is currently busy (Rate Limit). Please wait 30 seconds and try again.",
              }) + "\n";
            controller.enqueue(encoder.encode(errorMsg));
          } else {
            const errorMsg =
              JSON.stringify({ type: "error", message: errorMessage }) + "\n";
            controller.enqueue(encoder.encode(errorMsg));
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
