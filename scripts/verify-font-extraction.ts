import { chromium } from "playwright";
import { extractBrandFonts } from "../src/lib/scan/font-extractor";

async function verifyFontExtraction() {
  console.log("Starting verification...");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const url = "https://www.pipsnacks.com/"; // User test case
    console.log(`Navigating to ${url}...`);

    // Debug: Log all responses to see what fonts/CSS are actually loading
    page.on("response", async (response) => {
      const url = response.url();
      const contentType = await response
        .headerValue("content-type")
        .catch(() => "");
      if (
        url.includes("typekit") ||
        contentType?.includes("font") ||
        url.match(/\.(woff2?|ttf|otf|css)/i)
      ) {
        console.log(`[Network] ${response.status()} ${contentType} ${url}`);
      }
    });

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    } catch (e) {
      console.log("Navigation timeout, proceeding anyway...");
    }

    console.log("Running extractBrandFonts...");
    const result = await extractBrandFonts(page);

    console.log(
      "Extraction Result:",
      JSON.stringify(
        {
          primaryFontFamily: result.primaryFontFamily,
          fontFormat: result.fontFormat,
          isSystemFont: result.isSystemFont,
          hasFile: !!result.fontFileBase64,
        },
        null,
        2,
      ),
    );

    if (result.primaryFontFamily) {
      console.log("✅ verification passed: Font family detected");
    } else {
      console.error("❌ verification failed: No font family detected");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ verification failed:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyFontExtraction();
