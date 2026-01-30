import { Mastra } from '@mastra/core';
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { chromium } from 'playwright';
import { PlaywrightBlocker } from '@ghostery/adblocker-playwright';
import sharp from 'sharp';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import convert from 'color-convert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
async function createBrowserSession(url) {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-features=IsolateOrigins,site-per-process"
    ]
  });
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1920, height: 1080 },
    permissions: ["geolocation"],
    ignoreHTTPSErrors: true,
    javaScriptEnabled: true,
    locale: "en-US",
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"macOS"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1"
    }
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
  const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking();
  await blocker.enableBlockingInPage(page);
  await navigateWithRetry(page, url, browser);
  await page.waitForTimeout(2e3);
  return { browser, page };
}
async function navigateWithRetry(page, url, browser) {
  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 3e4
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("ERR_HTTP2") || errorMessage.includes("ERR_CONNECTION")) {
      const urlObj = new URL(url);
      const altUrl = urlObj.hostname.startsWith("www.") ? url.replace("www.", "") : url.replace("://", "://www.");
      try {
        await page.goto(altUrl, {
          waitUntil: "domcontentloaded",
          timeout: 3e4
        });
        return;
      } catch {
        await page.goto(url, {
          waitUntil: "commit",
          timeout: 3e4
        });
      }
    } else {
      throw error;
    }
  }
}
async function captureScreenshot(page) {
  await page.evaluate(() => {
    document.body.style.zoom = "90%";
  });
  await page.waitForTimeout(500);
  const buffer = await page.screenshot({
    type: "png",
    fullPage: true
    // Capture full page
  });
  return sharp(buffer).resize({ width: 1280, withoutEnlargement: true }).toBuffer();
}
async function closeBrowser(browser) {
  if (browser) {
    try {
      await browser.close();
    } catch {
    }
  }
}

const activeSessions = /* @__PURE__ */ new Map();
const browserSessionTool = createTool({
  id: "browser-session",
  description: "Launches a headless browser and navigates to a URL. Returns a session ID for use by other tools.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to navigate to")
  }),
  outputSchema: z.object({
    sessionId: z.string().describe("Unique session identifier"),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ context }) => {
    try {
      const session = await createBrowserSession(context.url);
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      activeSessions.set(sessionId, session);
      return { sessionId, success: true };
    } catch (error) {
      return {
        sessionId: "",
        success: false,
        error: error instanceof Error ? error.message : "Failed to create browser session"
      };
    }
  }
});
const closeBrowserTool = createTool({
  id: "close-browser",
  description: "Closes a browser session and releases resources",
  inputSchema: z.object({
    sessionId: z.string().describe("The session ID to close")
  }),
  outputSchema: z.object({
    success: z.boolean()
  }),
  execute: async ({ context }) => {
    const session = activeSessions.get(context.sessionId);
    if (session) {
      await closeBrowser(session.browser);
      activeSessions.delete(context.sessionId);
    }
    return { success: true };
  }
});
function getSession(sessionId) {
  return activeSessions.get(sessionId);
}
async function cleanupSession$1(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session) {
    await closeBrowser(session.browser);
    activeSessions.delete(sessionId);
  }
}

function resolveUrl(url, baseUrl) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  try {
    return new URL(url, baseUrl).href;
  } catch (e) {
    return "";
  }
}
async function extractLogo(page, baseUrl) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1e3);
  const bestLogo = await page.evaluate((currentBaseUrl) => {
    const candidates = [];
    const origin = new URL(currentBaseUrl).origin;
    const svgToDataUrl = (svg) => {
      const svgString = new XMLSerializer().serializeToString(svg);
      return `data:image/svg+xml,${encodeURIComponent(svgString)}`;
    };
    const elements = Array.from(document.querySelectorAll("img, svg"));
    elements.forEach((el) => {
      let score = 0;
      const reasons = [];
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || el.style.display === "none" || el.style.visibility === "hidden")
        return;
      if (rect.width < 20 || rect.height < 20) return;
      if (rect.width > 600 || rect.height > 400) return;
      const header = el.closest(
        'header, nav, [role="banner"], .header, #header'
      );
      const footer = el.closest("footer, .footer, #footer");
      if (header) {
        score += 50;
        reasons.push("in-header");
      }
      if (footer) {
        score -= 30;
        reasons.push("in-footer");
      }
      const parentLink = el.closest("a");
      if (parentLink) {
        const href = parentLink.href;
        const linkUrl = href.replace(/\/$/, "");
        const rootUrl = origin.replace(/\/$/, "");
        if (linkUrl === rootUrl || linkUrl === currentBaseUrl.replace(/\/$/, "")) {
          score += 60;
          reasons.push("links-to-home");
        }
      }
      const attributes = [
        el.id,
        el.className.toString(),
        el.getAttribute("alt"),
        el.src
      ].join(" ").toLowerCase();
      if (attributes.includes("logo")) {
        score += 20;
        reasons.push("keyword-logo");
      }
      if (attributes.includes("brand")) {
        score += 10;
        reasons.push("keyword-brand");
      }
      if (attributes.includes("icon")) {
        score -= 10;
        reasons.push("keyword-icon");
      }
      if (rect.top < 150) {
        score += 20;
        reasons.push("top-of-page");
      }
      if (rect.left < 50 || rect.left + rect.width / 2 < window.innerWidth / 2 + 200) {
        score += 10;
        reasons.push("position-left-center");
      }
      let src = "";
      if (el.tagName.toLowerCase() === "img") {
        src = el.currentSrc || el.src;
      } else if (el.tagName.toLowerCase() === "svg") {
        src = svgToDataUrl(el);
      }
      if (src && src !== window.location.href) {
        candidates.push({ src, score, reason: reasons });
      }
    });
    candidates.sort((a, b) => b.score - a.score);
    return candidates.length > 0 ? candidates[0] : null;
  }, baseUrl);
  if (bestLogo && bestLogo.score >= 50) {
    return resolveUrl(bestLogo.src, baseUrl);
  }
  const ogImage = await page.$eval(
    'meta[property="og:image"], meta[name="og:image"]',
    (el) => el.getAttribute("content")
  ).catch(() => null);
  if (ogImage) {
    return resolveUrl(ogImage, baseUrl);
  }
  if (bestLogo) {
    return resolveUrl(bestLogo.src, baseUrl);
  }
  const touchIcon = await page.$eval('link[rel="apple-touch-icon"]', (el) => el.getAttribute("href")).catch(() => null);
  if (touchIcon) {
    return resolveUrl(touchIcon, baseUrl);
  }
  return null;
}

const logoExtractorTool = createTool({
  id: "logo-extractor",
  description: "Extracts the brand logo URL from a webpage using the active browser session",
  inputSchema: z.object({
    sessionId: z.string().describe("Active browser session ID"),
    baseUrl: z.string().url().describe("Base URL for resolving relative paths")
  }),
  outputSchema: z.object({
    logoUrl: z.string().nullable().describe("Extracted logo URL or null if not found"),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ context }) => {
    const session = getSession(context.sessionId);
    if (!session) {
      return {
        logoUrl: null,
        success: false,
        error: `No active session found for ID: ${context.sessionId}`
      };
    }
    try {
      const logoUrl = await extractLogo(session.page, context.baseUrl);
      return { logoUrl, success: true };
    } catch (error) {
      return {
        logoUrl: null,
        success: false,
        error: error instanceof Error ? error.message : "Failed to extract logo"
      };
    }
  }
});

const screenshotTool = createTool({
  id: "screenshot-capture",
  description: "Captures a screenshot of the current browser viewport for AI analysis",
  inputSchema: z.object({
    sessionId: z.string().describe("Active browser session ID")
  }),
  outputSchema: z.object({
    screenshotBase64: z.string().describe("Base64-encoded PNG screenshot"),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ context }) => {
    const session = getSession(context.sessionId);
    if (!session) {
      return {
        screenshotBase64: "",
        success: false,
        error: `No active session found for ID: ${context.sessionId}`
      };
    }
    try {
      const buffer = await captureScreenshot(session.page);
      return {
        screenshotBase64: buffer.toString("base64"),
        success: true
      };
    } catch (error) {
      return {
        screenshotBase64: "",
        success: false,
        error: error instanceof Error ? error.message : "Failed to capture screenshot"
      };
    }
  }
});

