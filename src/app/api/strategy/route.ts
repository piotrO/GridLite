import { NextRequest, NextResponse } from "next/server";
import { mastra } from "@/mastra";
import { BrandProfileInput, StrategyDocument } from "@/lib/strategy/strategist";
import { Product, CatalogStats, DPAStrategy } from "@/types/shopify";

// Force Node.js runtime (Playwright doesn't work in Edge runtime)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Allow up to 5 minutes for strategy generation (AI workflows)
export const maxDuration = 300;

interface StrategyRequest {
  // Brand profile (required)
  brandProfile: BrandProfileInput;

  // Option A: Pass raw website text from Phase 1 (Scan → Strategy flow)
  rawWebsiteText?: string;

  // Option B: URL for text-only rescan (Dashboard → Strategy flow)
  websiteUrl?: string;

  // Campaign type: display (default) or dpa
  campaignType?: "display" | "dpa";

  // For DPA mode: product catalog data
  products?: Product[];
  catalogStats?: CatalogStats;

  // For chat continuation
  mode?: "initial" | "chat";
  userMessage?: string;
  currentStrategy?: StrategyDocument;
  currentDpaStrategy?: DPAStrategy;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body: StrategyRequest = await request.json();

    if (!body.brandProfile) {
      return NextResponse.json(
        { error: "brandProfile is required" },
        { status: 400 },
      );
    }

    const isDpaMode = body.campaignType === "dpa";

    // Handle chat mode (simple response, no streaming needed)
    if (body.mode === "chat" && body.userMessage && body.currentStrategy) {
      // Use DPA chat agent for DPA campaigns
      const agentId = isDpaMode ? "strategistDpaChat" : "strategistChat";
      const agent = mastra.getAgent(agentId);

      const contextSummary = `
Brand: ${body.brandProfile.name} (${body.brandProfile.industry || "Unknown industry"})
Brand Summary: ${body.brandProfile.brandSummary || "N/A"}
Tagline: ${body.brandProfile.tagline || "N/A"}

Current Strategy:
- Type: ${body.currentStrategy.recommendation}
- Campaign Angle: "${body.currentStrategy.campaignAngle}"
- Headline: "${body.currentStrategy.headline}"
- Subheadline: "${body.currentStrategy.subheadline}"
- CTA: "${body.currentStrategy.callToAction}"
${
  isDpaMode && body.currentDpaStrategy
    ? `
DPA Strategy:
- Selected Products: ${body.currentDpaStrategy.segments?.map((s) => s.name).join(", ") || "N/A"}
- Product Count: ${body.currentDpaStrategy.totalProducts || 0}
`
    : ""
}`;

      const history = (body.conversationHistory || []).slice(-6).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const result = await agent.generate([
        { role: "user", content: `Context:\n${contextSummary}` },
        ...history,
        { role: "user", content: body.userMessage },
        { role: "user", content: "Respond as Sarah with JSON:" },
      ] as any);

      let parsed;
      try {
        const jsonMatch = result.text.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonString = jsonMatch ? jsonMatch[1].trim() : result.text.trim();
        parsed = JSON.parse(jsonString);
      } catch {
        parsed = { message: result.text };
      }

      return NextResponse.json({
        type: "chat",
        message: parsed.message,
        updatedStrategy: parsed.updatedStrategy,
        updatedDpaStrategy: parsed.updatedDpaStrategy,
      });
    }

    // Initial strategy generation (streaming via
    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;
        const startTime = Date.now();
        console.log(`[Strategy Stream] Started at ${new Date().toISOString()}`);

