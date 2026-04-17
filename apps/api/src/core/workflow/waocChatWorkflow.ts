// src/core/workflow/waocChatWorkflow.ts

import { runTask, registerWorkflow } from "./registry.js";
import type { WorkflowContext } from "./types.js";
import type { WorkflowDefinition } from "./engine.js";

import { preparePromptStep } from "./steps/preparePromptStep.js";
import { generateLLMStep } from "./steps/generateLLMStep.js";

const WAOC_CHAT_TEMPLATE_VERSION = 4;

export type WaocChatInput = {
  message: string;
  lang?: "en" | "zh" | "mixed";
  recentMessages?: string;
  memory?: string;
  threadMemory?: string | null;

  communityName?: string;
  communityIdentity?: string;
  communityNarrative?: string;
  communityFocus?: string;
  ecosystemContext?: string;
  officialLinks?: string;
};

export type WaocChatData = {
  reply: string;
  suggestedAction?: string;
};

type WaocChatCtx = WorkflowContext<WaocChatInput, WaocChatData> & {
  __rawOutput?: string;
  __threadMemory?: Record<string, any>;
};

function norm(v: unknown) {
  return String(v ?? "").trim();
}

function safeJson(value: any) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function parseThreadMemory(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, any>;

  try {
    return JSON.parse(String(value));
  } catch {
    return {};
  }
}

function finalizeReply(reply: string, lang?: "en" | "zh" | "mixed") {
  const text = norm(reply)
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20)
    .join("\n");

  if (text) return text;

  return lang === "zh"
    ? "刚刚那条没处理好。"
    : "That one didn’t go through cleanly.";
}

function extractJsonObject(output: string): string | null {
  const raw = String(output ?? "").trim();
  if (!raw) return null;

  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first >= 0 && last > first) {
    return raw.slice(first, last + 1);
  }

  return null;
}

function parseOutput(raw: string, lang?: "en" | "zh" | "mixed"): WaocChatData {
  const text = String(raw ?? "").trim();

  if (!text) {
    return {
      reply:
        lang === "zh"
          ? "刚刚那条没处理好。"
          : "That one didn’t go through cleanly.",
      suggestedAction: "none",
    };
  }

  try {
    const parsed = JSON.parse(text);
    return {
      reply: finalizeReply(parsed?.reply || text, lang),
      suggestedAction: typeof parsed?.suggestedAction === "string" ? parsed.suggestedAction.trim() : "none",
    };
  } catch {
    // continue
  }

  const extracted = extractJsonObject(text);
  if (extracted) {
    try {
      const parsed = JSON.parse(extracted);
      return {
        reply: finalizeReply(parsed?.reply || text, lang),
        suggestedAction: typeof parsed?.suggestedAction === "string" ? parsed.suggestedAction.trim() : "none",
      };
    } catch {
      // continue
    }
  }

  return {
    reply: finalizeReply(text, lang),
    suggestedAction: "none",
  };
}

function hasUrl(text: string) {
  return /https?:\/\/\S+/i.test(text) || /\bwww\.\S+/i.test(text);
}

function looksLikeBrowseIntent(text: string) {
  return (
    hasUrl(text) ||
    /浏览网页|打开网页|访问网页|看看这个网页|看看这个网站|分析这个网页|分析这个链接|读取网页|抓取网页|看一下这个网站|看一下这个网页/.test(text) ||
    /open (this )?(page|site|website|link)/i.test(text) ||
    /browse (this )?(page|site|website|link)/i.test(text) ||
    /analyze (this )?(page|site|website|link)/i.test(text) ||
    /read (this )?(page|site|website|link)/i.test(text)
  );
}

async function saveSimpleMemory(ctx: WaocChatCtx) {
  const chatId =
    (ctx as any)?.meta?.chatId ||
    (ctx as any)?.chatId ||
    (ctx as any)?.input?.chatId;

  if (!chatId) return;

  try {
    await runTask("memory_store", {
      namespace: "waoc_chat_thread_memory",
      key: String(chatId),
      value: safeJson({
        lastUserMessage: norm(ctx.input?.message),
        lastReply: norm(ctx.data?.reply),
        updatedAt: Date.now(),
      }),
    });
  } catch {
    // do nothing
  }
}