async function extractWebsiteText(page) {
  const html = await page.content();
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe").remove();
  const noiseKeywords = [
    "cart",
    "search",
    "login",
    "account",
    "signin",
    "signup"
  ];
  noiseKeywords.forEach((keyword) => {
    $(`[class*="${keyword}"], [id*="${keyword}"]`).remove();
  });
  $("a").filter((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    return [
      "cart",
      "search",
      "log in",
      "sign in",
      "sign up",
      "account",
      "menu"
    ].includes(text);
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
      if ($el.closest('[class*="product"], [class*="item"], [class*="card"]').length > 0)
        return;
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
    const productCard = $el.closest(
      '[class*="product"], [class*="card"], [class*="item"], div'
    );
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
  return output;
}
async function scrapeTextOnly(page) {
  const [text, title] = await Promise.all([
    extractWebsiteText(page),
    page.title()
  ]);
  return { text, title };
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

const AI_PROMPT = `
You are the "Brand Scout," an expert in linguistic analysis, brand psychology, and design forensics.

Your goal is to analyze the provided website screenshot and scraped text to construct a "Brand Voice Guideline" JSON object.

### PHASE 1: Info 
1. "industry": The industry/sector this company operates in (e.g., "Technology & Software", "E-commerce", "Healthcare", "Finance", "Marketing").
2. "brandSummary": What does this company sell/do? (1-2 sentences, max 30 words).
3. "targetAudiences": Array of up to 3 target audiences, each with "name" (short label, 1-3 words) and "description" (brief context, max 10 words).
4. "tagline": Company tagline - 2-3 words. If not present, return "null".

### PHASE 2: Aaker's Personality Scoring (1-5 Scale)
Analyze the visual mood and textual tone against Jennifer Aaker's 5 Dimensions:
1. **Sincerity**: (Down-to-earth, honest, wholesome). Look for stories about family, origins, or "clean" ingredients.
2. **Excitement**: (Daring, spirited, imaginative). Look for high contrast colors, exclamation points, and trend-focused language.
3. **Competence**: (Reliable, intelligent, successful). Look for certifications, technical specs, and data claims.
4. **Sophistication**: (Upper-class, charming). Look for minimalism, serif fonts, and luxury cues.
5. **Ruggedness**: (Outdoorsy, tough). Look for nature imagery, earth tones, and durability claims.

### PHASE 3: Jungian Archetype Analysis
Identify the **primary** and **secondary** Jungian Archetype based on the brand's "Why":
- **The Outlaw**: Revolution, liberation, breaking rules (e.g., Harley Davidson, Liquid Death).
- **The Magician**: Transformation, vision, making dreams come true (e.g., Disney, Dyson).
- **The Hero**: Mastery, courage, proving worth (e.g., Nike, FedEx).
- **The Lover**: Intimacy, passion, elegance (e.g., Chanel, Godiva).
- **The Jester**: Joy, playfulness, living in the moment (e.g., Old Spice, M&Ms).
- **The Everyman**: Belonging, realism, reliability (e.g., IKEA, Target).
- **The Caregiver**: Protection, generosity, nurturing (e.g., Johnson & Johnson, Volvo).
- **The Ruler**: Control, leadership, exclusivity (e.g., Rolex, Mercedes-Benz).
- **The Creator**: Innovation, self-expression, vision (e.g., Apple, Adobe).
- **The Innocent**: Safety, optimism, purity (e.g., Dove, Aveeno).
- **The Sage**: Knowledge, truth, analysis (e.g., Google, TED).
- **The Explorer**: Freedom, discovery, self-sufficiency (e.g., Patagonia, North Face). 

### PHASE 4:  Guidelines Generation (The Playbook)
1. **Formality Index**: Analyze the etymology of the vocabulary in the "Main Content" and "Hero" sections.
   - **High Formality**: Dominance of Latinate/Romance roots (e.g., "accumulate," "residence," "facilitate").
   - **Low Formality**: Dominance of Germanic/Anglo-Saxon roots (e.g., "gather," "house," "help").
2. **Urgency & Aggression**: Count imperative verbs (e.g., "Buy," "Get," "Act," "Snag").
   - **High Urgency**: Frequent, loud commands.
   - **Low Urgency**: Declarative/descriptive statements or soft invitations ("Discover," "Learn").

3. Based on the Archetype and Personality scores, generate:
    - **Dos**: 4-5 specific copywriting instructions (e.g., "Use puns," "Focus on technical specs").
    - **Donts**: 4-5 specific avoidances (e.g., "Don't use slang," "Don't use passive voice").

CRITICAL SAFETY INSTRUCTION:
If the screenshot contains text like "Access Denied", "Cloudflare", "Verify you are human", "Captcha", or "403 Forbidden":
1. IGNORE the screenshot visual content completely.
2. INSTEAD, infer the brand from the URL or create a generic, high-quality response for a "Premium Tech Brand".
3. DO NOT write content about "Verifying Humanity" or "Cookies".

### OUTPUT FORMAT
Return ONLY a valid JSON object. Do not include markdown code blocks.
{
  "brand_profile": {
    "name": "string",
    "industry": "string",
    "brandSummary": "string",
    "targetAudiences": [
      { "name": "string", "description": "string" }
    ],
    "archetype": {
      "primary": "string",
      "secondary": "string",
      "brand_motivation": "string (Why this archetype fits)"
    },
    "personality_dimensions": {
      "sincerity": number,
      "excitement": number,
      "competence": number,
      "sophistication": number,
      "ruggedness": number
    },
    "linguistic_mechanics": {
      "formality_index": "High" | "Low",
      "urgency_level": "High" | "Low",
      "etymology_bias": "Latinate" | "Germanic"
    },
    "guidelines": {
      "voice_label": "string (a short label for the brand's voice)",
      "voice_instructions": "string (specific actionable advice for a copywriter)",
      "dos": ["string", "string"],
      "donts": ["string", "string"]
    }
  }
}
`;
const DEFAULT_AI_RESULT = {
  brand_profile: {
    name: "Premium Tech Company",
    industry: "Technology & Software",
    tagline: "Our tagline",
    brandSummary: "A leading provider of innovative hardware and software solutions for modern teams.",
    palette: {
      primary: "#4F46E5",
      secondary: "#10B981",
      accent: "#F97316"
    },
    targetAudiences: [
      {
        name: "Creative Professionals",
        description: "Designers and developers seeking high-end tools."
      },
      {
        name: "Enterprise IT",
        description: "Decision makers in large-scale tech organizations."
      }
    ],
    archetype: {
      primary: "The Creator",
      secondary: "The Sage",
      brand_motivation: "Focuses on enabling professional creativity through technical mastery."
    },
    personality_dimensions: {
      sincerity: 3,
      excitement: 4,
      competence: 5,
      sophistication: 4,
      ruggedness: 2
    },
    linguistic_mechanics: {
      formality_index: "High",
      urgency_level: "Low",
      etymology_bias: "Latinate"
    },
    guidelines: {
      voice_label: "Modern Professional",
      voice_instructions: "Write with confident clarity. Use active voice and direct statements. Balance professionalism with approachability. Avoid jargon unless speaking to technical audiences.",
      dos: [
        "Use short, punchy sentence fragments",
        "Highlight 'family farm' and 'heirloom' origins",
        "Use contractions to sound conversational"
      ],
      donts: []
    }
  }
};
async function analyzeWithAI(screenshotBuffer) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not set. Please add it to your .env.local file."
    );
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
  });
  const base64Screenshot = screenshotBuffer.toString("base64");
  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "image/png",
        data: base64Screenshot
      }
    },
    AI_PROMPT
  ]);
  const responseText = result.response.text();
  return parseAIResponse(responseText);
}
function parseAIResponse(responseText) {
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    const data = JSON.parse(jsonString);
    const brandProfile = data.brand_profile || data.brandProfile || data;
    if (brandProfile) {
      if (brandProfile.personalityDimensions && !brandProfile.personality_dimensions) {
        brandProfile.personality_dimensions = brandProfile.personalityDimensions;
      }
      if (brandProfile.linguisticMechanics && !brandProfile.linguistic_mechanics) {
        brandProfile.linguistic_mechanics = brandProfile.linguisticMechanics;
      }
      if (brandProfile.guidelines) {
        if (brandProfile.guidelines.voiceLabel && !brandProfile.guidelines.voice_label) {
          brandProfile.guidelines.voice_label = brandProfile.guidelines.voiceLabel;
        }
        if (brandProfile.guidelines.voiceInstructions && !brandProfile.guidelines.voice_instructions) {
          brandProfile.guidelines.voice_instructions = brandProfile.guidelines.voiceInstructions;
        }
      }
    }
    return {
      brand_profile: brandProfile
    };
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    return DEFAULT_AI_RESULT;
  }
}
function isRateLimitError(error) {
  const message = error.message;
  return message.includes("429") || message.toLowerCase().includes("too many requests");
}

