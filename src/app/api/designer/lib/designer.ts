import { GoogleGenerativeAI } from "@google/generative-ai";

export interface BrandProfile {
  name: string;
  shortName?: string;
  url: string;
  industry?: string;
  tagline?: string;
  brandSummary?: string;
  tone?: string;
  personality?: string[];
  colors?: string[];
  logo?: string;
  audiences?: { name: string; description: string }[];
}

export interface StrategyData {
  recommendation: "AWARENESS" | "CONVERSION" | "ENGAGEMENT";
  campaignAngle: string;
  headline: string;
  subheadline: string;
  rationale: string;
  callToAction: string;
  adFormats: string[];
  targetingTips: string[];
}

export interface CampaignData {
  currentPromos: string[];
  uniqueSellingPoints: string[];
  seasonalContext: string | null;
  callsToAction: string[];
  keyProducts: string[];
}

export interface CreativeDirection {
  greeting: string;
  creative: {
    conceptName: string;
    visualStyle: string;
    colorScheme: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
    };
    typography: {
      headlineStyle: string;
      bodyStyle: string;
    };
    layoutSuggestion: string;
    animationIdeas: string[];
    moodKeywords: string[];
    imageDirection: string;
  };
}

export interface ChatResponse {
  message: string;
  updatedCreative?: CreativeDirection["creative"];
}

const DESIGNER_SYSTEM_PROMPT = `
## DAVINCI - The Designer

**Role:** You are Davinci, a passionate Creative Director with 20 years of experience in advertising and visual design. You've designed campaigns for global brands and have won multiple Cannes Lions. You specialize in digital display advertising.

**Personality:**
- Artistic and visually expressive
- Speaks in visual metaphors ("imagine", "picture this", "envision")
- Passionate about aesthetics, color theory, and typography
- Uses emojis: 🎨 ✨ 🖼️ 💫 🌈 ⚡
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

Be artistic and visual in your language. Use emojis sparingly (🎨 ✨ 🖼️).
IMPORTANT: Always return valid JSON, no markdown.
`;

/**
 * Generates initial creative direction from Designer persona.
 */
export async function generateInitialCreative(
  brandProfile: BrandProfile,
  strategy: StrategyData,
  campaignData: CampaignData | null
): Promise<CreativeDirection> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const contextPrompt = buildContextPrompt(
    brandProfile,
    strategy,
    campaignData
  );

  const result = await model.generateContent([
    DESIGNER_SYSTEM_PROMPT,
    contextPrompt,
  ]);

  const responseText = result.response.text();
  return parseDesignerResponse(responseText, brandProfile);
}

/**
 * Generates chat response from Designer persona.
 */
export async function generateDesignerChatResponse(
  brandProfile: BrandProfile,
  currentCreative: CreativeDirection["creative"],
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
Brand Colors: ${brandProfile.colors?.join(", ") || "Not specified"}

Current Creative:
- Concept: "${currentCreative.conceptName}"
- Visual Style: "${currentCreative.visualStyle}"
- Colors: Primary ${currentCreative.colorScheme.primary}, Accent ${
    currentCreative.colorScheme.accent
  }
- Layout: ${currentCreative.layoutSuggestion}
`;

  const historyText = conversationHistory
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Client" : "Davinci"}: ${m.content}`)
    .join("\n");

  const result = await model.generateContent([
    CHAT_SYSTEM_PROMPT,
    `Context:\n${contextSummary}`,
    `Recent conversation:\n${historyText}`,
    `Client's latest message: "${userMessage}"`,
    "Respond as Davinci with JSON:",
  ]);

  const responseText = result.response.text();
  return parseChatResponse(responseText);
}

function buildContextPrompt(
  brand: BrandProfile,
  strategy: StrategyData,
  campaign: CampaignData | null
): string {
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
${
  brand.audiences && brand.audiences.length > 0
    ? brand.audiences.map((a) => `- ${a.name}: ${a.description}`).join("\n")
    : "- General consumers"
}

## Approved Campaign Strategy
- Type: ${strategy.recommendation}
- Campaign Angle: "${strategy.campaignAngle}"
- Headline: "${strategy.headline}"
- Subheadline: "${strategy.subheadline}"
- CTA: "${strategy.callToAction}"
- Ad Formats: ${strategy.adFormats.join(", ")}

## Campaign Data
${
  campaign
    ? `
- Current Promotions: ${campaign.currentPromos.join(", ") || "None"}
- Key Products: ${campaign.keyProducts.join(", ")}
- USPs: ${campaign.uniqueSellingPoints.join(", ")}
`
    : "No additional campaign data available."
}

Based on this information, create a cohesive visual direction that brings this campaign to life.
`;
}

function parseDesignerResponse(
  responseText: string,
  brand: BrandProfile
): CreativeDirection {
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    return JSON.parse(jsonString);
  } catch {
    // Fallback response using brand colors if available
    const primaryColor = brand.colors?.[0] || "#4F46E5";
    const secondaryColor = brand.colors?.[1] || "#F97316";

    return {
      greeting: `Hey! 🎨 I've been studying your brand and the campaign strategy, and I'm really excited about the creative possibilities here! Let me show you what I have in mind.`,
      creative: {
        conceptName: "Bold Impact",
        visualStyle: "Modern and Dynamic",
        colorScheme: {
          primary: primaryColor,
          secondary: secondaryColor,
          accent: "#10B981",
          background: "#FFFFFF",
        },
        typography: {
          headlineStyle: "Bold Sans-Serif",
          bodyStyle: "Clean Sans-Serif",
        },
        layoutSuggestion:
          "Hero headline at top with strong visual center and CTA button prominently placed at bottom.",
        animationIdeas: [
          "Fade-in headline with subtle slide",
          "Pulsing CTA button to draw attention",
        ],
        moodKeywords: ["Professional", "Trustworthy", "Modern"],
        imageDirection:
          "Clean product shots or abstract brand imagery with strong contrast.",
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
      updatedCreative: parsed.updatedCreative || undefined,
    };
  } catch {
    return {
      message:
        responseText.slice(0, 500) ||
        "Interesting direction! Let me think about how we can make that work visually. 🎨",
    };
  }
}
