// src/core/workflows/waocChatWorkflow.ts
import { runTask, registerWorkflow } from "./registry.js";
import type { WorkflowContext } from "./types.js";
import type { WorkflowDefinition } from "./engine.js";

import { preparePromptStep } from "./steps/preparePromptStep.js";
import { generateLLMStep } from "./steps/generateLLMStep.js";
import { parseJsonStep } from "./steps/parseJsonStep.js";
import { validateSchemaStep } from "./steps/validateSchemaStep.js";
import { refineJsonStep } from "./steps/refineJsonStep.js";

import { waocChatValidator } from "../validators/waocChatValidator.js";
import {
  checkWaocChatConstraints,
  type WaocChatData,
  type WaocSuggestedAction,
} from "../constraints/waocChatConstraints.js";

/* =========================
   Constants
========================= */

const WAOC_CHAT_TEMPLATE_VERSION = 10;

const ALLOWED_ACTIONS: WaocSuggestedAction[] = [
  "none",
  "/links",
  "/mission",
  "/rank",
  "/report",
  "/builders",
  "/knowledge",
  "/growth",
];

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
  recentMessages?: string;
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

function isAllowedAction(v: any): v is WaocSuggestedAction {
  return ALLOWED_ACTIONS.includes(v as WaocSuggestedAction);
}

function ensureAllowedAction(v: any): WaocSuggestedAction {
  return isAllowedAction(v) ? v : "none";
}

function getRecentMessages(ctx: WaocChatCtx) {
  return norm(
    ctx.input?.recentMessages ??
      (ctx as any)?.recentMessages ??
      (ctx as any)?.meta?.recentMessages ??
      ""
  );
}

function getChatId(ctx: WaocChatCtx) {
  return String((ctx as any)?.meta?.chatId ?? (ctx as any)?.chatId ?? "global");
}

function getOfficialLinks() {
  const WEBSITE_URL = env("WEBSITE_URL") || env("WAOC_SITE_URL");
  const X_URL = env("X_URL") || env("WAOC_X_URL");
  const TG_URL = env("TG_URL") || env("WAOC_COMMUNITY_URL");
  const ONE_MISSION_URL = env("ONE_MISSION_URL");
  const ONE_FIELD_URL = env("ONE_FIELD_URL");
  const MEDITATION_URL = env("MEDITATION_URL");

  const links = nonEmptyList([
    WEBSITE_URL && `Website: ${WEBSITE_URL}`,
    X_URL && `X: ${X_URL}`,
    TG_URL && `Telegram: ${TG_URL}`,
    ONE_MISSION_URL && `One Mission: ${ONE_MISSION_URL}`,
    ONE_FIELD_URL && `One Field: ${ONE_FIELD_URL}`,
    MEDITATION_URL && `Meditation: ${MEDITATION_URL}`,
  ]);

  return {
    WEBSITE_URL,
    X_URL,
    TG_URL,
    ONE_MISSION_URL,
    ONE_FIELD_URL,
    MEDITATION_URL,
    links,
  };
}