const PersonalityDimensionsSchema$1 = z.object({
  sincerity: z.number().min(1).max(5).describe("1-5 scale"),
  excitement: z.number().min(1).max(5).describe("1-5 scale"),
  competence: z.number().min(1).max(5).describe("1-5 scale"),
  sophistication: z.number().min(1).max(5).describe("1-5 scale"),
  ruggedness: z.number().min(1).max(5).describe("1-5 scale")
});
const LinguisticMechanicsSchema$1 = z.object({
  formality_index: z.enum(["High", "Low"]),
  urgency_level: z.enum(["High", "Low"]),
  etymology_bias: z.enum(["Latinate", "Germanic"])
});
const VisualIdentitySchema$1 = z.object({
  primary_color: z.string().describe("Hex color code"),
  font_style: z.string().describe("Serif, Sans-Serif, Slab, Script")
});
const BrandGuidelinesSchema$1 = z.object({
  voice_label: z.string().describe("A short label for the brand's voice"),
  voice_instructions: z.string().describe("Actionable advice for copywriters"),
  dos: z.array(z.string()).describe("4-5 specific copywriting instructions"),
  donts: z.array(z.string()).describe("4-5 specific avoidances")
});
const TargetAudienceSchema$1 = z.object({
  name: z.string().describe("Short label for the audience (1-3 words)"),
  description: z.string().describe("Brief context (max 10 words)")
});
const BrandProfileSchema$2 = z.object({
  name: z.string().describe("Brand name"),
  industry: z.string().describe("Industry/sector"),
  brandSummary: z.string().describe("What the company does"),
  targetAudiences: z.array(TargetAudienceSchema$1).describe("Up to 3 target audiences"),
  archetype: z.object({
    primary: z.string().describe("Primary Jungian Archetype"),
    secondary: z.string().describe("Secondary Jungian Archetype"),
    brand_motivation: z.string().describe("Motivation behind the chosen archetypes")
  }),
  personality_dimensions: PersonalityDimensionsSchema$1,
  linguistic_mechanics: LinguisticMechanicsSchema$1,
  guidelines: BrandGuidelinesSchema$1
});
const AIAnalysisResultSchema = z.object({
  brand_profile: BrandProfileSchema$2
});
const aiAnalyzerTool = createTool({
  id: "ai-brand-analyzer",
  description: "Analyzes a website screenshot with Gemini AI using the Brand Scout methodology. Extracts Aaker's personality dimensions, linguistic mechanics, and brand guidelines including voice instructions and visual identity.",
  inputSchema: z.object({
    screenshotBase64: z.string().describe("Base64-encoded PNG screenshot")
  }),
  outputSchema: z.object({
    analysis: AIAnalysisResultSchema.nullable(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ screenshotBase64 }) => {
    try {
      const buffer = Buffer.from(screenshotBase64, "base64");
      const analysis = await analyzeWithAI(buffer);
      return { analysis, success: true };
    } catch (error) {
      return {
        analysis: null,
        success: false,
        error: error instanceof Error ? error.message : "Failed to analyze with AI"
      };
    }
  }
});

const ImageGenerationOptionsSchema = z.object({
  prompt: z.string().describe("Detailed prompt describing the image to generate"),
  style: z.enum(["product", "lifestyle", "abstract", "hero"]).optional().default("hero").describe("Visual style for the image"),
  industry: z.string().optional().describe("Industry context for visual style"),
  moodKeywords: z.array(z.string()).optional().describe("Mood keywords to incorporate")
});
const ImageGenerationResultSchema = z.object({
  imageData: z.string().describe("Base64 encoded image data"),
  mimeType: z.string().describe("MIME type of the image"),
  enhancedPrompt: z.string().describe("The prompt that was used")
});
function buildEnhancedPrompt(prompt, style, industry, moodKeywords) {
  const parts = [prompt];
  switch (style) {
    case "product":
      parts.push(
        "Professional product photography style",
        "Clean and minimal composition",
        "Soft studio lighting",
        "High-end commercial quality"
      );
      break;
    case "lifestyle":
      parts.push(
        "Lifestyle photography style",
        "Natural and authentic feel",
        "Warm ambient lighting"
      );
      break;
    case "abstract":
      parts.push(
        "Abstract digital art style",
        "Modern and dynamic composition",
        "Bold visual elements"
      );
      break;
    case "hero":
    default:
      parts.push(
        "Hero image for digital advertising",
        "Eye-catching and professional",
        "Clean composition suitable for text overlay"
      );
      break;
  }
  if (industry) {
    parts.push(`Suitable for ${industry} industry`);
  }
  if (moodKeywords && moodKeywords.length > 0) {
    parts.push(`Mood: ${moodKeywords.join(", ")}`);
  }
  parts.push(
    "Subject should be the main focus",
    "Simple or plain background that can be easily removed",
    "No text or watermarks in the image"
  );
  return parts.join(". ") + ".";
}
const imageGeneratorTool = createTool({
  id: "image-generator",
  description: "Generates high-quality images using AI for advertising and marketing use. Supports different visual styles and can incorporate brand context.",
  inputSchema: ImageGenerationOptionsSchema,
  outputSchema: z.object({
    result: ImageGenerationResultSchema.nullable(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ context }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        result: null,
        success: false,
        error: "GEMINI_API_KEY environment variable is not set."
      };
    }
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-image",
        generationConfig: {
          responseModalities: ["image", "text"]
        }
      });
      const enhancedPrompt = buildEnhancedPrompt(
        context.prompt,
        context.style || "hero",
        context.industry,
        context.moodKeywords
      );
      const imagePrompt = `Generate a high-quality image for advertising use:

${enhancedPrompt}

Requirements:
- The image should be professional and suitable for digital display advertising
- Ensure the main subject is clearly visible and well-composed
- The background should be simple/plain to allow for easy background removal
- No text, logos, or watermarks should appear in the image
- High resolution and sharp details`;
      console.log("[ImageGenerator Tool] Generating image with prompt:", context.prompt.slice(0, 100));
      const result = await model.generateContent(imagePrompt);
      const response = result.response;
      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts) {
        return {
          result: null,
          success: false,
          error: "No content parts in response"
        };
      }
      for (const part of parts) {
        const partData = part;
        if (partData.inlineData) {
          console.log("[ImageGenerator Tool] Image generated successfully");
          return {
            result: {
              imageData: partData.inlineData.data,
              mimeType: partData.inlineData.mimeType,
              enhancedPrompt
            },
            success: true
          };
        }
      }
      return {
        result: null,
        success: false,
        error: "No image data in response"
      };
    } catch (error) {
      console.error("[ImageGenerator Tool] Error:", error);
      return {
        result: null,
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate image"
      };
    }
  }
});
async function generateImage(options) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      result: null,
      success: false,
      error: "GEMINI_API_KEY environment variable is not set."
    };
  }
  try {
    const { GoogleGenerativeAI: GoogleGenerativeAI2 } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI2(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
      generationConfig: {
        responseModalities: ["image", "text"]
      }
    });
    const enhancedPrompt = buildEnhancedPrompt(
      options.prompt,
      options.style || "hero",
      options.industry,
      options.moodKeywords
    );
    const imagePrompt = `Generate a high-quality image for advertising use:

${enhancedPrompt}

Requirements:
- The image should be professional and suitable for digital display advertising
- Ensure the main subject is clearly visible and well-composed
- The background should be simple/plain to allow for easy background removal
- No text, logos, or watermarks should appear in the image
- High resolution and sharp details`;
    console.log("[ImageGenerator] Generating image with prompt:", options.prompt.slice(0, 100));
    const result = await model.generateContent(imagePrompt);
    const response = result.response;
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      return {
        result: null,
        success: false,
        error: "No content parts in response"
      };
    }
    for (const part of parts) {
      const partData = part;
      if (partData.inlineData) {
        console.log("[ImageGenerator] Image generated successfully");
        return {
          result: {
            imageData: partData.inlineData.data,
            mimeType: partData.inlineData.mimeType,
            enhancedPrompt
          },
          success: true
        };
      }
    }
    return {
      result: null,
      success: false,
      error: "No image data in response"
    };
  } catch (error) {
    console.error("[ImageGenerator] Error:", error);
    return {
      result: null,
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate image"
    };
  }
}
function getImageDataUrl(result) {
  return `data:${result.mimeType};base64,${result.imageData}`;
}

const brandScannerAgent = new Agent({
  id: "brand-scanner",
  name: "brand-scanner",
  instructions: `You are a Brand Intelligence Agent specialized in extracting comprehensive brand information from websites.

WORKFLOW:
When given a URL to analyze, execute these tools in order:

1. **browser-session**: Launch a browser and navigate to the URL. Save the sessionId.
2. **logo-extractor**: Extract the brand logo using the sessionId and baseUrl.
3. **screenshot-capture**: Capture a screenshot of the page using the sessionId.
4. **text-extractor**: Extract the text content using the sessionId.
5. **ai-brand-analyzer**: Analyze the screenshot to extract brand colors, voice, tone, etc.
6. **close-browser**: Close the browser session to free resources.

IMPORTANT:
- Always use the same sessionId returned from browser-session for all subsequent tools.
- Always close the browser session when done, even if earlier steps fail.
- If any tool fails, report the error but continue with other tools if possible.

OUTPUT:
Return a JSON object with the complete brand analysis:
{
  "logo": "<logo URL or \u{1F680} if not found>",
  "colors": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "businessName": "<official company name>",
  "shortName": "<common brand name>",
  "tagline": "<brand tagline>",
  "voice": ["<adj1>", "<adj2>", "<adj3>"],
  "tone": "<tone description>",
  "industry": "<industry/sector>",
  "brandSummary": "<what the company does>",
  "targetAudiences": [{"name": "...", "description": "..."}],
  "rawWebsiteText": "<extracted text for strategy>"
}`,
  model: "google/gemini-2.5-flash",
  tools: {
    "browser-session": browserSessionTool,
    "close-browser": closeBrowserTool,
    "logo-extractor": logoExtractorTool,
    "screenshot-capture": screenshotTool,
    "text-extractor": textExtractorTool,
    "ai-brand-analyzer": aiAnalyzerTool
  }
});

const strategistAgent = new Agent({
  id: "strategist",
  name: "strategist",
  instructions: `## SARAH - The Strategist

**Role:** You are Sarah, an energetic and insightful Digital Marketing Strategist with 15 years of experience. You've worked with Fortune 500 brands and small businesses alike. You specialize in display advertising campaigns.

**Personality:**
- Enthusiastic and data-driven, but approachable
- Use casual language with strategic depth
- Often start messages with "Hey!" or "Love it!" or "Great news!"
- Use emojis sparingly but effectively: \u{1F3AF} \u{1F4A1} \u{1F4CA} \u2728 \u{1F680}
- Be encouraging and confident in your recommendations

**Your Task:**
1. Analyze the brand profile and campaign data provided
2. Recommend ONE of three campaign strategies:
   - AWARENESS: For brands needing visibility and recognition
   - CONVERSION: For brands with clear offers wanting immediate sales/leads
   - ENGAGEMENT: For brands wanting to build community and interaction

3. Create a compelling campaign angle based on:
   - The brand's unique selling points
   - Any current promotions
   - Their target audiences
   - Industry best practices for display ads

4. **COPYWRITING RULES - Write like a world-class ad copywriter:**
   - Headlines: 3-6 words MAX. Punchy. Powerful. No fluff.
   - Subheadlines: 4-7 words MAX. One clear benefit.
   - Use power verbs: Get, Save, Discover, Unlock, Transform, Boost, Start
   - Create urgency when appropriate: Now, Today, Limited, Instant
   - Focus on BENEFITS, not features
   - Write how people SPEAK, not how companies write
   - Avoid using the company name in the copy 
   - Avoid generic phrases like "Quality you can trust" or "Your partner in success"
   
   GOOD examples:
   - "Save 50% Today" (not "Quality Products at Affordable Prices")
   - "Cook Like a Pro" (not "Professional Cooking Solutions")
   - "Sleep Better Tonight" (not "Experience Premium Sleep Quality")
   - "Free Shipping Always" (not "We Offer Complimentary Delivery")

5. **IMPORTANT - Visual Story:**
   Think about the ONE hero visual that tells this brand's story. Consider:
   - What's the brand's most ICONIC product or symbol?
   - What emotional moment captures the brand experience?
   - What image would a customer instantly recognize as THIS brand?
   
   For example:
   - McDonald's \u2192 Golden fries or someone enjoying a Big Mac
   - Nike \u2192 Athlete in motion, determination on face
   - Apple \u2192 Clean product shot, beautiful design
   - Starbucks \u2192 Cozy moment with a warm cup

**Output Format:**
Return a JSON object with the following structure:
{
  "greeting": "A personalized opening message (2-3 sentences) that shows you understand their brand and gets them excited",
  "strategy": {
    "recommendation": "AWARENESS" | "CONVERSION" | "ENGAGEMENT",
    "campaignAngle": "A catchy 2-4 word theme (e.g., 'Speed and Trust', 'Premium Quality', 'Always Available')",
    "headline": "Primary ad headline - MUST be 3-6 words. Punchy. Action-oriented. No filler words.",
    "subheadline": "Supporting message - MUST be 4-7 words. One benefit only.",
    "rationale": "Why this approach works for them (2-3 sentences)",
    "callToAction": "Primary CTA button text (2-3 words, action verb first)",
    "heroVisualConcept": "ONE sentence describing the perfect hero image that captures this brand's essence. Be specific about the product/subject, mood, and emotional connection.",
    "adFormats": ["300x250", "728x90", "160x600"],
    "targetingTips": ["Audience targeting tip 1", "Audience targeting tip 2"]
  }
}

IMPORTANT: Return ONLY the JSON, no markdown formatting or additional text.`,
  model: "google/gemini-2.5-flash"
});
const strategistChatAgent = new Agent({
  id: "strategist-chat",
  name: "strategist-chat",
  instructions: `You are Sarah, an energetic Digital Marketing Strategist. You're in a conversation with a client about their ad campaign strategy.

**IMPORTANT:** Detect if the user is requesting a STRATEGY CHANGE. Strategy change requests include:
- Asking for a different campaign angle/theme (e.g., "focus on urgency instead", "let's try a trust angle")
- Requesting a different strategy type (e.g., "I want conversion-focused", "let's do engagement")
- Asking to change the headline, CTA, or overall approach
- Expressing they don't like the current strategy and want something different

**If user requests a strategy change:**
Return JSON in this format:
{
  "message": "Your conversational response explaining the new strategy (2-3 sentences)",
  "updatedStrategy": {
    "recommendation": "AWARENESS" | "CONVERSION" | "ENGAGEMENT",
    "campaignAngle": "New 2-4 word theme",
    "headline": "New headline - 3-6 words, punchy, no filler",
    "subheadline": "Supporting message - 4-7 words max",
    "rationale": "Why this new approach works (2-3 sentences)",
    "callToAction": "CTA text (2-3 words, action verb first)",
    "adFormats": ["300x250", "728x90", "160x600"],
    "targetingTips": ["Tip 1", "Tip 2"]
  }
}

**If user is just asking questions or making minor comments (NOT a strategy change):**
Return JSON in this format:
{
  "message": "Your conversational response (2-4 sentences)"
}

Use a casual, friendly tone. Use emojis sparingly (\u{1F3AF} \u{1F4A1} \u2728).
IMPORTANT: Always return valid JSON, no markdown.`,
  model: "google/gemini-2.5-flash"
});

