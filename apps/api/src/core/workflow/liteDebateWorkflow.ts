import type { WorkflowContext } from "./types.js";
import type { WorkflowDefinition } from "./engine.js";

import { preparePromptStep } from "./steps/preparePromptStep.js";
import { generateLLMStep } from "./steps/generateLLMStep.js";
import { parseJsonStep } from "./steps/parseJsonStep.js";
import { validateSchemaStep } from "./steps/validateSchemaStep.js";
import { refineJsonStep } from "./steps/refineJsonStep.js";

import { registerWorkflow } from "./registry.js";
import { liteDebateValidator } from "../validators/liteDebateValidator.js";

export type LiteDebateInput = {
  topic: string;
  audience?: string;
  tone?: string;
  brand?: string;
  link?: string;
  language?: string;
  goal?: string;
};

export type LiteDebateData = {
  items: Array<{ text: string }>;
};

type Ctx = WorkflowContext<LiteDebateInput, LiteDebateData> & { templateVersion: number };

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

function clampLen(s: string, max = 220) {
  const t = safeTrim(s);
  if (!t) return "";
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

function uniqItems(items: { text: string }[], limit = 6) {
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

      return { text: clampLen(text, 220) };
    })
    .filter((x) => x.text.length > 0);

  const fallback = [
    mergeBilingual(
      "Hot take: the problem isn't the tool — it's the weak system around it.",
      "我的看法是：问题不在工具，而在工具周围那套薄弱的系统。",
      lang
    ),
    mergeBilingual(
      "Most people are optimizing the output. The real leverage is in the workflow.",
      "大多数人优化的是输出，真正的杠杆其实在 workflow 里。",
      lang
    ),
    mergeBilingual(
      "The more generic the advice sounds, the less likely it is to work in practice.",
      "建议听起来越泛，落地时往往越没用。",
      lang
    )
  ].map((x) => ({ text: clampLen(x, 220) }));

  ctx.data = {
    items: uniqItems(normalized.length ? normalized : fallback, 6)
  };
}

export const liteDebateWorkflowDef: WorkflowDefinition<Ctx> = {
  name: "lite_debate_workflow",
  maxAttempts: 3,
  steps: [
    preparePromptStep<LiteDebateInput, LiteDebateData>({
      task: "lite/debate",
      templateVersion: 2,
      variables: (input) => ({
        topic: input.topic,
        audience: input.audience ?? "builders / creators / founders",
        tone: input.tone ?? "sharp, contrarian",
        brand: input.brand ?? "OneAI",
        link: input.link ?? "",
        language: normalizeLang(input.language),
        goal: input.goal ?? ""
      })
    }),

    generateLLMStep<LiteDebateInput, LiteDebateData>(),
    parseJsonStep<LiteDebateInput, LiteDebateData>(),

    async (ctx: Ctx) => {
      normalize(ctx);
      return { ok: true };
    },

    validateSchemaStep<LiteDebateInput, LiteDebateData>(liteDebateValidator),

    refineJsonStep<LiteDebateInput, LiteDebateData>({
      check: (ctx) => {
        const r = liteDebateValidator.validate(ctx.data);
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
        "Generate 1-6 contrarian debate replies, each <= 220 chars."
    }),

    parseJsonStep<LiteDebateInput, LiteDebateData>(),

    async (ctx: Ctx) => {
      normalize(ctx);
      return { ok: true };
    },

    validateSchemaStep<LiteDebateInput, LiteDebateData>(liteDebateValidator)
  ]
};

registerWorkflow({
  task: "lite/debate",
  def: liteDebateWorkflowDef as any
});