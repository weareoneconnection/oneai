import type { WorkflowContext, WorkflowStep } from "../types.js";

type PackKey = "quick" | "growth" | "launch" | "replies";

type ScheduleItem = {
  id: string;
  type: "hook" | "tweet" | "thread" | "cta" | "reply";
  text: string;
  suggested_at_iso: string;
  channel: "x";
};

function makeId() {
  return Math.random().toString(36).slice(2) + "-" + Math.random().toString(36).slice(2);
}

function safeTrim(v: any) {
  return String(v ?? "").trim();
}

function ensureArrayMin<T>(arr: T[] | undefined, min: number, fallback: T): T[] {
  const out = Array.isArray(arr) ? [...arr] : [];
  while (out.length < min) out.push(fallback);
  return out;
}

function buildDefaultReplyStrategy(input: any) {
  const pack: PackKey = (input?.pack as PackKey) || "quick";
  const audience = safeTrim(input?.audience || "builders");
  const tone = safeTrim(input?.tone || "contrarian");
  const lang = safeTrim(input?.lang || input?.language || "en");

  return {
    schema_version: "reply_strategy_v1",
    pack,
    audience,
    tone,
    lang,
    rules: [
      "Reply under big accounts within 2 minutes of their post.",
      "Start with a strong first line, then one concrete insight, then a question.",
      "No links in replies unless asked.",
    ],
    targets: [
      { type: "account", hint: "large builders / founders accounts" },
      { type: "thread", hint: "hot threads where your reply can rank top-3" },
    ],
  };
}

function buildDefaultSchedule(data: any) {
  // 超轻量默认 schedule（你后面会替换成真实 Distribution 层 schedule plan）
  const now = new Date();
  const plusHours = (h: number) => {
    const d = new Date(now);
    d.setHours(d.getHours() + h);
    return d.toISOString();
  };

  const hook0 = safeTrim(data?.best_hook || data?.hooks?.[0] || "");
  const tweet0 = safeTrim(data?.tweets?.[0] || "");
  const cta = safeTrim(data?.cta || "");

  const items: ScheduleItem[] = [];

  if (hook0) items.push({ id: makeId(), type: "hook", text: hook0, suggested_at_iso: plusHours(1), channel: "x" });
  if (tweet0) items.push({ id: makeId(), type: "tweet", text: tweet0, suggested_at_iso: plusHours(6), channel: "x" });
  if (cta) items.push({ id: makeId(), type: "cta", text: cta, suggested_at_iso: plusHours(24), channel: "x" });

  return {
    schema_version: "schedule_v1",
    generated_at_iso: new Date().toISOString(),
    timezone: (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
      } catch {
        return "local";
      }
    })(),
    items,
  };
}

export function normalizePackOutputStep<TInput, TData>(): WorkflowStep<WorkflowContext<TInput, TData>> {
  return async (ctx) => {
    const d: any = ctx.data || {};

    // ---- 1) hooks/tweets 数量兜底（让 schema minItems 不炸）
    const bestFallback = safeTrim(d.best_hook || d.hooks?.[0] || d.tweets?.[0] || d.cta || "Hook: structure beats prompts.");
    d.hooks = ensureArrayMin<string>(d.hooks, 5, bestFallback);
    d.tweets = ensureArrayMin<string>(d.tweets, 1, safeTrim(d.tweets?.[0] || bestFallback));

    // ---- 2) 必填对象兜底（schedule / reply_strategy）
    if (!d.reply_strategy) d.reply_strategy = buildDefaultReplyStrategy(ctx.input);
    if (!d.schedule) d.schedule = buildDefaultSchedule(d);

    // ---- 3) 清洗
    d.best_hook = safeTrim(d.best_hook || d.hooks?.[0] || "");
    d.cta = safeTrim(d.cta || "");
    d.hooks = (d.hooks || []).map(safeTrim).filter(Boolean);
    d.tweets = (d.tweets || []).map(safeTrim).filter(Boolean);

    ctx.data = d;
    return { ok: true };
  };
}