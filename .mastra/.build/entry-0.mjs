import { Mastra } from '@mastra/core';
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { chromium } from 'playwright';
import { PlaywrightBlocker } from '@ghostery/adblocker-playwright';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createStep, createWorkflow } from '@mastra/core/workflows';

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
async function createBrowserSession(url) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1920, height: 1080 },
    permissions: ["geolocation"],
    ignoreHTTPSErrors: true,
    javaScriptEnabled: true,
    locale: "en-US"
  });
  const page = await context.newPage();
  const blocker = await PlaywrightBlocker.fromPrebuiltAdsAndTracking();
  await blocker.enableBlockingInPage(page);
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 6e4
  });
  await page.waitForTimeout(2e3);
  return { browser, page };
}
async function captureScreenshot(page) {
  return page.screenshot({
    type: "png",
    fullPage: false
    // Top viewport only for better analysis
  });
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

async function extractLogo(page, baseUrl) {
  const ogImage = await page.$eval('meta[property="og:image"]', (el) => el.getAttribute("content")).catch(() => null);
  if (ogImage) {
    return ogImage.startsWith("http") ? ogImage : new URL(ogImage, baseUrl).href;
  }
  const favicon = await page.$eval(
    'link[rel="icon"], link[rel="shortcut icon"]',
    (el) => el.getAttribute("href")
  ).catch(() => null);
  if (favicon) {
    return favicon.startsWith("http") ? favicon : new URL(favicon, baseUrl).href;
  }
  const logoImg = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll("img"));
    const logoImage = imgs.find(
      (img) => img.className.toLowerCase().includes("logo") || img.alt?.toLowerCase().includes("logo")
    );
    return logoImage?.src || "";
  });
  return logoImg || null;
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
  const rawText = await page.evaluate(() => {
    const clone = document.body.cloneNode(true);
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
      ".social-share"
    ];
    selectorsToRemove.forEach((selector) => {
      clone.querySelectorAll(selector).forEach((el) => el.remove());
    });
    const text = clone.innerText || clone.textContent || "";
    return text.replace(/\s+/g, " ").replace(/\n\s*\n/g, "\n").trim();
  });
  const MAX_LENGTH = 15e3;
  if (rawText.length > MAX_LENGTH) {
    return rawText.slice(0, MAX_LENGTH) + "...";
  }
  return rawText;
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
Role: You are an award-winning Creative Director and Brand Strategist.
Task: Analyze this website screenshot to extract brand information.

CRITICAL SAFETY INSTRUCTION:
If the screenshot contains text like "Access Denied", "Cloudflare", "Verify you are human", "Captcha", or "403 Forbidden":
1. IGNORE the screenshot visual content completely.
2. INSTEAD, infer the brand from the URL or create a generic, high-quality response for a "Premium Tech Brand".
3. DO NOT write content about "Verifying Humanity" or "Cookies".

Extract the following and return ONLY raw JSON:

1. "colors": The 3 dominant brand hex colors from the website.
2. "businessName": The official full company/brand name (e.g., "Apple Inc.", "The Coca-Cola Company").
3. "shortName": The short/common brand name used in everyday speech (e.g., "Apple", "Coca-Cola").
4. "tagline": A concise brand tagline (max 10 words) based on the website content.
5. "voice": Array of 3 adjectives describing the brand voice.
6. "tone": Professional description of brand tone (max 50 words).
7. "industry": The industry/sector this company operates in (e.g., "Technology & Software", "E-commerce", "Healthcare", "Finance", "Marketing").
8. "brandSummary": What does this company sell/do? (1-2 sentences, max 30 words).
9. "targetAudiences": Array of up to 3 target audiences, each with "name" (short label, 2-4 words) and "description" (brief context, max 10 words).

