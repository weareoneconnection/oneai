import type { WorkflowContext, WorkflowStep } from "../types.js";

function extractJson(raw: string) {
  const text = String(raw || "").trim();
  if (!text) return "{}";

  // 1) already pure JSON
  if (text.startsWith("{") || text.startsWith("[")) return text;

  // 2) fenced block: ```json ... ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  // 3) first object block
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj?.[0]) return obj[0].trim();

  // 4) first array block
  const arr = text.match(/\[[\s\S]*\]/);
  if (arr?.[0]) return arr[0].trim();

  return text;
}

export function parseJsonStep<TInput, TData>(): WorkflowStep<
  WorkflowContext<TInput, TData>
> {
  return async (ctx) => {
    try {
      const raw = String(ctx.rawText || "").trim();
      if (!raw) {
        return { ok: false, error: "Empty model output" };
      }

      const jsonText = extractJson(raw);
      ctx.data = JSON.parse(jsonText) as TData;
      return { ok: true };
    } catch {
      return { ok: false, error: "Invalid JSON format" };
    }
  };
}