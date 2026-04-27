import type { WorkflowDefinition } from "../engine.js";
import type { WorkflowContext, WorkflowStep } from "../types.js";
import { registerWorkflow } from "../registry.js";
import { generateLLMStep } from "../steps/generateLLMStep.js";
import { parseJsonStep } from "../steps/parseJsonStep.js";
import { refineJsonStep } from "../steps/refineJsonStep.js";
import { validateSchemaStep } from "../steps/validateSchemaStep.js";
import { compileTemplate } from "../../prompts/compiler.js";
import moduleAnalysisPrompt from "./prompts/module_analysis.v1.json" with { type: "json" };
import initialProjectAnalysisPrompt from "./prompts/initial_project_analysis.v1.json" with { type: "json" };
import oneclawTaskPrompt from "./prompts/oneclaw_task.v1.json" with { type: "json" };
import {
  constructionInitialProjectAnalysisValidator,
  constructionModuleAnalysisValidator,
  constructionOneclawTaskValidator,
} from "./validators.js";

type JsonRecord = Record<string, unknown>;

type PromptTemplate = {
  system: string;
  userTemplate: string;
};

type ConstructionWorkflowInput = JsonRecord & {
  message?: string;
  lang?: "en" | "zh" | "mixed";
};

type ModuleAnalysisData = {
  status: "ok" | "warning" | "critical";
  executiveSummary: string;
  metrics: JsonRecord;
  recommendations: string[];
  risks?: JsonRecord[];
  suggestedActions?: JsonRecord[];
  confidence?: number;
};

type OneClawStep = {
  id: string;
  action: string;
  input: JsonRecord;
  dependsOn?: string[];
};

type OneClawTaskData = {
  reply: string;
  shouldExecute: boolean;
  oneclawTask: null | {
    taskName: string;
    steps: OneClawStep[];
  };
};

type Ctx<TData> = WorkflowContext<ConstructionWorkflowInput, TData> & {
  templateVersion: number;
};

const CONSTRUCTION_ONECLAW_ACTIONS = [
  "content.generate",
  "content.transform",
  "result.compose",
  "api.request",
  "api.webhook",
  "browser.open",
  "browser.screenshot",
  "browser.extract",
  "browser.click",
  "browser.type",
  "file.read",
  "file.write",
  "file.append",
  "file.list",
  "message.draft",
  "message.notify",
  "message.send",
  "human.approval.request",
  "human.confirmation.request",
  "construction.task.create",
  "construction.approval.request",
  "construction.procurement.followup",
  "construction.inspection.create",
  "construction.hse.corrective_action",
  "construction.qaqc.ncr.create",
  "construction.rfi.create",
  "construction.change_order.prepare",
  "construction.schedule.recovery_plan",
  "construction.contract.claim_prepare",
  "construction.budget.variance_review",
] as const;

const allowedActions = new Set<string>(CONSTRUCTION_ONECLAW_ACTIONS);

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asContext(input: ConstructionWorkflowInput) {
  return JSON.stringify(input, null, 2);
}

function prepareConstructionPrompt<TData>(params: {
  prompt: PromptTemplate;
  module?: string;
  taskType?: string;
}): WorkflowStep<Ctx<TData>> {
  return async (ctx) => {
    ctx.systemPrompt = params.prompt.system;
    ctx.userPrompt = compileTemplate(params.prompt.userTemplate, {
      module: params.module ?? "",
      taskType: params.taskType ?? ctx.task,
      context: asContext(ctx.input),
      lang: ctx.input.lang ?? "mixed",
    });
    ctx.model = "gpt-4o-mini";
    ctx.temperature = 0.3;
    return { ok: true };
  };
}

