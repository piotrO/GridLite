import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIAnalysisResult } from "./types";

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
2. "tagline": A concise brand tagline (max 10 words) based on the website content.
3. "voice": Array of 3 adjectives describing the brand voice.
4. "tone": Professional description of brand tone (max 50 words).
5. "brandSummary": What does this company sell/do? (1-2 sentences, max 30 words).
6. "targetAudiences": Array of up to 3 target audience descriptions (e.g., "Tech-savvy millennials", "Small business owners", "Health-conscious parents").

Return only raw JSON in this exact format: 
{ "colors": ["#...", "#...", "#..."], "tagline": "...", "voice": ["...", "...", "..."], "tone": "...", "brandSummary": "...", "targetAudiences": ["...", "...", "..."] }
`;

const DEFAULT_AI_RESULT: AIAnalysisResult = {
  colors: ["#4F46E5", "#F97316", "#10B981"],
  tagline: "Building the future, one pixel at a time",
  voice: ["Innovative", "Trustworthy", "Modern"],
  tone: "Professional yet approachable",
  brandSummary: "A premium technology company focused on innovation.",
  targetAudiences: [
    "Tech-savvy professionals",
    "Early adopters",
    "Digital-first businesses",
  ],
};

/**
 * Analyzes a screenshot using Google Gemini AI to extract brand information.
 */
export async function analyzeWithAI(
  screenshotBuffer: Buffer
): Promise<AIAnalysisResult> {
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

  const base64Screenshot = screenshotBuffer.toString("base64");

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "image/png",
        data: base64Screenshot,
      },
    },
    AI_PROMPT,
  ]);

  const responseText = result.response.text();

  return parseAIResponse(responseText);
}

/**
 * Parses the AI response text into a structured result.
 */
function parseAIResponse(responseText: string): AIAnalysisResult {
  try {
    // Remove markdown code blocks if present
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    return JSON.parse(jsonString);
  } catch {
    // Fallback if AI doesn't return valid JSON
    return DEFAULT_AI_RESULT;
  }
}

/**
 * Checks if an error is a rate limit error.
 */
export function isRateLimitError(error: Error): boolean {
  const message = error.message;
  return (
    message.includes("429") ||
    message.toLowerCase().includes("too many requests")
  );
}
