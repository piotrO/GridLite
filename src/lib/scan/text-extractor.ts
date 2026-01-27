import { Page } from "playwright";
import * as cheerio from "cheerio";
import { log } from "console";

/**
 * Extracts clean text content from a webpage for strategy analysis.
 * Uses cheerio to perform semantic extraction of headers, CTAs, and metadata.
 */
export async function extractWebsiteText(page: Page): Promise<string> {
  // Get the full HTML content
  const html = await page.content();
  const $ = cheerio.load(html);

  // cleanup unwanted elements
  $("script, style, noscript, svg, iframe").remove();

  // Strict Noise Filtering: Remove elements with specific keywords in class/id
  const noiseKeywords = [
    "cart",
    "search",
    "login",
    "account",
    "signin",
    "signup",
  ];
  noiseKeywords.forEach((keyword) => {
    $(`[class*="${keyword}"], [id*="${keyword}"]`).remove();
  });

  // Also remove links with exact utility text
  $("a")
    .filter((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      return [
        "cart",
        "search",
        "log in",
        "sign in",
        "sign up",
        "account",
        "menu",
      ].includes(text);
    })
    .remove();

  // 1. Metadata
  const title = $("title").text().trim();
  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";
  const siteName = $('meta[property="og:site_name"]').attr("content") || "";

  // 2. Hero Headers (H1, H2) with Context
  const heroes: string[] = [];
  $("h1, h2").each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    if (!text || text.length > 200) return;

    let context = "";
    // Check next sibling for context
    const nextEl = $el.next();
    if (nextEl.is("p, h3, span") && nextEl.text().length < 300) {
      context = nextEl.text().trim();
    }
    // If no sibling context, check parent's other children if closely related
    else {
      const parentP = $el.parent().find("p").first();
      if (parentP.length && parentP.text().length < 300) {
        context = parentP.text().trim();
      }
    }

    heroes.push(`Header: ${text}${context ? `\nSubtext: ${context}` : ""}`);
  });

  // 3. Brand Story (Narrative Isolation)
  // Look for "About" sections or long paragraphs not in product cards
  const storySentences: string[] = [];

  // Prioritize #about or .about sections
  $("#about, .about, .about-us")
    .find("p")
    .each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 50) storySentences.push(text);
    });

  // If no explicit about section, look for long paragraphs in main content
  if (storySentences.length === 0) {
    $("p").each((_, el) => {
      const $el = $(el);
      // Avoid product cards
      if (
        $el.closest('[class*="product"], [class*="item"], [class*="card"]')
          .length > 0
      )
        return;

      const text = $el.text().trim();
      if (text.length > 150) storySentences.push(text);
    });
  }

  // 4. Product Catalog (Commercial Isolation)
  const products: string[] = [];
  // Find price patterns
  const priceRegex = /[$€£]\s*\d+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?\s*[$€£]/;

  $("body")
    .find("*")
    .filter((_, el) => {
      return priceRegex.test($(el).text()) && $(el).children().length === 0; // Leaf nodes with price
    })
    .each((_, el) => {
      const $el = $(el);
      const price = $el.text().trim();

      // Traverse up to find a container that might have a title
      const productCard = $el.closest(
        '[class*="product"], [class*="card"], [class*="item"], div',
      );
      if (productCard.length) {
        // Find a title within this card
        const titleEl = productCard
          .find("h3, h4, h5, strong, .title, .product-title")
          .first();
        if (titleEl.length) {
          const title = titleEl.text().trim();
          if (title && price) {
            products.push(`Product: ${title} | Price: ${price}`);
          }
        }
      }
    });

  // 5. Calls to Action (Buttons/Links)
  const ctas: string[] = [];
  $("a, button").each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    const href = $el.attr("href");
    const role = $el.attr("role");
    const classes = ($el.attr("class") || "").toLowerCase();

    // Heuristics for buttons
    const isButton =
      el.tagName === "BUTTON" ||
      role === "button" ||
      classes.includes("btn") ||
      classes.includes("button") ||
      classes.includes("cta");

    if (isButton && text && text.length < 50) {
      ctas.push(`[${text}](${href || "#"})`);
    }
  });

  // 6. Social Profiles
  const socialLinks: string[] = [];
  const knownSocials = [
    "facebook.com",
    "twitter.com",
    "x.com",
    "instagram.com",
    "linkedin.com",
    "tiktok.com",
    "youtube.com",
    "pinterest.com",
  ];

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const isSocial = knownSocials.some((s) => href.includes(s));
    if (isSocial) {
      socialLinks.push(href);
    }
  });

  // Format the output
  const output = `
<METADATA>
Title: ${title}
Description: ${description}
Site Name: ${siteName}
</METADATA>

<HERO>
${heroes.slice(0, 10).join("\n\n")}
</HERO>

<BRAND_STORY>
${storySentences.slice(0, 5).join("\n\n")}
</BRAND_STORY>

<PRODUCT_CATALOG>
${[...new Set(products)]
  .slice(0, 10)
  .map((p) => `- ${p}`)
  .join("\n")}
</PRODUCT_CATALOG>

<CTAS>
${[...new Set(ctas)]
  .slice(0, 15)
  .map((c) => `- ${c}`)
  .join("\n")}
</CTAS>

<SOCIALS>
${[...new Set(socialLinks)].map((s) => `- ${s}`).join("\n")}
</SOCIALS>
`.trim();
  return output;
}

/**
 * Lightweight text-only scrape for Dashboard → Strategy flow.
 * Reuses browser session utilities but skips screenshot.
 */
export async function scrapeTextOnly(
  page: Page,
): Promise<{ text: string; title: string }> {
  const [text, title] = await Promise.all([
    extractWebsiteText(page),
    page.title(),
  ]);

  return { text, title };
}