function normalizeModuleAnalysis(data: unknown): ModuleAnalysisData {
  const raw = isRecord(data) ? data : {};
  const status = String(raw.status ?? "warning").toLowerCase();
  return {
    status: ["ok", "warning", "critical"].includes(status)
      ? (status as ModuleAnalysisData["status"])
      : "warning",
    executiveSummary:
      String(raw.executiveSummary ?? raw.summary ?? "").trim() ||
      "Construction analysis completed.",
    metrics: isRecord(raw.metrics) ? raw.metrics : {},
    recommendations: Array.isArray(raw.recommendations)
      ? raw.recommendations.map((item) => String(item).trim()).filter(Boolean)
      : ["Review the available construction signals and assign accountable follow-up."],
    risks: Array.isArray(raw.risks) ? (raw.risks.filter(isRecord) as JsonRecord[]) : [],
    suggestedActions: Array.isArray(raw.suggestedActions)
      ? (raw.suggestedActions.filter(isRecord) as JsonRecord[])
      : [],
    confidence: Number.isFinite(Number(raw.confidence))
      ? Math.max(0, Math.min(1, Number(raw.confidence)))
      : 0.7,
  };
}

function normalizeInitialProjectAnalysis(data: unknown) {
  const raw = isRecord(data) ? data : {};
  const modules = ["risk", "contract", "budget", "schedule", "procurement", "qaqc", "hse"];
  const out: JsonRecord = {
    summary:
      String(raw.summary ?? "").trim() ||
      "Initial Construction OS project analysis completed.",
  };

  for (const module of modules) {
    out[module] = normalizeModuleAnalysis(raw[module]);
  }

  return out;
}

