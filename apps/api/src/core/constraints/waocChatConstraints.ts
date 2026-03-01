// src/core/constraints/waocChatConstraints.ts

export type WaocSuggestedAction = "none" | "/links" | "/mission" | "/rank" | "/report";

export type WaocChatData = {
  reply: string;
  suggestedAction?: WaocSuggestedAction;
};

type CheckArgs = {
  data: WaocChatData;
  userMessage?: string;
  lang?: "en" | "zh";
};

type CheckResult =
  | { ok: true; data: WaocChatData }
  | { ok: false; reason: string; data?: WaocChatData };

const ACTIONS: WaocSuggestedAction[] = ["none", "/links", "/mission", "/rank", "/report"];

function norm(s: any) {
  return String(s ?? "").trim();
}
function lower(s: any) {
  return norm(s).toLowerCase();
}

function sanitizeReply(reply: any) {
  let r = norm(reply);
  if (!r) r = "Got it.";
  // remove accidental code fences if LLM leaks
  r = r.replace(/```[\s\S]*?```/g, "").trim();
  if (!r) r = "Got it.";
  return r;
}

function normalizeAction(a: any): WaocSuggestedAction {
  const v = norm(a) as WaocSuggestedAction;
  return ACTIONS.includes(v) ? v : "none";
}

/** conservative: only trigger when user explicitly asks meaning/full form */
function userExplicitlyAsksMeaning(msgLower: string) {
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

function ensureFirstLineFullForm(reply: string, lang: "en" | "zh") {
  const required = lang === "zh" ? "WAOC = We Are One Connection。" : "WAOC = We Are One Connection.";
  const r = sanitizeReply(reply);

  if (r.startsWith(required)) return r;

  // avoid duplicates if already somewhere
  const cleaned = r.replace(required, "").trim();
  return cleaned ? `${required}\n${cleaned}` : required;
}

function looksLikeExternalVerification(msgLower: string) {
  return (
    /\bca\b/.test(msgLower) ||
    msgLower.includes("contract") ||
    msgLower.includes("address") ||
    msgLower.includes("price") ||
    msgLower.includes("listing") ||
    msgLower.includes("listed") ||
    msgLower.includes("partnership") ||
    msgLower.includes("audit") ||
    msgLower.includes("news") ||
    msgLower.includes("latest") ||
    msgLower.includes("update") ||
    msgLower.includes("合约") ||
    msgLower.includes("地址") ||
    msgLower.includes("价格") ||
    msgLower.includes("上线") ||
    msgLower.includes("上所") ||
    msgLower.includes("合作") ||
    msgLower.includes("审计") ||
    msgLower.includes("新闻") ||
    msgLower.includes("最新") ||
    msgLower.includes("更新") ||
    msgLower.includes("真假") ||
    msgLower.includes("verify") ||
    msgLower.includes("scam")
  );
}

/**
 * Core constraints check:
 * - reply non-empty
 * - suggestedAction in whitelist
 * - if meaning asked: enforce first-line exact full form
 */
export function checkWaocChatConstraints(args: CheckArgs): CheckResult {
  const data = args?.data ?? ({ reply: "" } as any);
  const userMessage = norm(args?.userMessage);
  const msgLower = lower(userMessage);
  const lang: "en" | "zh" = args?.lang === "zh" ? "zh" : "en";

  const fixed: WaocChatData = {
    reply: sanitizeReply(data.reply),
    suggestedAction: normalizeAction(data.suggestedAction ?? "none"),
  };

  if (userMessage && userExplicitlyAsksMeaning(msgLower)) {
    fixed.reply = ensureFirstLineFullForm(fixed.reply, lang);
  }

  // If user asks external verification-like question, encourage /links unless already set
  if (userMessage && looksLikeExternalVerification(msgLower)) {
    if (fixed.suggestedAction === "none") fixed.suggestedAction = "/links";
  }

  // Minimal validity
  if (!fixed.reply) return { ok: false, reason: "empty_reply", data: fixed };
  if (!ACTIONS.includes(fixed.suggestedAction ?? "none"))
    return { ok: false, reason: "bad_action", data: fixed };

  return { ok: true, data: fixed };
}

/**
 * Hard guard used in workflow:
 * never crash, always returns ok:true data
 */
export function checkWaocChatConstraintsSafe(args: CheckArgs): { ok: true; data: WaocChatData } {
  const r = checkWaocChatConstraints(args);
  if (r.ok) return { ok: true, data: r.data };
  const d = r.data ?? { reply: "Got it.", suggestedAction: "none" };
  return { ok: true, data: d };
}