        const encodeEvent = (event: unknown) => {
          if (closed) return;
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
            );
          } catch (e) {
            console.error("[Strategy Stream] Error enqueuing event:", e);
          }
        };

        const closeStream = () => {
          if (closed) return;
          closed = true;
          clearInterval(keepAlive);
          try {
            controller.close();
            const closeTime = Math.round((Date.now() - startTime) / 1000);
            console.log(`[Strategy Stream] Stream closed at ${closeTime}s.`);
          } catch {
            // ignore
          }
        };

        // Keep connection alive during long AI steps
        const keepAlive = setInterval(() => {
          if (closed) return;
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          console.log(`[Strategy Stream] Interval ping at ${elapsed}s`);
          encodeEvent({ type: "ping" });
        }, 5000);

        try {
          console.log(`[Strategy Stream] Sending initial buffer flush...`);
          // Force the proxy to flush its initial buffer
          if (!closed)
            controller.enqueue(encoder.encode(" ".repeat(2048) + "\n\n"));

          console.log(`[Strategy Stream] Initializing Mastra workflow...`);
          const workflowId = isDpaMode ? "strategyDpa" : "strategy";
          const workflow = mastra.getWorkflow(workflowId);

          const stepLabels: Record<string, string> = isDpaMode
            ? {
                "analyze-catalog": "Analyzing product catalog",
                "generate-dpa-strategy": "Creating DPA campaign strategy",
              }
            : {
                "fetch-website-text": "Analyzing website content",
                "extract-campaign-data": "Identifying key selling points",
                "generate-strategy": "Formulating campaign strategy",
              };

          encodeEvent({
            type: "init",
            steps: Object.keys(stepLabels).map((id) => ({
              id,
              label: stepLabels[id],
            })),
          });

          console.log(`[Strategy Stream] Creating workflow run...`);
          const run = await workflow.createRun();

          const inputData = isDpaMode
            ? {
                brandProfile: {
                  ...body.brandProfile,
                  url: body.brandProfile.url || "",
                },
                products: body.products || [],
                catalogStats: body.catalogStats,
              }
            : {
                brandProfile: body.brandProfile,
                rawWebsiteText: body.rawWebsiteText,
                websiteUrl: body.websiteUrl,
              };

          console.log(`[Strategy Stream] Starting workflow execution...`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const streamResult = await run.stream({ inputData } as any);

          for await (const event of streamResult.fullStream) {
            if (closed) break;
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            console.log(
              `[Strategy Stream] Received workflow event at ${elapsed}s:`,
              event.type,
            );

            if (event.type === "workflow-step-start" && "payload" in event) {
              const payload = event.payload as Record<string, unknown>;
              const step = payload?.step as Record<string, unknown> | undefined;
              const stepId = (payload?.stepId || step?.id || payload?.id) as
                | string
                | undefined;

              if (stepId && stepLabels[stepId]) {
                console.log(`[Strategy Stream]   -> Step Start: ${stepId}`);
                encodeEvent({
                  type: "step_start",
                  stepId,
                  label: stepLabels[stepId],
                });
              }
            }

            if (event.type === "workflow-step-finish" && "payload" in event) {
              const payload = event.payload as Record<string, unknown>;
              const step = payload?.step as Record<string, unknown> | undefined;
              const stepId = (payload?.stepId || step?.id || payload?.id) as
                | string
                | undefined;

              const result = payload?.result as { success?: boolean };
              const success = result?.success !== false;

              if (stepId && stepLabels[stepId]) {
                console.log(
                  `[Strategy Stream]   -> Step Complete: ${stepId} (Success: ${success})`,
                );
                encodeEvent({
                  type: "step_complete",
                  stepId,
                  success,
                });
              }
            }
          }

          if (closed) return;
          console.log(
            `[Strategy Stream] Workflow execution finished. Waiting for final result...`,
          );
          const workflowResult = await streamResult.result;
          const totalTime = Math.round((Date.now() - startTime) / 1000);

          if (workflowResult.status === "success" && workflowResult.result) {
            console.log(
              `[Strategy Stream] Success. Sending final complete event at ${totalTime}s.`,
            );
            encodeEvent({ type: "complete", data: workflowResult.result });
          } else {
            console.error(
              `[Strategy Stream] Failed status at ${totalTime}s:`,
              workflowResult.status,
            );
            encodeEvent({
              type: "error",
              message:
                workflowResult.status === "failed"
                  ? "Workflow failed to complete"
                  : "Workflow completed but no result was returned",
            });
          }
        } catch (error) {
          const errorTime = Math.round((Date.now() - startTime) / 1000);
          console.error(
            `[Strategy Stream] Exception caught at ${errorTime}s:`,
            error,
          );

          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          if (
            errorMessage.includes("429") ||
            errorMessage.toLowerCase().includes("too many requests")
          ) {
            encodeEvent({
              type: "error",
              message:
                "AI is currently busy (Rate Limit). Please wait 30 seconds and try again.",
            });
          } else {
            encodeEvent({
              type: "error",
              message: errorMessage,
            });
          }
        } finally {
          closeStream();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
        Connection: "keep-alive",
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
