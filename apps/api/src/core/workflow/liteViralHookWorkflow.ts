import type { WorkflowContext } from "./types.js";
import type { WorkflowDefinition } from "./engine.js";

import { preparePromptStep } from "./steps/preparePromptStep.js";
import { generateLLMStep } from "./steps/generateLLMStep.js";
import { parseJsonStep } from "./steps/parseJsonStep.js";
import { validateSchemaStep } from "./steps/validateSchemaStep.js";
import { refineJsonStep } from "./steps/refineJsonStep.js";

import { registerWorkflow } from "./registry.js";
import { liteViralHookValidator } from "../validators/liteViralHookValidator.js";

export type LiteInput = {
  topic: string;
  audience?: string;
  tone?: string;
  brand?: string;
  link?: string;
  language?: string; // en | zh | bi
  goal?: string;
};

export type LiteHookData = {
  items: { text: string }[];
};

type Ctx = WorkflowContext<LiteInput, LiteHookData> & { templateVersion: number };

function safeTrim(v: any) {
  return String(v ?? "").trim();
}

function normalizeLang(v: unknown): "en" | "zh" | "bi" {
  const s = safeTrim(v).toLowerCase();
  if (s === "zh") return "zh";
  if (s === "bi") return "bi";
  return "en";
}

function clampLen(s: string, max = 220) {
  const t = safeTrim(s);
  if (!t) return "";
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

function mergeBilingual(textEn?: string, textZh?: string, lang: "en" | "zh" | "bi" = "en") {
  const en = safeTrim(textEn);
  const zh = safeTrim(textZh);

  if (lang === "zh") return zh || en;
  if (lang === "en") return en || zh;

  // bilingual
  if (en && zh) return `EN: ${en}\nZH: ${zh}`;
  return en || zh;
}

function uniqItems(items: { text: string }[], limit = 10) {
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
      // v1 shape: { text }
      if (typeof x?.text === "string") {
        return { text: clampLen(x.text, 220) };
      }

      // v2 bilingual shape: { text_en, text_zh }
      const merged = mergeBilingual(x?.text_en, x?.text_zh, lang);
      return { text: clampLen(merged, 220) };
    })
    .filter((x) => x.text.length > 0);

  // fallback if model returned nothing usable
  const fallback = mergeBilingual(
    `${safeTrim(ctx.input.topic) || "This topic"} is more important than most builders think.`,
    `${safeTrim(ctx.input.topic) || "这个主题"}比大多数 builder 想象得更重要。`,
    lang
  );

  ctx.data = {
    items: uniqItems(
      normalized.length ? normalized : [{ text: clampLen(fallback, 220) }],
      10
    )
  };
}

export const liteViralHookWorkflowDef: WorkflowDefinition<Ctx> = {
  name: "lite_viral_hook_workflow",
  maxAttempts: 3,
  steps: [
    preparePromptStep<LiteInput, LiteHookData>({
      task: "lite/viral_hook",
      templateVersion: 2, // ✅ use v2 prompt
      variables: (input) => ({
        topic: input.topic,
        audience: input.audience ?? "builders / creators / founders",
        tone: input.tone ?? "sharp, contrarian, twitter-native",
        brand: input.brand ?? "OneAI",
        link: input.link ?? "",
        language: normalizeLang(input.language),
        goal: input.goal ?? ""
      })
    }),

    generateLLMStep<LiteInput, LiteHookData>(),

    parseJsonStep<LiteInput, LiteHookData>(),

    // ✅ normalize before validate, so bilingual objects become {text}
    async (ctx: Ctx) => {
      normalize(ctx);
      return { ok: true };
    },

    validateSchemaStep<LiteInput, LiteHookData>(liteViralHookValidator),

    // optional repair
    refineJsonStep<LiteInput, LiteHookData>({
      check: (ctx) => {
        const r = liteViralHookValidator.validate(ctx.data);
        const errs: string[] = r.ok
          ? []
          : Array.isArray(r.errors)
          ? r.errors.map((e: any) => (typeof e === "string" ? e : JSON.stringify(e)))
          : [typeof r.errors === "string" ? r.errors : JSON.stringify(r.errors)];
        return { ok: r.ok, errors: errs };
      },
      extraInstruction:
        "Return valid JSON only. " +
        "Schema must be exactly: {\"items\":[{\"text\":\"...\"}]}. " +
        "Do not return text_en/text_zh in the final repaired output. " +
        "Generate 10 distinct hooks. Each hook must be concise, Twitter-native, and <= 220 chars."
    }),

    parseJsonStep<LiteInput, LiteHookData>(),

    async (ctx: Ctx) => {
      normalize(ctx);
      return { ok: true };
    },

    validateSchemaStep<LiteInput, LiteHookData>(liteViralHookValidator)
  ]
};

registerWorkflow({
  task: "lite/viral_hook",
  def: liteViralHookWorkflowDef as any
});