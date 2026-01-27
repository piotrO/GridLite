import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as cheerio from 'cheerio';
import { g as getSession } from './browser.mjs';

async function extractWebsiteText(page) {
  const html = await page.content();
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe").remove();
  const noiseKeywords = ["cart", "search", "login", "account", "signin", "signup"];
  noiseKeywords.forEach((keyword) => {
    $(`[class*="${keyword}"], [id*="${keyword}"]`).remove();
  });
  $("a").filter((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    return ["cart", "search", "log in", "sign in", "sign up", "account", "menu"].includes(text);
  }).remove();
  const title = $("title").text().trim();
  const description = $('meta[name="description"]').attr("content") || $('meta[property="og:description"]').attr("content") || "";
  const siteName = $('meta[property="og:site_name"]').attr("content") || "";
  const heroes = [];
  $("h1, h2").each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    if (!text || text.length > 200) return;
    let context = "";
    const nextEl = $el.next();
    if (nextEl.is("p, h3, span") && nextEl.text().length < 300) {
      context = nextEl.text().trim();
    } else {
      const parentP = $el.parent().find("p").first();
      if (parentP.length && parentP.text().length < 300) {
        context = parentP.text().trim();
      }
    }
    heroes.push(`Header: ${text}${context ? `
Subtext: ${context}` : ""}`);
  });
  const storySentences = [];
  $("#about, .about, .about-us").find("p").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 50) storySentences.push(text);
  });
  if (storySentences.length === 0) {
    $("p").each((_, el) => {
      const $el = $(el);
      if ($el.closest('[class*="product"], [class*="item"], [class*="card"]').length > 0) return;
      const text = $el.text().trim();
      if (text.length > 150) storySentences.push(text);
    });
  }
  const products = [];
  const priceRegex = /[$€£]\s*\d+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?\s*[$€£]/;
  $("body").find("*").filter((_, el) => {
    return priceRegex.test($(el).text()) && $(el).children().length === 0;
  }).each((_, el) => {
    const $el = $(el);
    const price = $el.text().trim();
    const productCard = $el.closest('[class*="product"], [class*="card"], [class*="item"], div');
    if (productCard.length) {
      const titleEl = productCard.find("h3, h4, h5, strong, .title, .product-title").first();
      if (titleEl.length) {
        const title2 = titleEl.text().trim();
        if (title2 && price) {
          products.push(`Product: ${title2} | Price: ${price}`);
        }
      }
    }
  });
  const ctas = [];
  $("a, button").each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    const href = $el.attr("href");
    const role = $el.attr("role");
    const classes = ($el.attr("class") || "").toLowerCase();
    const isButton = el.tagName === "BUTTON" || role === "button" || classes.includes("btn") || classes.includes("button") || classes.includes("cta");
    if (isButton && text && text.length < 50) {
      ctas.push(`[${text}](${href || "#"})`);
    }
  });
  const socialLinks = [];
  const knownSocials = [
    "facebook.com",
    "twitter.com",
    "x.com",
    "instagram.com",
    "linkedin.com",
    "tiktok.com",
    "youtube.com",
    "pinterest.com"
  ];
  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const isSocial = knownSocials.some((s) => href.includes(s));
    if (isSocial) {
      socialLinks.push(href);
    }
  });
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
${[...new Set(products)].slice(0, 10).map((p) => `- ${p}`).join("\n")}
</PRODUCT_CATALOG>

<CTAS>
${[...new Set(ctas)].slice(0, 15).map((c) => `- ${c}`).join("\n")}
</CTAS>

<SOCIALS>
${[...new Set(socialLinks)].map((s) => `- ${s}`).join("\n")}
</SOCIALS>
`.trim();
  console.log(output);
  return output;
}

const textExtractorTool = createTool({
  id: "text-extractor",
  description: "Extracts clean text content from a webpage, removing navigation, scripts, and non-content elements",
  inputSchema: z.object({
    sessionId: z.string().describe("Active browser session ID")
  }),
  outputSchema: z.object({
    text: z.string().describe("Extracted text content (max 15,000 chars)"),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ context }) => {
    const session = getSession(context.sessionId);
    if (!session) {
      return {
        text: "",
        success: false,
        error: `No active session found for ID: ${context.sessionId}`
      };
    }
    try {
      const text = await extractWebsiteText(session.page);
      return { text, success: true };
    } catch (error) {
      return {
        text: "",
        success: false,
        error: error instanceof Error ? error.message : "Failed to extract text"
      };
    }
  }
});

export { extractWebsiteText as e, textExtractorTool as t };
