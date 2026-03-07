import type { WorkflowContext } from "./types.js";
import type { WorkflowDefinition } from "./engine.js";

import { preparePromptStep } from "./steps/preparePromptStep.js";
import { generateLLMStep } from "./steps/generateLLMStep.js";
import { parseJsonStep } from "./steps/parseJsonStep.js";
import { validateSchemaStep } from "./steps/validateSchemaStep.js";
import { refineJsonStep } from "./steps/refineJsonStep.js";

import { registerWorkflow } from "./registry.js";
import { studioLiteStrategyValidator } from "../validators/studioLiteStrategyValidator.js";

export type StudioLiteStrategyInput = {
  topic: string;
  brand?: string;
  audience?: string;
  tone?: string;
  language?: string;
  goal?: string;
  pack?: "quick" | "growth" | "launch" | "replies";
};

export type StudioLiteStrategyData = {
  core_angle: string;
  narrative_frame: string;
  conversation_goal: string;
  content_mix: string[];
  key_mechanisms: string[];
  anti_patterns: string[];
};

type Ctx = WorkflowContext<StudioLiteStrategyInput, StudioLiteStrategyData> & {
  templateVersion: number;
};

function safeTrim(v: any) {
  return String(v ?? "").trim();
}

function uniq(arr: string[], limit = 8) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr || []) {
    const s = safeTrim(x);
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

function normalize(ctx: Ctx) {
  const d: any = ctx.data || {};

  ctx.data = {
    core_angle: safeTrim(d.core_angle) || `${safeTrim(ctx.input.topic)} as a high-signal topic`,
    narrative_frame: safeTrim(d.narrative_frame) || "insight over hype",
    conversation_goal: safeTrim(d.conversation_goal) || safeTrim(ctx.input.goal) || "discussion",
    content_mix: uniq(Array.isArray(d.content_mix) ? d.content_mix.map(String) : ["hook", "tweet", "debate"], 6),
    key_mechanisms: uniq(Array.isArray(d.key_mechanisms) ? d.key_mechanisms.map(String) : ["contrast", "insight", "mechanism"], 8),
    anti_patterns: uniq(Array.isArray(d.anti_patterns) ? d.anti_patterns.map(String) : ["generic marketing", "hashtags", "topic drift"], 8)
  };
}

export const studioLiteStrategyWorkflowDef: WorkflowDefinition<Ctx> = {
  name: "studio_lite_strategy_workflow",
  maxAttempts: 3,
  steps: [
    preparePromptStep<StudioLiteStrategyInput, StudioLiteStrategyData>({
      task: "lite/strategy",
      templateVersion: 12,
      variables: (input) => ({
        topic: input.topic,
        brand: input.brand ?? "",
        audience: input.audience ?? "builders / creators / founders",
        tone: input.tone ?? "sharp, builder-native",
        language: input.language ?? "en",
        goal: input.goal ?? "discussion",
        pack: input.pack ?? "growth"
      })
    }),

    generateLLMStep<StudioLiteStrategyInput, StudioLiteStrategyData>(),
    parseJsonStep<StudioLiteStrategyInput, StudioLiteStrategyData>(),

    async (ctx: Ctx) => {
      normalize(ctx);
      return { ok: true };
    },

    validateSchemaStep<StudioLiteStrategyInput, StudioLiteStrategyData>(studioLiteStrategyValidator),

    refineJsonStep<StudioLiteStrategyInput, StudioLiteStrategyData>({
      check: (ctx) => {
        const r = studioLiteStrategyValidator.validate(ctx.data);
        const errs: string[] = r.ok
          ? []
          : Array.isArray(r.errors)
          ? r.errors.map((e: any) => (typeof e === "string" ? e : JSON.stringify(e)))
          : [typeof r.errors === "string" ? r.errors : JSON.stringify(r.errors)];
        return { ok: r.ok, errors: errs };
      },
      extraInstruction:
        "Return valid JSON only. Keep strategy concise and concrete. No extra keys."
    }),

    parseJsonStep<StudioLiteStrategyInput, StudioLiteStrategyData>(),

    async (ctx: Ctx) => {
      normalize(ctx);
      return { ok: true };
    },

    validateSchemaStep<StudioLiteStrategyInput, StudioLiteStrategyData>(studioLiteStrategyValidator)
  ]
};

registerWorkflow({
  task: "studio_lite_strategy",
  def: studioLiteStrategyWorkflowDef as any
});