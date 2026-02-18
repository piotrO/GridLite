import { NextRequest, NextResponse } from "next/server";
import { mastra } from "@/mastra";
import { SUPPORTED_LANGUAGES } from "@/types/localization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface LocalizeRequest {
  copy: {
    headline: string;
    bodyCopy: string;
    ctaText: string;
  };
  products?: {
    productId: string;
    title: string;
    vendor: string;
    ctaText: string;
  }[];
  brandProfile: {
    name: string;
    industry?: string;
    tone?: string;
    personality?: string[];
  };
  targetLanguages: string[];
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body: LocalizeRequest = await request.json();

    if (!body.copy || !body.targetLanguages?.length) {
      return NextResponse.json(
        { error: "copy and targetLanguages are required" },
        { status: 400 },
      );
    }

    const isDpa = body.products && body.products.length > 0;

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: any) => {
          const message = JSON.stringify(event) + "\n";
          controller.enqueue(encoder.encode(message));
        };

        try {
          const nonEnglishLangs = body.targetLanguages.filter(
            (l) => l !== "en",
          );

          const steps = nonEnglishLangs.map((code) => {
            const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
            return {
              id: `translate-${code}`,
              label: `${lang?.flag || "🌐"} Translating to ${lang?.name || code}`,
            };
          });

          sendEvent({ type: "init", steps });

          const results: Record<string, any> = {};
          const agent = isDpa
            ? mastra.getAgent("localizerDpa")
            : mastra.getAgent("localizer");

          for (const code of nonEnglishLangs) {
            const stepId = `translate-${code}`;
            const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
            const langName = lang?.name || code;

            sendEvent({ type: "step_start", stepId });

            try {
              let prompt: string;

              if (isDpa && body.products) {
                const productsPayload = body.products.map((p) => ({
                  id: p.productId,
                  title: p.title,
                  vendor: p.vendor,
                  ctaText: p.ctaText,
                }));

                prompt = `Localize the following product ad copy to ${langName} (${code}).

Brand: ${body.brandProfile.name}
Industry: ${body.brandProfile.industry || "General"}
Tone: ${body.brandProfile.tone || "Professional"}

Campaign copy (also translate this):
- Headline: ${body.copy.headline}
- Body copy: ${body.copy.bodyCopy}
- CTA: ${body.copy.ctaText}

Products to localize:
${JSON.stringify(productsPayload, null, 2)}

Return JSON with both "copy" (headline, bodyCopy, ctaText) and "products" array.`;
              } else {
                prompt = `Localize the following advertising copy to ${langName} (${code}).

Brand: ${body.brandProfile.name}
Industry: ${body.brandProfile.industry || "General"}
Tone: ${body.brandProfile.tone || "Professional"}
Personality: ${body.brandProfile.personality?.join(", ") || "Professional"}

Copy to localize:
- Headline: "${body.copy.headline}"
- Body copy: "${body.copy.bodyCopy}"
- CTA text: "${body.copy.ctaText}"`;
              }

              const response = await agent.generate(prompt);
              const text =
                typeof response.text === "string"
                  ? response.text
                  : JSON.stringify(response.text);

              const jsonMatch = text.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);

                // Fix product IDs — LLMs often truncate/modify long Shopify IDs,
                // so we inject the original IDs back by index position
                if (isDpa && parsed.products && body.products) {
                  parsed.products.forEach((p: any, idx: number) => {
                    if (body.products![idx]) {
                      p.productId = body.products![idx].productId;
                    }
                  });
                }

                results[code] = parsed;
              } else {
                results[code] = { error: "Failed to parse response" };
              }

              sendEvent({ type: "step_complete", stepId, success: true });
            } catch (e) {
              console.error(`[Localize] Failed for ${code}:`, e);
              results[code] = {
                error: e instanceof Error ? e.message : "Translation failed",
              };
              sendEvent({ type: "step_complete", stepId, success: false });
            }
          }

          sendEvent({ type: "complete", data: { translations: results } });
          controller.close();
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : "Localization failed";
          sendEvent({ type: "error", message: msg });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 },
    );
  }
}
