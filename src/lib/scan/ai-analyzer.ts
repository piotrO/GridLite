import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIAnalysisResult } from "@/lib/shared/types";

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

const DEFAULT_AI_RESULT: AIAnalysisResult = {
  brand_profile: {
    name: "Premium Tech Company",
    industry: "Technology & Software",
    tagline: "Our tagline",
    brandSummary:
      "A leading provider of innovative hardware and software solutions for modern teams.",
    targetAudiences: [
      {
        name: "Creative Professionals",
        description: "Designers and developers seeking high-end tools.",
      },
      {
        name: "Enterprise IT",
        description: "Decision makers in large-scale tech organizations.",
      },
    ],
    archetype: {
      primary: "The Creator",
      secondary: "The Sage",
      brand_motivation:
        "Focuses on enabling professional creativity through technical mastery.",
    },
    personality_dimensions: {
      sincerity: 3,
      excitement: 4,
      competence: 5,
      sophistication: 4,
      ruggedness: 2,
    },
    linguistic_mechanics: {
      formality_index: "High",
      urgency_level: "Low",
      etymology_bias: "Latinate",
    },
    guidelines: {
      voice_label: "Modern Professional",
      voice_instructions:
        "Write with confident clarity. Use active voice and direct statements. Balance professionalism with approachability. Avoid jargon unless speaking to technical audiences.",
      dos: [
        "Use short, punchy sentence fragments",
        "Highlight 'family farm' and 'heirloom' origins",
        "Use contractions to sound conversational",
      ],
      donts: [],
    },
  },
};

/**
 * Analyzes a screenshot using Google Gemini AI to extract brand information.
 */
export async function analyzeWithAI(
  screenshotBuffer: Buffer,
): Promise<AIAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not set. Please add it to your .env.local file.",
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
