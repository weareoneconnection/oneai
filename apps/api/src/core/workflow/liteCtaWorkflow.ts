import type { WorkflowContext } from "./types.js";
import type { WorkflowDefinition } from "./engine.js";

import { preparePromptStep } from "./steps/preparePromptStep.js";
import { generateLLMStep } from "./steps/generateLLMStep.js";
import { parseJsonStep } from "./steps/parseJsonStep.js";
import { validateSchemaStep } from "./steps/validateSchemaStep.js";
import { refineJsonStep } from "./steps/refineJsonStep.js";

import { registerWorkflow } from "./registry.js";
import { liteCtaValidator } from "../validators/liteCtaValidator.js";

export type LiteCtaInput = {
  topic: string;
  audience?: string;
  tone?: string;
  brand?: string;
  link?: string;
  language?: string;
  goal?: string;
};

export type LiteCtaData = {
  items: Array<{ text: string }>;
};

type Ctx = WorkflowContext<LiteCtaInput, LiteCtaData> & { templateVersion: number };

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

function clampLen(s: string, max = 140) {
  const t = safeTrim(s);
  if (!t) return "";
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

function uniqItems(items: { text: string }[], limit = 3) {
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
  const items = Array.isArray(ctx.data?.items) ? ctx.data.items : [];

  const normalized = items
    .map((x: any) => {
      const text =
        typeof x?.text === "string"
          ? x.text
          : mergeBilingual(x?.text_en, x?.text_zh, lang);

      return { text: clampLen(text, 140) };
    })
    .filter((x) => x.text.length > 0);

  const fallback = mergeBilingual(
    safeTrim(ctx.input.link)
      ? `Join here: ${safeTrim(ctx.input.link)}`
      : `Reply "join" to get the link.`,
    safeTrim(ctx.input.link)
      ? `点击这里加入：${safeTrim(ctx.input.link)}`
      : `回复“join”获取链接。`,
    lang
  );

  ctx.data = {
    items: uniqItems(
      normalized.length ? normalized : [{ text: clampLen(fallback, 140) }],
      3
    )
  };
}

export const liteCtaWorkflowDef: WorkflowDefinition<Ctx> = {
  name: "lite_cta_workflow",
  maxAttempts: 3,
  steps: [
    preparePromptStep<LiteCtaInput, LiteCtaData>({
      task: "lite/cta",
      templateVersion: 2,
      variables: (input) => ({
        topic: input.topic,
        audience: input.audience ?? "builders / creators / founders",
        tone: input.tone ?? "clear, direct",
        brand: input.brand ?? "OneAI",
        link: input.link ?? "",
        language: normalizeLang(input.language),
        goal: input.goal ?? ""
      })
    }),

    generateLLMStep<LiteCtaInput, LiteCtaData>(),
    parseJsonStep<LiteCtaInput, LiteCtaData>(),

    async (ctx: Ctx) => {
      normalize(ctx);
      return { ok: true };
    },

    validateSchemaStep<LiteCtaInput, LiteCtaData>(liteCtaValidator),

    refineJsonStep<LiteCtaInput, LiteCtaData>({
      check: (ctx) => {
        const r = liteCtaValidator.validate(ctx.data);
        if (r.ok) return { ok: true, errors: [] as string[] };

        const errs: string[] = Array.isArray(r.errors)
          ? r.errors.map((e: any) => (typeof e === "string" ? e : JSON.stringify(e)))
          : [typeof r.errors === "string" ? r.errors : JSON.stringify(r.errors)];

        return { ok: false, errors: errs };
      },
      extraInstruction:
        "Return valid JSON only. Final schema must be exactly {\"items\":[{\"text\":\"...\"}]}. " +
        "Do not return text_en/text_zh in the final repaired output. " +
        "Generate 1-3 CTA lines. Each CTA must be concise and <= 140 chars."
    }),

    parseJsonStep<LiteCtaInput, LiteCtaData>(),

    async (ctx: Ctx) => {
      normalize(ctx);
      return { ok: true };
    },

    validateSchemaStep<LiteCtaInput, LiteCtaData>(liteCtaValidator)
  ]
};

registerWorkflow({
  task: "lite/cta",
  def: liteCtaWorkflowDef as any
});