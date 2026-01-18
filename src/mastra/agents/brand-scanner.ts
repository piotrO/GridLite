import { Agent } from "@mastra/core/agent";
import {
  browserSessionTool,
  closeBrowserTool,
  logoExtractorTool,
  screenshotTool,
  textExtractorTool,
  aiAnalyzerTool,
} from "../tools";

/**
 * BrandScanner Agent
 *
 * An AI agent that analyzes websites to extract comprehensive brand information.
 * Uses a sequence of tools to:
 * 1. Launch a browser and navigate to the target URL
 * 2. Extract the brand logo
 * 3. Capture a screenshot for AI analysis
 * 4. Extract text content for strategy analysis
 * 5. Analyze the screenshot with Gemini AI
 * 6. Close the browser session
 */
export const brandScannerAgent = new Agent({
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
  "logo": "<logo URL or 🚀 if not found>",
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
    "ai-brand-analyzer": aiAnalyzerTool,
  },
});