const designerAgent = new Agent({
  id: "designer",
  name: "designer",
  instructions: `## DAVINCI - The Designer

**Role:** You are Davinci, a passionate Creative Director with 20 years of experience in advertising and visual design. You've designed campaigns for global brands and have won multiple Cannes Lions. You specialize in digital display advertising.

**Personality:**
- Artistic and visually expressive
- Speaks in visual metaphors ("imagine", "picture this", "envision")
- Passionate about aesthetics, color theory, and typography
- Uses emojis: \u{1F3A8} \u2728 \u{1F5BC}\uFE0F \u{1F4AB} \u{1F308} \u26A1
- Often references design principles: contrast, balance, hierarchy, flow
- Enthusiastic but thoughtful in feedback

**Your Task:**
1. Review the brand profile and approved campaign strategy
2. Create a cohesive visual direction that brings the strategy to life
3. Suggest specific colors, typography, layout, and animation ideas
4. **Create a detailed hero image prompt** based on the strategy's heroVisualConcept
5. Ensure designs align with the brand's identity and campaign goals

**IMPORTANT - Hero Image Prompt:**
You must create a detailed, AI-image-generation-ready prompt (50-100 words) that will produce a stunning hero visual. Your prompt should include:
- The SPECIFIC product or subject (not generic - e.g., "golden McDonald's fries" not "fast food")
- Photography/art style (product photography, lifestyle, editorial, etc.)
- Lighting and mood (warm, dramatic, soft, etc.)
- Composition guidance (close-up, centered, rule of thirds)
- Color guidance that matches the brand
- What to EXCLUDE: "No text, no logos, no watermarks"

**Output Format:**
Return a JSON object with the following structure:
{
  "greeting": "A personalized opening message (2-3 sentences) expressing excitement about the creative direction",
  "creative": {
    "conceptName": "A catchy 2-4 word name for the creative concept",
    "visualStyle": "Brief description of the overall visual approach (e.g., 'Bold and Minimalist', 'Warm and Inviting')",
    "colorScheme": {
      "primary": "HEX color from brand palette primary",
      "secondary": "HEX color from brand palette secondary",
      "accent": "HEX color from brand palette accent",
      "extraColors": ["Optional meaningful hexes if useful for variation"],
      "background": "HEX background color"
    },
    "typography": {
      "headlineStyle": "Font style suggestion for headlines (e.g., 'Bold Sans-Serif, Impact')",
      "bodyStyle": "Font style for body text"
    },
    "layoutSuggestion": "Brief layout direction (1-2 sentences)",
    "animationIdeas": ["Animation idea 1", "Animation idea 2"],
    "moodKeywords": ["Keyword1", "Keyword2", "Keyword3"],
    "heroImagePrompt": "DETAILED 50-100 word prompt for AI image generation. Include specific subject, style, lighting, composition, colors. Must end with: No text, no logos, no watermarks, plain background for easy compositing."
  }
}

IMPORTANT: Return ONLY the JSON, no markdown formatting or additional text.`,
  model: "google/gemini-2.5-flash"
});
const designerChatAgent = new Agent({
  id: "designer-chat",
  name: "designer-chat",
  instructions: `You are Davinci, a passionate Creative Director. You're in a conversation with a client about their ad creative.

**IMPORTANT:** Detect what type of request the user is making:

## 1. CREATIVE STYLE CHANGES
Requests for different colors, fonts, styles, visual approach, layout concepts, or animation ideas.

## 2. COPY/TEXT CHANGES  
Requests to change headline, body text, CTA text, or translate text.

## 3. LAYER POSITION/SCALE CHANGES
Requests to move, reposition, resize, or scale specific elements like:
- "Move the logo up/down/left/right"
- "Make the headline bigger/smaller"
- "Resize the CTA button"
- "Shift the image to the left"
- "Scale down the product image"

## 4. IMAGE GENERATION/MODIFICATION
Requests to generate a new image, change the image, or modify the existing image:
- "Generate a new image"
- "Create an image of a product"
- "Change the image to show..."
- "Make the image more colorful/vibrant/warm"
- "I want a different image"
- "Generate something with..."

---

**RESPONSE FORMATS:**

**For CREATIVE STYLE or COPY changes:**
{
  "message": "Your conversational response (2-3 sentences)",
  "updatedCreative": {
    "conceptName": "...",
    "visualStyle": "...",
    "colorScheme": { 
      "primary": "...", 
      "secondary": "...", 
      "accent": "...", 
      "extraColors": ["..."],
      "background": "..." 
    },
    "typography": { "headlineStyle": "...", "bodyStyle": "..." },
    "layoutSuggestion": "...",
    "animationIdeas": ["...", "..."],
    "moodKeywords": ["...", "...", "..."],
    "heroImagePrompt": "...",
    "headline": "Only if copy change requested",
    "bodyCopy": "Only if copy change requested",
    "ctaText": "Only if copy change requested"
  }
}

**For LAYER POSITION/SCALE changes:**
{
  "message": "Your conversational response confirming the change (2-3 sentences)",
  "layerModifications": [
    {
      "layerName": "logo",
      "positionDelta": { "x": 0, "y": -30 },
      "scaleFactor": 1.0,
      "sizes": ["all"]
    }
  ]
}

Layer names available: logo, maincopy, subcopy, cta, dynamicimage, shape1, shape2, bg

Position delta: negative y = move UP, positive y = move DOWN, negative x = move LEFT, positive x = move RIGHT
Scale factor: 1.0 = no change, 1.2 = 20% bigger, 0.8 = 20% smaller

**For IMAGE GENERATION/MODIFICATION requests:**
{
  "message": "Your conversational response about the image you'll create (2-3 sentences, be enthusiastic about the visual you're creating)",
  "imageGenerationRequest": {
    "prompt": "Detailed description of the image to generate. Include: subject, style, mood, colors, composition. Be specific and descriptive.",
    "style": "hero",
    "regenerate": true
  }
}

Style options: "product" (clean product shot), "lifestyle" (in-context usage), "abstract" (artistic/conceptual), "hero" (main advertising visual)

**IMPORTANT for layer changes:** If the user doesn't specify which ad sizes to apply the change to, ask them:
{
  "message": "Great idea! \u{1F3A8} Should I apply this change to all ad sizes, or just a specific one like the 300x600?",
  "needsClarification": true,
  "clarificationContext": "sizes"
}

**For questions or minor comments (no changes needed):**
{
  "message": "Your conversational response (2-4 sentences)"
}

Be artistic and visual in your language. Use emojis sparingly (\u{1F3A8} \u2728 \u{1F5BC}\uFE0F).
IMPORTANT: Always return valid JSON, no markdown.`,
  model: "google/gemini-2.5-flash"
});

