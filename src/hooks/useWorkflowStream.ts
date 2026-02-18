"use client";

import { useState, useRef, useCallback } from "react";
import { WorkflowStep } from "@/components/WorkflowProgress";

interface UseWorkflowStreamOptions<TResult> {
  onComplete?: (data: TResult) => void;
  onError?: (error: string) => void;
}

export function useWorkflowStream<TResult = any>(
  endpoint: string,
  options: UseWorkflowStreamOptions<TResult> = {},
) {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TResult | null>(null);
  const hasStartedRef = useRef(false);

  // Keep options in ref to avoid re-creating start function if options change
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const start = useCallback(
    async (payload: any) => {
      setIsLoading(true);
      setError(null);
      setSteps([]);
      setData(null);
      hasStartedRef.current = true;

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("Failed to start workflow");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response stream available");
        }

        let buffer = "";
        let receivedResult = false;

        const processLine = (line: string) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;

          try {
            const message = JSON.parse(trimmedLine);

            if (message.type === "init") {
              setSteps(
                message.steps.map((s: any) => ({
                  id: s.id,
                  label: s.label,
                  status: "pending",
                })),
              );
            } else if (message.type === "step_start") {
              setSteps((prev) =>
                prev.map((s) => {
                  if (s.id === message.stepId) {
                    if (s.status === "completed" || s.status === "failed")
                      return s;
                    return { ...s, status: "running", startTime: Date.now() };
                  }
                  if (s.status === "running") {
                    return { ...s, status: "completed", endTime: Date.now() };
                  }
                  return s;
                }),
              );
            } else if (message.type === "step_complete") {
              const success = message.success !== false;
              setSteps((prev) =>
                prev.map((s) =>
                  s.id === message.stepId
                    ? {
                        ...s,
                        status: success ? "completed" : "failed",
                        endTime: Date.now(),
                      }
                    : s,
                ),
              );
            } else if (message.type === "complete") {
              receivedResult = true;
              setData(message.data);
              if (optionsRef.current.onComplete) {
                optionsRef.current.onComplete(message.data);
              }
            } else if (message.type === "error") {
              throw new Error(message.message);
            }
          } catch (e) {
            // Rethrow stream errors and real processing errors
            if (
              e instanceof Error &&
              e.message !== "Unexpected end of JSON input"
            ) {
              throw e;
            }
            // Ignore JSON parse errors for malformed lines
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            processLine(line);
          }
        }

        // Process any remaining content in buffer after stream ends
        if (buffer.trim()) {
          processLine(buffer);
        }

        // Safety net: if stream ended without a 'complete' or 'error' event,
        // trigger onError so the UI shows a fallback instead of a blank error screen
        if (!receivedResult) {
          const noDataMsg = "Workflow stream ended without producing a result";
          setError(noDataMsg);
          if (optionsRef.current.onError) optionsRef.current.onError(noDataMsg);
        }
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : "Workflow failed";
        setError(msg);
        if (optionsRef.current.onError) optionsRef.current.onError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [endpoint],
  );

  return { start, steps, isLoading, error, data };
}
