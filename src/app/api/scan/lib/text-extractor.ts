import { Page } from "playwright";

/**
 * Extracts clean text content from a webpage for strategy analysis.
 * Removes non-content elements like scripts, styles, navigation, and footers.
 * Caps output at 15,000 characters to stay within API limits.
 */
export async function extractWebsiteText(page: Page): Promise<string> {
  const rawText = await page.evaluate(() => {
    // Clone the body to avoid modifying the actual page
    const clone = document.body.cloneNode(true) as HTMLElement;

    // Remove non-content elements
    const selectorsToRemove = [
      "script",
      "style",
      "noscript",
      "svg",
      "iframe",
      "nav",
      "footer",
      "header",
      "[role='navigation']",
      "[role='banner']",
      "[role='contentinfo']",
      ".cookie-banner",
      ".cookie-consent",
      "#cookie-banner",
      ".nav",
      ".navigation",
      ".footer",
      ".header",
      ".sidebar",
      ".advertisement",
      ".ad",
      ".social-share",
    ];

    selectorsToRemove.forEach((selector) => {
      clone.querySelectorAll(selector).forEach((el) => el.remove());
    });

    // Get text content and clean up whitespace
    const text = clone.innerText || clone.textContent || "";

    // Normalize whitespace: collapse multiple newlines/spaces
    return text
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n")
      .trim();
  });

  // Cap at 15,000 characters to stay within reasonable API limits
  const MAX_LENGTH = 15000;
  if (rawText.length > MAX_LENGTH) {
    return rawText.slice(0, MAX_LENGTH) + "...";
  }

  return rawText;
}

/**
 * Lightweight text-only scrape for Dashboard → Strategy flow.
 * Reuses browser session utilities but skips screenshot.
 */
export async function scrapeTextOnly(
  page: Page
): Promise<{ text: string; title: string }> {
  const [text, title] = await Promise.all([
    extractWebsiteText(page),
    page.title(),
  ]);

  return { text, title };
}