const colorReasonerAgent = new Agent({
  id: "color-reasoner",
  name: "color-reasoner",
  instructions: `You are a Brand Design Director. Your task is to determine the definitive brand color palette (Primary, Secondary, Accent) for a brand based on three sources of incomplete or noisy data.

INPUT DATA:
1. **ScreenshotColors**: Extracted from a screenshot. Dominant colors.
2. **LogoColors**: Extracted from the logo file. *Note: Secondary/Accent may be NULL if the logo is monochrome or simple.*
3. **HtmlColors**: Hex codes found in the HTML/CSS source. Contains everything.

YOUR GOAL:
Synthesize these inputs to find the "True" Brand Palette.

RULES FOR REASONING:
- **Primary Color**: The dominant color in the Logo is the Source of Truth.
- **Secondary Color**: If Logo has a secondary color, use it. If not, look for a high-contrast functional color in Screenshot (buttons, etc.) that matches HTML colors. **If strictly monochrome, valid to return null.**
- **Accent Color**: Often used for High Priority CTAs. Look for saturation. **If none found, return null.**
- **Extra Colors**: Additional brand colors if found.

OUTPUT FORMAT:
Return ONLY a JSON object:
{
  "primary": "#hex",
  "secondary": "#hex" or null,
  "accent": "#hex" or null,
  "extraColors": ["#hex"],
  "reasoning": "Brief explanation"
}

Do not return markdown formatting or code blocks. Just the raw JSON string.`,
  model: "google/gemini-2.5-flash"
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function getColorDistance(rgb1, rgb2) {
  return Math.sqrt(
    Math.pow(rgb1[0] - rgb2[0], 2) + Math.pow(rgb1[1] - rgb2[1], 2) + Math.pow(rgb1[2] - rgb2[2], 2)
  );
}
function rgbToHex(r, g, b) {
  return "#" + convert.rgb.hex([r, g, b]);
}
function findProjectRoot(startDir) {
  let current = startDir;
  while (current !== path.parse(current).root) {
    if (fs.existsSync(path.join(current, "package.json"))) {
      return current;
    }
    current = path.dirname(current);
  }
  return process.cwd();
}
async function extractPaletteFromBuffer(buffer, type, debugName = "debug-image") {
  const projectRoot = findProjectRoot(__dirname);
  const debugDir = path.join(projectRoot, "public", "debug");
  console.log(`[ColorExtractor] Saving debug images to: ${debugDir}`);
  if (!fs.existsSync(debugDir)) {
    try {
      fs.mkdirSync(debugDir, { recursive: true });
    } catch (e) {
      console.error(`[ColorExtractor] Failed to create debug directory:`, e);
    }
  }
  if (fs.existsSync(debugDir)) {
    try {
      const originalPath = path.join(debugDir, `${debugName}-original.png`);
      fs.writeFileSync(originalPath, buffer);
    } catch (e) {
      console.error(`[ColorExtractor] Debug save failed:`, e);
    }
  }
  const sharpInstance = sharp(buffer).resize(512, 512, { fit: "inside", withoutEnlargement: true }).ensureAlpha();
  try {
    const analyzedBuffer = await sharpInstance.clone().png().toBuffer();
    fs.writeFileSync(
      path.join(debugDir, `${debugName}-analyzed.png`),
      analyzedBuffer
    );
  } catch (e) {
  }
  const { data, info } = await sharpInstance.raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const colorCounts = /* @__PURE__ */ new Map();
  const QUANTIZE_STEP = 1;
  const whiteThreshold = type === "logo" ? 230 : 255;
  for (let i = 0; i < data.length; i += channels) {
    const r0 = data[i];
    const g0 = data[i + 1];
    const b0 = data[i + 2];
    const a = channels >= 4 ? data[i + 3] : 255;
    if (a <= 50) continue;
    let r = r0;
    let g = g0;
    let b = b0;
    if (r > whiteThreshold && g > whiteThreshold && b > whiteThreshold) continue;
    r = Math.round(r / QUANTIZE_STEP) * QUANTIZE_STEP;
    g = Math.round(g / QUANTIZE_STEP) * QUANTIZE_STEP;
    b = Math.round(b / QUANTIZE_STEP) * QUANTIZE_STEP;
    const key = `${r},${g},${b}`;
    const existing = colorCounts.get(key);
    if (existing) {
      existing.count++;
    } else {
      colorCounts.set(key, { r, g, b, count: 1 });
    }
  }
  const sortedCandidates = Array.from(colorCounts.values()).sort(
    (a, b) => b.count - a.count
  );
  const selectedColors = [];
  const MIN_DISTANCE = 15;
  for (const candidate of sortedCandidates) {
    const candidateRgb = [
      candidate.r,
      candidate.g,
      candidate.b
    ];
    const isTooClose = selectedColors.some(
      (selected) => getColorDistance(selected.rgb, candidateRgb) < MIN_DISTANCE
    );
    if (!isTooClose) {
      selectedColors.push({
        hex: rgbToHex(candidate.r, candidate.g, candidate.b),
        rgb: candidateRgb,
        count: candidate.count
      });
    }
    if (selectedColors.length >= 10) break;
  }
  if (selectedColors.length === 0) {
    return { primary: "#4F46E5", secondary: null, accent: null };
  }
  const totalPixels = Array.from(colorCounts.values()).reduce(
    (sum, c) => sum + c.count,
    0
  );
  console.log(
    `[ColorExtractor] Top colors for ${type}:`,
    selectedColors.map(
      (c) => `${c.hex} (${(c.count / totalPixels * 100).toFixed(1)}%)`
    )
  );
  const primary = selectedColors[0].hex;
  const secondary = selectedColors.length > 1 ? selectedColors[1].hex : null;
  const accent = selectedColors.length > 2 ? selectedColors[2].hex : null;
  const extraColors = selectedColors.length > 3 ? selectedColors.slice(3, 5).map((c) => c.hex) : void 0;
  return { primary, secondary, accent, extraColors };
}
function extractColorsFromHtml(html) {
  const hexRegex = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b/g;
  const rgbRegex = /rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/g;
  const rgbaRegex = /rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*([\d.]+)\s*\)/g;
  const colorCounts = /* @__PURE__ */ new Map();
  let match;
  while ((match = hexRegex.exec(html)) !== null) {
    const color = match[0].toUpperCase();
    colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
  }
  while ((match = rgbRegex.exec(html)) !== null) {
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    if (r <= 255 && g <= 255 && b <= 255) {
      const color = rgbToHex(r, g, b).toUpperCase();
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }
  }
  while ((match = rgbaRegex.exec(html)) !== null) {
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    const a = parseFloat(match[4]);
    if (r <= 255 && g <= 255 && b <= 255 && a > 0.1) {
      const color = rgbToHex(r, g, b).toUpperCase();
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }
  }
  const totalMatches = Array.from(colorCounts.values()).reduce(
    (sum, count) => sum + count,
    0
  );
  const sortedWithFreq = Array.from(colorCounts.entries()).sort((a, b) => b[1] - a[1]).map(([color, count]) => ({
    color,
    percent: (count / totalMatches * 100).toFixed(1)
  }));
  console.log(
    `[ColorExtractor] Top colors in HTML:`,
    sortedWithFreq.slice(0, 10).map((c) => `${c.color} (${c.percent}%)`)
  );
  return sortedWithFreq.map((s) => s.color);
}
async function extractColorsFromScreenshot(imageBuffer) {
  console.log("[ColorExtractor] Extracting from screenshot...");
  return extractPaletteFromBuffer(
    imageBuffer,
    "screenshot",
    "debug-screenshot"
  );
}
async function extractColorsFromLogo(logoUrl) {
  console.log(`[ColorExtractor] Extracting from logo: ${logoUrl}`);
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) throw new Error("Failed to fetch");
    const buffer = Buffer.from(await response.arrayBuffer());
    return extractPaletteFromBuffer(buffer, "logo", "debug-logo");
  } catch (error) {
    console.error("[ColorExtractor] Logo extraction failed:", error);
    return { primary: "#000000", secondary: "#000000", accent: "#000000" };
  }
}

async function extractBrandFonts(page) {
  const fontFiles = /* @__PURE__ */ new Map();
  const handleResponse = async (response) => {
    const url = response.url().toLowerCase();
    const contentType = await response.headerValue("content-type").catch(() => "") || "";
    const isFont = /\.(woff2?|ttf|otf)(\?|$)/.test(url) || contentType.includes("font") || url.includes("use.typekit.net");
    if (isFont) {
      try {
        const bufferPromise = response.body();
        const timeoutPromise = new Promise(
          (_, reject) => setTimeout(() => reject(new Error("Timeout getting body")), 3e3)
        );
        const buffer = await Promise.race([bufferPromise, timeoutPromise]);
        if (buffer.length > 0) {
          fontFiles.set(response.url(), { buffer, contentType });
        }
      } catch (e) {
      }
    }
  };
  page.on("response", handleResponse);
  try {
    try {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 15e3 });
    } catch (e) {
      console.warn("Reload timeout exceeded, proceeding with extraction...");
    }
    await page.waitForTimeout(2e3);
    const computedStyles = await page.evaluate(`(() => {
      const h1 = document.querySelector("h1");
      const body = document.body;

      // Get computed style
      const h1Style = h1 ? window.getComputedStyle(h1).fontFamily : "";
      const bodyStyle = window.getComputedStyle(body).fontFamily;

      const clean = (str) => {
        if (!str) return "";
        // Split by comma to get stack, take first one
        // Remove single or double quotes
        return str.split(",")[0].trim().replace(/['"]/g, "");
      };

      return {
        h1Font: clean(h1Style),
        bodyFont: clean(bodyStyle),
        fullH1Stack: h1Style,
      };
    })()`);
    const primaryFont = computedStyles.h1Font || computedStyles.bodyFont;
    if (!primaryFont) {
      return {
        primaryFontFamily: "system-ui",
        fontFileBase64: null,
        fontFormat: null,
        isSystemFont: true
      };
    }
    let match;
    for (const [url, data] of fontFiles.entries()) {
      if (url.toLowerCase().includes(primaryFont.toLowerCase().replace(/\s+/g, "-")) || url.toLowerCase().includes(primaryFont.toLowerCase().replace(/\s+/g, ""))) {
        match = { url, ...data };
        break;
      }
    }
    if (!match && fontFiles.size > 0) {
      const candidates = Array.from(fontFiles.entries()).filter(([_, data]) => data.buffer.length > 4e3).sort((a, b) => b[1].buffer.length - a[1].buffer.length);
      if (candidates.length > 0) {
        console.log(
          `[Font Extraction] No name match for '${primaryFont}'. Falling back to largest captured font: ${candidates[0][0]}`
        );
        match = { url: candidates[0][0], ...candidates[0][1] };
      }
    }
    const getFormat = (url, contentType) => {
      const lowerUrl = url.toLowerCase();
      const lowerCT = contentType.toLowerCase();
      if (lowerUrl.includes(".woff2") || lowerCT.includes("woff2"))
        return "woff2";
      if (lowerUrl.includes(".woff") || lowerCT.includes("woff"))
        return "woff";
      if (lowerUrl.includes(".ttf") || lowerCT.includes("ttf"))
        return "ttf";
      if (lowerUrl.includes(".otf") || lowerCT.includes("otf"))
        return "otf";
      if (/\.woff2($|\?)/.test(lowerUrl)) return "woff2";
      if (/\.woff($|\?)/.test(lowerUrl)) return "woff";
      if (/\.ttf($|\?)/.test(lowerUrl)) return "ttf";
      if (/\.otf($|\?)/.test(lowerUrl)) return "otf";
      return null;
    };
    const format = match ? getFormat(match.url, match.contentType) : null;
    return {
      primaryFontFamily: primaryFont,
      fontFileBase64: match ? match.buffer.toString("base64") : null,
      fontFormat: format,
      isSystemFont: !match || !format
    };
  } finally {
    page.removeListener("response", handleResponse);
  }
}

