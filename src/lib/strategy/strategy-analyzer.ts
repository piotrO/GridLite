import { GoogleGenerativeAI } from "@google/generative-ai";

export interface CampaignData {
  currentPromos: string[];
  uniqueSellingPoints: string[];
  seasonalContext: string | null;
  callsToAction: string[];
  keyProducts: string[];
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

const DEFAULT_CAMPAIGN_DATA: CampaignData = {
  currentPromos: [],
  uniqueSellingPoints: ["Quality service", "Professional team"],
  seasonalContext: null,
  callsToAction: ["Contact Us"],
  keyProducts: ["Professional services"],
};

/**
 * Extracts campaign-relevant data from website text using Gemini.
 */
export async function extractCampaignData(
  websiteText: string
): Promise<CampaignData> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const result = await model.generateContent([
    CAMPAIGN_EXTRACTION_PROMPT,
    `\n\nWebsite Content:\n${websiteText}`,
  ]);

  const responseText = result.response.text();

  return parseCampaignResponse(responseText);
}

function parseCampaignResponse(responseText: string): CampaignData {
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : responseText.trim();
    const parsed = JSON.parse(jsonString);

    return {
      currentPromos: parsed.currentPromos || [],
      uniqueSellingPoints:
        parsed.uniqueSellingPoints || DEFAULT_CAMPAIGN_DATA.uniqueSellingPoints,
      seasonalContext: parsed.seasonalContext || null,
      callsToAction:
        parsed.callsToAction || DEFAULT_CAMPAIGN_DATA.callsToAction,
      keyProducts: parsed.keyProducts || DEFAULT_CAMPAIGN_DATA.keyProducts,
    };
  } catch {
    return DEFAULT_CAMPAIGN_DATA;
  }
}
