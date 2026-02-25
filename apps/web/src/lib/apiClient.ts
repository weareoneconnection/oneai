// apps/web/src/lib/apiClient.ts

/**
 * OneAI OS – Web API Client (v4, OS-ready)
 * ✅ Supports:
 * - x-api-key auth (dev)
 * - HTML/non-JSON responses (wrong route / fallback)
 * - Unified error messages
 * - /v1/generate task-runner protocol: { type, input, options }
 *
 * ✅ OS upgrade:
 * - If workflowType is provided, it will be sent as `type` directly (no mapping to tweet/mission).
 * - If workflowType is NOT provided, it falls back to legacy StudioMode mapping (tweet/mission).
 */

export type StudioMode = "tweet" | "mission" | "command" | "thread";
export type Lang = "en" | "zh";

export type OutputItem = { title?: string; content: string };

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const ADMIN_KEY = process.env.NEXT_PUBLIC_ONEAI_ADMIN_KEY || "";

/** ---------------------------------------
 * Helpers
 * ------------------------------------- */

function extractLink(s: string) {
  const m = (s || "").match(/https?:\/\/\S+/);
  return m ? m[0] : "";
}

function safeTrim(v: unknown) {
  return String(v ?? "").trim();
}

function normalizeLang(v: unknown, fallback: Lang = "en"): Lang {
  const s = safeTrim(v).toLowerCase();
  return s === "zh" ? "zh" : fallback;
}

async function safeFetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(ADMIN_KEY ? { "x-api-key": ADMIN_KEY } : {}),
      ...(options?.headers || {}),
    },
    ...options,
  });

  const contentType = res.headers.get("content-type") || "";
  const raw = await res.text();

  // ❌ If API returns HTML -> wrong route / proxy / fallback
  if (
    contentType.includes("text/html") ||
    raw.trim().startsWith("<!DOCTYPE html") ||
    raw.trim().startsWith("<html")
  ) {
    throw new Error(
      `API returned HTML instead of JSON. URL: ${url} Check NEXT_PUBLIC_API_BASE_URL`
    );
  }

  // ❌ Non JSON
  if (!contentType.includes("application/json")) {
    throw new Error(
      `API returned non-JSON. URL: ${url} Content-Type: ${contentType} Body: ${raw.slice(
        0,
        200
      )}`
    );
  }

  let data: any = null;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`API JSON parse failed. URL: ${url} Body: ${raw.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Request failed: ${res.status}`);
  }

  return data;
}

/** ---------------------------------------
 * Types (aligned with API workflows)
 * ------------------------------------- */

/**
 * IMPORTANT:
 * - mode: for UI OS mode (tweet/mission/command/thread)
 * - workflowType: actual /v1/generate task type (tweet/mission/waoc_chat/mission_os/...)
 *
 * If workflowType is provided => it will be used as API `type` directly.
 */
export type StudioGeneratePayload = {
  mode: StudioMode;
  workflowType?: string; // ✅ OS: direct API workflow type, e.g. "waoc_chat"
  projectSlug: string;
  language: Lang;
  tone: string;
  goal: string;
  constraints: string;
  input: {
    topic: string;
    details: string;
    rewards: string;
    // optional OS fields
    message?: string; // for chat-like workflows
    context?: string; // for chat-like workflows
    projectVoice?: unknown;
    hint?: string;
  };
  options?: {
    templateVersion?: number;
    maxAttempts?: number;
    debug?: boolean;
  };
};

// --- API workflow inputs (apps/api) ---
type TweetInput = {
  topic: string;
  audience?: string;
  tone?: string;
  brand?: string;
  link?: string;
};

type MissionInput = {
  goal: string;
  targetAudience: string;
};

type WaocChatInput = {
  message: string;
  context?: string;
  lang?: Lang;
};

type WaocBrainInput = {
  question: string;
  lang?: Lang;
};

type WaocSocialPostInput = {
  topic: string;
  mode?: "tweet" | "thread" | "poster";
  brand?: string;
  link?: string;
  lang?: Lang;
};

type WaocNarrativeInput = {
  topic: string;
  depth?: "short" | "medium" | "deep";
  lang?: Lang;
};

type MissionOsInput = {
  goal: string;
  targetAudience: string;
  brand?: string;
  link?: string;
  lang?: Lang;
};

type MissionEnhancerInput = {
  title: string;
  description: string;
  goal: string;
  lang?: Lang;
};

type IdentityInput = {
  source: string;
  handle: string;
  message: string;
  lang?: Lang;
};

// --- API workflow outputs (apps/api) ---
export type TweetData = {
  tweet_zh: string;
  tweet_en: string;
  hashtags: string[];
  cta: string;
};

export type MissionData = {
  mission_title: string;
  objective: string;
  steps: string[];
  reward_structure: { top_reward: string; participation_reward: string };
  ranking_model: string;
  anti_sybil_mechanism: string;
};

export type GenerateResponse<TData = any> = {
  success: boolean;
  attempts: number;
  usage?: any;
  usageTotal?: any;
  usageSteps?: any;
  data: TData | null;
  latencyMs?: number;
  error?: any;
};

/** ---------------------------------------
 * Mapping: Studio -> workflow request
 * ------------------------------------- */

