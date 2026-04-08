import type { WorkflowContext } from "./types.js";
import type { WorkflowDefinition } from "./engine.js";

import { preparePromptStep } from "./steps/preparePromptStep.js";
import { generateLLMStep } from "./steps/generateLLMStep.js";
import { parseJsonStep } from "./steps/parseJsonStep.js";
import { validateSchemaStep } from "./steps/validateSchemaStep.js";
import { refineJsonStep } from "./steps/refineJsonStep.js";

import { registerWorkflow } from "./registry.js";
import { xEngageValidator } from "../validators/xEngageValidator.js";
import { checkXEngageConstraints } from "../constraints/xEngageConstraints.js";

export type XEngagePosture = "growth" | "proof" | "quiet";

export type XEngageInput = {
  message: string;
  lang?: "en" | "zh" | "mixed";
  candidateTweets?: Array<{
    tweetId: string;
    author?: string;
    authorId?: string;
    text: string;
    createdAt?: string;
    conversationId?: string;
    referencedTweets?: Array<{
      type?: string;
      id?: string;
    }>;
  }>;
};

export type XEngageData = {
  reply: string;
  shouldExecute: boolean;
  posture: XEngagePosture;
  oneclawTask: {
    taskName: string;
    steps: Array<{
      id: string;
      action: "social.post";
      input: Record<string, unknown>;
      dependsOn?: string[];
    }>;
  } | null;
};

type XEngageCtx = WorkflowContext<XEngageInput, XEngageData> & {
  templateVersion: number;
};

function asString(value: unknown): string {
  return String(value ?? "").trim();
}

function asPosture(value: unknown): XEngagePosture {
  const text = asString(value);
  switch (text) {
    case "growth":
    case "proof":
    case "quiet":
      return text;
    default:
      return "quiet";
  }
}

function normalizeXEngagePlan(data: any): XEngageData {
  const reply = asString(data?.reply);
  const shouldExecute = Boolean(data?.shouldExecute);
  const posture = asPosture(data?.posture);

  let oneclawTask = data?.oneclawTask ?? null;

  if (!shouldExecute) {
    oneclawTask = null;
  }

  if (shouldExecute && oneclawTask) {
    oneclawTask = {
      taskName: asString(oneclawTask.taskName) || "x_engage_task",
      steps: Array.isArray(oneclawTask.steps)
        ? oneclawTask.steps.map((step: any, index: number) => ({
            id: asString(step?.id) || `step_${index + 1}`,
            action: "social.post" as const,
            input:
              step?.input &&
              typeof step.input === "object" &&
              !Array.isArray(step.input)
                ? step.input
                : {},
            dependsOn: Array.isArray(step?.dependsOn)
              ? step.dependsOn.map((v: unknown) => String(v))
              : [],
          }))
        : [],
    };
  }

  return {
    reply,
    shouldExecute,
    posture,
    oneclawTask,
  };
}

export const xEngageWorkflowDef: WorkflowDefinition<XEngageCtx> = {
  name: "x_engage_workflow",
  maxAttempts: 3,

  steps: [
    preparePromptStep<XEngageInput, XEngageData>({
      task: "x_engage",
      templateVersion: 1,
      variables: (input) => ({
        message: input.message,
        lang: input.lang ?? "mixed",
        candidateTweets: JSON.stringify(input.candidateTweets ?? []),
      }),
    }),

    generateLLMStep<XEngageInput, XEngageData>(),

    parseJsonStep<XEngageInput, XEngageData>(),

    async (ctx: XEngageCtx) => {
      ctx.data = normalizeXEngagePlan(ctx.data);
      return { ok: true };
    },

    validateSchemaStep<XEngageInput, XEngageData>(xEngageValidator),

    refineJsonStep<XEngageInput, XEngageData>({
      check: (ctx) =>
        checkXEngageConstraints(ctx.data as any, ctx.input.candidateTweets ?? []),
      extraInstruction:
        "Return valid JSON only. If shouldExecute=false, oneclawTask must be null. If shouldExecute=true, oneclawTask must contain at least one valid social.post reply step. Each step must include input.content and numeric input.replyToTweetId. Only select tweets that are highly likely to allow public replies. Prefer root tweets with open discussion signals such as questions, requests for thoughts, builders prompts, or clear invitation to comment. Avoid announcement-style, closed, gated, quoted, or likely restricted conversations. Prefer at most 2 reply steps.",
    }),

    parseJsonStep<XEngageInput, XEngageData>(),

    async (ctx: XEngageCtx) => {
      ctx.data = normalizeXEngagePlan(ctx.data);
      return { ok: true };
    },

    validateSchemaStep<XEngageInput, XEngageData>(xEngageValidator),

    async (ctx: XEngageCtx) => {
      const result = checkXEngageConstraints(
        ctx.data as any,
        ctx.input.candidateTweets ?? [],
      );

      if (!result.ok) {
        return { ok: false, error: result.errors };
      }

      if (!ctx.data) {
        return { ok: false, error: ["internal: data undefined"] };
      }

      return { ok: true };
    },
  ],
};

registerWorkflow({
  task: "x_engage",
  def: xEngageWorkflowDef as any,
});