const PersonalityDimensionsSchema = z.object({
  sincerity: z.number().min(1).max(5),
  excitement: z.number().min(1).max(5),
  competence: z.number().min(1).max(5),
  sophistication: z.number().min(1).max(5),
  ruggedness: z.number().min(1).max(5)
});
const LinguisticMechanicsSchema = z.object({
  formality_index: z.enum(["High", "Low"]),
  urgency_level: z.enum(["High", "Low"]),
  etymology_bias: z.enum(["Latinate", "Germanic"])
});
const VisualIdentitySchema = z.object({
  primary_color: z.string(),
  font_style: z.string()
});
const TypographySchema = z.object({
  primaryFontFamily: z.string(),
  fontFileBase64: z.string().nullable(),
  fontFormat: z.enum(["woff2", "woff", "ttf", "otf"]).nullable(),
  isSystemFont: z.boolean()
});
const BrandPaletteSchema = z.object({
  primary: z.string(),
  secondary: z.string().nullable().optional(),
  accent: z.string().nullable().optional(),
  extraColors: z.array(z.string()).optional()
});
const BrandGuidelinesSchema = z.object({
  voice_label: z.string(),
  voice_instructions: z.string(),
  dos: z.array(z.string()),
  donts: z.array(z.string())
});
const TargetAudienceSchema = z.object({
  name: z.string(),
  description: z.string()
});
const BrandProfileSchema$1 = z.object({
  name: z.string(),
  industry: z.string(),
  brandSummary: z.string(),
  targetAudiences: z.array(TargetAudienceSchema),
  archetype: z.object({
    primary: z.string(),
    secondary: z.string(),
    brand_motivation: z.string()
  }),
  personality_dimensions: PersonalityDimensionsSchema,
  linguistic_mechanics: LinguisticMechanicsSchema,
  guidelines: BrandGuidelinesSchema,
  palette: BrandPaletteSchema.optional()
});
const PreviousDataSchema = z.object({
  screenshotBase64: z.string().optional(),
  rawWebsiteText: z.string().optional(),
  rawHtml: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
  typography: TypographySchema.nullable().optional()
});
const ScanInputSchema = z.object({
  url: z.string().url().describe("The URL to scan"),
  previousScanData: PreviousDataSchema.optional()
});
const ScanOutputSchema = z.object({
  logo: z.string(),
  brand_profile: BrandProfileSchema$1,
  rawWebsiteText: z.string().optional(),
  typography: TypographySchema.optional(),
  screenshotBase64: z.string().optional()
});
const sessionStore = /* @__PURE__ */ new Map();
const launchBrowserStep = createStep({
  id: "launch-browser",
  inputSchema: ScanInputSchema,
  outputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ inputData, runId }) => {
    const { url, previousScanData } = inputData;
    const sessionKey = `session_${runId}`;
    if (previousScanData?.screenshotBase64 && previousScanData?.rawWebsiteText) {
      return { url, sessionKey: "SKIPPED", success: true };
    }
    try {
      const session = await createBrowserSession(url);
      sessionStore.set(sessionKey, session);
      return { url, sessionKey, success: true };
    } catch (error) {
      return {
        url,
        sessionKey,
        success: false,
        error: error instanceof Error ? error.message : "Failed to launch browser"
      };
    }
  }
});
const extractFontsStep = createStep({
  id: "extract-fonts",
  inputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    previousScanData: PreviousDataSchema.optional(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  outputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    typography: TypographySchema.nullable(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ inputData }) => {
    const { url, sessionKey, previousScanData, success, error } = inputData;
    if (!success) {
      return { url, sessionKey, typography: null, success: false, error };
    }
    if (sessionKey === "SKIPPED" && previousScanData?.typography !== void 0) {
      return {
        url,
        sessionKey,
        typography: previousScanData.typography,
        success: true
      };
    }
    const session = sessionStore.get(sessionKey);
    if (!session) {
      if (sessionKey === "SKIPPED") {
        return { url, sessionKey, typography: null, success: true };
      }
      return {
        url,
        sessionKey,
        typography: null,
        success: false,
        error: "No session found"
      };
    }
    try {
      const result = await extractBrandFonts(session.page);
      return { url, sessionKey, typography: result, success: true };
    } catch (error2) {
      console.warn("Font extraction failed:", error2);
      return {
        url,
        sessionKey,
        typography: null,
        success: true,
        // Continue workflow
        error: error2 instanceof Error ? error2.message : "Failed to extract fonts"
      };
    }
  }
});
const extractLogoStep = createStep({
  id: "extract-logo",
  inputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    previousScanData: PreviousDataSchema.optional(),
    typography: TypographySchema.nullable(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  outputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    typography: TypographySchema.nullable(),
    logoUrl: z.string().nullable(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ inputData }) => {
    const { url, sessionKey, previousScanData, typography, success, error } = inputData;
    if (!success) {
      return {
        url,
        sessionKey,
        typography,
        logoUrl: null,
        success: false,
        error
      };
    }
    if (sessionKey === "SKIPPED" && previousScanData?.logoUrl !== void 0) {
      return {
        url,
        sessionKey,
        typography,
        logoUrl: previousScanData.logoUrl,
        success: true
      };
    }
    const session = sessionStore.get(sessionKey);
    if (!session) {
      if (sessionKey === "SKIPPED") {
        return { url, sessionKey, typography, logoUrl: null, success: true };
      }
      return {
        url,
        sessionKey,
        logoUrl: null,
        success: false,
        error: "No session found"
      };
    }
    try {
      const logoUrl = await extractLogo(session.page, url);
      return { url, sessionKey, typography, logoUrl, success: true };
    } catch (error2) {
      return {
        url,
        sessionKey,
        typography,
        logoUrl: null,
        success: false,
        error: error2 instanceof Error ? error2.message : "Failed to extract logo"
      };
    }
  }
});
const captureScreenshotStep = createStep({
  id: "capture-screenshot",
  inputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    previousScanData: PreviousDataSchema.optional(),
    logoUrl: z.string().nullable(),
    typography: TypographySchema.nullable(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  outputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    typography: TypographySchema.nullable(),
    screenshotBase64: z.string(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ inputData }) => {
    const {
      url,
      sessionKey,
      previousScanData,
      logoUrl,
      typography,
      success,
      error
    } = inputData;
    if (!success) {
      return {
        url,
        sessionKey,
        logoUrl,
        typography,
        screenshotBase64: "",
        success: false,
        error
      };
    }
    if (sessionKey === "SKIPPED" && previousScanData?.screenshotBase64) {
      return {
        url,
        sessionKey,
        logoUrl,
        typography,
        screenshotBase64: previousScanData.screenshotBase64,
        success: true
      };
    }
    const session = sessionStore.get(sessionKey);
    if (!session) {
      return {
        url,
        sessionKey,
        logoUrl,
        typography,
        screenshotBase64: "",
        success: false,
        error: "No session found"
      };
    }
    try {
      const buffer = await captureScreenshot(session.page);
      return {
        url,
        sessionKey,
        logoUrl,
        typography,
        screenshotBase64: buffer.toString("base64"),
        success: true
      };
    } catch (error2) {
      return {
        url,
        sessionKey,
        logoUrl,
        typography,
        screenshotBase64: "",
        success: false,
        error: error2 instanceof Error ? error2.message : "Failed to capture screenshot"
      };
    }
  }
});
const extractTextStep = createStep({
  id: "extract-text",
  inputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    previousScanData: PreviousDataSchema.optional(),
    logoUrl: z.string().nullable(),
    typography: TypographySchema.nullable(),
    screenshotBase64: z.string(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  outputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    typography: TypographySchema.nullable(),
    screenshotBase64: z.string(),
    rawWebsiteText: z.string(),
    rawHtml: z.string(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ inputData }) => {
    const {
      url,
      sessionKey,
      previousScanData,
      logoUrl,
      typography,
      screenshotBase64,
      success,
      error
    } = inputData;
    if (!success) {
      return {
        url,
        sessionKey,
        logoUrl,
        typography,
        screenshotBase64,
        rawWebsiteText: "",
        rawHtml: "",
        success: false,
        error
      };
    }
    if (sessionKey === "SKIPPED" && previousScanData?.rawWebsiteText) {
      return {
        url,
        sessionKey,
        logoUrl,
        typography,
        screenshotBase64,
        rawWebsiteText: previousScanData.rawWebsiteText,
        rawHtml: previousScanData.rawHtml || "",
        success: true
      };
    }
    const session = sessionStore.get(sessionKey);
    if (!session) {
      return {
        url,
        sessionKey,
        logoUrl,
        screenshotBase64,
        rawWebsiteText: "",
        rawHtml: "",
        success: false,
        error: "No session found"
      };
    }
    try {
      const start = Date.now();
      const rawWebsiteText = await extractWebsiteText(session.page);
      const rawHtml = await session.page.content();
      console.log(`[Text&HTML] Extracted in ${Date.now() - start}ms`);
      await closeBrowser(session.browser);
      sessionStore.delete(sessionKey);
      return {
        url,
        sessionKey,
        logoUrl,
        typography,
        screenshotBase64,
        rawWebsiteText,
        rawHtml,
        success: true
      };
    } catch (error2) {
      const session2 = sessionStore.get(sessionKey);
      if (session2) {
        await closeBrowser(session2.browser);
        sessionStore.delete(sessionKey);
      }
      return {
        url,
        sessionKey,
        logoUrl,
        screenshotBase64,
        rawWebsiteText: "",
        rawHtml: "",
        success: false,
        error: error2 instanceof Error ? error2.message : "Failed to extract text"
      };
    }
  }
});
const extractColorsStep = createStep({
  id: "extract-colors-multi",
  inputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    typography: TypographySchema.nullable(),
    screenshotBase64: z.string(),
    rawWebsiteText: z.string(),
    rawHtml: z.string(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  outputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    typography: TypographySchema.nullable(),
    screenshotBase64: z.string(),
    rawWebsiteText: z.string(),
    screenshotColors: BrandPaletteSchema,
    logoColors: BrandPaletteSchema,
    htmlColors: z.array(z.string()),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ inputData }) => {
    const { screenshotBase64, logoUrl, typography, rawHtml, success } = inputData;
    let screenshotColors = {
      primary: "#000",
      secondary: "#000",
      accent: "#000"
    };
    let logoColors = {
      primary: "#000",
      secondary: null,
      accent: null
    };
    let htmlColors = [];
    if (!success) {
      return {
        ...inputData,
        typography,
        screenshotColors,
        logoColors,
        htmlColors
      };
    }
    try {
      if (screenshotBase64) {
        const buffer = Buffer.from(screenshotBase64, "base64");
        screenshotColors = await extractColorsFromScreenshot(buffer);
      }
      if (logoUrl) {
        logoColors = await extractColorsFromLogo(logoUrl);
      }
      if (rawHtml) {
        htmlColors = extractColorsFromHtml(rawHtml);
      }
      return {
        ...inputData,
        screenshotColors,
        logoColors,
        htmlColors,
        typography
      };
    } catch (e) {
      console.error("Error in color extraction step:", e);
      return {
        ...inputData,
        typography,
        screenshotColors,
        logoColors,
        htmlColors
      };
    }
  }
});
const determineBrandColorsStep = createStep({
  id: "determine-brand-colors",
  inputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    typography: TypographySchema.nullable(),
    screenshotBase64: z.string(),
    rawWebsiteText: z.string(),
    screenshotColors: BrandPaletteSchema,
    logoColors: BrandPaletteSchema,
    htmlColors: z.array(z.string()),
    success: z.boolean(),
    error: z.string().optional()
  }),
  outputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    typography: TypographySchema.nullable(),
    screenshotBase64: z.string(),
    rawWebsiteText: z.string(),
    palette: BrandPaletteSchema,
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ inputData }) => {
    const { screenshotColors, logoColors, htmlColors, success } = inputData;
    if (!success) {
      return {
        ...inputData,
        palette: { primary: "#000", secondary: "#000", accent: "#000" }
      };
    }
    try {
      const agent = mastra.getAgent("colorReasoner");
      const result = await agent.generate(
        JSON.stringify({
          screenshotColors,
          logoColors,
          htmlColors: htmlColors.slice(0, 50)
          // Limit noise
        })
      );
      let palette = { primary: "#000", secondary: "#000", accent: "#000" };
      try {
        const jsonStr = result.text.replace(/```json/g, "").replace(/```/g, "").trim();
        palette = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error("Failed to parse color reasoner output:", result.text);
        palette = screenshotColors;
      }
      return {
        ...inputData,
        palette
      };
    } catch (error) {
      console.error("Color reasoning failed:", error);
      return {
        ...inputData,
        palette: screenshotColors
        // Fallback
      };
    }
  }
});
const DEFAULT_BRAND_PROFILE = {
  name: "Premium Tech Company",
  industry: "Technology & Software",
  brandSummary: "A leading provider of innovative hardware and software solutions.",
  targetAudiences: [
    { name: "Creative Professionals", description: "Seeking high-end tools." }
  ],
  archetype: {
    primary: "The Creator",
    secondary: "The Sage",
    brand_motivation: "Enabling creativity through technical excellence."
  },
  personality_dimensions: {
    sincerity: 3,
    excitement: 4,
    competence: 4,
    sophistication: 3,
    ruggedness: 2
  },
  linguistic_mechanics: {
    formality_index: "Low",
    urgency_level: "Low",
    etymology_bias: "Germanic"
  },
  guidelines: {
    voice_label: "Modern Professional",
    voice_instructions: "Write with confident clarity.",
    dos: ["Use active voice", "Be direct"],
    donts: ["Avoid jargon", "No passive voice"]
  }
};
const analyzeWithAIStep = createStep({
  id: "analyze-with-ai",
  inputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    typography: TypographySchema.nullable().optional(),
    screenshotBase64: z.string(),
    rawWebsiteText: z.string(),
    palette: BrandPaletteSchema,
    success: z.boolean(),
    error: z.string().optional()
  }),
  outputSchema: ScanOutputSchema,
  execute: async ({ inputData }) => {
    const {
      logoUrl,
      typography,
      screenshotBase64,
      palette,
      rawWebsiteText,
      success,
      error
    } = inputData;
    const defaultResult = {
      logo: logoUrl || "\u{1F680}",
      brand_profile: {
        ...DEFAULT_BRAND_PROFILE,
        palette
      },
      rawWebsiteText,
      typography
    };
    if (!success || !screenshotBase64) {
      return {
        ...defaultResult,
        brand_profile: {
          ...DEFAULT_BRAND_PROFILE,
          guidelines: {
            ...DEFAULT_BRAND_PROFILE.guidelines,
            voice_instructions: error || "Failed to scan website"
          }
        }
      };
    }
    try {
      const buffer = Buffer.from(screenshotBase64, "base64");
      const aiResult = await analyzeWithAI(buffer);
      return {
        logo: logoUrl || "\u{1F680}",
        brand_profile: {
          ...aiResult.brand_profile,
          // OVERRIDE the AI's guessed palette with our reasoned palette
          palette
        },
        rawWebsiteText,
        typography,
        screenshotBase64
        // Pass it back for subsequent rescans
      };
    } catch (error2) {
      return {
        ...defaultResult,
        brand_profile: {
          ...DEFAULT_BRAND_PROFILE,
          guidelines: {
            ...DEFAULT_BRAND_PROFILE.guidelines,
            voice_instructions: error2 instanceof Error ? `AI analysis failed: ${error2.message}` : "AI analysis failed"
          }
        }
      };
    }
  }
});
const brandScanWorkflow = createWorkflow({
  id: "brand-scan",
  inputSchema: ScanInputSchema,
  outputSchema: ScanOutputSchema
}).then(launchBrowserStep).then(extractFontsStep).then(extractLogoStep).then(captureScreenshotStep).then(extractTextStep).then(extractColorsStep).then(determineBrandColorsStep).then(analyzeWithAIStep).commit();
async function cleanupSession(sessionKey) {
  const session = sessionStore.get(sessionKey);
  if (session) {
    await closeBrowser(session.browser);
    sessionStore.delete(sessionKey);
  }
}

