import type { WorkflowContext } from "./types.js";
import type { WorkflowDefinition } from "./engine.js";

import { preparePromptStep } from "./steps/preparePromptStep.js";
import { generateLLMStep } from "./steps/generateLLMStep.js";
import { parseJsonStep } from "./steps/parseJsonStep.js";
import { validateSchemaStep } from "./steps/validateSchemaStep.js";
import { refineJsonStep } from "./steps/refineJsonStep.js";

import { registerWorkflow } from "./registry.js";
import { liteReplyValidator } from "../validators/liteReplyValidator.js";

export type LiteReplyInput = {
  topic: string;
  audience?: string;
  tone?: string;
  brand?: string;
  link?: string;
  language?: string;
  goal?: string;
};

export type LiteReplyData = {
  items: Array<{ text: string }>;
};

type Ctx = WorkflowContext<LiteReplyInput, LiteReplyData> & { templateVersion: number };

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

function uniqItems(items: { text: string }[], limit = 12) {
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
      "Interesting point — but the mechanism matters more than the headline.",
      "这个点很有意思——但比标题更重要的是背后的机制。",
      lang
    ),
    mergeBilingual(
      "Most people miss the system behind it. That's where the real edge is.",
      "大多数人忽略了背后的系统，而真正的优势恰恰在那里。",
      lang
    ),
    mergeBilingual(
      "The better question is: what does this change in practice?",
      "更好的问题是：这在实践里到底改变了什么？",
      lang
    )
  ].map((x) => ({ text: clampLen(x, 220) }));

  ctx.data = {
    items: uniqItems(normalized.length ? normalized : fallback, 12)
  };
}

export const liteReplyWorkflowDef: WorkflowDefinition<Ctx> = {
  name: "lite_reply_workflow",
  maxAttempts: 3,
  steps: [
    preparePromptStep<LiteReplyInput, LiteReplyData>({
      task: "lite/reply",
      templateVersion: 2,
      variables: (input) => ({
        topic: input.topic,
        audience: input.audience ?? "builders / creators / founders",
        tone: input.tone ?? "sharp, thoughtful",
        brand: input.brand ?? "OneAI",
        link: input.link ?? "",
        language: normalizeLang(input.language),
        goal: input.goal ?? ""
      })
    }),

    generateLLMStep<LiteReplyInput, LiteReplyData>(),
    parseJsonStep<LiteReplyInput, LiteReplyData>(),

    async (ctx: Ctx) => {
      normalize(ctx);
      return { ok: true };
    },

    validateSchemaStep<LiteReplyInput, LiteReplyData>(liteReplyValidator),

    refineJsonStep<LiteReplyInput, LiteReplyData>({
      check: (ctx) => {
        const r = liteReplyValidator.validate(ctx.data);
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
        "Generate 3-12 replies, each <= 220 chars."
    }),

    parseJsonStep<LiteReplyInput, LiteReplyData>(),

    async (ctx: Ctx) => {
      normalize(ctx);
      return { ok: true };
    },

    validateSchemaStep<LiteReplyInput, LiteReplyData>(liteReplyValidator)
  ]
};

registerWorkflow({
  task: "lite/reply",
  def: liteReplyWorkflowDef as any
});