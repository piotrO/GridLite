import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

export { aiAnalyzerTool as a, analyzeWithAI as b };