function parseUrl(url) {
  if (!url || typeof url !== "string") {
    return null;
  }
  const normalized = url.startsWith("http") ? url : `https://${url}`;
  try {
    new URL(normalized);
    return normalized;
  } catch {
    return null;
  }
}

const CAMPAIGN_EXTRACTION_PROMPT = `
Role: You are an expert marketing analyst extracting campaign-relevant data from website content.

Task: Analyze the provided website text and extract information that would be useful for creating an advertising campaign.

Extract the following and return ONLY raw JSON:

1. "currentPromos": Array of 1-3 active promotions, sales, discounts, or special offers currently visible (e.g., "20% off first service", "Free estimates", "Limited time offer"). If none found, return empty array.

2. "uniqueSellingPoints": Array of 2-4 things that make this business stand out from competitors (e.g., "24/7 availability", "Licensed & Insured", "Family-owned since 1985", "Same-day service", "5-star rated").

3. "seasonalContext": Any seasonal, holiday, or time-sensitive messaging (e.g., "Summer AC special", "Holiday hours", "Back to school sale"). Return null if none found.

4. "callsToAction": Array of 1-3 primary calls-to-action found (e.g., "Book Now", "Get a Free Quote", "Call 555-1234", "Shop Now").

5. "keyProducts": Array of 1-5 main products, services, or categories mentioned (e.g., "Emergency Plumbing", "Water Heater Installation", "Drain Cleaning").

Return only raw JSON in this exact format:
{
  "currentPromos": ["..."],
  "uniqueSellingPoints": ["..."],
  "seasonalContext": "..." or null,
  "callsToAction": ["..."],
  "keyProducts": ["..."]
}
`;
const DEFAULT_CAMPAIGN_DATA = {
  currentPromos: [],
  uniqueSellingPoints: ["Quality service", "Professional team"],
  seasonalContext: null,
  callsToAction: ["Contact Us"],
  keyProducts: ["Professional services"]
};
async function extractCampaignData(websiteText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
  });
  const result = await model.generateContent([
    CAMPAIGN_EXTRACTION_PROMPT,
    `

Website Content:
${websiteText}`
  ]);
  const responseText = result.response.text();
  return parseCampaignResponse(responseText);
}
function parseCampaignResponse(responseText) {
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    const parsed = JSON.parse(jsonString);
    return {
      currentPromos: parsed.currentPromos || [],
      uniqueSellingPoints: parsed.uniqueSellingPoints || DEFAULT_CAMPAIGN_DATA.uniqueSellingPoints,
      seasonalContext: parsed.seasonalContext || null,
      callsToAction: parsed.callsToAction || DEFAULT_CAMPAIGN_DATA.callsToAction,
      keyProducts: parsed.keyProducts || DEFAULT_CAMPAIGN_DATA.keyProducts
    };
  } catch {
    return DEFAULT_CAMPAIGN_DATA;
  }
}

