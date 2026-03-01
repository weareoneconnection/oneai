// src/core/workflows/waocChatWorkflow.ts
import { runTask } from "./registry.js";
import type { WorkflowContext } from "./types.js";
import type { WorkflowDefinition } from "./engine.js";

import { preparePromptStep } from "./steps/preparePromptStep.js";
import { generateLLMStep } from "./steps/generateLLMStep.js";
import { parseJsonStep } from "./steps/parseJsonStep.js";
import { validateSchemaStep } from "./steps/validateSchemaStep.js";
import { refineJsonStep } from "./steps/refineJsonStep.js";

import { waocChatValidator } from "../validators/waocChatValidator.js";
import { registerWorkflow } from "./registry.js";

import {
  checkWaocChatConstraints,
  type WaocChatData,
  type WaocSuggestedAction,
} from "../constraints/waocChatConstraints.js";

/* =========================
   Types
========================= */

export type WaocChatInput = {
  message: string;
  context?: "community" | "mission" | "philosophy" | "general";
  lang?: "en" | "zh";
  emotionHint?:
    | "greeting_morning"
    | "greeting_night"
    | "stress"
    | "anger"
    | "celebrate"
    | "gratitude"
    | "apology"
    | null;
};

type WaocChatCtx = WorkflowContext<WaocChatInput, WaocChatData> & {
  templateVersion: number;
};

/* =========================
   Helpers
========================= */

function norm(s: any) {
  return String(s ?? "").trim();
}
function lower(s: any) {
  return norm(s).toLowerCase();
}
function env(name: string) {
  const v = process.env[name];
  return v ? String(v).trim() : "";
}
function nonEmptyList(xs: Array<string | false | null | undefined>) {
  return xs.map((x) => String(x || "").trim()).filter(Boolean);
}

/** Basic intent signals (used only for safe fallback / quick replies) */
function looksLikeMeaningQuestion(msgLower: string) {
  return /waoc.*meaning|what.*waoc|stands for|acronym|全称|什么意思|含义|缩写|代表什么/.test(
    msgLower
  );
}
function looksLikeCAQuestion(msgLower: string) {
  return (
    /\bca\b/.test(msgLower) ||
    msgLower.includes("contract") ||
    msgLower.includes("address") ||
    msgLower.includes("合约") ||
    msgLower.includes("地址")
  );
}
function looksLikeNewsQuestion(msgLower: string) {
  return (
    msgLower.includes("news") ||
    msgLower.includes("update") ||
    msgLower.includes("what's new") ||
    msgLower.includes("最新") ||
    msgLower.includes("有什么消息") ||
    msgLower.includes("进展")
  );
}

/* =========================
   Deterministic Quick Replies (FACTUAL ONLY)
========================= */

