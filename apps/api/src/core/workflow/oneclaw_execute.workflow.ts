import type { WorkflowContext } from "./types.js";
import type { WorkflowDefinition } from "./engine.js";

import { preparePromptStep } from "./steps/preparePromptStep.js";
import { generateLLMStep } from "./steps/generateLLMStep.js";
import { parseJsonStep } from "./steps/parseJsonStep.js";
import { validateSchemaStep } from "./steps/validateSchemaStep.js";
import { refineJsonStep } from "./steps/refineJsonStep.js";

import { registerWorkflow } from "./registry.js";
import { oneclawExecuteValidator } from "../validators/oneclawExecuteValidator.js";
import { checkOneClawExecuteConstraints } from "../constraints/oneclawExecuteConstraints.js";

export type OneClawAction =
  | "api.request"
  | "browser.open"
  | "browser.screenshot"
  | "file.read"
  | "file.write"
  | "message.send"
  | "social.post";

export type OneClawStep = {
  id: string;
  action: OneClawAction;
  input: Record<string, unknown>;
  dependsOn?: string[];
};

export type OneClawTask = {
  taskName: string;
  steps: OneClawStep[];
};

export type OneClawExecuteInput = {
  message: string;
  lang?: "en" | "zh" | "mixed";
  defaultChatId?: string;
  defaultScreenshotPath?: string;
};

export type OneClawExecuteData = {
  reply: string;
  shouldExecute: boolean;
  oneclawTask: OneClawTask | null;
};

type OneClawExecuteCtx = WorkflowContext<
  OneClawExecuteInput,
  OneClawExecuteData
> & {
  templateVersion: number;
};

function normalizeOneClawPlan(data: any): OneClawExecuteData {
  const reply = String(data?.reply ?? "").trim();
  const shouldExecute = Boolean(data?.shouldExecute);

  let oneclawTask: OneClawTask | null = data?.oneclawTask ?? null;

  if (!shouldExecute) {
    oneclawTask = null;
  }

  if (shouldExecute && oneclawTask) {
    oneclawTask = {
      taskName: String(oneclawTask.taskName ?? "oneclaw_task").trim() || "oneclaw_task",
      steps: Array.isArray(oneclawTask.steps)
        ? oneclawTask.steps.map((step: any, index: number) => ({
            id: String(step?.id ?? `step_${index + 1}`).trim() || `step_${index + 1}`,
            action: String(step?.action ?? "").trim() as OneClawAction,
            input:
              step?.input && typeof step.input === "object" && !Array.isArray(step.input)
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
    oneclawTask,
  };
}

export const oneclawExecuteWorkflowDef: WorkflowDefinition<OneClawExecuteCtx> = {
  name: "oneclaw_execute_workflow",
  maxAttempts: 3,

  steps: [
    preparePromptStep<OneClawExecuteInput, OneClawExecuteData>({
      task: "oneclaw_execute",
      templateVersion: 1,
      variables: (input) => ({
        message: input.message,
        lang: input.lang ?? "mixed",
        defaultChatId: input.defaultChatId ?? "",
        defaultScreenshotPath: input.defaultScreenshotPath ?? "screenshot.png",
      }),
    }),

    generateLLMStep<OneClawExecuteInput, OneClawExecuteData>(),

    parseJsonStep<OneClawExecuteInput, OneClawExecuteData>(),

    async (ctx: OneClawExecuteCtx) => {
      ctx.data = normalizeOneClawPlan(ctx.data);
      return { ok: true };
    },

    validateSchemaStep<OneClawExecuteInput, OneClawExecuteData>(
      oneclawExecuteValidator
    ),

    refineJsonStep<OneClawExecuteInput, OneClawExecuteData>({
      check: (ctx) => checkOneClawExecuteConstraints(ctx.data as any),
      extraInstruction:
        "Return valid JSON only. If shouldExecute=false, oneclawTask must be null. If shouldExecute=true, oneclawTask must contain a valid taskName and at least one valid step. Only use these actions: api.request, browser.open, browser.screenshot, file.read, file.write, message.send, social.post.",
    }),

    parseJsonStep<OneClawExecuteInput, OneClawExecuteData>(),

    async (ctx: OneClawExecuteCtx) => {
      ctx.data = normalizeOneClawPlan(ctx.data);
      return { ok: true };
    },

    validateSchemaStep<OneClawExecuteInput, OneClawExecuteData>(
      oneclawExecuteValidator
    ),

    async (ctx: OneClawExecuteCtx) => {
      const result = checkOneClawExecuteConstraints(ctx.data as any);

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
  task: "oneclaw_execute",
  def: oneclawExecuteWorkflowDef as any,
});