import { NextResponse } from "next/server";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { PlaywrightBlocker } from "@ghostery/adblocker-playwright";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  let browser = null;

  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Normalize URL - add https:// if no protocol provided
    const targetUrl =
      url.startsWith("http://") || url.startsWith("https://")
        ? url
        : `https://${url}`;

    // Validate URL format
    try {
      new URL(targetUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Launch headless browser with stealth
    chromium.use(stealth());

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

    // Setup adblocker on the page
    const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking();
    await blocker.enableBlockingInPage(page);

    // Use domcontentloaded for faster results, and increase timeout to 60s
    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Wait a brief moment for dynamic content and hydration
    await page.waitForTimeout(2000);

    const screenshotBuffer = await page.screenshot({
      type: "png",
      fullPage: false, // Top viewport only
    });

    // Extract logo URL from meta tags or favicon
    let logoUrl: string | null = null;

    // Try og:image first
    const ogImage = await page
      .$eval('meta[property="og:image"]', (el) => el.getAttribute("content"))
      .catch(() => null);

    if (ogImage) {
      // Handle relative URLs
      logoUrl = ogImage.startsWith("http")
        ? ogImage
        : new URL(ogImage, targetUrl).href;
    } else {
      // Fallback to favicon
      const favicon = await page
        .$eval('link[rel="icon"], link[rel="shortcut icon"]', (el) =>
          el.getAttribute("href")
        )
        .catch(() => null);

      if (favicon) {
        logoUrl = favicon.startsWith("http")
          ? favicon
          : new URL(favicon, targetUrl).href;
      }
    }

    await browser.close();
    browser = null;

    // Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Convert screenshot to base64
    const base64Screenshot = screenshotBuffer.toString("base64");

    // Create prompt for brand analysis
    const prompt = `
Role: You are an award-winning Creative Director and Direct-Response Copywriter.
Task: Analyze this website screenshot to create a high-converting HTML5 banner ad.

CRITICAL SAFETY INSTRUCTION:
If the screenshot contains text like "Access Denied", "Cloudflare", "Verify you are human", "Captcha", or "403 Forbidden":
1. IGNORE the screenshot visual content completely.
2. INSTEAD, infer the brand from the URL or create a generic, high-quality ad for a "Premium Tech Brand".
3. DO NOT write an ad about "Verifying Humanity" or "Cookies".

Extract the following and return ONLY raw JSON:

1. "colors": The 3 dominant brand hex colors.
2. "logoDescription": Short description of logo style.
3. "brandSummary": What does this company sell? (1 sentence).

4. "visualKeyword": Create a vivid, artistic AI image prompt (3-5 words) to generate a background. 
   - DO NOT just list a noun (e.g., "computer").
   - DO include mood/lighting/style (e.g., "modern desk setup, cinematic lighting, cyberpunk, 4k").
   - It must match the brand's vibe.

5. "headline": Write a punchy, benefit-driven headline (max 6 words).
   - FOCUS: The result/feeling for the user.
   - BANNED: "Welcome to...", "The best...", or generic greetings.
   - TONE: Urgent, exciting, or intriguing.

6. "sub": A supporting sentence (max 8 words) that clarifies the offer or adds social proof.

7. "cta": A high-conversion Call to Action button. 
   - USE: Strong verbs (e.g., "Start Free", "Get 50% Off", "Book Demo").
   - AVOID: "Submit", "Click Here".

Return only raw JSON in this exact format: 
{ "colors": ["#...", "#...", "#..."], "logoDescription": "...", "brandSummary": "...", "visualKeyword": "...", "headline": "...", "sub": "...", "cta": "..." }
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

    // Parse JSON from response (handle potential markdown code blocks)
    let parsedResponse;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonString = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
      parsedResponse = JSON.parse(jsonString);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response", rawResponse: responseText },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...parsedResponse,
      logoUrl,
      websiteUrl: targetUrl,
      screenshotUrl: `data:image/png;base64,${base64Screenshot}`,
    });
  } catch (error) {
    // Clean up browser if still open
    if (browser) {
      await browser.close();
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error analyzing website:", errorMessage);
    // Check for rate limit errors
    if (
      errorMessage.includes("429") ||
      errorMessage.toLowerCase().includes("too many requests")
    ) {
      return NextResponse.json(
        {
          error:
            "AI is currently busy (Rate Limit). Please wait 30 seconds and try again.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to analyze website. Please check the URL." },
      { status: 500 }
    );
  }
}
