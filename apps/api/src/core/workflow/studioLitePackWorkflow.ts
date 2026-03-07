// apps/api/src/core/workflow/studioLitePackWorkflow.ts
import type { WorkflowContext } from "./types.js";
import type { WorkflowDefinition } from "./engine.js";

import { validateSchemaStep } from "./steps/validateSchemaStep.js";
import { registerWorkflow, runTask } from "./registry.js";
import { studioLitePackValidator } from "../validators/studioLitePackValidator.js";

export type StudioLitePackInput = {
  instruction: string;
  pack?: "quick" | "growth" | "launch" | "replies";

  topic?: string;
  audience?: string;
  tone?: string;
  brand?: string;
  link?: string;
  language?: string; // en | zh | bi
  goal?: string;

  signals?: {
    best_performing_type?: string;
    weakest_type?: string;
    top_pattern?: string;
    low_pattern?: string;
    impressions?: number;
    likes?: number;
    replies?: number;
    reposts?: number;
    follows?: number;
  };
};

export type StudioLiteScheduleItem = {
  day: number;
  content_type: string;
  description: string;
};

export type StudioLitePackData = {
  schema_version: "studio_lite_pack_v2";

  best_hook: string;
  hooks: string[];
  tweets: string[];
  thread?: string[];
  cta: string;
  replies?: string[];

  schedule: StudioLiteScheduleItem[];
  reply_strategy: string[];

  meta: {
    pack: string;
    audience: string;
    tone: string;
    language: string;
    source: "oneai" | "fallback";
    generated_at: string;
  };
};

type Ctx = WorkflowContext<StudioLitePackInput, StudioLitePackData> & {
  templateVersion: number;
};

type StrategyOutput = {
  core_angle?: string;
  narrative_frame?: string;
  conversation_goal?: string;
  content_mix?: string[];
  key_mechanisms?: string[];
  anti_patterns?: string[];
};

type DistributionOutput = {
  content_loop?: string;
  distribution_plan?: Array<{
    day: number;
    slot?: "morning" | "midday" | "evening";
    content_type: "hook" | "tweet" | "thread" | "reply" | "debate" | "cta";
    objective?: string;
  }>;
  sequencing_reason?: string;
};

type FeedbackOutput = {
  best_performing_type?: string;
  weakest_type?: string;
  winning_pattern?: string;
  losing_pattern?: string;
  adaptation_reason?: string;
  next_actions?: string[];
};

type PackType = "quick" | "growth" | "launch" | "replies";
type LangType = "en" | "zh" | "bi";

/* =========================
   Helpers
   ========================= */

function safeTrim(v: unknown): string {
  return String(v ?? "").trim();
}

function normalizeLang(v: unknown): LangType {
  const s = safeTrim(v).toLowerCase();
  if (s === "zh") return "zh";
  if (s === "bi") return "bi";
  return "en";
}

function normalizePack(v: unknown): PackType {
  const s = safeTrim(v).toLowerCase();
  if (s === "growth") return "growth";
  if (s === "launch") return "launch";
  if (s === "replies") return "replies";
  return "quick";
}

