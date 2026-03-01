// src/core/constraints/waocChatConstraints.ts
// WAOC Identity Enforcement 2.2 (Final, Practical)
//
// Goal: enforce acronym safety WITHOUT forcing "WAOC = We Are One Connection" in every reply.
// - Only require the phrase when the USER is explicitly asking the acronym meaning.
// - Still block invalid expansions anywhere in the reply.
// - Still keep Truth Gate rules.
// - suggestedAction enum validation (avoid UI button conflict / long link spam).
// - TruthGate trigger checks BOTH userMessage + reply (more reliable).
// - Optional: lightweight auto-fix with lang-aware prepend.
//
// ✅ Updates vs 2.0:
// - Stronger meaning-intent detection (covers "What is WAOC?", "WAOC?", "means", etc.)
// - Stronger invalid expansion detection (covers more "expansion" verbs)
// - TruthGate trigger slightly more precise (reduces false positives)

export type WaocSuggestedAction = "none" | "/links";

export type WaocChatData = {
  reply: string;
  suggestedAction?: WaocSuggestedAction | string;
};

export type WaocChatCheckInput = {
  data: WaocChatData;
  userMessage?: string;
  lang?: "en" | "zh";
};

function norm(s: any) {
  return String(s ?? "").trim();
}
function lower(s: any) {
  return norm(s).toLowerCase();
}

/** ---------------------------------------
 *  Meaning intent detection (USER SIDE)
 *  ------------------------------------- */
function userAsksAcronymMeaning(userLower: string) {
  const mentionsWAOC = /\bwaoc\b/.test(userLower) || userLower.includes("waoc");
  if (!mentionsWAOC) return false;

  return (
    /\bstands?\s+for\b|\bstanding\s+for\b|\bacronym\b|\bmeaning\b|\bmeans\b|\bfull\s*form\b|\bexpand(ed)?\b/.test(
      userLower
    ) ||
    /\bwhat\s+(is|’s|'s)\s+waoc\b/.test(userLower) ||
    /\bwhat\s+does\s+waoc\s+(mean|stand\s+for)\b/.test(userLower) ||
    /^\s*waoc\s*\?\s*$/.test(userLower) ||
    /全称|缩写|代表什么|什么意思|含义|展开/.test(userLower) ||
    /waoc.*(全称|缩写|代表什么|什么意思|含义|展开)/.test(userLower)
  );
}

/** ---------------------------------------
 *  Expansion safety: forbid wrong expansions anywhere
 *  ------------------------------------- */
const MUST_PHRASE = "we are one connection";

const BANNED_ACRONYMS = [
  "we are one community",
  "web of autonomous",
  "autonomous communities",
  "one community",
  "web of all communities",
  "web of all community",
];

function containsInvalidExpansion(replyLower: string) {
  if (BANNED_ACRONYMS.some((s) => replyLower.includes(s))) return true;

  const explicitBad =
    /waoc\s*(=|stands?\s+for|standing\s+for|is\s+short\s+for|expanded\s+as|refers\s+to)\s*(?!we\s+are\s+one\s+connection)/.test(
      replyLower
    );

  return explicitBad;
}

/** ---------------------------------------
 *  Truth gate helpers
 *  ------------------------------------- */
function needsVerification(textLower: string) {
  // 更精准：避免仅出现 “market” 就误触发
  return /price|valuation|market\s*(now|today|current)|latest|update|updates|news|listing|partner(ship)?|contract\s*address|\bca\b|verify|official|scam|真假|最新|今天|现在|新闻|更新|价格|估值|市值|行情|合约|地址|验证|防骗/.test(
    textLower
  );
}
function hasDisclosure(replyLower: string) {
  return /won't make (it|things) up|i can’t verify|i cannot verify|i don't have reliable access|can’t reliably know|i won't guess|不乱编|不会乱编|无法验证|我没法验证|不会猜|不猜/.test(
    replyLower
  );
}
function hasConcreteNextStep(replyLower: string) {
  return /\/report|pinned|pin|official|website|x\.com|telegram|join|link|官网|置顶|官方|入口|链接|频道|公告|\/rank|\/mission|\/links|\/website/.test(
    replyLower
  );
}
function containsFluff(replyLower: string) {
  return /stay tuned|exciting developments|we're continuously building|keep the community engaged|it's important to stay informed|consider sharing|thriving|interconnected civilization|请关注官方渠道|敬请期待|持续建设|激动人心|保持关注/.test(
    replyLower
  );
}