function toWorkflowRequest(p: StudioGeneratePayload): { type: string; input: any } {
  const lang = normalizeLang(p.language, "en");
  const link = extractLink(`${p.input.rewards || ""} ${p.input.details || ""}`);

  // ✅ 1) OS path: workflowType specified => direct type, build best-effort input
  const wf = safeTrim(p.workflowType);
  if (wf) {
    // --- WAOC Chat ---
    if (wf === "waoc_chat") {
      const message = safeTrim(p.input.message ?? p.input.topic);
      const context = safeTrim(p.input.context ?? p.input.details) || "general";
      const input: WaocChatInput = { message, context, lang };
      return { type: wf, input };
    }

    // --- WAOC Brain ---
    if (wf === "waoc_brain") {
      const input: WaocBrainInput = {
        question: safeTrim(p.input.topic || p.input.message),
        lang,
      };
      return { type: wf, input };
    }

    // --- WAOC Social Post (tweet/thread/poster) ---
    if (wf === "waoc_social_post") {
      // Use Studio mode to hint output style
      const mode: WaocSocialPostInput["mode"] =
        p.mode === "thread" ? "thread" : p.mode === "command" ? "tweet" : "tweet";

      const input: WaocSocialPostInput = {
        topic: safeTrim(p.input.topic),
        mode,
        brand: safeTrim(p.projectSlug || "WAOC"),
        link,
        lang,
      };
      return { type: wf, input };
    }

    // --- WAOC Narrative ---
    if (wf === "waoc_narrative") {
      const input: WaocNarrativeInput = {
        topic: safeTrim(p.input.topic),
        depth: "medium",
        lang,
      };
      return { type: wf, input };
    }

    // --- Mission OS ---
    if (wf === "mission_os") {
      const input: MissionOsInput = {
        goal: safeTrim(p.goal || p.input.topic || "growth"),
        targetAudience: safeTrim(p.input.details || "builders / creators / founders"),
        brand: safeTrim(p.projectSlug || "WAOC"),
        link,
        lang,
      };
      return { type: wf, input };
    }

    // --- Mission Enhancer ---
    if (wf === "mission_enhancer") {
      const input: MissionEnhancerInput = {
        title: safeTrim(p.input.topic || "Mission"),
        description: safeTrim(p.input.details || ""),
        goal: safeTrim(p.goal || "growth"),
        lang,
      };
      return { type: wf, input };
    }

    // --- Identity ---
    if (wf === "identity") {
      const input: IdentityInput = {
        source: "telegram",
        handle: "unknown",
        message: safeTrim(p.input.topic || p.input.message || ""),
        lang,
      };
      return { type: wf, input };
    }

    // --- tweet / mission direct passthrough ---
    if (wf === "tweet") {
      const input: TweetInput = {
        topic: safeTrim(p.input.topic || "OneAI OS update"),
        audience: safeTrim(p.input.details || "builders / creators / founders"),
        tone: safeTrim(p.tone || "civilization-scale but practical"),
        brand: safeTrim(p.projectSlug || "OneAI"),
        link,
      };
      return { type: wf, input };
    }

    if (wf === "mission") {
      const input: MissionInput = {
        goal: safeTrim(p.goal || p.input.topic || "growth"),
        targetAudience: safeTrim(p.input.details || "builders / creators / founders"),
      };
      return { type: wf, input };
    }

    // --- default: send generic payload for unknown future workflows ---
    return {
      type: wf,
      input: {
        topic: p.input.topic,
        details: p.input.details,
        rewards: p.input.rewards,
        lang,
        tone: p.tone,
        goal: p.goal,
        constraints: p.constraints,
        projectSlug: p.projectSlug,
        __meta: {
          mode: p.mode,
          hint: p.input.hint,
          projectVoice: p.input.projectVoice,
        },
      },
    };
  }

  // ✅ 2) Legacy path: no workflowType => map StudioMode to tweet/mission
  if (p.mode === "mission") {
    const goal = safeTrim(p.input.topic || p.goal) || "growth";
    const targetAudience =
      safeTrim(p.input.details) || "builders / creators / founders";
    const input: MissionInput = { goal, targetAudience };
    return { type: "mission", input };
  }

  // Default to tweet
  const input: TweetInput = {
    topic: safeTrim(p.input.topic) || "OneAI OS update",
    audience: safeTrim(p.input.details) || "builders / creators / founders",
    tone: safeTrim(p.tone) || "civilization-scale but practical",
    brand: safeTrim(p.projectSlug || "OneAI"),
    link,
  };
  return { type: "tweet", input };
}

/** ---------------------------------------
 * API Calls
 * ------------------------------------- */

export async function generate(p: StudioGeneratePayload): Promise<GenerateResponse> {
  if (!API_BASE) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");

  const url = `${API_BASE}/v1/generate`;
  const mapped = toWorkflowRequest(p);

  return safeFetchJSON(url, {
    method: "POST",
    body: JSON.stringify({
      type: mapped.type,
      input: mapped.input,
      options: {
        maxAttempts: p.options?.maxAttempts ?? 3,
        templateVersion: p.options?.templateVersion ?? 1,
        ...(p.options?.debug ? { debug: true } : {}),
      },
    }),
  });
}

/** Optional: health check */
export async function health() {
  if (!API_BASE) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");
  return safeFetchJSON(`${API_BASE}/`, { method: "GET" });
}

/** Optional: billing helpers (if you use them later) */
export async function billingStatus() {
  if (!API_BASE) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");
  return safeFetchJSON(`${API_BASE}/v1/billing/status`, { method: "GET" });
}