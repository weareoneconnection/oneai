import type { WorkflowContext } from "./types.js";
import type { WorkflowDefinition } from "./engine.js";

import { preparePromptStep } from "./steps/preparePromptStep.js";
import { generateLLMStep } from "./steps/generateLLMStep.js";
import { parseJsonStep } from "./steps/parseJsonStep.js";
import { validateSchemaStep } from "./steps/validateSchemaStep.js";
import { refineJsonStep } from "./steps/refineJsonStep.js";

import { registerWorkflow } from "./registry.js";
import { xPublisherValidator } from "../validators/xPublisherValidator.js";
import { checkXPublisherConstraints } from "../constraints/xPublisherConstraints.js";

export type XPublisherPosture =
  | "launch"
  | "growth"
  | "proof"
  | "quiet";

export type XPublisherAction = "social.post";

export type XPublisherStep = {
  id: string;
  action: XPublisherAction;
  input: Record<string, unknown>;
  dependsOn?: string[];
};

export type XPublisherTask = {
  taskName: string;
  steps: XPublisherStep[];
};

export type XPublisherInput = {
  message: string;
  lang?: "en" | "zh" | "mixed";
  websiteUrl?: string;
  defaultReplyToTweetId?: string;
  defaultMediaPath?: string;
  postureHint?: XPublisherPosture;
};

export type XPublisherData = {
  reply: string;
  shouldExecute: boolean;
  posture: XPublisherPosture;
  oneclawTask: XPublisherTask | null;
};

type XPublisherCtx = WorkflowContext<
  XPublisherInput,
  XPublisherData
> & {
  templateVersion: number;
};

function asString(value: unknown): string {
  return String(value ?? "").trim();
}

function asPosture(value: unknown): XPublisherPosture {
  const text = asString(value);
  switch (text) {
    case "launch":
    case "growth":
    case "proof":
    case "quiet":
      return text;
    default:
      return "quiet";
  }
}

function normalizeXPublisherPlan(data: any): XPublisherData {
  const reply = asString(data?.reply);
  const shouldExecute = Boolean(data?.shouldExecute);
  const posture = asPosture(data?.posture);

  let oneclawTask: XPublisherTask | null = data?.oneclawTask ?? null;

  if (!shouldExecute) {
    oneclawTask = null;
  }

  if (shouldExecute && oneclawTask) {
    oneclawTask = {
      taskName:
        asString(oneclawTask.taskName) || "x_publisher_task",
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

export const xPublisherWorkflowDef: WorkflowDefinition<XPublisherCtx> = {
  name: "x_publisher_workflow",
  maxAttempts: 3,

  steps: [
    preparePromptStep<XPublisherInput, XPublisherData>({
      task: "x_publisher",
      templateVersion: 1,
      variables: (input) => ({
        message: input.message,
        lang: input.lang ?? "mixed",
        websiteUrl: input.websiteUrl ?? "",
        defaultReplyToTweetId: input.defaultReplyToTweetId ?? "",
        defaultMediaPath: input.defaultMediaPath ?? "",
        postureHint: input.postureHint ?? "",
      }),
    }),

    generateLLMStep<XPublisherInput, XPublisherData>(),

    parseJsonStep<XPublisherInput, XPublisherData>(),

    async (ctx: XPublisherCtx) => {
      ctx.data = normalizeXPublisherPlan(ctx.data);
      return { ok: true };
    },

    validateSchemaStep<XPublisherInput, XPublisherData>(
      xPublisherValidator,
    ),

    refineJsonStep<XPublisherInput, XPublisherData>({
      check: (ctx) => checkXPublisherConstraints(ctx.data as any),
      extraInstruction:
        "Return valid JSON only. If shouldExecute=false, oneclawTask must be null. If shouldExecute=true, oneclawTask must contain a valid taskName and at least one valid social.post step. Allowed posture values: launch, growth, proof, quiet. Only use social.post steps. For reply steps, input.replyToTweetId must be a numeric tweet ID. For media posts, include input.mediaPaths as an array of non-empty file paths. Prefer at most 3 posts total.",
    }),

    parseJsonStep<XPublisherInput, XPublisherData>(),

    async (ctx: XPublisherCtx) => {
      ctx.data = normalizeXPublisherPlan(ctx.data);
      return { ok: true };
    },

    validateSchemaStep<XPublisherInput, XPublisherData>(
      xPublisherValidator,
    ),

    async (ctx: XPublisherCtx) => {
      const result = checkXPublisherConstraints(ctx.data as any);

      if (!result.ok) {
        return { ok: false, error: result.errors };
      }

      if (!ctx.data) {
        return { ok: false, error: ["internal: data undefined"] };
      }

      // 纯 planning：这里绝不执行 OneClaw
      // 最终只返回规划结果给 Bot / service 层
      return { ok: true };
    },
  ],
};

registerWorkflow({
  task: "x_publisher",
  def: xPublisherWorkflowDef as any,
});