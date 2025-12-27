import { GoogleGenerativeAI } from "@google/generative-ai";
import { CampaignData } from "./strategy-analyzer";

export interface BrandProfileInput {
  name: string;
  shortName?: string;
  url: string;
  industry?: string;
  tagline?: string;
  brandSummary?: string;
  tone?: string;
  personality?: string[];
  colors?: string[];
  audiences?: { name: string; description: string }[];
}

export interface StrategyDocument {
  recommendation: "AWARENESS" | "CONVERSION" | "ENGAGEMENT";
  campaignAngle: string;
  headline: string;
  subheadline: string;
  rationale: string;
  callToAction: string;
  adFormats: string[];
  targetingTips: string[];
}

export interface StrategistResponse {
  greeting: string;
  strategy: StrategyDocument;
}

export interface ChatResponse {
  message: string;
  updatedStrategy?: StrategyDocument;
}

const STRATEGIST_SYSTEM_PROMPT = `
## SARAH - The Strategist

**Role:** You are Sarah, an energetic and insightful Digital Marketing Strategist with 15 years of experience. You've worked with Fortune 500 brands and small businesses alike. You specialize in display advertising campaigns.

**Personality:**
- Enthusiastic and data-driven, but approachable
- Use casual language with strategic depth
- Often start messages with "Hey!" or "Love it!" or "Great news!"
- Use emojis sparingly but effectively: 🎯 💡 📊 ✨ 🚀
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

const CHAT_SYSTEM_PROMPT = `
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

Use a casual, friendly tone. Use emojis sparingly (🎯 💡 ✨).
IMPORTANT: Always return valid JSON, no markdown.
`;

/**
 * Generates initial strategy recommendation from Strategist persona.
 */
export async function generateInitialStrategy(
  brandProfile: BrandProfileInput,
  campaignData: CampaignData
): Promise<StrategistResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const contextPrompt = buildContextPrompt(brandProfile, campaignData);

  const result = await model.generateContent([
    STRATEGIST_SYSTEM_PROMPT,
    contextPrompt,
  ]);

  const responseText = result.response.text();
  return parseStrategistResponse(responseText);
}

/**
 * Generates chat response from Strategist persona.
 * May include an updated strategy if user requests changes.
 */
export async function generateChatResponse(
  brandProfile: BrandProfileInput,
  currentStrategy: StrategyDocument,
  userMessage: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[]
): Promise<ChatResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
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

  const historyText = conversationHistory
    .slice(-6) // Keep last 6 messages for context
    .map((m) => `${m.role === "user" ? "Client" : "Sarah"}: ${m.content}`)
    .join("\n");

  const result = await model.generateContent([
    CHAT_SYSTEM_PROMPT,
    `Context:\n${contextSummary}`,
    `Recent conversation:\n${historyText}`,
    `Client's latest message: "${userMessage}"`,
    "Respond as Sarah with JSON:",
  ]);

  const responseText = result.response.text();
  return parseChatResponse(responseText);
}

function buildContextPrompt(
  brand: BrandProfileInput,
  campaign: CampaignData
): string {
  return `
## Brand Information
- Name: ${brand.name}${
    brand.shortName ? ` (commonly known as "${brand.shortName}")` : ""
  }
- Website: ${brand.url}
- Industry: ${brand.industry || "Not specified"}
- Tagline: ${brand.tagline || "None provided"}
- About: ${brand.brandSummary || "No description available"}
- Brand Voice: ${brand.tone || "Professional"}
- Personality: ${brand.personality?.join(", ") || "Not specified"}
- Brand Colors: ${brand.colors?.join(", ") || "Not specified"}

## Target Audiences
${
  brand.audiences && brand.audiences.length > 0
    ? brand.audiences.map((a) => `- ${a.name}: ${a.description}`).join("\n")
    : "- General consumers"
}

## Campaign Data (from website analysis)
- Current Promotions: ${
    campaign.currentPromos.length > 0
      ? campaign.currentPromos.join(", ")
      : "None detected"
  }
- Unique Selling Points: ${campaign.uniqueSellingPoints.join(", ")}
- Seasonal Context: ${campaign.seasonalContext || "None"}
- Main CTAs on Website: ${campaign.callsToAction.join(", ")}
- Key Products/Services: ${campaign.keyProducts.join(", ")}

Based on this information, create a strategic campaign recommendation.
`;
}

function parseStrategistResponse(responseText: string): StrategistResponse {
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    return JSON.parse(jsonString);
  } catch {
    // Fallback response if parsing fails
    return {
      greeting:
        "Hey! I've been diving into your brand and I'm really excited about what I see! 🎯 Let me share my strategic recommendation.",
      strategy: {
        recommendation: "AWARENESS",
        campaignAngle: "Quality & Trust",
        headline: "Your Success Starts Here",
        subheadline: "Professional solutions you can count on",
        rationale:
          "Building brand awareness is key for establishing market presence. A trust-focused campaign resonates with audiences seeking reliability.",
        callToAction: "Learn More",
        adFormats: ["300x250", "728x90", "160x600"],
        targetingTips: [
          "Target users interested in your industry",
          "Use lookalike audiences from your customer base",
        ],
      },
    };
  }
}

function parseChatResponse(responseText: string): ChatResponse {
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    const parsed = JSON.parse(jsonString);

    return {
      message: parsed.message || "Let me think about that...",
      updatedStrategy: parsed.updatedStrategy || undefined,
    };
  } catch {
    // Fallback: treat the whole response as a message
    return {
      message:
        responseText.slice(0, 500) ||
        "Great point! Let me think about that. 🎯",
    };
  }
}
