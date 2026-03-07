import type { WorkflowContext } from "./types.js";
import type { WorkflowDefinition } from "./engine.js";

import { preparePromptStep } from "./steps/preparePromptStep.js";
import { generateLLMStep } from "./steps/generateLLMStep.js";
import { parseJsonStep } from "./steps/parseJsonStep.js";
import { validateSchemaStep } from "./steps/validateSchemaStep.js";
import { refineJsonStep } from "./steps/refineJsonStep.js";

import { registerWorkflow } from "./registry.js";
import { studioLiteDistributionValidator } from "../validators/studioLiteDistributionValidator.js";

export type StudioLiteDistributionInput = {
  topic: string;
  pack?: "quick" | "growth" | "launch" | "replies";
  goal?: string;
  hooks?: string[];
  tweets?: string[];
  thread?: string[];
  replies?: string[];
  cta?: string;
};

export type StudioLiteDistributionData = {
  content_loop: string;
  distribution_plan: Array<{
    day: number;
    slot: "morning" | "midday" | "evening";
    content_type: "hook" | "tweet" | "thread" | "reply" | "debate" | "cta";
    objective: string;
  }>;
  sequencing_reason: string;
};

type Ctx = WorkflowContext<StudioLiteDistributionInput, StudioLiteDistributionData> & {
  templateVersion: number;
};

function safeTrim(v: any) {
  return String(v ?? "").trim();
}

function normalize(ctx: Ctx) {
  const d: any = ctx.data || {};
  const defaultPlan = [
    { day: 0, slot: "morning", content_type: "hook", objective: "Open the conversation with a strong angle." },
    { day: 0, slot: "midday", content_type: "tweet", objective: "Deliver the core insight." },
    { day: 0, slot: "evening", content_type: "debate", objective: "Trigger replies and disagreement." }
  ];

  ctx.data = {
    content_loop: safeTrim(d.content_loop) || "Hook → Insight tweet → Debate → Replies → Thread follow-up",
    distribution_plan: Array.isArray(d.distribution_plan) && d.distribution_plan.length
      ? d.distribution_plan.slice(0, 12).map((x: any) => ({
          day: Number(x?.day ?? 0),
          slot: x?.slot === "midday" || x?.slot === "evening" ? x.slot : "morning",
          content_type: ["hook", "tweet", "thread", "reply", "debate", "cta"].includes(x?.content_type)
            ? x.content_type
            : "tweet",
          objective: safeTrim(x?.objective) || "Drive discussion."
        }))
      : defaultPlan,
    sequencing_reason: safeTrim(d.sequencing_reason) || "Start with attention, follow with insight, then trigger interaction."
  };
}

export const studioLiteDistributionWorkflowDef: WorkflowDefinition<Ctx> = {
  name: "studio_lite_distribution_workflow",
  maxAttempts: 3,
  steps: [
    preparePromptStep<StudioLiteDistributionInput, StudioLiteDistributionData>({
      task: "lite/distribution",
      templateVersion: 12,
      variables: (input) => ({
        topic: input.topic,
        pack: input.pack ?? "growth",
        goal: input.goal ?? "discussion",
        hooks_count: String(input.hooks?.length ?? 0),
        tweets_count: String(input.tweets?.length ?? 0),
        thread_count: String(input.thread?.length ?? 0),
        replies_count: String(input.replies?.length ?? 0),
        has_cta: input.cta ? "yes" : "no"
      })
    }),

    generateLLMStep<StudioLiteDistributionInput, StudioLiteDistributionData>(),
    parseJsonStep<StudioLiteDistributionInput, StudioLiteDistributionData>(),

    async (ctx: Ctx) => {
      normalize(ctx);
      return { ok: true };
    },

    validateSchemaStep<StudioLiteDistributionInput, StudioLiteDistributionData>(studioLiteDistributionValidator),

    refineJsonStep<StudioLiteDistributionInput, StudioLiteDistributionData>({
      check: (ctx) => {
        const r = studioLiteDistributionValidator.validate(ctx.data);
        const errs: string[] = r.ok
          ? []
          : Array.isArray(r.errors)
          ? r.errors.map((e: any) => (typeof e === "string" ? e : JSON.stringify(e)))
          : [typeof r.errors === "string" ? r.errors : JSON.stringify(r.errors)];
        return { ok: r.ok, errors: errs };
      },
      extraInstruction:
        "Return valid JSON only. Keep plan short, concrete, and operational."
    }),

    parseJsonStep<StudioLiteDistributionInput, StudioLiteDistributionData>(),

    async (ctx: Ctx) => {
      normalize(ctx);
      return { ok: true };
    },

    validateSchemaStep<StudioLiteDistributionInput, StudioLiteDistributionData>(studioLiteDistributionValidator)
  ]
};

registerWorkflow({
  task: "studio_lite_distribution",
  def: studioLiteDistributionWorkflowDef as any
});