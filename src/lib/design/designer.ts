import { mastra } from "@/mastra";
import type {
  BrandProfile,
  CreativeData,
  ChatResponse,
} from "@/lib/shared/types";

// Re-export types for backwards compatibility
export type {
  BrandProfile,
  StrategyDocument as StrategyData,
  CampaignData,
  CreativeDirection,
  CreativeData,
  ChatResponse,
} from "@/lib/shared/types";

/**
 * Generates chat response from Designer persona using Mastra agent.
 */
export async function generateDesignerChatResponse(
  brandProfile: BrandProfile,
  currentCreative: CreativeData,
  userMessage: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[],
  currentContent?: { headline: string; bodyCopy: string; ctaText: string }
): Promise<ChatResponse> {
  const agent = mastra.getAgent("designerChat");

  const contextSummary = `
Brand: ${brandProfile.name} (${brandProfile.industry || "Unknown industry"})
Brand Colors: ${brandProfile.colors?.join(", ") || "Not specified"}

Current Creative:
- Concept: "${currentCreative.conceptName}"
- Visual Style: "${currentCreative.visualStyle}"
- Colors: Primary ${currentCreative.colorScheme.primary}, Accent ${currentCreative.colorScheme.accent}
- Layout: ${currentCreative.layoutSuggestion}

Current Ad Copy:
- Headline: "${currentContent?.headline || "Not set"}"
- Body Text: "${currentContent?.bodyCopy || "Not set"}"
- CTA Button: "${currentContent?.ctaText || "Not set"}"
`;

  const historyText = conversationHistory
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Client" : "Davinci"}: ${m.content}`)
    .join("\n");

  const result = await agent.generate([
    { role: "user", content: `Context:\n${contextSummary}` },
    { role: "user", content: `Recent conversation:\n${historyText}` },
    { role: "user", content: `Client's latest message: "${userMessage}"` },
    { role: "user", content: "Respond as Davinci with JSON:" },
  ]);

  return parseChatResponse(result.text);
}

function parseChatResponse(responseText: string): ChatResponse {
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    const parsed = JSON.parse(jsonString);

    return {
      message: parsed.message || "Let me think about that...",
      updatedCreative: parsed.updatedCreative || undefined,
      layerModifications: parsed.layerModifications || undefined,
      imageGenerationRequest: parsed.imageGenerationRequest || undefined,
      needsClarification: parsed.needsClarification || false,
      clarificationContext: parsed.clarificationContext || undefined,
    };
  } catch {
    return {
      message:
        responseText.slice(0, 500) ||
        "Interesting direction! Let me think about how we can make that work visually. 🎨",
    };
  }
}