/** ---------------------------------------
 *  suggestedAction validation
 *  ------------------------------------- */
function isValidSuggestedAction(x: any): x is WaocSuggestedAction | undefined {
  return x === undefined || x === "none" || x === "/links";
}

/** ---------------------------------------
 *  Optional: auto-fix (lightweight)
 *  ------------------------------------- */
export function waocIdentityAutoFix(args: {
  reply: string;
  userMessage?: string;
  lang?: "en" | "zh";
}) {
  const uLower = lower(args.userMessage || "");
  const asksMeaning = userAsksAcronymMeaning(uLower);

  const prefix =
    args.lang === "zh"
      ? "WAOC = We Are One Connection。\n"
      : "WAOC = We Are One Connection.\n";

  let r = norm(args.reply);

  if (!r) return asksMeaning ? prefix.trim() : "";

  const rLower = lower(r);

  if (asksMeaning && !rLower.includes(MUST_PHRASE)) {
    r = `${prefix}${r}`;
  }

  if (containsInvalidExpansion(lower(r))) {
    r = r.replace(
      /WAOC\s*(=|stands?\s+for|standing\s+for|is\s+short\s+for|expanded\s+as|refers\s+to)\s*[^.。\n]+/gi,
      "WAOC = We Are One Connection"
    );

    for (const bad of BANNED_ACRONYMS) {
      const re = new RegExp(bad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      r = r.replace(re, "We Are One Connection");
    }
  }

  return r.trim();
}

/** ---------------------------------------
 *  Main constraints check (Final)
 *  ------------------------------------- */
export function checkWaocChatConstraints(input: WaocChatCheckInput) {
  const errors: string[] = [];

  const data = input?.data;
  const reply = norm(data?.reply);
  if (!reply) errors.push("reply must be non-empty");

  const lowerReply = lower(reply);
  const userLower = lower(input?.userMessage || "");

  const asksMeaning = userAsksAcronymMeaning(userLower);

  /* -----------------------------
     1️⃣ 禁止机器人开场
  ----------------------------- */
  const bannedStarts = [
    "clarify",
    "focus on",
    "identify",
    "please clarify",
    "what specific area",
    "could you clarify",
    "can you clarify",
    "请问你需要了解",
    "你想了解哪个方面",
    "请具体说明",
  ];
  if (bannedStarts.some((s) => lowerReply.startsWith(s))) {
    errors.push("reply too generic/coaching; answer directly like a normal person");
  }

  /* -----------------------------
     2️⃣ WAOC Identity Enforcement 2.2
  ----------------------------- */
  if (asksMeaning && !lowerReply.includes(MUST_PHRASE)) {
    errors.push(
      'If user asks meaning, must include: "WAOC = We Are One Connection" (not necessarily every reply)'
    );
  }

  if (containsInvalidExpansion(lowerReply)) {
    errors.push("WAOC acronym expansion is invalid (do not redefine WAOC)");
  }

  /* -----------------------------
     3️⃣ 禁止 PR 空话
  ----------------------------- */
  if (containsFluff(lowerReply)) {
    errors.push("reply contains PR-style fluff; must be concrete");
  }

  /* -----------------------------
     4️⃣ Truth Gate（reliable trigger）
  ----------------------------- */
  const verificationTopic =
    needsVerification(userLower) || needsVerification(lowerReply);

  if (verificationTopic) {
    if (!hasDisclosure(lowerReply)) {
      errors.push(
        "verification-type reply must disclose uncertainty (cannot verify / won't guess)"
      );
    }
    if (!hasConcreteNextStep(lowerReply)) {
      errors.push(
        "verification-type reply must provide a concrete next step (pinned, official links, /report)"
      );
    }
  }

  /* -----------------------------
     5️⃣ suggestedAction enum
  ----------------------------- */
  if (!isValidSuggestedAction((data as any)?.suggestedAction)) {
    errors.push('suggestedAction must be "none" or "/links"');
  }

  /* -----------------------------
     6️⃣ suggestedAction length limit (legacy safeguard)
  ----------------------------- */
  if (
    (data as any)?.suggestedAction &&
    String((data as any).suggestedAction).length > 200
  ) {
    errors.push("suggestedAction too long (max 200 chars)");
  }

  return { ok: errors.length === 0, errors };
}