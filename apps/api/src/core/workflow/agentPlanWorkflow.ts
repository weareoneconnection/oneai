import type { WorkflowContext } from "./types.js";
import type { WorkflowDefinition } from "./engine.js";

import { preparePromptStep } from "./steps/preparePromptStep.js";
import { generateLLMStep } from "./steps/generateLLMStep.js";
import { parseJsonStep } from "./steps/parseJsonStep.js";
import { validateSchemaStep } from "./steps/validateSchemaStep.js";
import { refineJsonStep } from "./steps/refineJsonStep.js";
import { normalizeAgentPlanStep } from "./steps/normalizeAgentPlanStep.js";

import { agentPlanValidator } from "../validators/agentPlanValidator.js";
import { registerWorkflow } from "./registry.js";
import { checkAgentPlanConstraints } from "../constraints/agentPlanConstraints.js";

export type AgentPlanInput = {
  goal: string;
  wallet?: string;
  brand?: string;
  chain?: string;
  audience?: string;
  tone?: string;
  link?: string;
};

export type AgentPlanData = {
  summary: string;
  tweets: string[];
  missions: string[];
  actions: string[];
  proofLabel: string;
  aiReasoning: string[];
  rawText: string;
};

type AgentPlanCtx = WorkflowContext<AgentPlanInput, AgentPlanData> & {
  templateVersion: number;
};

export const agentPlanWorkflowDef: WorkflowDefinition<AgentPlanCtx> = {
  name: "agent_plan_workflow",
  maxAttempts: 3,
  steps: [
    preparePromptStep({
      task: "agent_plan",
      templateVersion: 1,
      variables: (input: AgentPlanInput) => ({
        goal: input.goal,
        wallet: input.wallet ?? "not_connected",
        brand: input.brand ?? "WAOC OneAI Agent OS",
        chain: input.chain ?? "X Layer",
        audience:
          input.audience ??
          "builders / creators / founders / hackathon judges",
        tone:
          input.tone ??
          "high-signal, product-grade, execution-focused",
        link: input.link ?? ""
      })
    }),

    generateLLMStep(),
    parseJsonStep(),

    // ✅ 关键：防止模型乱返回
    normalizeAgentPlanStep(),

    validateSchemaStep(agentPlanValidator),

    refineJsonStep({
      check: (ctx: any) =>
        checkAgentPlanConstraints(ctx.data as any),
      extraInstruction:
        "Ensure summary exists. tweets must be exactly 2. missions exactly 4. actions exactly 4. aiReasoning must contain 3-6 items. rawText must be present. Do NOT output tweet_zh, tweet_en, hashtags, or CTA."
    }),

    parseJsonStep(),
    normalizeAgentPlanStep(),
    validateSchemaStep(agentPlanValidator),

    async (ctx: any) => {
      const r = checkAgentPlanConstraints(ctx.data);
      if (!r.ok) return { ok: false, error: r.errors };

      if (!ctx.data) {
        return { ok: false, error: ["internal: data undefined"] };
      }

      // ✅ 最终清洗
      ctx.data.summary = ctx.data.summary.trim();
      ctx.data.proofLabel =
        ctx.data.proofLabel?.trim() || "Proof of Coordination";
      ctx.data.rawText = ctx.data.rawText.trim();

      ctx.data.tweets = ctx.data.tweets
        .map((t: string) => t.trim())
        .slice(0, 2);

      ctx.data.missions = ctx.data.missions
        .map((m: string) => m.trim())
        .slice(0, 4);

      ctx.data.actions = ctx.data.actions
        .map((a: string) => a.trim())
        .slice(0, 4);

      ctx.data.aiReasoning = ctx.data.aiReasoning
        .map((r: string) => r.trim())
        .filter(Boolean)
        .slice(0, 6);

      return { ok: true };
    }
  ]
};

registerWorkflow({
  task: "agent_plan",
  def: agentPlanWorkflowDef as any
});