Return only raw JSON in this exact format: 
{ "colors": ["#...", "#...", "#..."], "businessName": "...", "shortName": "...", "tagline": "...", "voice": ["...", "...", "..."], "tone": "...", "industry": "...", "brandSummary": "...", "targetAudiences": [{"name": "...", "description": "..."}, ...] }
`;
const DEFAULT_AI_RESULT = {
  colors: ["#4F46E5", "#F97316", "#10B981"],
  businessName: "Premium Tech Company Inc.",
  shortName: "Premium Tech",
  tagline: "Building the future, one pixel at a time",
  voice: ["Innovative", "Trustworthy", "Modern"],
  tone: "Professional yet approachable",
  industry: "Technology & Software",
  brandSummary: "A premium technology company focused on innovation.",
  targetAudiences: [
    { name: "Tech Professionals", description: "Ages 25-45, decision makers" },
    { name: "Early Adopters", description: "Innovation enthusiasts" },
    { name: "Digital Businesses", description: "Companies seeking growth" }
  ]
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
    return JSON.parse(jsonString);
  } catch {
    return DEFAULT_AI_RESULT;
  }
}
function isRateLimitError(error) {
  const message = error.message;
  return message.includes("429") || message.toLowerCase().includes("too many requests");
}

const TargetAudienceSchema = z.object({
  name: z.string().describe("Short label for the audience (2-4 words)"),
  description: z.string().describe("Brief context (max 10 words)")
});
const AIAnalysisResultSchema = z.object({
  colors: z.array(z.string()).describe("3-4 dominant brand hex colors"),
  businessName: z.string().optional().describe("Official full company name"),
  shortName: z.string().optional().describe("Common/short brand name"),
  tagline: z.string().describe("Brand tagline (max 10 words)"),
  voice: z.array(z.string()).describe("3 adjectives describing brand voice"),
  tone: z.string().describe("Description of brand tone (max 50 words)"),
  industry: z.string().optional().describe("Industry/sector"),
  brandSummary: z.string().optional().describe("What the company does (1-2 sentences)"),
  targetAudiences: z.array(TargetAudienceSchema).optional().describe("Up to 3 target audiences")
});
const aiAnalyzerTool = createTool({
  id: "ai-brand-analyzer",
  description: "Analyzes a website screenshot with Gemini AI to extract brand information including colors, voice, tone, industry, and target audiences",
  inputSchema: z.object({
    screenshotBase64: z.string().describe("Base64-encoded PNG screenshot")
  }),
  outputSchema: z.object({
    analysis: AIAnalysisResultSchema.nullable(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ context }) => {
    try {
      const buffer = Buffer.from(context.screenshotBase64, "base64");
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

const brandScannerAgent = new Agent({
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
  model: "google/gemini-2.0-flash",
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

**Output Format:**
Return a JSON object with the following structure:
{
  "greeting": "A personalized opening message (2-3 sentences) that shows you understand their brand and gets them excited",
  "strategy": {
    "recommendation": "AWARENESS" | "CONVERSION" | "ENGAGEMENT",
    "campaignAngle": "A catchy 2-4 word theme (e.g., 'Speed and Trust', 'Premium Quality', 'Always Available')",
    "headline": "Primary ad headline - punchy, max 8 words",
    "subheadline": "Supporting message - max 12 words",
    "rationale": "Why this approach works for them (2-3 sentences)",
    "callToAction": "Primary CTA button text (2-4 words)",
    "adFormats": ["300x250", "728x90", "160x600"],
    "targetingTips": ["Audience targeting tip 1", "Audience targeting tip 2"]
  }
}

IMPORTANT: Return ONLY the JSON, no markdown formatting or additional text.`,
  model: "google/gemini-2.0-flash"
});
const strategistChatAgent = new Agent({
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
    "headline": "New headline - max 8 words",
    "subheadline": "New supporting message - max 12 words",
    "rationale": "Why this new approach works (2-3 sentences)",
    "callToAction": "New CTA text (2-4 words)",
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
  model: "google/gemini-2.0-flash"
});