function quickAutoReply(args: {
  raw: string;
  msg: string; // already lowercased
  lang: "en" | "zh";
}): WaocChatData | null {
  const { raw, msg, lang } = args;

  const WEBSITE_URL = env("WEBSITE_URL") || env("WAOC_SITE_URL");
  const X_URL = env("X_URL");
  const TG_URL = env("TG_URL") || env("WAOC_COMMUNITY_URL");
  const ONE_MISSION_URL = env("ONE_MISSION_URL");
  const ONE_FIELD_URL = env("ONE_FIELD_URL");
  const MEDITATION_URL = env("MEDITATION_URL");

  const WAOC_CA_SOL = env("WAOC_CA_SOL");
  const WAOC_CA_BSC = env("WAOC_CA_BSC");

  const links = nonEmptyList([
    WEBSITE_URL && `Website: ${WEBSITE_URL}`,
    X_URL && `X: ${X_URL}`,
    TG_URL && `Telegram: ${TG_URL}`,
    ONE_MISSION_URL && `One Mission: ${ONE_MISSION_URL}`,
    ONE_FIELD_URL && `One Field: ${ONE_FIELD_URL}`,
    MEDITATION_URL && `Meditation: ${MEDITATION_URL}`,
  ]);

  // ✅ suggestedAction 只做“入口按钮”，不和 Mission/Report 按钮冲突
  const actionLinks: WaocSuggestedAction = "/links";
  const actionNone: WaocSuggestedAction = "none";

  // --- WAOC meaning / stands for (deterministic) ---
  const asksMeaning =
    /waoc.*meaning|what.*waoc|stands for|acronym|全称|什么意思|含义|缩写|代表什么/.test(msg);

  if (asksMeaning) {
    const reply =
      lang === "zh"
        ? "WAOC = We Are One Connection。\n" +
          "WAOC 是面向长期协作的协调层：身份、贡献、证明，以及可落地的应用入口（如 One Mission / One Field）。\n\n" +
          "官方入口：\n" +
          (links.length
            ? links.map((x) => `- ${x}`).join("\n")
            : "（暂未配置官方链接）")
        : "WAOC = We Are One Connection.\n" +
          "WAOC is a long-term coordination layer for builders: identity, contribution, proofs, and practical applications (e.g., One Mission / One Field).\n\n" +
          "Official entry points:\n" +
          (links.length
            ? links.map((x) => `- ${x}`).join("\n")
            : "(official links not configured yet)");

    return { reply, suggestedAction: links.length ? actionLinks : actionNone };
  }

  // --- Website / Links ---
  const asksLinks =
    msg === "website" ||
    msg === "site" ||
    msg === "links" ||
    msg.includes("website") ||
    msg.includes("官网") ||
    msg.includes("链接") ||
    msg.includes("site");

  if (asksLinks) {
    return {
      reply:
        lang === "zh"
          ? "WAOC 官方入口在这里（选你需要的）：\n" +
            (links.length
              ? links.map((x) => `- ${x}`).join("\n")
              : "（暂未配置链接环境变量）")
          : "WAOC official entry points (pick what you need):\n" +
            (links.length
              ? links.map((x) => `- ${x}`).join("\n")
              : "(links not configured on server env yet)"),
      suggestedAction: links.length ? actionLinks : actionNone,
    };
  }

  // --- CA / Contract Address ---
  const asksCA = looksLikeCAQuestion(msg) || msg === "ca" || msg.includes("ca ");

  if (asksCA) {
    const hasSol = Boolean(WAOC_CA_SOL);
    const hasBsc = Boolean(WAOC_CA_BSC);

    if (lang === "zh") {
      if (hasSol || hasBsc) {
        const lines: string[] = [];
        if (hasSol) lines.push(`Solana CA: ${WAOC_CA_SOL}`);
        if (hasBsc) lines.push(`BSC CA: ${WAOC_CA_BSC}`);
        return {
          reply:
            "WAOC 合约地址（官方配置）：\n" +
            lines.map((x) => `- ${x}`).join("\n") +
            "\n\n⚠️ 只以官方渠道为准，别信私聊。",
          suggestedAction: actionLinks, // ✅ 仍给 /links：用于后续核验入口
        };
      }
      return {
        reply:
          "你问的是 WAOC 的 CA（合约地址）对吗？我这边没有在系统里配置 CA，所以不会乱写。\n" +
          "请到官网/置顶消息/官方频道核对后再操作。（需要入口可用 /links）",
        suggestedAction: actionLinks,
      };
    }

    if (hasSol || hasBsc) {
      const lines: string[] = [];
      if (hasSol) lines.push(`Solana CA: ${WAOC_CA_SOL}`);
      if (hasBsc) lines.push(`BSC CA: ${WAOC_CA_BSC}`);
      return {
        reply:
          "WAOC contract address (officially configured):\n" +
          lines.map((x) => `- ${x}`).join("\n") +
          "\n\n⚠️ Only trust official channels—ignore DMs.",
        suggestedAction: actionLinks,
      };
    }

    return {
      reply:
        "Are you asking for WAOC CA (contract address)? I don’t have a configured CA here, so I won’t guess.\n" +
        "Please verify via official links / pinned message. (/links)",
      suggestedAction: actionLinks,
    };
  }

  // --- One Mission / leaderboard ---
  const asksMission =
    msg.includes("one mission") ||
    msg === "mission" ||
    msg.includes("leaderboard") ||
    msg.includes("rank") ||
    msg.includes("排行榜") ||
    msg.includes("任务") ||
    msg.includes("积分");

  if (asksMission) {
    return {
      reply:
        lang === "zh"
          ? "One Mission 是 WAOC 的贡献引擎：完成任务 → 记分 → 上榜。用下方 Mission 按钮进入。"
          : "One Mission is WAOC’s contribution engine: complete tasks → earn points → climb the leaderboard. Use the Mission button below.",
      suggestedAction: actionNone, // ✅ 不和按钮冲突
    };
  }

  // --- help (very short triggers) ---
  if (raw.length <= 14) {
    if (lang === "zh" && (msg === "help" || msg === "帮助")) {
      return {
        reply:
          "我能帮你：解释 WAOC / One Mission / 排行榜、发公告草稿、做投票、写推文、梳理增长策略。",
        suggestedAction: actionNone,
      };
    }
    if (lang === "en" && msg === "help") {
      return {
        reply:
          "I can help explain WAOC/One Mission/leaderboards, draft announcements, polls, tweets, and growth strategy.",
        suggestedAction: actionNone,
      };
    }
  }

  return null;
}