function normalizeDependsOn(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeOneclawTask(data: unknown): OneClawTaskData {
  const raw = isRecord(data) ? data : {};
  const shouldExecute = Boolean(raw.shouldExecute);
  const reply =
    String(raw.reply ?? "").trim() ||
    (shouldExecute ? "Construction task planned." : "No execution needed.");

  if (!shouldExecute || !isRecord(raw.oneclawTask)) {
    return { reply, shouldExecute: false, oneclawTask: null };
  }

  const rawTask = raw.oneclawTask;
  const steps = Array.isArray(rawTask.steps) ? rawTask.steps : [];

  return {
    reply,
    shouldExecute,
    oneclawTask: {
      taskName:
        String(rawTask.taskName ?? "construction_oneclaw_task").trim() ||
        "construction_oneclaw_task",
      steps: steps.map((step, index) => {
        const s = isRecord(step) ? step : {};
        return {
          id: String(s.id ?? `step_${index + 1}`).trim() || `step_${index + 1}`,
          action: String(s.action ?? "").trim(),
          input: isRecord(s.input) ? s.input : {},
          dependsOn: normalizeDependsOn(s.dependsOn),
        };
      }),
    },
  };
}

function checkModuleAnalysis(data: ModuleAnalysisData) {
  const errors: string[] = [];
  if (!data.executiveSummary.trim()) errors.push("executiveSummary is required.");
  if (!data.recommendations.length) errors.push("recommendations must not be empty.");
  return { ok: errors.length === 0, errors };
}

function checkOneclawTask(data: OneClawTaskData) {
  const errors: string[] = [];
  if (!data.reply.trim()) errors.push("reply is required.");
  if (data.shouldExecute && !data.oneclawTask) {
    errors.push("oneclawTask is required when shouldExecute=true.");
  }
  if (!data.shouldExecute && data.oneclawTask !== null) {
    errors.push("oneclawTask must be null when shouldExecute=false.");
  }
  if (!data.oneclawTask) return { ok: errors.length === 0, errors };

  const ids = new Set<string>();
  for (const step of data.oneclawTask.steps) {
    if (!step.id.trim()) errors.push("step id is required.");
    if (ids.has(step.id)) errors.push(`duplicate step id: ${step.id}`);
    ids.add(step.id);
    if (!allowedActions.has(step.action)) {
      errors.push(`unsupported construction action: ${step.action}`);
    }
    for (const dep of step.dependsOn ?? []) {
      if (!ids.has(dep)) errors.push(`step ${step.id} depends on unknown or later step: ${dep}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function moduleWorkflow(task: string, module: string): WorkflowDefinition<Ctx<ModuleAnalysisData>> {
  return {
    name: `${task}_workflow`,
    maxAttempts: 3,
    steps: [
      prepareConstructionPrompt({ prompt: moduleAnalysisPrompt, module }),
      generateLLMStep<ConstructionWorkflowInput, ModuleAnalysisData>(),
      parseJsonStep<ConstructionWorkflowInput, ModuleAnalysisData>(),
      async (ctx) => {
        ctx.data = normalizeModuleAnalysis(ctx.data);
        return { ok: true };
      },
      validateSchemaStep<ConstructionWorkflowInput, ModuleAnalysisData>(
        constructionModuleAnalysisValidator,
      ),
      refineJsonStep<ConstructionWorkflowInput, ModuleAnalysisData>({
        check: (ctx) => checkModuleAnalysis(ctx.data as ModuleAnalysisData),
        extraInstruction:
          "Return valid JSON only. Include status, executiveSummary, metrics, and non-empty recommendations.",
      }),
      parseJsonStep<ConstructionWorkflowInput, ModuleAnalysisData>(),
      async (ctx) => {
        ctx.data = normalizeModuleAnalysis(ctx.data);
        return { ok: true };
      },
      validateSchemaStep<ConstructionWorkflowInput, ModuleAnalysisData>(
        constructionModuleAnalysisValidator,
      ),
    ],
  };
}

function initialWorkflow(): WorkflowDefinition<Ctx<JsonRecord>> {
  return {
    name: "construction.project.initial_analysis_workflow",
    maxAttempts: 3,
    steps: [
      prepareConstructionPrompt({ prompt: initialProjectAnalysisPrompt }),
      generateLLMStep<ConstructionWorkflowInput, JsonRecord>(),
      parseJsonStep<ConstructionWorkflowInput, JsonRecord>(),
      async (ctx) => {
        ctx.data = normalizeInitialProjectAnalysis(ctx.data);
        return { ok: true };
      },
      validateSchemaStep<ConstructionWorkflowInput, JsonRecord>(
        constructionInitialProjectAnalysisValidator,
      ),
    ],
  };
}

function oneclawWorkflow(task: string, taskType: string): WorkflowDefinition<Ctx<OneClawTaskData>> {
  return {
    name: `${task}_workflow`,
    maxAttempts: 3,
    steps: [
      prepareConstructionPrompt({ prompt: oneclawTaskPrompt, taskType }),
      generateLLMStep<ConstructionWorkflowInput, OneClawTaskData>(),
      parseJsonStep<ConstructionWorkflowInput, OneClawTaskData>(),
      async (ctx) => {
        ctx.data = normalizeOneclawTask(ctx.data);
        return { ok: true };
      },
      validateSchemaStep<ConstructionWorkflowInput, OneClawTaskData>(
        constructionOneclawTaskValidator,
      ),
      refineJsonStep<ConstructionWorkflowInput, OneClawTaskData>({
        check: (ctx) => checkOneclawTask(ctx.data as OneClawTaskData),
        extraInstruction:
          "Return valid JSON only. Use only allowed Construction OS OneClaw actions. If shouldExecute=false, oneclawTask must be null.",
      }),
      parseJsonStep<ConstructionWorkflowInput, OneClawTaskData>(),
      async (ctx) => {
        ctx.data = normalizeOneclawTask(ctx.data);
        return { ok: true };
      },
      validateSchemaStep<ConstructionWorkflowInput, OneClawTaskData>(
        constructionOneclawTaskValidator,
      ),
    ],
  };
}

const moduleTasks = [
  ["construction.contract.analysis", "contract"],
  ["construction.budget.analysis", "budget"],
  ["construction.schedule.analysis", "schedule"],
  ["construction.procurement.analysis", "procurement"],
  ["construction.risk.analysis", "risk"],
  ["construction.qaqc.analysis", "qaqc"],
  ["construction.hse.analysis", "hse"],
] as const;

for (const [task, module] of moduleTasks) {
  registerWorkflow({ task, def: moduleWorkflow(task, module) as any });
}

registerWorkflow({
  task: "construction.project.initial_analysis",
  def: initialWorkflow() as any,
});

registerWorkflow({
  task: "construction.workflow.approval",
  def: oneclawWorkflow("construction.workflow.approval", "approval workflow") as any,
});

registerWorkflow({
  task: "construction.workflow.task",
  def: oneclawWorkflow("construction.workflow.task", "task workflow") as any,
});

registerWorkflow({
  task: "construction_oneclaw_execute",
  def: oneclawWorkflow("construction_oneclaw_execute", "action workflow") as any,
});