const designerAgent = new Agent({
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
4. Ensure designs align with the brand's identity and campaign goals

**Output Format:**
Return a JSON object with the following structure:
{
  "greeting": "A personalized opening message (2-3 sentences) expressing excitement about the creative direction",
  "creative": {
    "conceptName": "A catchy 2-4 word name for the creative concept",
    "visualStyle": "Brief description of the overall visual approach (e.g., 'Bold and Minimalist', 'Warm and Inviting')",
    "colorScheme": {
      "primary": "HEX color that aligns with brand",
      "secondary": "HEX color for contrast",
      "accent": "HEX pop color for CTAs",
      "background": "HEX background color"
    },
    "typography": {
      "headlineStyle": "Font style suggestion for headlines (e.g., 'Bold Sans-Serif, Impact')",
      "bodyStyle": "Font style for body text"
    },
    "layoutSuggestion": "Brief layout direction (1-2 sentences)",
    "animationIdeas": ["Animation idea 1", "Animation idea 2"],
    "moodKeywords": ["Keyword1", "Keyword2", "Keyword3"],
    "imageDirection": "Brief guidance on imagery/photography style"
  }
}

IMPORTANT: Return ONLY the JSON, no markdown formatting or additional text.`,
  model: "google/gemini-2.0-flash"
});
const designerChatAgent = new Agent({
  name: "designer-chat",
  instructions: `You are Davinci, a passionate Creative Director. You're in a conversation with a client about their ad creative.

**IMPORTANT:** Detect if the user is requesting a CREATIVE CHANGE. Creative change requests include:
- Asking for different colors, fonts, or styles
- Requesting a different visual approach
- Wanting to change the layout or animation
- Expressing they don't like the current direction

**If user requests a creative change:**
Return JSON in this format:
{
  "message": "Your conversational response explaining the new creative direction (2-3 sentences)",
  "updatedCreative": {
    "conceptName": "...",
    "visualStyle": "...",
    "colorScheme": { "primary": "...", "secondary": "...", "accent": "...", "background": "..." },
    "typography": { "headlineStyle": "...", "bodyStyle": "..." },
    "layoutSuggestion": "...",
    "animationIdeas": ["...", "..."],
    "moodKeywords": ["...", "...", "..."],
    "imageDirection": "..."
  }
}

**If user is just asking questions or making minor comments:**
Return JSON in this format:
{
  "message": "Your conversational response (2-4 sentences)"
}

Be artistic and visual in your language. Use emojis sparingly (\u{1F3A8} \u2728 \u{1F5BC}\uFE0F).
IMPORTANT: Always return valid JSON, no markdown.`,
  model: "google/gemini-2.0-flash"
});

const ScanInputSchema = z.object({
  url: z.string().url().describe("The URL to scan")
});
const ScanOutputSchema = z.object({
  logo: z.string(),
  colors: z.array(z.string()),
  businessName: z.string().optional(),
  shortName: z.string().optional(),
  tagline: z.string(),
  voice: z.array(z.string()),
  tone: z.string(),
  industry: z.string().optional(),
  brandSummary: z.string().optional(),
  targetAudiences: z.array(
    z.object({
      name: z.string(),
      description: z.string()
    })
  ).optional(),
  rawWebsiteText: z.string().optional()
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
    const { url } = inputData;
    const sessionKey = `session_${runId}`;
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
const extractLogoStep = createStep({
  id: "extract-logo",
  inputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  outputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ inputData }) => {
    const { url, sessionKey, success, error } = inputData;
    if (!success) {
      return { url, sessionKey, logoUrl: null, success: false, error };
    }
    const session = sessionStore.get(sessionKey);
    if (!session) {
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
      return { url, sessionKey, logoUrl, success: true };
    } catch (error2) {
      return {
        url,
        sessionKey,
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
    logoUrl: z.string().nullable(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  outputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    screenshotBase64: z.string(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ inputData }) => {
    const { url, sessionKey, logoUrl, success, error } = inputData;
    if (!success) {
      return {
        url,
        sessionKey,
        logoUrl,
        screenshotBase64: "",
        success: false,
        error
      };
    }
    const session = sessionStore.get(sessionKey);
    if (!session) {
      return {
        url,
        sessionKey,
        logoUrl,
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
        screenshotBase64: buffer.toString("base64"),
        success: true
      };
    } catch (error2) {
      return {
        url,
        sessionKey,
        logoUrl,
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
    logoUrl: z.string().nullable(),
    screenshotBase64: z.string(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  outputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    screenshotBase64: z.string(),
    rawWebsiteText: z.string(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  execute: async ({ inputData }) => {
    const { url, sessionKey, logoUrl, screenshotBase64, success, error } = inputData;
    if (!success) {
      return {
        url,
        sessionKey,
        logoUrl,
        screenshotBase64,
        rawWebsiteText: "",
        success: false,
        error
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
        success: false,
        error: "No session found"
      };
    }
    try {
      const rawWebsiteText = await extractWebsiteText(session.page);
      await closeBrowser(session.browser);
      sessionStore.delete(sessionKey);
      return {
        url,
        sessionKey,
        logoUrl,
        screenshotBase64,
        rawWebsiteText,
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
        success: false,
        error: error2 instanceof Error ? error2.message : "Failed to extract text"
      };
    }
  }
});
const analyzeWithAIStep = createStep({
  id: "analyze-with-ai",
  inputSchema: z.object({
    url: z.string(),
    sessionKey: z.string(),
    logoUrl: z.string().nullable(),
    screenshotBase64: z.string(),
    rawWebsiteText: z.string(),
    success: z.boolean(),
    error: z.string().optional()
  }),
  outputSchema: ScanOutputSchema,
  execute: async ({ inputData }) => {
    const { logoUrl, screenshotBase64, rawWebsiteText, success, error } = inputData;
    const defaultResult = {
      logo: logoUrl || "\u{1F680}",
      colors: ["#4F46E5", "#F97316", "#10B981", "#8B5CF6"],
      businessName: void 0,
      shortName: void 0,
      tagline: "Innovation meets excellence",
      voice: ["Innovative", "Trustworthy", "Modern"],
      tone: "Professional yet approachable",
      industry: void 0,
      brandSummary: void 0,
      targetAudiences: void 0,
      rawWebsiteText
    };
    if (!success || !screenshotBase64) {
      return {
        ...defaultResult,
        brandSummary: error || "Failed to scan website"
      };
    }
    try {
      const buffer = Buffer.from(screenshotBase64, "base64");
      const aiResult = await analyzeWithAI(buffer);
      return {
        logo: logoUrl || "\u{1F680}",
        colors: aiResult.colors?.length ? aiResult.colors.slice(0, 4) : defaultResult.colors,
        businessName: aiResult.businessName,
        shortName: aiResult.shortName,
        tagline: aiResult.tagline || defaultResult.tagline,
        voice: aiResult.voice?.length ? aiResult.voice : defaultResult.voice,
        tone: aiResult.tone || defaultResult.tone,
        industry: aiResult.industry,
        brandSummary: aiResult.brandSummary,
        targetAudiences: aiResult.targetAudiences,
        rawWebsiteText
      };
    } catch (error2) {
      return {
        ...defaultResult,
        brandSummary: error2 instanceof Error ? `AI analysis failed: ${error2.message}` : "AI analysis failed"
      };
    }
  }
});
const brandScanWorkflow = createWorkflow({
  id: "brand-scan",
  inputSchema: ScanInputSchema,
  outputSchema: ScanOutputSchema
}).then(launchBrowserStep).then(extractLogoStep).then(captureScreenshotStep).then(extractTextStep).then(analyzeWithAIStep).commit();
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

const STRATEGIST_SYSTEM_PROMPT = `
## SARAH - The Strategist

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

**Output Format:**
Return a JSON object with the following structure:
{
  "greeting": "A personalized opening message (2-3 sentences) that shows you understand their brand and gets them excited",
  "strategy": {
    "recommendation": "AWARENESS" | "CONVERSION" | "ENGAGEMENT",
    "campaignAngle": "A catchy 2-4 word theme (e.g., 'Speed and Trust', 'Premium Quality', 'Always Available')",
    "headline": "Primary ad headline - punchy, max 8 words",
    "subheadline": "Supporting message - max 12 words",
    "rationale": "Why this approach works for them (2-3 sentences)",
    "callToAction": "Primary CTA button text (2-4 words)",
    "adFormats": ["300x250", "728x90", "160x600"],
    "targetingTips": ["Audience targeting tip 1", "Audience targeting tip 2"]
  }
}

IMPORTANT: Return ONLY the JSON, no markdown formatting or additional text.
`;
const CHAT_SYSTEM_PROMPT$1 = `
You are Sarah, an energetic Digital Marketing Strategist. You're in a conversation with a client about their ad campaign strategy.

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
    "headline": "New headline - max 8 words",
    "subheadline": "New supporting message - max 12 words",
    "rationale": "Why this new approach works (2-3 sentences)",
    "callToAction": "New CTA text (2-4 words)",
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
IMPORTANT: Always return valid JSON, no markdown.
`;
async function generateInitialStrategy(brandProfile, campaignData) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
  });
  const contextPrompt = buildContextPrompt$1(brandProfile, campaignData);
  const result = await model.generateContent([
    STRATEGIST_SYSTEM_PROMPT,
    contextPrompt
  ]);
  const responseText = result.response.text();
  return parseStrategistResponse(responseText);
}
async function generateChatResponse(brandProfile, currentStrategy, userMessage, conversationHistory) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
  });
  const contextSummary = `
Brand: ${brandProfile.name} (${brandProfile.industry || "Unknown industry"})
Brand Summary: ${brandProfile.brandSummary || "N/A"}
Tagline: ${brandProfile.tagline || "N/A"}

Current Strategy:
- Type: ${currentStrategy.recommendation}
- Campaign Angle: "${currentStrategy.campaignAngle}"
- Headline: "${currentStrategy.headline}"
- Subheadline: "${currentStrategy.subheadline}"
- CTA: "${currentStrategy.callToAction}"
`;
  const historyText = conversationHistory.slice(-6).map((m) => `${m.role === "user" ? "Client" : "Sarah"}: ${m.content}`).join("\n");
  const result = await model.generateContent([
    CHAT_SYSTEM_PROMPT$1,
    `Context:
${contextSummary}`,
    `Recent conversation:
${historyText}`,
    `Client's latest message: "${userMessage}"`,
    "Respond as Sarah with JSON:"
  ]);
  const responseText = result.response.text();
  return parseChatResponse$1(responseText);
}
function buildContextPrompt$1(brand, campaign) {
  return `
## Brand Information
- Name: ${brand.name}${brand.shortName ? ` (commonly known as "${brand.shortName}")` : ""}
- Website: ${brand.url}
- Industry: ${brand.industry || "Not specified"}
- Tagline: ${brand.tagline || "None provided"}
- About: ${brand.brandSummary || "No description available"}
- Brand Voice: ${brand.tone || "Professional"}
- Personality: ${brand.personality?.join(", ") || "Not specified"}
- Brand Colors: ${brand.colors?.join(", ") || "Not specified"}

## Target Audiences
${brand.audiences && brand.audiences.length > 0 ? brand.audiences.map((a) => `- ${a.name}: ${a.description}`).join("\n") : "- General consumers"}

## Campaign Data (from website analysis)
- Current Promotions: ${campaign.currentPromos.length > 0 ? campaign.currentPromos.join(", ") : "None detected"}
- Unique Selling Points: ${campaign.uniqueSellingPoints.join(", ")}
- Seasonal Context: ${campaign.seasonalContext || "None"}
- Main CTAs on Website: ${campaign.callsToAction.join(", ")}
- Key Products/Services: ${campaign.keyProducts.join(", ")}

Based on this information, create a strategic campaign recommendation.
`;
}
function parseStrategistResponse(responseText) {
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    return JSON.parse(jsonString);
  } catch {
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
      }
    };
  }
}
function parseChatResponse$1(responseText) {
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    const parsed = JSON.parse(jsonString);
    return {
      message: parsed.message || "Let me think about that...",
      updatedStrategy: parsed.updatedStrategy || void 0
    };
  } catch {
    return {
      message: responseText.slice(0, 500) || "Great point! Let me think about that. \u{1F3AF}"
    };
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
    colors: z.array(z.string()).optional(),
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
      const result = await generateInitialStrategy(
        brandProfile,
        campaignData
      );
      return {
        greeting: result.greeting,
        strategy: result.strategy,
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

const DESIGNER_SYSTEM_PROMPT = `
## DAVINCI - The Designer

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
4. Ensure designs align with the brand's identity and campaign goals

**Output Format:**
Return a JSON object with the following structure:
{
  "greeting": "A personalized opening message (2-3 sentences) expressing excitement about the creative direction",
  "creative": {
    "conceptName": "A catchy 2-4 word name for the creative concept",
    "visualStyle": "Brief description of the overall visual approach (e.g., 'Bold and Minimalist', 'Warm and Inviting')",
    "colorScheme": {
      "primary": "HEX color that aligns with brand",
      "secondary": "HEX color for contrast",
      "accent": "HEX pop color for CTAs",
      "background": "HEX background color"
    },
    "typography": {
      "headlineStyle": "Font style suggestion for headlines (e.g., 'Bold Sans-Serif, Impact')",
      "bodyStyle": "Font style for body text"
    },
    "layoutSuggestion": "Brief layout direction (1-2 sentences)",
    "animationIdeas": ["Animation idea 1", "Animation idea 2"],
    "moodKeywords": ["Keyword1", "Keyword2", "Keyword3"],
    "imageDirection": "Brief guidance on imagery/photography style"
  }
}

IMPORTANT: Return ONLY the JSON, no markdown formatting or additional text.
`;
const CHAT_SYSTEM_PROMPT = `
You are Davinci, a passionate Creative Director. You're in a conversation with a client about their ad creative.

**IMPORTANT:** Detect if the user is requesting a CREATIVE CHANGE. Creative change requests include:
- Asking for different colors, fonts, or styles
- Requesting a different visual approach
- Wanting to change the layout or animation
- Expressing they don't like the current direction

**If user requests a creative change:**
Return JSON in this format:
{
  "message": "Your conversational response explaining the new creative direction (2-3 sentences)",
  "updatedCreative": {
    "conceptName": "...",
    "visualStyle": "...",
    "colorScheme": { "primary": "...", "secondary": "...", "accent": "...", "background": "..." },
    "typography": { "headlineStyle": "...", "bodyStyle": "..." },
    "layoutSuggestion": "...",
    "animationIdeas": ["...", "..."],
    "moodKeywords": ["...", "...", "..."],
    "imageDirection": "..."
  }
}

**If user is just asking questions or making minor comments:**
Return JSON in this format:
{
  "message": "Your conversational response (2-4 sentences)"
}

Be artistic and visual in your language. Use emojis sparingly (\u{1F3A8} \u2728 \u{1F5BC}\uFE0F).
IMPORTANT: Always return valid JSON, no markdown.
`;
async function generateInitialCreative(brandProfile, strategy, campaignData) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
  });
  const contextPrompt = buildContextPrompt(
    brandProfile,
    strategy,
    campaignData
  );
  const result = await model.generateContent([
    DESIGNER_SYSTEM_PROMPT,
    contextPrompt
  ]);
  const responseText = result.response.text();
  return parseDesignerResponse(responseText, brandProfile);
}
async function generateDesignerChatResponse(brandProfile, currentCreative, userMessage, conversationHistory) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
  });
  const contextSummary = `
Brand: ${brandProfile.name} (${brandProfile.industry || "Unknown industry"})
Brand Colors: ${brandProfile.colors?.join(", ") || "Not specified"}

Current Creative:
- Concept: "${currentCreative.conceptName}"
- Visual Style: "${currentCreative.visualStyle}"
- Colors: Primary ${currentCreative.colorScheme.primary}, Accent ${currentCreative.colorScheme.accent}
- Layout: ${currentCreative.layoutSuggestion}
`;
  const historyText = conversationHistory.slice(-6).map((m) => `${m.role === "user" ? "Client" : "Davinci"}: ${m.content}`).join("\n");
  const result = await model.generateContent([
    CHAT_SYSTEM_PROMPT,
    `Context:
${contextSummary}`,
    `Recent conversation:
${historyText}`,
    `Client's latest message: "${userMessage}"`,
    "Respond as Davinci with JSON:"
  ]);
  const responseText = result.response.text();
  return parseChatResponse(responseText);
}
function buildContextPrompt(brand, strategy, campaign) {
  return `
## Brand Information
- Name: ${brand.name}
- Industry: ${brand.industry || "Not specified"}
- Tagline: ${brand.tagline || "None provided"}
- About: ${brand.brandSummary || "No description available"}
- Brand Voice: ${brand.tone || "Professional"}
- Brand Colors: ${brand.colors?.join(", ") || "Not specified"}
- Personality: ${brand.personality?.join(", ") || "Not specified"}

## Target Audiences
${brand.audiences && brand.audiences.length > 0 ? brand.audiences.map((a) => `- ${a.name}: ${a.description}`).join("\n") : "- General consumers"}

## Approved Campaign Strategy
- Type: ${strategy.recommendation}
- Campaign Angle: "${strategy.campaignAngle}"
- Headline: "${strategy.headline}"
- Subheadline: "${strategy.subheadline}"
- CTA: "${strategy.callToAction}"
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
    const primaryColor = brand.colors?.[0] || "#4F46E5";
    const secondaryColor = brand.colors?.[1] || "#F97316";
    return {
      greeting: `Hey! \u{1F3A8} I've been studying your brand and the campaign strategy, and I'm really excited about the creative possibilities here! Let me show you what I have in mind.`,
      creative: {
        conceptName: "Bold Impact",
        visualStyle: "Modern and Dynamic",
        colorScheme: {
          primary: primaryColor,
          secondary: secondaryColor,
          accent: "#10B981",
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
        imageDirection: "Clean product shots or abstract brand imagery with strong contrast."
      }
    };
  }
}
function parseChatResponse(responseText) {
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    const parsed = JSON.parse(jsonString);
    return {
      message: parsed.message || "Let me think about that...",
      updatedCreative: parsed.updatedCreative || void 0
    };
  } catch {
    return {
      message: responseText.slice(0, 500) || "Interesting direction! Let me think about how we can make that work visually. \u{1F3A8}"
    };
  }
}

const BrandProfileSchema = z.object({
  name: z.string(),
  shortName: z.string().optional(),
  url: z.string().optional(),
  industry: z.string().optional(),
  tagline: z.string().optional(),
  brandSummary: z.string().optional(),
  tone: z.string().optional(),
  personality: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
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
    imageDirection: z.string()
  })
});
const generateCreativeStep = createStep({
  id: "generate-creative",
  inputSchema: DesignerInputSchema,
  outputSchema: CreativeOutputSchema,
  execute: async ({ inputData }) => {
    const { brandProfile, strategy, campaignData } = inputData;
    try {
      const result = await generateInitialCreative(
        brandProfile,
        strategy,
        campaignData || null
      );
      return {
        greeting: result.greeting,
        creative: result.creative
      };
    } catch (error) {
      const primaryColor = brandProfile.colors?.[0] || "#4F46E5";
      const secondaryColor = brandProfile.colors?.[1] || "#F97316";
      return {
        greeting: `Hey! \u{1F3A8} I've been studying your brand and the campaign strategy, and I'm really excited about the creative possibilities here! Let me show you what I have in mind.`,
        creative: {
          conceptName: "Bold Impact",
          visualStyle: "Modern and Dynamic",
          colorScheme: {
            primary: primaryColor,
            secondary: secondaryColor,
            accent: "#10B981",
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
    designerChat: designerChatAgent
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
