import type { WorkflowContext } from "./types.js";
import type { WorkflowDefinition } from "./engine.js";

import { preparePromptStep } from "./steps/preparePromptStep.js";
import { generateLLMStep } from "./steps/generateLLMStep.js";
import { parseJsonStep } from "./steps/parseJsonStep.js";
import { validateSchemaStep } from "./steps/validateSchemaStep.js";
import { refineJsonStep } from "./steps/refineJsonStep.js";

import { registerWorkflow } from "./registry.js";
import { liteThreadValidator } from "../validators/liteThreadValidator.js";

export type LiteThreadInput = {
  topic: string;
  audience?: string;
  tone?: string;
  brand?: string;
  link?: string;
  language?: string;
  goal?: string;
};

export type LiteThreadData = {
  items: Array<{ text: string }>;
};

type Ctx = WorkflowContext<LiteThreadInput, LiteThreadData> & { templateVersion: number };

function safeTrim(v: any) {
  return String(v ?? "").trim();
}

function normalizeLang(v: unknown): "en" | "zh" | "bi" {
  const s = safeTrim(v).toLowerCase();
  if (s === "zh") return "zh";
  if (s === "bi") return "bi";
  return "en";
}

function mergeBilingual(textEn?: string, textZh?: string, lang: "en" | "zh" | "bi" = "en") {
  const en = safeTrim(textEn);
  const zh = safeTrim(textZh);

  if (lang === "zh") return zh || en;
  if (lang === "en") return en || zh;
  if (en && zh) return `EN: ${en}\nZH: ${zh}`;
  return en || zh;
}

function clampLen(s: string, max = 260) {
  const t = safeTrim(s);
  if (!t) return "";
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

function uniqItems(items: { text: string }[], limit = 8) {
  const seen = new Set<string>();
  const out: { text: string }[] = [];

  for (const item of items) {
    const text = safeTrim(item?.text);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ text });
    if (out.length >= limit) break;
  }

  return out;
}

function normalize(ctx: Ctx) {
  const lang = normalizeLang(ctx.input.language);
  const rawItems = Array.isArray(ctx.data?.items) ? ctx.data.items : [];

  const normalized = rawItems
    .map((x: any) => {
      const text =
        typeof x?.text === "string"
          ? x.text
          : mergeBilingual(x?.text_en, x?.text_zh, lang);

      return { text: clampLen(text, 260) };
    })
    .filter((x) => x.text.length > 0);

  const fallback = [
    mergeBilingual(
      `${safeTrim(ctx.input.topic) || "This topic"} matters more than it looks.`,
      `${safeTrim(ctx.input.topic) || "这个主题"}比表面上更重要。`,
      lang
    ),
    mergeBilingual(
      "Most people only see the surface. The real value is in the mechanism.",
      "大多数人只看表面，真正的价值在于机制。",
      lang
    ),
    mergeBilingual(
      "If you understand the system behind it, the narrative becomes much clearer.",
      "如果你理解背后的系统，整个叙事就会清晰得多。",
      lang
    )
  ].map((x) => ({ text: clampLen(x, 260) }));

  ctx.data = {
    items: uniqItems(normalized.length ? normalized : fallback, 8)
  };
}

export const liteThreadWorkflowDef: WorkflowDefinition<Ctx> = {
  name: "lite_thread_workflow",
  maxAttempts: 3,
  steps: [
    preparePromptStep<LiteThreadInput, LiteThreadData>({
      task: "lite/thread",
      templateVersion: 2,
      variables: (input) => ({
        topic: input.topic,
        audience: input.audience ?? "builders / creators / founders",
        tone: input.tone ?? "clear, sharp, twitter-native",
        brand: input.brand ?? "OneAI",
        link: input.link ?? "",
        language: normalizeLang(input.language),
        goal: input.goal ?? ""
      })
    }),

    generateLLMStep<LiteThreadInput, LiteThreadData>(),
    parseJsonStep<LiteThreadInput, LiteThreadData>(),

    async (ctx: Ctx) => {
      normalize(ctx);
      return { ok: true };
    },

    validateSchemaStep<LiteThreadInput, LiteThreadData>(liteThreadValidator),

    refineJsonStep<LiteThreadInput, LiteThreadData>({
      check: (ctx) => {
        const r = liteThreadValidator.validate(ctx.data);
        const errs: string[] = r.ok
          ? []
          : Array.isArray(r.errors)
          ? r.errors.map((e: any) => (typeof e === "string" ? e : JSON.stringify(e)))
          : [typeof r.errors === "string" ? r.errors : JSON.stringify(r.errors)];
        return { ok: r.ok, errors: errs };
      },
      extraInstruction:
        "Return valid JSON only. Final schema must be exactly {\"items\":[{\"text\":\"...\"}]}. " +
        "Do not return text_en/text_zh in the final repaired output. " +
        "Generate 3-8 thread posts, each <= 260 chars."
    }),

    parseJsonStep<LiteThreadInput, LiteThreadData>(),

    async (ctx: Ctx) => {
      normalize(ctx);
      return { ok: true };
    },

    validateSchemaStep<LiteThreadInput, LiteThreadData>(liteThreadValidator)
  ]
};

registerWorkflow({
  task: "lite/thread",
  def: liteThreadWorkflowDef as any
});