function uniq(arr: string[], limit = 999): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const s of (arr || []).map((x) => safeTrim(x)).filter(Boolean)) {
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

function extractTopic(instruction: string): string | null {
  const text = safeTrim(instruction);
  if (!text) return null;

  // 中文：关于WAOC / 关于 WAOC生态 / 写一个关于WAOC的thread
  const zh = text.match(/关于\s*([^\n，。,.!！？?]{2,40})/);
  if (zh?.[1]) {
    return safeTrim(zh[1]).replace(/的?(thread|帖子|推文|内容|文案)$/i, "");
  }

  // 英文：about WAOC / about OneAI Studio Lite growth loop
  const en = text.match(/about\s+([a-zA-Z0-9_\-\s]{2,60})/i);
  if (en?.[1]) {
    return safeTrim(en[1]).replace(/\b(thread|tweet|post|content)\b$/i, "").trim();
  }

  return null;
}

function clampLen(s: string, max = 280): string {
  const t = safeTrim(s);
  if (!t) return "";
  if (t.length <= max) return t;
  return t.slice(0, Math.max(1, max - 1)).trimEnd() + "…";
}

function mergeBilingual(textEn?: string, textZh?: string, lang: LangType = "en"): string {
  const en = safeTrim(textEn);
  const zh = safeTrim(textZh);

  if (lang === "zh") return zh || en;
  if (lang === "en") return en || zh;
  if (en && zh) return `EN: ${en}\nZH: ${zh}`;
  return en || zh;
}

function clampBilingual(text: string, lang: LangType, maxMono = 280): string {
  const t = safeTrim(text);
  if (!t) return "";

  if (lang !== "bi") return clampLen(t, maxMono);

  const m = t.match(/^EN:\s*([\s\S]*?)\nZH:\s*([\s\S]*)$/);
  if (!m) return clampLen(t, 280);

  const en = clampLen(m[1], 120);
  const zh = clampLen(m[2], 120);
  return `EN: ${en}\nZH: ${zh}`;
}

function normalizeTextItem(x: any, lang: LangType): string {
  if (!x) return "";
  if (typeof x === "string") return x;
  if (typeof x?.text === "string") return x.text;
  return mergeBilingual(x?.text_en, x?.text_zh, lang);
}

function extractTexts(data: any, lang: LangType = "en"): string[] {
  if (!data) return [];

  if (typeof data === "string") return [data];

  if (Array.isArray(data)) {
    return data.map((x) => normalizeTextItem(x, lang)).filter(Boolean);
  }

  if (Array.isArray(data?.items)) {
    return data.items.map((x: any) => normalizeTextItem(x, lang)).filter(Boolean);
  }

  if (Array.isArray(data?.hooks)) {
    return data.hooks.map((x: any) => normalizeTextItem(x, lang)).filter(Boolean);
  }

  if (Array.isArray(data?.tweets)) {
    return data.tweets.map((x: any) => normalizeTextItem(x, lang)).filter(Boolean);
  }

  if (Array.isArray(data?.thread)) {
    return data.thread.map((x: any) => normalizeTextItem(x, lang)).filter(Boolean);
  }

  if (Array.isArray(data?.replies)) {
    return data.replies.map((x: any) => normalizeTextItem(x, lang)).filter(Boolean);
  }

  const out: string[] = [];

  if (typeof data?.tweet_en === "string" || typeof data?.tweet_zh === "string") {
    const t = mergeBilingual(data?.tweet_en, data?.tweet_zh, lang);
    if (t) out.push(t);
  }

  if (typeof data?.cta === "string") out.push(data.cta);

  if (typeof data?.cta_en === "string" || typeof data?.cta_zh === "string") {
    const c = mergeBilingual(data?.cta_en, data?.cta_zh, lang);
    if (c) out.push(c);
  }

  if (typeof data?.text === "string") out.push(data.text);

  if (typeof data?.text_en === "string" || typeof data?.text_zh === "string") {
    const t = mergeBilingual(data?.text_en, data?.text_zh, lang);
    if (t) out.push(t);
  }

  return out.filter(Boolean);
}

/**
 * Production-oriented founder-Twitter hook scoring.
 *
 * Goal:
 * - reward contrarian / mechanism / tension-based hooks
 * - punish ad-copy / generic / bloated hooks
 * - keep selection logic simple and stable
 */
function scoreHook(input: string): number {
  const s = safeTrim(input);
  if (!s) return -999;

  const text = s.toLowerCase();
  let score = 0;

  // --------------------
  // Positive signals
  // --------------------

  // 1) Contrarian / assumption-breaking
  if (
    /(most founders think|most people think|everyone thinks|they'?re wrong|but the real|the real leverage|the real problem|the hidden cost|the biggest mistake)/i.test(
      s
    )
  ) {
    score += 4;
  }

  // 2) Mechanism / systems language
  if (
    /(creates|generates|generate|replaces|replace|workflow|workflows|system|systems|mechanism|trade-off|framework|input|output|validation|process|processes)/i.test(
      s
    )
  ) {
    score += 3;
  }

  // 3) Tension / conflict
  if (
    /(most .* fail|not because|the mistake|the real issue|the real bottleneck|the hidden reason|instead of)/i.test(
      s
    )
  ) {
    score += 3;
  }

  // 4) Contrast framing
  // 4) Contrast framing
if (/(not .* but|x .* y|vs\.?|rather than|instead of|>)/i.test(s)) {
  score += 2;
}

  // 5) Brevity sweet spot
  const len = s.length;
  if (len >= 35 && len <= 120) score += 3;
  else if (len <= 160) score += 1;
  else if (len > 180) score -= 3;
  else if (len < 18) score -= 2;

  // 6) Clarity / formatting
  const lineCount = s.split(/\n+/).filter(Boolean).length;
  const commaCount = (s.match(/,/g) || []).length;
  if (lineCount >= 1 && lineCount <= 3) score += 1;
  if (commaCount >= 3) score -= 1;

  // --------------------
  // Negative signals
  // --------------------

  // 7) Marketing / ad-copy language
  if (
    /(why wait|don'?t miss|unlock|supercharge|game changer|game-changer|revolutionary|secret sauce|ready to|want to|join now|change the game|take your .* to the next level|key to getting|your path to|starts here)/i.test(
      s
    )
  ) {
    score -= 5;
  }

  // 8) Generic low-signal statements
  if (
    /(can help|helps founders|is important|is essential|is powerful|is the future|is the key|are essential|the best .* use|could be the key)/i.test(
      s
    )
  ) {
    score -= 3;
  }

  // 9) Weak opener patterns
  if (
    /^(launching a product\?|building with ai\?|want to|looking to|ready to|why are you|thinking about|ever tried)/i.test(
      text
    )
  ) {
    score -= 3;
  }

  // 10) Meme / weak metaphor signals
  if (
    /(cat|grandma|toddler|recipe|secret sauce|magic|wizard|superpower|cooking without|building a bridge)/i.test(
      s
    )
  ) {
    score -= 4;
  }

  // 11) Hashtags / emoji make hooks feel less like founder-native openers
  const hashtagCount = (s.match(/#/g) || []).length;
  if (hashtagCount > 0) score -= 2;
  if (/[\u{1F300}-\u{1FAFF}]/u.test(s)) score -= 2;

  return score;
}

function pickBestHook(hooks: string[]): string {
  const ranked = hooks
    .map((hook) => ({ hook, score: scoreHook(hook) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best) return hooks[0] || "";

  // If all hooks are weak, still return the best available one
  return best.hook;
}

function ensureMinUnique(arr: string[], min: number, fillers: string[]): string[] {
  const out = uniq(arr);
  const fallbackList = uniq(fillers).filter(Boolean);

  for (const f of fallbackList) {
    if (out.length >= min) break;
    if (!out.some((x) => x.toLowerCase() === f.toLowerCase())) {
      out.push(f);
    }
  }

  let i = 1;
  while (out.length < min) {
    const base = fallbackList[0] || "Workflows > prompts.";
    const next = `${base} (${i})`;
    if (!out.some((x) => x.toLowerCase() === next.toLowerCase())) out.push(next);
    i += 1;
  }

  return out;
}

function defaultSchedule(pack: PackType, lang: LangType): StudioLiteScheduleItem[] {
  const bi = (en: string, zh: string) => mergeBilingual(en, zh, lang);

  const base: StudioLiteScheduleItem[] = [
    {
      day: 0,
      content_type: "best_hook",
      description: bi("morning: post Best Hook to test the angle.", "早上：发布最佳 Hook，测试角度。")
    },
    {
      day: 0,
      content_type: "tweet",
      description: bi("midday: post 1 supporting Tweet.", "中午：发布 1 条支撑推文。")
    },
    {
      day: 0,
      content_type: "thread",
      description: bi("evening: post Thread if available.", "晚上：如果有 Thread 就发 Thread。")
    },
    {
      day: 1,
      content_type: "hook",
      description: bi("morning: post a fresh Hook variant.", "第二天早上：发一个新的 Hook 变体。")
    },
    {
      day: 1,
      content_type: "tweet",
      description: bi("midday: post a Tweet with a clear takeaway.", "第二天中午：发一条结论明确的推文。")
    },
    {
      day: 1,
      content_type: "cta",
      description: bi("evening: post CTA / invite.", "第二天晚上：发布 CTA / 邀请。")
    }
  ];

  if (pack === "replies") {
    return [
      {
        day: 0,
        content_type: "reply",
        description: bi("morning: drop 3 high-signal replies.", "早上：发 3 条高信号回复。")
      },
      {
        day: 0,
        content_type: "reply",
        description: bi("midday: reply in your niche.", "中午：在你赛道内继续回复。")
      },
      {
        day: 0,
        content_type: "debate",
        description: bi("evening: one debate-style reply.", "晚上：发 1 条带争议的回复。")
      },
      {
        day: 1,
        content_type: "reply",
        description: bi("morning: continue reply cadence.", "第二天早上：继续回复节奏。")
      },
      {
        day: 1,
        content_type: "reply",
        description: bi("midday: quote-style reply if relevant.", "第二天中午：如合适，发 quote 风格回复。")
      },
      {
        day: 1,
        content_type: "debate",
        description: bi("evening: one more debate-style reply.", "第二天晚上：再发 1 条争议式回复。")
      }
    ];
  }

  if (pack === "launch") {
    return [
      {
        day: 0,
        content_type: "best_hook",
        description: bi("morning: launch hook.", "早上：发布 launch hook。")
      },
      {
        day: 0,
        content_type: "cta",
        description: bi("midday: CTA / waitlist / early access.", "中午：发布 CTA / waitlist / 早期名额。")
      },
      {
        day: 0,
        content_type: "thread",
        description: bi("evening: thread explaining why it matters.", "晚上：发 thread 解释为什么重要。")
      },
      {
        day: 1,
        content_type: "tweet",
        description: bi("morning: supporting insight tweet.", "第二天早上：发支撑 insight 推文。")
      },
      {
        day: 1,
        content_type: "tweet",
        description: bi("midday: handle objections.", "第二天中午：处理异议。")
      },
      {
        day: 1,
        content_type: "cta",
        description: bi("evening: final CTA reminder.", "第二天晚上：最后一轮 CTA 提醒。")
      }
    ];
  }

  return base;
}

function defaultReplyStrategy(pack: PackType, lang: LangType): string[] {
  const bi = (en: string, zh: string) => mergeBilingual(en, zh, lang);

  const base = [
    bi("Prioritize high-signal posts in your niche.", "优先回复你所在赛道的高信号帖子。"),
    bi("Reply within 10–30 minutes when possible.", "尽量在 10–30 分钟内回复。"),
    bi("Add one concrete mechanism or observation.", "加入一个具体机制或观察。"),
    bi("Avoid generic praise.", "避免空泛夸赞。"),
    bi("End with one short question if useful.", "如果合适，结尾用一个简短问题。"),
    bi("Track which reply styles bring profile visits.", "记录哪种回复风格更能带来主页访问。")
  ];

  if (pack === "launch") {
    return [
      bi("Use replies to handle objections, not hard-sell.", "用回复来处理异议，而不是硬推销。"),
      bi("Direct interest toward the main launch tweet.", "把兴趣导向主 launch 推文。"),
      bi("Keep CTAs factual and time-bound.", "CTA 要事实化，并带时间边界。"),
      bi("Turn common questions into follow-up tweets.", "把常见问题变成后续推文。"),
      bi("Reuse strong phrases from replies in main posts.", "把回复里的强表达复用到主帖里。"),
      bi("Track which launch angle gets the most replies.", "记录哪种 launch 角度带来最多回复。")
    ];
  }

  return base;
}

/* =========================
   V12 Strategy + Task Planning
   ========================= */

function buildTaskPlan(pack: PackType, strategy?: StrategyOutput) {
  const mix = Array.isArray(strategy?.content_mix)
    ? strategy!.content_mix!.map((x) => safeTrim(x).toLowerCase())
    : [];

  const wantsDebate = mix.includes("debate");
  const wantsReplies = mix.includes("reply") || mix.includes("replies");
  const wantsThread = mix.includes("thread");
  const wantsHook = mix.includes("hook");
  const wantsTweet = mix.includes("tweet");
  const wantsCta = mix.includes("cta");
  const wantsLaunch = mix.includes("launch");

  if (pack === "quick") {
    return [
      { task: "lite/viral_hook", n: wantsHook ? 10 : 6, out: "hooks" as const },
      { task: "lite/thread", n: wantsThread ? 1 : 0, out: "thread" as const },
      { task: "lite/tweet", n: wantsTweet ? 3 : 2, out: "tweets" as const },
      { task: "lite/cta", n: wantsCta ? 1 : 1, out: "cta" as const }
    ].filter((x) => x.n > 0);
  }

  if (pack === "growth") {
    return [
      { task: "lite/viral_hook", n: wantsHook ? 10 : 8, out: "hooks" as const },
      { task: "lite/thread", n: wantsThread ? 2 : 1, out: "thread" as const },
      { task: "lite/tweet", n: wantsTweet ? 5 : 3, out: "tweets" as const },
      { task: "lite/reply", n: wantsReplies ? 8 : 4, out: "replies" as const },
      { task: wantsDebate ? "lite/debate" : "lite/reply", n: wantsDebate ? 4 : 2, out: "replies" as const },
      { task: "lite/cta", n: wantsCta ? 1 : 1, out: "cta" as const }
    ];
  }

  if (pack === "launch") {
    return [
      { task: "lite/viral_hook", n: wantsHook ? 10 : 8, out: "hooks" as const },
      { task: wantsLaunch ? "lite/launch" : "lite/tweet", n: 3, out: "tweets" as const },
      { task: "lite/tweet", n: wantsTweet ? 5 : 3, out: "tweets" as const },
      { task: "lite/thread", n: wantsThread ? 1 : 0, out: "thread" as const },
      { task: "lite/cta", n: 1, out: "cta" as const }
    ].filter((x) => x.n > 0);
  }

  return [
    { task: wantsReplies ? "lite/reply" : "lite/debate", n: 20, out: "replies" as const },
    { task: "lite/debate", n: wantsDebate ? 6 : 3, out: "replies" as const }
  ];
}

async function runWithConcurrency<T>(
  items: T[],
  worker: (item: T) => Promise<any>,
  concurrency: number
) {
  const res: any[] = new Array(items.length);
  let i = 0;

  const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      try {
        res[idx] = await worker(items[idx]);
      } catch (e) {
        res[idx] = {
          success: false,
          data: null,
          error: String((e as any)?.message || e)
        };
      }
    }
  });

  await Promise.all(runners);
  return res;
}

/* =========================
   V13 Orchestration
   ========================= */

async function buildPack(ctx: Ctx): Promise<StudioLitePackData> {
  const pack = normalizePack(ctx.input.pack);
  const language = normalizeLang(ctx.input.language);

  const topic =
    safeTrim(ctx.input.topic) ||
    extractTopic(ctx.input.instruction || "") ||
    safeTrim(ctx.input.instruction) ||
    "OneAI Studio Lite";

  const audience = safeTrim(ctx.input.audience) || "builders / creators / founders";
  const tone = safeTrim(ctx.input.tone) || "sharp, contrarian, twitter-native";
  const brand = safeTrim(ctx.input.brand) || "OneAI";
  const link = safeTrim(ctx.input.link) || "";
  const goal = safeTrim(ctx.input.goal) || "discussion";

  let usedFallback = false;
  const failedTasks: string[] = [];

  // 1) Strategy
  const strategyRes = await runTask(
    "studio_lite_strategy",
    {
      topic,
      brand,
      audience,
      tone,
      language,
      goal,
      pack
    },
    { templateVersion: 12, maxAttempts: 3 }
  );

  const strategyOk = Boolean(strategyRes?.success);
  if (!strategyOk) {
    usedFallback = true;
    failedTasks.push("studio_lite_strategy");
  }

  const strategy = (strategyRes?.success ? strategyRes.data : null) as StrategyOutput | null;

  const baseInput = {
    instruction: safeTrim(ctx.input.instruction) || topic,
    topic,
    audience,
    tone,
    brand,
    link,
    language,
    goal,
    core_angle: safeTrim(strategy?.core_angle),
    narrative_frame: safeTrim(strategy?.narrative_frame),
    conversation_goal: safeTrim(strategy?.conversation_goal)
  };

  // 2) Content
  const plan = buildTaskPlan(pack, strategy || undefined);
  const calls = plan.flatMap((p) =>
    Array.from({ length: p.n }).map(() => ({ task: p.task, out: p.out }))
  );

  const contentResults = await runWithConcurrency(
    calls,
    async (c) => {
      const r = await runTask(c.task, baseInput, { templateVersion: 12, maxAttempts: 3 });
      return { ...c, r };
    },
    4
  );

  const hooks: string[] = [];
  const tweets: string[] = [];
  const thread: string[] = [];
  const replies: string[] = [];
  let cta = "";

  for (const x of contentResults) {
    const r = x?.r;
    if (!r?.success) {
      usedFallback = true;
      failedTasks.push(String(x?.task || "unknown_task"));
      continue;
    }

    const texts = extractTexts(r.data, language)
      .map((t) => clampBilingual(t, language))
      .filter(Boolean);

    if (x.out === "hooks") hooks.push(...texts);
    else if (x.out === "tweets") tweets.push(...texts);
    else if (x.out === "thread") thread.push(...texts);
    else if (x.out === "replies") replies.push(...texts);
    else if (x.out === "cta") cta = cta || (texts[0] ?? "");
  }

  const hooksU = uniq(hooks, 30);
  const tweetsU = uniq(tweets, 30);
  const threadU = uniq(thread, 30);
  const repliesU = uniq(replies, 40);

  const fallbackHook = mergeBilingual(
    "Workflows > prompts.",
    "工作流 > 提示词。",
    language
  );

  const fallbackHooks = [
    fallbackHook,
    mergeBilingual(
      `${brand} is not another AI tool. It's a workflow layer.`,
      `${brand} 不是另一个 AI 工具，而是工作流层。`,
      language
    ),
    mergeBilingual(
      "Most builders don't need more models. They need better workflows.",
      "大多数 builder 不需要更多模型，而是更好的工作流。",
      language
    ),
    mergeBilingual(
      "The biggest mistake in AI: building the tool instead of the workflow.",
      "AI 里最大的错误：在造工具，而不是造工作流。",
      language
    )
  ].map((x) => clampBilingual(x, language));

  const best_hook =
    pack === "replies"
      ? fallbackHooks[0]
      : safeTrim(pickBestHook(hooksU.length ? hooksU : tweetsU)) ||
        clampBilingual(topic, language, 240) ||
        fallbackHooks[0];

  if (!hooksU.length) usedFallback = true;
  if (!tweetsU.length) usedFallback = true;

  const hooksFinal = ensureMinUnique(
    hooksU.length ? hooksU : [best_hook],
    5,
    [best_hook, ...fallbackHooks]
  ).slice(0, 20);

  const tweetsFinal = ensureMinUnique(
    tweetsU.length ? tweetsU : [best_hook],
    1,
    [
      best_hook,
      mergeBilingual(
        "The future of AI tools looks more like workflows than dashboards.",
        "AI 工具的未来，看起来更像工作流，而不是仪表盘。",
        language
      )
    ].map((x) => clampBilingual(x, language))
  ).slice(0, 20);

  const ctaFinal =
    safeTrim(cta) ||
    (link
      ? mergeBilingual(`Try it: ${link}`, `试试这个：${link}`, language)
      : mergeBilingual(
          `Reply "join" and I'll send the link.`,
          `回复“join”，我会把链接发给你。`,
          language
        ));

  if (!safeTrim(cta)) usedFallback = true;

  // 3) Distribution
  const distributionRes = await runTask(
    "studio_lite_distribution",
    {
      topic,
      pack,
      goal,
      hooks: hooksFinal,
      tweets: tweetsFinal,
      thread: threadU,
      replies: repliesU,
      cta: ctaFinal
    },
    { templateVersion: 12, maxAttempts: 3 }
  );

  const distributionOk = Boolean(distributionRes?.success);
  if (!distributionOk) {
    usedFallback = true;
    failedTasks.push("studio_lite_distribution");
  }

  const distribution = (distributionRes?.success ? distributionRes.data : null) as DistributionOutput | null;

  const schedule: StudioLiteScheduleItem[] =
    Array.isArray(distribution?.distribution_plan) && distribution!.distribution_plan!.length
      ? distribution!.distribution_plan!.slice(0, 12).map((x: any) => {
          const slot = safeTrim(x?.slot);
          const objective = safeTrim(x?.objective) || "Drive discussion.";
          return {
            day: Number(x?.day ?? 0),
            content_type: safeTrim(x?.content_type) || "tweet",
            description: slot ? `${slot}: ${objective}` : objective
          };
        })
      : defaultSchedule(pack, language);

  if (!distribution?.distribution_plan?.length) usedFallback = true;

  // 4) Feedback
  let feedback: FeedbackOutput | null = null;
  let feedbackOk = false;

  if (ctx.input.signals) {
    const feedbackRes = await runTask(
      "studio_lite_feedback",
      {
        topic,
        goal,
        language,
        signals: ctx.input.signals
      },
      { templateVersion: 12, maxAttempts: 3 }
    );

    feedbackOk = Boolean(feedbackRes?.success);
    if (!feedbackOk) {
      usedFallback = true;
      failedTasks.push("studio_lite_feedback");
    }

    feedback = (feedbackRes?.success ? feedbackRes.data : null) as FeedbackOutput | null;
  }

  const reply_strategy =
    feedback?.next_actions?.length && language === "en"
      ? uniq(feedback.next_actions.map(String), 6)
      : defaultReplyStrategy(pack, language);

  if (feedback?.next_actions?.length && language !== "en") {
    usedFallback = true;
  }

  const data: StudioLitePackData = {
    schema_version: "studio_lite_pack_v2",

    best_hook,
    hooks: hooksFinal,
    tweets: tweetsFinal,
    cta: ctaFinal,
    schedule,
    reply_strategy,

    ...(threadU.length ? { thread: threadU.slice(0, 14) } : {}),
    ...(repliesU.length ? { replies: repliesU.slice(0, 30) } : {}),

    meta: {
      pack,
      audience,
      tone,
      language,
      source: usedFallback ? "fallback" : "oneai",
      generated_at: new Date().toISOString()
    }
  };

  return data;
}

/* =========================
   Workflow Definition
   ========================= */

export const studioLitePackWorkflowDef: WorkflowDefinition<Ctx> = {
  name: "studio_lite_pack_workflow_v13",
  maxAttempts: 2,
  steps: [
    async (ctx: Ctx) => {
      ctx.data = await buildPack(ctx);
      return { ok: true };
    },
    validateSchemaStep<StudioLitePackInput, StudioLitePackData>(studioLitePackValidator)
  ]
};

registerWorkflow({
  task: "studio_lite_pack",
  def: studioLitePackWorkflowDef as any
});