async function readSimpleMemory(ctx: WaocChatCtx) {
  const chatId =
    (ctx as any)?.meta?.chatId ||
    (ctx as any)?.chatId ||
    (ctx as any)?.input?.chatId;

  if (!chatId) return {};

  try {
    const res = await runTask("memory_read", {
      namespace: "waoc_chat_thread_memory",
      key: String(chatId),
    });

    return parseThreadMemory(res?.data?.value ?? "");
  } catch {
    return {};
  }
}

export const waocChatWorkflowDef: WorkflowDefinition<WaocChatCtx> = {
  name: "waoc_chat_workflow",
  maxAttempts: 1,
  steps: [
    // 1) 准备轻记忆
    async (ctx: WaocChatCtx) => {
      const previous =
        parseThreadMemory(ctx.input?.threadMemory) ||
        (await readSimpleMemory(ctx));

      ctx.__threadMemory = previous;
      return { ok: true };
    },

    // 2) 生成 prompt
    preparePromptStep<WaocChatInput, WaocChatData>({
      task: "waoc_chat",
      templateVersion: 4,
      variables: (input: WaocChatInput, ctx?: any): Record<string, string> => {
        const c = ctx as WaocChatCtx | undefined;

        return {
          message: norm(input.message),
          recentMessages: norm(input.recentMessages ?? ""),
          memory: norm(input.memory ?? ""),
          threadMemory: safeJson(c?.__threadMemory ?? {}),
          communityContext: safeJson({
            communityName: norm(input.communityName),
            communityIdentity: norm(input.communityIdentity),
            communityNarrative: norm(input.communityNarrative),
            communityFocus: norm(input.communityFocus),
            ecosystemContext: norm(input.ecosystemContext),
            officialLinks: norm(input.officialLinks),
          }),
        };
      },
    }),

    // 3) LLM 生成
    generateLLMStep<WaocChatInput, WaocChatData>(),

    // 4) 解析 + 轻路由 + 保存记忆
    async (ctx: WaocChatCtx) => {
      const rawOutput =
        (ctx as any)?.output ??
        (ctx as any)?.rawOutput ??
        (ctx as any)?.llmOutput ??
        (ctx as any)?.result ??
        "";

      ctx.__rawOutput = String(rawOutput ?? "");
      ctx.data = parseOutput(ctx.__rawOutput, ctx.input?.lang);

      const rawMessage = norm(ctx.input?.message);

      // 自动调用 OneClaw 浏览网页
      if (looksLikeBrowseIntent(rawMessage)) {
        try {
          const taskInput: any = {
            message: rawMessage,
            lang: ctx.input?.lang ?? "en",
            recentMessages: norm(ctx.input?.recentMessages ?? ""),
            memory: norm(ctx.input?.memory ?? ""),
            threadMemory: safeJson(ctx.__threadMemory ?? {}),
            communityName: norm(ctx.input?.communityName),
            communityIdentity: norm(ctx.input?.communityIdentity),
            communityNarrative: norm(ctx.input?.communityNarrative),
            communityFocus: norm(ctx.input?.communityFocus),
            ecosystemContext: norm(ctx.input?.ecosystemContext),
            officialLinks: norm(ctx.input?.officialLinks),
            defaultChatId: String(
              (ctx as any)?.meta?.chatId ??
              (ctx as any)?.chatId ??
              (ctx as any)?.input?.chatId ??
              ""
            ).trim(),
            defaultScreenshotPath: "oneclaw_auto.png"
          };

          const r = await runTask("oneclaw_execute", taskInput, {
            templateVersion: 1,
          });

          const clawReply =
            r?.data?.reply ??
            r?.data?.answer ??
            r?.data?.content ??
            r?.data?.text;

          if (r?.success && clawReply) {
            ctx.data.reply = finalizeReply(String(clawReply), ctx.input?.lang);
            ctx.data.suggestedAction = "/web";
          }
        } catch {
          // 不抛错，保留原始 AI 回复
        }
      }

      await saveSimpleMemory(ctx);

      return { ok: true };
    },
  ],
};

registerWorkflow({
  task: "waoc_chat",
  def: waocChatWorkflowDef as any,
});