/* =========================
   Constraint Guard (never crash)
========================= */

function applyConstraintsOrFallback(args: {
  data: WaocChatData;
  input: WaocChatInput;
}): { ok: true; data: WaocChatData } {
  const data = args.data || { reply: "", suggestedAction: "none" };
  const input = args.input || ({} as any);

  // ✅ pass userMessage for Identity Enforcement 2.0
  const check = checkWaocChatConstraints({ data, userMessage: input.message });
  if (check.ok) return { ok: true, data };

  const raw = norm(input.message);
  const msgLower = lower(raw);
  const lang: "en" | "zh" = input.lang === "zh" ? "zh" : "en";
  const replyLower = lower(data.reply || "");

  const hasBadExpansion =
    replyLower.includes("web of all communities") ||
    replyLower.includes("web of autonomous") ||
    replyLower.includes("autonomous communities") ||
    replyLower.includes("we are one community") ||
    replyLower.includes("one community") ||
    /waoc\s*(=|stands\s+for)\s*(?!we\s+are\s+one\s+connection)/.test(replyLower);

  // Links helper (only as reply content; action is /links)
  const website = env("WEBSITE_URL") || env("WAOC_SITE_URL");
  const tg = env("TG_URL") || env("WAOC_COMMUNITY_URL");
  const x = env("X_URL");
  const oneMission = env("ONE_MISSION_URL");

  const linkLine =
    [website && `Website: ${website}`, x && `X: ${x}`, tg && `Telegram: ${tg}`, oneMission && `One Mission: ${oneMission}`]
      .filter(Boolean)
      .join(" | ") || "";

  // --- Wrong expansion fix (short, non-PR) ---
  if (hasBadExpansion) {
    const fixed: WaocChatData =
      lang === "zh"
        ? {
            reply:
              (looksLikeMeaningQuestion(msgLower)
                ? "WAOC = We Are One Connection。\n"
                : "") +
              "WAOC 的全称只有一个：We Are One Connection。\n" +
              "它是面向长期协作的协调层：身份、贡献、证明与应用入口。\n" +
              (linkLine ? `\n入口：${linkLine}\n（需要入口可用 /links）` : ""),
            suggestedAction: linkLine ? "/links" : "none",
          }
        : {
            reply:
              (looksLikeMeaningQuestion(msgLower)
                ? "WAOC = We Are One Connection.\n"
                : "") +
              "WAOC has only one expansion: We Are One Connection.\n" +
              "It’s a long-term coordination layer for identity, contribution, proofs, and practical entry points.\n" +
              (linkLine ? `\nEntry: ${linkLine}\n(Use /links if you need the entry list.)` : ""),
            suggestedAction: linkLine ? "/links" : "none",
          };

    const c2 = checkWaocChatConstraints({ data: fixed, userMessage: input.message });
    if (c2.ok) return { ok: true, data: fixed };
  }

  // --- Meaning question MUST be hard-fixed ---
  if (looksLikeMeaningQuestion(msgLower)) {
    const fixed: WaocChatData =
      lang === "zh"
        ? {
            reply:
              "WAOC = We Are One Connection。\n" +
              "它是一套面向长期协作的协调层：身份、贡献、证明，以及可落地的应用入口（如 One Mission / One Field 等）。",
            suggestedAction: "none",
          }
        : {
            reply:
              "WAOC = We Are One Connection.\n" +
              "It’s a long-term coordination layer for identity, contribution, proofs, and practical apps (e.g., One Mission / One Field).",
            suggestedAction: "none",
          };

    const c2 = checkWaocChatConstraints({ data: fixed, userMessage: input.message });
    if (c2.ok) return { ok: true, data: fixed };
  }

  // --- News/update questions: Truth Gate + path ---
  if (looksLikeNewsQuestion(msgLower)) {
    const fixed: WaocChatData =
      lang === "zh"
        ? {
            reply:
              "我这边不做“实时新闻/进展”的猜测，也不会编。\n" +
              "以置顶消息 + 官网/官方 X 更新为准；如果你只是想看群内摘要，用下方 Report 按钮。",
            suggestedAction: linkLine ? "/links" : "none", // ✅ 需要入口时给 /links；Report 用按钮，不用 action
          }
        : {
            reply:
              "I can’t verify real-time news here and I won’t guess.\n" +
              "Use pinned messages + official website/X updates. If you just want an in-community summary, use the Report button below.",
            suggestedAction: linkLine ? "/links" : "none",
          };

    const c2 = checkWaocChatConstraints({ data: fixed, userMessage: input.message });
    if (c2.ok) return { ok: true, data: fixed };
  }

  // --- CA/price safety fallback ---
  if (looksLikeCAQuestion(msgLower) || /price|估值|价格|多少钱|市值|行情/.test(msgLower)) {
    const fixed: WaocChatData =
      lang === "zh"
        ? {
            reply:
              "这类信息（CA/价格/上所/合作）如果没出现在官方入口里，我不会乱写。\n" +
              "请用置顶消息/官网/官方 X 核对。（需要入口可用 /links）",
            suggestedAction: linkLine ? "/links" : "none",
          }
        : {
            reply:
              "For CA/price/listings/partnerships: if it’s not in official sources, I won’t guess.\n" +
              "Verify via pinned message/website/official X. (Use /links for entry points.)",
            suggestedAction: linkLine ? "/links" : "none",
          };

    const c2 = checkWaocChatConstraints({ data: fixed, userMessage: input.message });
    if (c2.ok) return { ok: true, data: fixed };
  }

  // --- Generic safe fallback (non-coaching) ---
  const fixed: WaocChatData =
    lang === "zh"
      ? {
          reply:
            "我按 WAOC 语境给你可执行的路径：要入口发 /links；要执行（推文/叙事/任务）直接发关键词：tweet / narrative / mission。",
          suggestedAction: "none",
        }
      : {
          reply:
            "Practical path: for entry points send /links; for execution (tweet/narrative/mission) just send the keyword: tweet / narrative / mission.",
          suggestedAction: "none",
        };

  const c2 = checkWaocChatConstraints({ data: fixed, userMessage: input.message });
  if (c2.ok) return { ok: true, data: fixed };

  return {
    ok: true,
    data: {
      reply: lang === "zh" ? "WAOC = We Are One Connection。" : "WAOC = We Are One Connection.",
      suggestedAction: "none",
    },
  };
}