const StrategyInputSchema = z.object({
  brandProfile: z.object({
    name: z.string(),
    shortName: z.string().optional(),
    url: z.string(),
    industry: z.string().optional(),
    tagline: z.string().optional(),
    brandSummary: z.string().optional(),
    tone: z.string().optional(),
    personality: z.array(z.string()).optional(),
    palette: z.object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
      extraColors: z.array(z.string()).optional()
    }).optional(),
    audiences: z.array(
      z.object({
        name: z.string(),
        description: z.string()
      })
    ).optional()
  }),
  rawWebsiteText: z.string().optional(),
  websiteUrl: z.string().optional()
});
const CampaignDataSchema$1 = z.object({
  currentPromos: z.array(z.string()),
  uniqueSellingPoints: z.array(z.string()),
  seasonalContext: z.string().nullable(),
  callsToAction: z.array(z.string()),
  keyProducts: z.array(z.string())
});
const StrategyDocumentSchema = z.object({
  recommendation: z.enum(["AWARENESS", "CONVERSION", "ENGAGEMENT"]),
  campaignAngle: z.string(),
  headline: z.string(),
  subheadline: z.string(),
  rationale: z.string(),
  callToAction: z.string(),
  adFormats: z.array(z.string()),
  targetingTips: z.array(z.string())
});
const StrategyOutputSchema = z.object({
  greeting: z.string(),
  strategy: StrategyDocumentSchema,
  campaignData: CampaignDataSchema$1
});
const fetchWebsiteTextStep = createStep({
  id: "fetch-website-text",
  inputSchema: StrategyInputSchema,
  outputSchema: z.object({
    brandProfile: StrategyInputSchema.shape.brandProfile,
    websiteText: z.string(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ inputData }) => {
    const { brandProfile, rawWebsiteText, websiteUrl } = inputData;
    if (rawWebsiteText) {
      return { brandProfile, websiteText: rawWebsiteText, success: true };
    }
    if (websiteUrl) {
      const normalizedUrl = parseUrl(websiteUrl);
      if (!normalizedUrl) {
        return {
          brandProfile,
          websiteText: `${brandProfile.name}. ${brandProfile.brandSummary || ""} ${brandProfile.tagline || ""}`,
          success: false,
          error: "Invalid website URL"
        };
      }
      try {
        const session = await createBrowserSession(normalizedUrl);
        const websiteText = await extractWebsiteText(session.page);
        await closeBrowser(session.browser);
        return { brandProfile, websiteText, success: true };
      } catch (error) {
        return {
          brandProfile,
          websiteText: `${brandProfile.name}. ${brandProfile.brandSummary || ""} ${brandProfile.tagline || ""}`,
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch website"
        };
      }
    }
    return {
      brandProfile,
      websiteText: `${brandProfile.name}. ${brandProfile.brandSummary || ""} ${brandProfile.tagline || ""}`,
      success: true
    };
  }
});
const extractCampaignDataStep = createStep({
  id: "extract-campaign-data",
  inputSchema: z.object({
    brandProfile: StrategyInputSchema.shape.brandProfile,
    websiteText: z.string(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  outputSchema: z.object({
    brandProfile: StrategyInputSchema.shape.brandProfile,
    campaignData: CampaignDataSchema$1,
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ inputData }) => {
    const { brandProfile, websiteText } = inputData;
    try {
      const campaignData = await extractCampaignData(websiteText);
      return { brandProfile, campaignData, success: true };
    } catch (error) {
      return {
        brandProfile,
        campaignData: {
          currentPromos: [],
          uniqueSellingPoints: ["Quality service", "Professional team"],
          seasonalContext: null,
          callsToAction: ["Contact Us"],
          keyProducts: ["Professional services"]
        },
        success: false,
        error: error instanceof Error ? error.message : "Failed to extract campaign data"
      };
    }
  }
});
const generateStrategyStep = createStep({
  id: "generate-strategy",
  inputSchema: z.object({
    brandProfile: StrategyInputSchema.shape.brandProfile,
    campaignData: CampaignDataSchema$1,
    success: z.boolean(),
    error: z.string().optional()
  }),
  outputSchema: StrategyOutputSchema,
  execute: async ({ inputData }) => {
    const { brandProfile, campaignData } = inputData;
    try {
      const agent = mastra.getAgent("strategist");
      const contextPrompt = `
BRAND PROFILE:
Name: ${brandProfile.name}
Industry: ${brandProfile.industry || "Unknown"}
Summary: ${brandProfile.brandSummary || "N/A"}
Tagline: ${brandProfile.tagline || "N/A"}
Audiences: ${brandProfile.audiences?.map((a) => a.name).join(", ") || "General"}

CAMPAIGN DATA (Extracted from Website):
Promotions: ${campaignData?.currentPromos.join(", ") || "None"}
USPs: ${campaignData?.uniqueSellingPoints.join(", ") || "N/A"}
Key Products: ${campaignData?.keyProducts.join(", ") || "N/A"}
Calls to Action: ${campaignData?.callsToAction.join(", ") || "N/A"}
`;
      const result = await agent.generate([
        { role: "user", content: contextPrompt },
        { role: "user", content: "Generate the initial strategy in JSON format." }
      ]);
      let parsed;
      try {
        const jsonMatch = result.text.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonString = jsonMatch ? jsonMatch[1].trim() : result.text.trim();
        parsed = JSON.parse(jsonString);
      } catch (e) {
        throw new Error("Failed to parse agent response as JSON");
      }
      return {
        greeting: parsed.greeting || "Hey! I've put together a strategy for you.",
        strategy: parsed.strategy,
        campaignData
      };
    } catch (error) {
      return {
        greeting: "Hey! I've been diving into your brand and I'm really excited about what I see! \u{1F3AF} Let me share my strategic recommendation.",
        strategy: {
          recommendation: "AWARENESS",
          campaignAngle: "Quality & Trust",
          headline: "Your Success Starts Here",
          subheadline: "Professional solutions you can count on",
          rationale: "Building brand awareness is key for establishing market presence. A trust-focused campaign resonates with audiences seeking reliability.",
          callToAction: "Learn More",
          adFormats: ["300x250", "728x90", "160x600"],
          targetingTips: [
            "Target users interested in your industry",
            "Use lookalike audiences from your customer base"
          ]
        },
        campaignData
      };
    }
  }
});
const strategyWorkflow = createWorkflow({
  id: "strategy",
  inputSchema: StrategyInputSchema,
  outputSchema: StrategyOutputSchema
}).then(fetchWebsiteTextStep).then(extractCampaignDataStep).then(generateStrategyStep).commit();

const BrandProfileSchema = z.object({
  name: z.string(),
  shortName: z.string().optional(),
  url: z.string().optional(),
  industry: z.string().optional(),
  tagline: z.string().optional(),
  brandSummary: z.string().optional(),
  tone: z.string().optional(),
  personality: z.array(z.string()).optional(),
  palette: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    extraColors: z.array(z.string()).optional()
  }).optional(),
  logo: z.string().optional(),
  audiences: z.array(
    z.object({
      name: z.string(),
      description: z.string()
    })
  ).optional()
});
const StrategyDataSchema = z.object({
  recommendation: z.enum(["AWARENESS", "CONVERSION", "ENGAGEMENT"]),
  campaignAngle: z.string(),
  headline: z.string(),
  subheadline: z.string(),
  rationale: z.string(),
  callToAction: z.string(),
  heroVisualConcept: z.string().optional(),
  adFormats: z.array(z.string()),
  targetingTips: z.array(z.string())
});
const CampaignDataSchema = z.object({
  currentPromos: z.array(z.string()),
  uniqueSellingPoints: z.array(z.string()),
  seasonalContext: z.string().nullable(),
  callsToAction: z.array(z.string()),
  keyProducts: z.array(z.string())
}).nullable();
const DesignerInputSchema = z.object({
  brandProfile: BrandProfileSchema,
  strategy: StrategyDataSchema,
  campaignData: CampaignDataSchema.optional()
});
const CreativeOutputSchema = z.object({
  greeting: z.string(),
  creative: z.object({
    conceptName: z.string(),
    visualStyle: z.string(),
    colorScheme: z.object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
      background: z.string()
    }),
    typography: z.object({
      headlineStyle: z.string(),
      bodyStyle: z.string()
    }),
    layoutSuggestion: z.string(),
    animationIdeas: z.array(z.string()),
    moodKeywords: z.array(z.string()),
    heroImagePrompt: z.string().optional(),
    imageDirection: z.string().optional()
  })
});
function buildContextPrompt(brand, strategy, campaign) {
  return `
## Brand Information
- Name: ${brand.name}
- Industry: ${brand.industry || "Not specified"}
- Tagline: ${brand.tagline || "None provided"}
- About: ${brand.brandSummary || "No description available"}
- Brand Voice: ${brand.tone || "Professional"}
${brand.palette ? `- Primary Color: ${brand.palette.primary}
- Secondary Color: ${brand.palette.secondary}
- Accent Color: ${brand.palette.accent}${brand.palette.extraColors ? `
- Extra Colors: ${brand.palette.extraColors.join(", ")}` : ""}` : ""}
- Personality: ${brand.personality?.join(", ") || "Not specified"}

## Target Audiences
${brand.audiences && brand.audiences.length > 0 ? brand.audiences.map((a) => `- ${a.name}: ${a.description}`).join("\n") : "- General consumers"}

## Approved Campaign Strategy
- Type: ${strategy.recommendation}
- Campaign Angle: "${strategy.campaignAngle}"
- Headline: "${strategy.headline}"
- Subheadline: "${strategy.subheadline}"
- CTA: "${strategy.callToAction}"
- Hero Visual Concept: "${strategy.heroVisualConcept || "Not specified"}"
- Ad Formats: ${strategy.adFormats.join(", ")}

## Campaign Data
${campaign ? `
- Current Promotions: ${campaign.currentPromos.join(", ") || "None"}
- Key Products: ${campaign.keyProducts.join(", ")}
- USPs: ${campaign.uniqueSellingPoints.join(", ")}
` : "No additional campaign data available."}

Based on this information, create a cohesive visual direction that brings this campaign to life.
`;
}
function parseDesignerResponse(responseText, brand) {
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    return JSON.parse(jsonString);
  } catch {
    return {
      greeting: `Hey! \u{1F3A8} I've been studying your brand and the campaign strategy, and I'm really excited about the creative possibilities here! Let me show you what I have in mind.`,
      creative: {
        conceptName: "Bold Impact",
        visualStyle: "Modern and Dynamic",
        colorScheme: {
          primary: brand.palette?.primary || "#4F46E5",
          secondary: brand.palette?.secondary || "#F97316",
          accent: brand.palette?.accent || "#10B981",
          extraColors: brand.palette?.extraColors || [],
          background: "#FFFFFF"
        },
        typography: {
          headlineStyle: "Bold Sans-Serif",
          bodyStyle: "Clean Sans-Serif"
        },
        layoutSuggestion: "Hero headline at top with strong visual center and CTA button prominently placed at bottom.",
        animationIdeas: [
          "Fade-in headline with subtle slide",
          "Pulsing CTA button to draw attention"
        ],
        moodKeywords: ["Professional", "Trustworthy", "Modern"],
        heroImagePrompt: "Professional hero image for digital advertising, clean composition, modern style",
        imageDirection: "Clean product shots or abstract brand imagery with strong contrast."
      }
    };
  }
}
const generateCreativeStep = createStep({
  id: "generate-creative",
  inputSchema: DesignerInputSchema,
  outputSchema: CreativeOutputSchema,
  execute: async ({ inputData }) => {
    const { brandProfile, strategy, campaignData } = inputData;
    try {
      const agent = mastra.getAgent("designer");
      const contextPrompt = buildContextPrompt(
        brandProfile,
        strategy,
        campaignData || null
      );
      const result = await agent.generate([
        { role: "user", content: contextPrompt }
      ]);
      const parsed = parseDesignerResponse(
        result.text,
        brandProfile
      );
      return {
        greeting: parsed.greeting,
        creative: parsed.creative
      };
    } catch (error) {
      console.error("[Designer Workflow] Error:", error);
      return {
        greeting: `Hey! \u{1F3A8} I've been studying your brand and the campaign strategy, and I'm really excited about the creative possibilities here! Let me show you what I have in mind.`,
        creative: {
          conceptName: "Bold Impact",
          visualStyle: "Modern and Dynamic",
          colorScheme: {
            primary: brandProfile.palette?.primary || "#4F46E5",
            secondary: brandProfile.palette?.secondary || "#F97316",
            accent: brandProfile.palette?.accent || "#10B981",
            extraColors: brandProfile.palette?.extraColors || [],
            background: "#FFFFFF"
          },
          typography: {
            headlineStyle: "Bold Sans-Serif",
            bodyStyle: "Clean Sans-Serif"
          },
          layoutSuggestion: "Hero headline at top with strong visual center and CTA button prominently placed at bottom.",
          animationIdeas: [
            "Fade-in headline with subtle slide",
            "Pulsing CTA button to draw attention"
          ],
          moodKeywords: ["Professional", "Trustworthy", "Modern"],
          heroImagePrompt: "Professional hero image for digital advertising, clean composition, modern style",
          imageDirection: "Clean product shots or abstract brand imagery with strong contrast."
        }
      };
    }
  }
});
const designerWorkflow = createWorkflow({
  id: "designer",
  inputSchema: DesignerInputSchema,
  outputSchema: CreativeOutputSchema
}).then(generateCreativeStep).commit();

const mastra = new Mastra({
  agents: {
    brandScanner: brandScannerAgent,
    strategist: strategistAgent,
    strategistChat: strategistChatAgent,
    designer: designerAgent,
    designerChat: designerChatAgent,
    colorReasoner: colorReasonerAgent
  },
  workflows: {
    brandScan: brandScanWorkflow,
    strategy: strategyWorkflow,
    designer: designerWorkflow
  }
});
function getBrandScannerAgent() {
  return mastra.getAgent("brandScanner");
}
function getBrandScanWorkflow() {
  return mastra.getWorkflow("brandScan");
}
function getStrategyWorkflow() {
  return mastra.getWorkflow("strategy");
}
function getDesignerWorkflow() {
  return mastra.getWorkflow("designer");
}

export { getBrandScanWorkflow, getBrandScannerAgent, getDesignerWorkflow, getStrategyWorkflow, mastra };
