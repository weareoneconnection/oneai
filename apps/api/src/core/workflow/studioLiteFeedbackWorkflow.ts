import type { WorkflowContext } from "./types.js";
import type { WorkflowDefinition } from "./engine.js";

import { preparePromptStep } from "./steps/preparePromptStep.js";
import { generateLLMStep } from "./steps/generateLLMStep.js";
import { parseJsonStep } from "./steps/parseJsonStep.js";
import { validateSchemaStep } from "./steps/validateSchemaStep.js";
import { refineJsonStep } from "./steps/refineJsonStep.js";

import { registerWorkflow } from "./registry.js";
import { studioLiteFeedbackValidator } from "../validators/studioLiteFeedbackValidator.js";

export type StudioLiteFeedbackInput = {
  topic: string;
  goal?: string;
  signals?: {
    best_performing_type?: string;
    weakest_type?: string;
    top_pattern?: string;
    low_pattern?: string;
    impressions?: number;
    likes?: number;
    replies?: number;
    reposts?: number;
    follows?: number;
  };
};

export type StudioLiteFeedbackData = {
  best_performing_type: string;
  weakest_type: string;
  winning_pattern: string;
  losing_pattern: string;
  adaptation_reason: string;
  next_actions: string[];
};

type Ctx = WorkflowContext<StudioLiteFeedbackInput, StudioLiteFeedbackData> & {
  templateVersion: number;
};

function safeTrim(v: any) {
  return String(v ?? "").trim();
}

function uniq(arr: string[], limit = 6) {
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
  const s = ctx.input.signals || {};

  ctx.data = {
    best_performing_type: safeTrim(d.best_performing_type) || safeTrim(s.best_performing_type) || "debate",
    weakest_type: safeTrim(d.weakest_type) || safeTrim(s.weakest_type) || "cta",
    winning_pattern: safeTrim(d.winning_pattern) || safeTrim(s.top_pattern) || "short contrast + strong insight",
    losing_pattern: safeTrim(d.losing_pattern) || safeTrim(s.low_pattern) || "generic product pitch",
    adaptation_reason: safeTrim(d.adaptation_reason) || "Shift toward higher-engagement formats and reduce generic content.",
    next_actions: uniq(
      Array.isArray(d.next_actions)
        ? d.next_actions.map(String)
        : [
            "Increase debate-style posts.",
            "Keep hooks shorter and sharper.",
            "Reduce generic CTA language."
          ],
      6
    )
  };
}

export const studioLiteFeedbackWorkflowDef: WorkflowDefinition<Ctx> = {
  name: "studio_lite_feedback_workflow",
  maxAttempts: 3,
  steps: [
    preparePromptStep<StudioLiteFeedbackInput, StudioLiteFeedbackData>({
      task: "lite/feedback",
      templateVersion: 12,
      variables: (input) => ({
        topic: input.topic,
        goal: input.goal ?? "discussion",
        best_performing_type: input.signals?.best_performing_type ?? "",
        weakest_type: input.signals?.weakest_type ?? "",
        top_pattern: input.signals?.top_pattern ?? "",
        low_pattern: input.signals?.low_pattern ?? "",
        impressions: String(input.signals?.impressions ?? ""),
        likes: String(input.signals?.likes ?? ""),
        replies: String(input.signals?.replies ?? ""),
        reposts: String(input.signals?.reposts ?? ""),
        follows: String(input.signals?.follows ?? "")
      })
    }),

    generateLLMStep<StudioLiteFeedbackInput, StudioLiteFeedbackData>(),
    parseJsonStep<StudioLiteFeedbackInput, StudioLiteFeedbackData>(),

    async (ctx: Ctx) => {
      normalize(ctx);
      return { ok: true };
    },

    validateSchemaStep<StudioLiteFeedbackInput, StudioLiteFeedbackData>(studioLiteFeedbackValidator),

    refineJsonStep<StudioLiteFeedbackInput, StudioLiteFeedbackData>({
      check: (ctx) => {
        const r = studioLiteFeedbackValidator.validate(ctx.data);
        const errs: string[] = r.ok
          ? []
          : Array.isArray(r.errors)
          ? r.errors.map((e: any) => (typeof e === "string" ? e : JSON.stringify(e)))
          : [typeof r.errors === "string" ? r.errors : JSON.stringify(r.errors)];
        return { ok: r.ok, errors: errs };
      },
      extraInstruction:
        "Return valid JSON only. Keep feedback practical, short, and actionable."
    }),

    parseJsonStep<StudioLiteFeedbackInput, StudioLiteFeedbackData>(),

    async (ctx: Ctx) => {
      normalize(ctx);
      return { ok: true };
    },

    validateSchemaStep<StudioLiteFeedbackInput, StudioLiteFeedbackData>(studioLiteFeedbackValidator)
  ]
};

registerWorkflow({
  task: "studio_lite_feedback",
  def: studioLiteFeedbackWorkflowDef as any
});