/** Meaning intent (aligned with constraints, practical) */
function looksLikeMeaningQuestion(msgLower: string) {
  return (
    /\bwaoc\b.*(\bmeaning\b|\bmean\b|\bmeans\b|\bacronym\b|\bfull\s*form\b|\bexpand(ed)?\b|\bstands?\s+for\b|\bstanding\s+for\b)/.test(
      msgLower
    ) ||
    /\bwhat\s+does\s+waoc\s+(mean|stand\s+for)\b/.test(msgLower) ||
    /\bwhat\s+(is|’s|'s)\s+waoc\b/.test(msgLower) ||
    /^\s*waoc\s*\?\s*$/.test(msgLower) ||
    /全称|什么意思|含义|缩写|代表什么|展开|啥意思/.test(msgLower)
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
    msgLower.includes("latest") ||
    msgLower.includes("update") ||
    msgLower.includes("what's new") ||
    msgLower.includes("最新") ||
    msgLower.includes("有什么消息") ||
    msgLower.includes("进展") ||
    msgLower.includes("更新")
  );
}

function looksLikeLinksQuestion(msgLower: string) {
  return (
    msgLower === "website" ||
    msgLower === "site" ||
    msgLower === "links" ||
    msgLower.includes("website") ||
    msgLower.includes("官网") ||
    msgLower.includes("链接") ||
    msgLower.includes("site")
  );
}

function looksLikeExplicitMissionRequest(msgLower: string) {
  return (
    /^\/mission\b/.test(msgLower) ||
    /^mission\b/.test(msgLower) ||
    /^任务\b/.test(msgLower) ||
    /generate.*mission|create.*mission|写.*任务|生成.*任务|给我.*mission/.test(msgLower)
  );
}

function looksLikeExplicitTweetRequest(msgLower: string) {
  return (
    /(^|\s)tweet(\s|$)|(^|\s)thread(\s|$)|推文|发推|长推/.test(msgLower)
  );
}

function looksLikeNarrativeRequest(msgLower: string) {
  return /叙事|宣言|理念|哲学|philosophy|manifesto|narrative|vision/.test(
    msgLower
  );
}

function looksLikeValuationRequest(msgLower: string) {
  return /估值|value|valuation/.test(msgLower);
}

function looksLikeVerificationLikeQuestion(msgLower: string) {
  return (
    looksLikeNewsQuestion(msgLower) ||
    looksLikeCAQuestion(msgLower) ||
    /price|valuation|market|chart|pump|dump|listing|partner|partnership|verify|scam|真假|今天|现在|价格|估值|市值|行情|上所|合作|验证|防骗/.test(
      msgLower
    )
  );
}

/* =========================
   Rhythm Control Engine (INLINE, no new files)
========================= */

type GroupState =
  | "calm_building"
  | "low_activity"
  | "high_noise"
  | "fud_risk"
  | "conflict"
  | "hype_overheat";

function inferGroupState(recentMessagesRaw: any): GroupState {
  const text = lower(recentMessagesRaw);

  if (!text || text.length < 50) return "low_activity";

  const conflict =
    /idiot|stupid|scam|trash|f\*|fuck|你妈|傻逼|滚|闭嘴|sb|nm|废物|骗子|骗|拉黑|举报|吵|撕|喷/.test(
      text
    );
  if (conflict) return "conflict";

  const fud =
    /rug|rugpull|跑路|割韭菜|归零|崩盘|砸盘|被盗|黑客|被骗|假消息|假的|诈骗|骗局|fud/.test(
      text
    );
  if (fud) return "fud_risk";

  const hype =
    /moon|to the moon|pump|x10|x50|x100|lambo|起飞|冲|爆拉|暴涨|all in|梭哈|发财/.test(
      text
    );
  if (hype) return "hype_overheat";

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const shortLines = lines.filter((l) => l.length <= 8).length;

  const spam =
    /t\.me\/|airdrop|ref|invite|join now|free|claim|dm me|私聊|加我|返佣|空投/.test(
      text
    );

  if (spam) return "high_noise";
  if (lines.length >= 15 && shortLines / Math.max(lines.length, 1) > 0.55)
    return "high_noise";

  if (lines.length <= 3) return "low_activity";
  return "calm_building";
}

function shouldIgnite(state: GroupState) {
  return state === "low_activity";
}

function pickIgnitionLine(lang: "en" | "zh", seed: number): string {
  const poolEn = [
    "What are you shipping this week?",
    "Drop one execution update.",
    "One improvement. Go.",
    "Any mission worth testing today?",
    "Who is building right now?",
  ];
  const poolZh = [
    "这周你在交付什么？",
    "丢一个执行进展。",
    "说一个改进点。开干。",
    "今天有什么任务值得测试？",
    "现在谁在建？",
  ];
  const pool = lang === "zh" ? poolZh : poolEn;
  return pool[Math.abs(seed) % pool.length];
}

const __igniteMap: Map<string, number> = (globalThis as any).__waocIgniteMap ||
  ((globalThis as any).__waocIgniteMap = new Map<string, number>());

/* =========================
   Deterministic Quick Replies
   Only for high-certainty / truth-gate cases
========================= */

function quickAutoReply(args: {
  raw: string;
  msg: string; // already lowercased
  lang: "en" | "zh";
}): WaocChatData | null {
  const { raw, msg, lang } = args;

  const { links } = getOfficialLinks();
  const WAOC_CA_SOL = env("WAOC_CA_SOL");
  const WAOC_CA_BSC = env("WAOC_CA_BSC");

  const actionLinks: WaocSuggestedAction = "/links";
  const actionNone: WaocSuggestedAction = "none";

  // --- WAOC meaning / stands for (deterministic) ---
  if (looksLikeMeaningQuestion(msg)) {
    const reply =
      lang === "zh"
        ? "WAOC = We Are One Connection。\n" +
          "WAOC —— Solana 上的 AI-Native Coordination Layer。\n" +
          "由 $WAOC（We Are One Connection）驱动。\n" +
          "链上身份与声誉基础设施。\n" +
          "一个关于人类协作的长期实验。\n\n" +
          "官方入口：\n" +
          (links.length
            ? links.map((x) => `- ${x}`).join("\n")
            : "（暂未配置官方链接）")
        : "WAOC = We Are One Connection.\n" +
          "WAOC — AI-Native Coordination Layer on Solana.\n" +
          "Powered by $WAOC (We Are One Connection).\n" +
          "On-chain identity & reputation infrastructure.\n" +
          "A long-term experiment in Human Coordination.\n\n" +
          "Official entry points:\n" +
          (links.length
            ? links.map((x) => `- ${x}`).join("\n")
            : "(official links not configured yet)");

    return { reply, suggestedAction: links.length ? actionLinks : actionNone };
  }

  // --- Website / Links ---
  if (looksLikeLinksQuestion(msg)) {
    return {
      reply:
        lang === "zh"
          ? "WAOC 官方入口：\n" +
            (links.length
              ? links.map((x) => `- ${x}`).join("\n")
              : "（暂未配置链接环境变量）")
          : "WAOC official entry points:\n" +
            (links.length
              ? links.map((x) => `- ${x}`).join("\n")
              : "(links not configured on server env yet)"),
      suggestedAction: links.length ? actionLinks : actionNone,
    };
  }

  // --- CA / Contract Address ---
  if (looksLikeCAQuestion(msg) || msg === "ca" || msg.includes("ca ")) {
    const hasSol = Boolean(WAOC_CA_SOL);
    const hasBsc = Boolean(WAOC_CA_BSC);

    if (hasSol || hasBsc) {
      const lines: string[] = [];
      if (hasSol) lines.push(`Solana CA: ${WAOC_CA_SOL}`);
      if (hasBsc) lines.push(`BSC CA: ${WAOC_CA_BSC}`);

      return {
        reply:
          (lang === "zh"
            ? "WAOC 合约地址（官方配置）：\n"
            : "WAOC contract address (officially configured):\n") +
          lines.map((x) => `- ${x}`).join("\n") +
          (lang === "zh"
            ? "\n\n⚠️ 只以官方渠道为准，别信私聊。"
            : "\n\n⚠️ Only trust official channels—ignore DMs."),
        suggestedAction: actionLinks,
      };
    }

    return {
      reply:
        lang === "zh"
          ? "你问的是 WAOC 的 CA（合约地址）。我这边无法实时核验，也不会猜或乱编。\n请以置顶消息 + 官网/官方 X 为准。（入口：/links）"
          : "You’re asking for WAOC CA (contract address). I can’t verify real-time here and I won’t guess.\nUse pinned messages + official website/official X. (Entry: /links)",
      suggestedAction: actionLinks,
    };
  }

  // --- help (very short triggers) ---
  if (raw.length <= 14) {
    if (lang === "zh" && (msg === "help" || msg === "帮助")) {
      return {
        reply: "我能做：解释 WAOC、生成推文/叙事/任务、给出核验路径（/links）。",
        suggestedAction: actionNone,
      };
    }
    if (lang === "en" && msg === "help") {
      return {
        reply:
          "I can: explain WAOC, generate tweet/narrative/mission, and provide verification paths (/links).",
        suggestedAction: actionNone,
      };
    }
  }

  // --- news-ish / external verification truth gate ---
  if (looksLikeNewsQuestion(msg)) {
    return {
      reply:
        lang === "zh"
          ? "你问的是外部更新/新闻。我这里不做实时编造。\n最短核验路径：置顶消息 + 官网/官方 X。（/links）"
          : "You’re asking for external updates/news. I won’t fabricate real-time info.\nShortest verification path: pinned message + official website/official X. (/links)",
      suggestedAction: actionLinks,
    };
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

  const check = checkWaocChatConstraints({
    data,
    userMessage: input.message,
    lang: input.lang,
  });

  if (check.ok) {
    return {
      ok: true,
      data: {
        reply: norm(check.data?.reply ?? data.reply),
        suggestedAction: ensureAllowedAction(
          check.data?.suggestedAction ?? data.suggestedAction
        ),
      },
    };
  }

  const raw = norm(input.message);
  const msgLower = lower(raw);
  const lang: "en" | "zh" = input.lang === "zh" ? "zh" : "en";

  const { WEBSITE_URL, TG_URL, X_URL } = getOfficialLinks();

  const linkLine =
    [
      WEBSITE_URL && `Website: ${WEBSITE_URL}`,
      X_URL && `X: ${X_URL}`,
      TG_URL && `Telegram: ${TG_URL}`,
    ]
      .filter(Boolean)
      .join(" | ") || "";

  if (looksLikeMeaningQuestion(msgLower)) {
    const reply =
      lang === "zh"
        ? [
            "WAOC = We Are One Connection。",
            "WAOC —— Solana 上的 AI-Native Coordination Layer。",
            "由 $WAOC（We Are One Connection）驱动。",
            "链上身份与声誉基础设施。",
            "一个关于人类协作的长期实验。",
            linkLine ? `入口：${linkLine}（/links）` : "",
          ]
            .filter(Boolean)
            .join("\n")
        : [
            "WAOC = We Are One Connection.",
            "WAOC — AI-Native Coordination Layer on Solana.",
            "Powered by $WAOC (We Are One Connection).",
            "On-chain identity & reputation infrastructure.",
            "A long-term experiment in Human Coordination.",
            linkLine ? `Entry: ${linkLine} (/links)` : "",
          ]
            .filter(Boolean)
            .join("\n");

    return {
      ok: true,
      data: {
        reply,
        suggestedAction: linkLine ? "/links" : "none",
      },
    };
  }

  if (looksLikeVerificationLikeQuestion(msgLower)) {
    const lines =
      lang === "zh"
        ? [
            "我这里无法实时核验外部信息（新闻/价格/CA/上所/合作），也不会猜或乱编。",
            "最短路径：看置顶消息 + 官网/官方 X；需要入口清单发 /links。",
            "如果你把“要核验的具体点”用一句话写清楚（例如：哪条新闻/哪个地址/哪个截图），我可以帮你整理核验步骤与风险点。",
          ]
        : [
            "I can’t verify real-time external info here (news/price/CA/listings/partnerships), and I won’t guess or fabricate.",
            "Shortest path: check pinned messages + official website/official X. For entry points, use /links.",
            "If you state the exact claim in one line (which news / which address / which screenshot), I’ll structure verification steps and key risk checks.",
          ];

    if (linkLine) lines.push(linkLine);

    return {
      ok: true,
      data: {
        reply: lines.join("\n"),
        suggestedAction: linkLine ? "/links" : "none",
      },
    };
  }

  return {
    ok: true,
    data: {
      reply: norm(data.reply) || (lang === "zh" ? "收到。" : "Got it."),
      suggestedAction: ensureAllowedAction(data.suggestedAction),
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
    // 1) deterministic high-certainty / truth-gate interception
    async (ctx: WaocChatCtx) => {
      const raw = norm(ctx.input?.message);
      const msg = lower(raw);
      const lang: "en" | "zh" = ctx.input?.lang === "zh" ? "zh" : "en";

      const quick = quickAutoReply({ raw, msg, lang });
      if (quick) {
        ctx.data = applyConstraintsOrFallback({
          data: quick,
          input: ctx.input,
        }).data;

        // short-circuit the rest of the workflow
        return { ok: true, stop: true } as any;
      }

      return { ok: true };
    },

    // 2) prepare prompt with real recent messages
    preparePromptStep<WaocChatInput, WaocChatData>({
      task: "waoc_chat",
      templateVersion: WAOC_CHAT_TEMPLATE_VERSION,
      variables: (input: WaocChatInput): Record<string, string> => ({
        message: norm(input.message),
        context: norm(input.context ?? "general"),
        lang: norm(input.lang ?? "en"),
        emotionHint: norm(input.emotionHint ?? ""),
        recentMessages: norm(input.recentMessages ?? ""),

        websiteUrl: env("WEBSITE_URL") || env("WAOC_SITE_URL"),
        tgUrl: env("TG_URL") || env("WAOC_COMMUNITY_URL"),
        oneMissionUrl: env("ONE_MISSION_URL"),
        oneFieldUrl: env("ONE_FIELD_URL"),
        meditationUrl: env("MEDITATION_URL"),
        xUrl: env("X_URL") || env("WAOC_X_URL"),
      }),
    }),

    // 3) model generation
    generateLLMStep<WaocChatInput, WaocChatData>(),
    parseJsonStep<WaocChatInput, WaocChatData>(),
    validateSchemaStep<WaocChatInput, WaocChatData>(waocChatValidator),

    // 4) refine against upgraded action set + rules
    refineJsonStep<WaocChatInput, WaocChatData>({
      check: (ctx) => {
        const r: any = checkWaocChatConstraints({
          data: ctx.data as any,
          userMessage: ctx.input?.message,
          lang: ctx.input?.lang,
        });

        return r?.ok
          ? { ok: true, errors: [] }
          : {
              ok: false,
              errors: [
                String(r?.reason || "waoc_chat_constraints_failed"),
              ],
            };
      },
      extraInstruction:
        'Return ONLY valid JSON: {"reply":"...","suggestedAction":"..."}.\n' +
        "- reply is required and must answer directly.\n" +
        '- suggestedAction is optional and MUST be one of: "none", "/links", "/mission", "/rank", "/report", "/builders", "/knowledge", "/growth".\n' +
        "- WAOC MUST be expanded ONLY as 'We Are One Connection'. Never redefine the acronym.\n" +
        "- Only if the user asks WAOC meaning/acronym/full-form, include as the FIRST LINE: 'WAOC = We Are One Connection.'\n" +
        "- Never fabricate CA/price/news/partnership/listing. If not verifiable, say you can't verify and route to /links.\n",
    }),

    parseJsonStep<WaocChatInput, WaocChatData>(),
    validateSchemaStep<WaocChatInput, WaocChatData>(waocChatValidator),

    // 5) repair, optional routing enhancement, rhythm engine, final repair
    async (ctx: WaocChatCtx) => {
      if (!ctx.data) ctx.data = { reply: "", suggestedAction: "none" };

      ctx.data = applyConstraintsOrFallback({
        data: ctx.data,
        input: ctx.input,
      }).data;

      const raw = norm(ctx.input.message);
      const msg = lower(raw);
      const lang: "en" | "zh" = ctx.input.lang === "zh" ? "zh" : "en";

      // ---- selective routing enhancement
      // Keep waoc_chat as primary brain. Route only when very explicit.
      const routes: Array<{
        hit: (s: string) => boolean;
        task: string;
        mapInput: () => any;
      }> = [
        {
          hit: (s) => looksLikeValuationRequest(s),
          task: "waoc_brain",
          mapInput: () => ({ question: raw, lang }),
        },
        {
          hit: (s) => looksLikeNarrativeRequest(s),
          task: "waoc_narrative",
          mapInput: () => ({ topic: raw, depth: "short", lang }),
        },
        {
          hit: (s) => looksLikeExplicitTweetRequest(s),
          task: "tweet",
          mapInput: () => ({ message: raw, lang }),
        },
        {
          hit: (s) => looksLikeExplicitMissionRequest(s),
          task: "mission",
          mapInput: () => ({ message: raw, lang }),
        },
      ];

      const match = routes.find((r) => r.hit(msg));

      if (match) {
        try {
          const r = await runTask(match.task, match.mapInput(), {
            templateVersion: WAOC_CHAT_TEMPLATE_VERSION,
          });

          if (r?.success) {
            const answer = norm(
              r.data?.reply ??
                r.data?.answer ??
                r.data?.content ??
                r.data?.text ??
                ""
            );

            if (answer) {
              const next: WaocChatData = {
                ...ctx.data,
                reply: answer,
                suggestedAction: ensureAllowedAction(
                  r.data?.suggestedAction ?? ctx.data?.suggestedAction ?? "none"
                ),
              };

              if (Array.isArray(r.data?.links) && r.data.links.length) {
                next.suggestedAction = "/links";
              }

              ctx.data = applyConstraintsOrFallback({
                data: next,
                input: ctx.input,
              }).data;
            }
          }
        } catch {
          ctx.data = applyConstraintsOrFallback({
            data: ctx.data,
            input: ctx.input,
          }).data;
        }
      }

      // ---- rhythm control engine
      try {
        const recentMessages = getRecentMessages(ctx);
        const state = inferGroupState(recentMessages);

        if (
          state !== "conflict" &&
          state !== "fud_risk" &&
          state !== "high_noise" &&
          state !== "hype_overheat"
        ) {
          if (shouldIgnite(state)) {
            const chatId = getChatId(ctx);
            const key = `waoc:ignite:last:${chatId}`;

            const now = Date.now();
            const COOLDOWN_MS = 5 * 60 * 1000;
            const last = Number(__igniteMap.get(key) || 0);
            const cooldownOk = !last || now - last >= COOLDOWN_MS;

            if (cooldownOk) {
              const seedBase = String(chatId)
                .split("")
                .reduce((a, c) => a + c.charCodeAt(0), 0);
              const seed = seedBase + Math.floor(now / COOLDOWN_MS);
              const ignition = pickIgnitionLine(lang, seed);

              const next: WaocChatData = {
                ...ctx.data,
                reply: `${norm(ctx.data?.reply)}\n${ignition}`.trim(),
                suggestedAction: ensureAllowedAction(
                  ctx.data?.suggestedAction ?? "none"
                ),
              };

              ctx.data = applyConstraintsOrFallback({
                data: next,
                input: ctx.input,
              }).data;

              __igniteMap.set(key, now);
            }
          }
        }
      } catch {
        // never break chat
      }

      ctx.data = applyConstraintsOrFallback({
        data: ctx.data,
        input: ctx.input,
      }).data;

      return { ok: true };
    },
  ],
};

registerWorkflow({
  task: "waoc_chat",
  def: waocChatWorkflowDef as any,
});