/* =========================
   Workflow
========================= */

export const waocChatWorkflowDef: WorkflowDefinition<WaocChatCtx> = {
  name: "waoc_chat_workflow",
  maxAttempts: 3,
  steps: [
    preparePromptStep<WaocChatInput, WaocChatData>({
      task: "waoc_chat",
      templateVersion: 9,
      variables: (input) => ({
        message: input.message,
        context: input.context ?? "general",
        lang: input.lang ?? "en",
        emotionHint: input.emotionHint ?? "",

        websiteUrl: env("WEBSITE_URL") || env("WAOC_SITE_URL"),
        tgUrl: env("TG_URL") || env("WAOC_COMMUNITY_URL"),
        oneMissionUrl: env("ONE_MISSION_URL"),
        oneFieldUrl: env("ONE_FIELD_URL"),
        meditationUrl: env("MEDITATION_URL"),
      }),
    }),

    generateLLMStep<WaocChatInput, WaocChatData>(),
    parseJsonStep<WaocChatInput, WaocChatData>(),
    validateSchemaStep<WaocChatInput, WaocChatData>(waocChatValidator),

    refineJsonStep<WaocChatInput, WaocChatData>({
      // ✅ Identity Enforcement 2.0: pass userMessage into constraints
      check: (ctx) =>
        checkWaocChatConstraints({
          data: ctx.data as any,
          userMessage: ctx.input?.message,
        }),
      extraInstruction:
        'Return ONLY valid JSON: {"reply":"...","suggestedAction":"..."}.\n' +
        "- reply is required and must answer directly (no coaching openers).\n" +
        '- suggestedAction is optional and MUST be either "none" or "/links".\n' +
        "- WAOC MUST be expanded ONLY as 'We Are One Connection'. Never redefine the acronym.\n" +
        "- Only if the user asks WAOC meaning/acronym/full-form, include: 'WAOC = We Are One Connection.' (not necessarily every reply).\n" +
        "- Never fabricate CA/price/news/partnership/listing. If not verifiable, say you can't verify and provide official verification steps (pinned/website/official X or /links).\n" +
        "- If user message is short (tweet/narrative/mission/roadmap/website/links/ca/rank/report), execute immediately without follow-up questions.\n",
    }),

    parseJsonStep<WaocChatInput, WaocChatData>(),
    validateSchemaStep<WaocChatInput, WaocChatData>(waocChatValidator),

    async (ctx: WaocChatCtx) => {
      if (!ctx.data) ctx.data = { reply: "", suggestedAction: "none" };

      // ✅ (1) First constraints gate (post-LLM)
      ctx.data = applyConstraintsOrFallback({ data: ctx.data, input: ctx.input }).data;

      const raw = norm(ctx.input.message);
      const msg = lower(raw);
      const lang: "en" | "zh" = ctx.input.lang === "zh" ? "zh" : "en";

      // ✅ (2) Deterministic factual quick replies
      const quick = quickAutoReply({ raw, msg, lang });
      if (quick) {
        ctx.data = applyConstraintsOrFallback({ data: quick, input: ctx.input }).data;
        return { ok: true };
      }

      // ✅ (3) Router: forward certain intents to other tasks/templates
      const routes: Array<{ hit: (s: string) => boolean; task: string }> = [
        { hit: (s) => /估值|value|valuation/.test(s), task: "waoc_brain" }, // ✅ 价格类仍会被 TruthGate 兜底
        { hit: (s) => /叙事|宣言|理念|哲学|manifesto|narrative|vision/.test(s), task: "waoc_narrative" },
        { hit: (s) => /mission|任务|排行榜|leaderboard|rank/.test(s), task: "mission" },
        { hit: (s) => /tweet|推文|发推|x\.com|thread/.test(s), task: "tweet" },
      ];

      const match = routes.find((r) => r.hit(msg));
      if (match) {
        try {
          const r = await runTask(
            match.task,
            match.task === "waoc_brain"
              ? { question: raw, lang: ctx.input.lang ?? "en" }
              : match.task === "waoc_narrative"
              ? { topic: raw, depth: "short", lang: ctx.input.lang ?? "en" }
              : { message: raw, lang: ctx.input.lang ?? "en" },
            { templateVersion: 5 }
          );

          if (r?.success) {
            const answer =
              (r.data?.reply ??
                r.data?.answer ??
                r.data?.content ??
                r.data?.text ??
                "").toString().trim();

            if (answer) {
              const next: WaocChatData = {
                ...ctx.data,
                reply: answer,
                // ✅ 默认不塞 action，避免冲突
                suggestedAction: ctx.data?.suggestedAction ?? "none",
              };

              // ✅ 如果子任务提供 links，仍然不要塞到 suggestedAction（避免长串/冲突）
              // 让 reply 自己包含必要链接/路径；必要时用 /links
              if (Array.isArray(r.data?.links) && r.data.links.length) {
                next.reply += "\n\n(Need official entry points? Use /links.)";
                next.suggestedAction = "/links";
              }

              // ✅ (4) Second constraints gate (post-routing override)
              ctx.data = applyConstraintsOrFallback({ data: next, input: ctx.input }).data;
            }
          }
        } catch {
          ctx.data = applyConstraintsOrFallback({ data: ctx.data, input: ctx.input }).data;
        }
      }

      // ✅ Final guarantee
      ctx.data = applyConstraintsOrFallback({ data: ctx.data, input: ctx.input }).data;
      return { ok: true };
    },
  ],
};

registerWorkflow({
  task: "waoc_chat",
  def: waocChatWorkflowDef as any,
});