// apps/web/src/app/(app)/studio/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { templates, projects } from "@/lib/data";
import type { StudioMode } from "@/lib/data";
import { generate } from "@/lib/apiClient";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";

type Tone = "minimal" | "tech" | "civilization" | "battle";
type Lang = "en" | "zh";

type OutputItem = { title?: string; content: string };

type HistoryItem = {
  id: string;
  createdAt: number;
  projectSlug: string;
  projectName?: string;

  mode: StudioMode;
  workflowType: string;

  language: Lang;
  tone: Tone;
  goal: string;
  constraints: string;

  input: { topic: string; details: string; rewards: string };
  outputs: OutputItem[];
};

const HISTORY_KEY = "oneai_studio_history_v40";
const HISTORY_LIMIT = 20;

function safeFileName(s: string) {
  return (s || "oneai-output")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function stringifyVoice(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/**
 * OS Mode meta (UI semantic) – not equal to API workflow type
 */
const modeMeta: Record<
  StudioMode,
  { osLabel: string; rawLabel: string; hint: string }
> = {
  tweet: {
    osLabel: "Broadcast",
    rawLabel: "Tweet",
    hint: "Hook → Mechanism → Rewards → Deadline → CTA",
  },
  mission: {
    osLabel: "Tasks",
    rawLabel: "Mission",
    hint: "Objective → Steps → Proof → Scoring → Rewards → Anti-spam",
  },
  command: {
    osLabel: "Ops",
    rawLabel: "Command",
    hint: "Role → Input → Output format → Constraints → Examples",
  },
  thread: {
    osLabel: "Narrative",
    rawLabel: "Thread",
    hint: "Outline → Sections → CTA → Follow-up",
  },
};

/**
 * WorkflowType (API type) options
 * - label for UI
 * - hint used on the panel
 * - allowed OS modes (optional)
 */
type WorkflowOption = {
  value: string; // API "type"
  label: string;
  hint: string;
  modes?: StudioMode[];
};

const WORKFLOW_OPTIONS: WorkflowOption[] = [
  // Broadcast
  {
    value: "tweet",
    label: "Tweet (tweet)",
    hint: "Generate bilingual tweets + hashtags + CTA.",
    modes: ["tweet", "thread", "command"],
  },
  {
    value: "waoc_social_post",
    label: "WAOC Social Post (waoc_social_post)",
    hint: "WAOC marketing post for tweet/thread style (best for launches).",
    modes: ["tweet", "thread"],
  },

  // Tasks
  {
    value: "mission",
    label: "Mission (mission)",
    hint: "Basic mission: title/objective/steps/rewards/ranking/anti-sybil.",
    modes: ["mission"],
  },
  {
    value: "mission_os",
    label: "Mission OS (mission_os)",
    hint: "OS-grade mission: proof + scoring + budget cap + growth loop + risks + copy.",
    modes: ["mission"],
  },
  {
    value: "mission_enhancer",
    label: "Mission Enhancer (mission_enhancer)",
    hint: "Improve an existing mission + suggest rewards + viral copy.",
    modes: ["mission", "tweet"],
  },

  // Ops
  {
    value: "waoc_chat",
    label: "WAOC Chat (waoc_chat)",
    hint: "Chat assistant output (reply + suggested action + links).",
    modes: ["command", "tweet", "mission", "thread"],
  },
  {
    value: "waoc_brain",
    label: "WAOC Brain (waoc_brain)",
    hint: "Q&A brain: answer + links (knowledge / onboarding).",
    modes: ["command", "tweet", "mission", "thread"],
  },

  // Narrative
  {
    value: "waoc_narrative",
    label: "WAOC Narrative (waoc_narrative)",
    hint: "Long-form narrative / manifesto / explanation content.",
    modes: ["thread"],
  },

  // Identity
  {
    value: "identity",
    label: "Identity (identity)",
    hint: "Extract profile: role, bio, strengths, goals, next actions.",
    modes: ["command", "mission"],
  },
];

/** ---------------------------------------
 * Output renderers (OS)
 * ------------------------------------- */

type Renderer = (data: any) => OutputItem[];

const renderTweet: Renderer = (data) => {
  const zh = data?.tweet_zh ?? "";
  const en = data?.tweet_en ?? "";
  const hashtags = Array.isArray(data?.hashtags) ? data.hashtags.join(" ") : "";
  const cta = data?.cta ?? "";

  const pretty = [
    zh ? `ZH:\n${zh}` : "",
    en ? `EN:\n${en}` : "",
    hashtags ? `Hashtags: ${hashtags}` : "",
    cta ? `CTA: ${cta}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return [{ title: "Tweet", content: pretty || JSON.stringify(data, null, 2) }];
};

const renderMission: Renderer = (data) => {
  const title = data?.mission_title ?? "Mission";
  const objective = data?.objective ?? "";
  const steps = Array.isArray(data?.steps) ? data.steps : [];
  const reward = data?.reward_structure ?? {};
  const ranking = data?.ranking_model ?? "";
  const anti = data?.anti_sybil_mechanism ?? "";

  const pretty = [
    `Title: ${title}`,
    objective ? `\nObjective:\n${objective}` : "",
    steps.length ? `\nSteps:\n- ${steps.join("\n- ")}` : "",
    reward?.top_reward || reward?.participation_reward
      ? `\nRewards:\n- Top: ${reward?.top_reward || "-"}\n- Participation: ${
          reward?.participation_reward || "-"
        }`
      : "",
    ranking ? `\nRanking:\n${ranking}` : "",
    anti ? `\nAnti-sybil:\n${anti}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return [{ title: "Mission", content: pretty || JSON.stringify(data, null, 2) }];
};

const renderWaocChat: Renderer = (data) => {
  const reply = data?.reply ?? "";
  const suggestedAction = data?.suggestedAction ?? "";
  const links = Array.isArray(data?.links) ? data.links : [];

  const pretty = [
    reply ? `Reply:\n${reply}` : "",
    suggestedAction ? `\nSuggested Action:\n${suggestedAction}` : "",
    links.length ? `\nLinks:\n- ${links.join("\n- ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return [{ title: "WAOC Chat", content: pretty || JSON.stringify(data, null, 2) }];
};

const renderWaocBrain: Renderer = (data) => {
  const answer = data?.answer ?? "";
  const links = Array.isArray(data?.links) ? data.links : [];
  const pretty = [
    answer ? `Answer:\n${answer}` : "",
    links.length ? `\nLinks:\n- ${links.join("\n- ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return [{ title: "WAOC Brain", content: pretty || JSON.stringify(data, null, 2) }];
};

const renderWaocSocialPost: Renderer = (data) => {
  // often returns tweet-like payload; prefer tweet renderer if possible
  if (data?.tweet_zh || data?.tweet_en) return renderTweet(data);
  const content = data?.content ?? data?.text ?? "";
  return [
    {
      title: "WAOC Social Post",
      content: content || JSON.stringify(data, null, 2),
    },
  ];
};

const renderWaocNarrative: Renderer = (data) => {
  const content = data?.content ?? "";
  return [{ title: "WAOC Narrative", content: content || JSON.stringify(data, null, 2) }];
};

const renderMissionOS: Renderer = (data) => {
  const title = data?.mission_title ?? "Mission OS";
  const objective = data?.objective ?? "";
  const steps = Array.isArray(data?.steps) ? data.steps : [];

  const proof = data?.proof
    ? `\nProof:\n- Type: ${data.proof.proofType || "-"}\n- Instructions: ${
        data.proof.proofInstructions || "-"
      }\n- Format: ${data.proof.submissionFormat || "-"}`
    : "";

  const reward = data?.reward_structure ?? {};
  const scoring = Array.isArray(reward?.scoring) ? reward.scoring : [];
  const cap = reward?.budgetCap;

  const rewardBlock =
    reward?.top_reward || reward?.participation_reward || cap
      ? `\nRewards:\n- Top: ${reward?.top_reward || "-"}\n- Participation: ${
          reward?.participation_reward || "-"
        }${
          cap
            ? `\n- BudgetCap: ${cap.currency || ""} maxParticipants=${cap.maxParticipants ?? "-"} maxTotalReward=${
                cap.maxTotalReward ?? "-"
              }`
            : ""
        }${
          scoring.length
            ? `\n- Scoring:\n  - ${scoring
                .map((s: any) => `${s.action ?? "-"}: ${s.points ?? "-"} pts`)
                .join("\n  - ")}`
            : ""
        }`
      : "";

  const ranking = data?.ranking_model ? `\nRanking:\n${data.ranking_model}` : "";
  const anti = data?.anti_sybil_mechanism ? `\nAnti-sybil:\n${data.anti_sybil_mechanism}` : "";

  const growth = data?.growth
    ? `\nGrowth:\n- k: ${data.growth.viralCoefficientEstimate ?? "-"}\n- Hooks: ${
        Array.isArray(data.growth.shareHooks) ? data.growth.shareHooks.join(", ") : "-"
      }\n- Loop: ${data.growth.referralLoop ?? "-"}`
    : "";

  const risk = data?.risk
    ? `\nRisk:\n- Abuse: ${
        Array.isArray(data.risk.abuseVectors) ? data.risk.abuseVectors.join(", ") : "-"
      }\n- Mitigations: ${
        Array.isArray(data.risk.mitigations) ? data.risk.mitigations.join(", ") : "-"
      }`
    : "";

  const copy = data?.recommendedCopy
    ? `\nRecommended Copy:\n- ZH: ${data.recommendedCopy.tweet_zh ?? "-"}\n- EN: ${
        data.recommendedCopy.tweet_en ?? "-"
      }\n- CTA: ${data.recommendedCopy.cta ?? "-"}`
    : "";

  const pretty = [
    `Title: ${title}`,
    objective ? `\nObjective:\n${objective}` : "",
    steps.length ? `\nSteps:\n- ${steps.join("\n- ")}` : "",
    proof,
    rewardBlock,
    ranking,
    anti,
    growth,
    risk,
    copy,
  ]
    .filter(Boolean)
    .join("\n");

  return [{ title: "Mission OS", content: pretty || JSON.stringify(data, null, 2) }];
};

const renderMissionEnhancer: Renderer = (data) => {
  const optimized = data?.optimizedDescription ?? "";
  const rewardSuggestion = data?.rewardSuggestion ?? "";
  const viral = data?.viralTweet;

  const pretty = [
    optimized ? `Optimized:\n${optimized}` : "",
    rewardSuggestion ? `\nReward Suggestion:\n${rewardSuggestion}` : "",
    viral ? `\nViral Tweet:\n${JSON.stringify(viral, null, 2)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return [{ title: "Mission Enhancer", content: pretty || JSON.stringify(data, null, 2) }];
};

const renderIdentity: Renderer = (data) => {
  return [{ title: "Identity", content: JSON.stringify(data, null, 2) }];
};

const outputRenderers: Record<string, Renderer> = {
  tweet: renderTweet,
  mission: renderMission,

  waoc_chat: renderWaocChat,
  waoc_brain: renderWaocBrain,
  waoc_social_post: renderWaocSocialPost,
  waoc_narrative: renderWaocNarrative,

  mission_os: renderMissionOS,
  mission_enhancer: renderMissionEnhancer,

  identity: renderIdentity,
};

function rendererFallback(data: any): OutputItem[] {
  if (typeof data === "string") return [{ title: "Output", content: data }];
  return [{ title: "Output", content: JSON.stringify(data, null, 2) }];
}

/** ---------------------------------------
 * Page
 * ------------------------------------- */

export default function StudioPage() {
  const sp = useSearchParams();
  const initialMode = (sp.get("mode") as StudioMode) || "tweet";

  const [mode, setMode] = useState<StudioMode>(initialMode);
  const [workflowType, setWorkflowType] = useState<string>("waoc_chat");

  const [projectSlug, setProjectSlug] = useState<string>(
    projects[0]?.slug || "oneai"
  );
  const [language, setLanguage] = useState<Lang>("en");
  const [tone, setTone] = useState<Tone>("tech");
  const [goal, setGoal] = useState<string>("launch");

  const [constraints, setConstraints] = useState<string>(
    "Announce clearly. 1 strong hook, 1 proof line, 1 CTA. No fluff."
  );

  const [inputA, setInputA] = useState<string>("");
  const [inputB, setInputB] = useState<string>("");
  const [inputC, setInputC] = useState<string>("");

  // template search/filter
  const [templateQuery, setTemplateQuery] = useState<string>("");
  const [templateCategory, setTemplateCategory] = useState<string>("all");

  const [loading, setLoading] = useState(false);
  const [outputs, setOutputs] = useState<OutputItem[]>([]);
  const [error, setError] = useState<string>("");

  // history
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const currentProject = useMemo(
    () => projects.find((p) => p.slug === projectSlug) || projects[0],
    [projectSlug]
  );

  // ======= Black-gold button classes =======
  const btnPrimary =
    "!bg-black !text-white border border-amber-400/35 shadow-[0_14px_40px_rgba(0,0,0,0.35)] hover:!bg-neutral-900 hover:shadow-[0_18px_55px_rgba(0,0,0,0.45)] active:scale-[0.98] transition-all rounded-full";
  const btnSecondary =
    "!bg-amber-50 !text-black border border-amber-400/55 shadow-sm hover:!bg-amber-100 active:scale-[0.98] transition-all rounded-full";
  const btnGhost =
    "!bg-white !text-black border border-black/15 shadow-sm hover:!bg-black/[0.04] active:scale-[0.98] transition-all rounded-full";
  const btnDanger =
    "!bg-red-50 !text-red-700 border border-red-400/40 shadow-sm hover:!bg-red-100 active:scale-[0.98] transition-all rounded-full";

  // ======= workflow hint + allowed options by mode =======
  const workflowOptionsForMode = useMemo(() => {
    return WORKFLOW_OPTIONS.filter((w) => !w.modes || w.modes.includes(mode));
  }, [mode]);

  const workflowHint = useMemo(() => {
    return (
      WORKFLOW_OPTIONS.find((w) => w.value === workflowType)?.hint ||
      "Structured OS output"
    );
  }, [workflowType]);

  // if mode changes and current workflowType not allowed, pick first allowed
  useEffect(() => {
    const allowed = workflowOptionsForMode;
    if (!allowed.length) return;
    const ok = allowed.some((w) => w.value === workflowType);
    if (!ok) setWorkflowType(allowed[0].value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ======= templates (still based on StudioMode) =======
  const relevantTemplates = useMemo(
    () => templates.filter((t) => t.mode === mode),
    [mode]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    relevantTemplates.forEach((t) => set.add(String((t as any).category || "general")));
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [relevantTemplates]);

  const filteredTemplates = useMemo(() => {
    const q = templateQuery.trim().toLowerCase();
    return relevantTemplates
      .filter((t) =>
        templateCategory === "all"
          ? true
          : String((t as any).category || "general") === templateCategory
      )
      .filter((t) => {
        if (!q) return true;
        const hay = `${(t as any).title} ${(t as any).description} ${(t as any).seedPrompt} ${(t as any).category} ${(t as any).mode}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 12);
  }, [relevantTemplates, templateQuery, templateCategory]);

  // ======= history load/save =======
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setHistory(parsed);
    } catch {
      // ignore
    }
  }, []);

  function persistHistory(next: HistoryItem[]) {
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function pushHistory(item: HistoryItem) {
    const next = [item, ...history].slice(0, HISTORY_LIMIT);
    persistHistory(next);
  }

  function clearHistory() {
    persistHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // ignore
    }
  }

  function restoreFromHistory(h: HistoryItem) {
    setMode(h.mode);
    setWorkflowType(h.workflowType);
    setProjectSlug(h.projectSlug);
    setLanguage(h.language);
    setTone(h.tone);
    setGoal(h.goal);
    setConstraints(h.constraints);
    setInputA(h.input.topic);
    setInputB(h.input.details);
    setInputC(h.input.rewards);
    setOutputs(h.outputs || []);
    setError("");
  }

  function applyTemplate(id: string) {
    const t = templates.find((x) => (x as any).id === id) as any;
    if (!t) return;
    setMode(t.mode as StudioMode);
    setConstraints(
      `Template: ${t.title}\n${t.seedPrompt}\n\nConstraints: keep output clean, structured, actionable.`
    );
    setInputA("");
    setInputB("");
    setInputC("");
    setOutputs([]);
    setError("");
  }

  // ======= export/copy helpers =======
  const combinedText = useMemo(() => {
    if (!outputs.length) return "";
    return outputs
      .map((o, idx) => {
        const title = o.title ? `${o.title}\n` : `Output ${idx + 1}\n`;
        return `${title}${o.content}`.trim();
      })
      .filter(Boolean)
      .join("\n\n---\n\n");
  }, [outputs]);

  const combinedMarkdown = useMemo(() => {
    const meta = `# Studio Output

- Project: **${currentProject?.name || "Project"}**
- OS Mode: **${modeMeta[mode].osLabel} · ${modeMeta[mode].rawLabel}**
- Workflow Type: **${workflowType}**
- Language: **${language}**
- Tone: **${tone}**
- Goal: **${goal}**

## Inputs

- Topic: ${inputA || "-"}
- Details: ${inputB || "-"}
- Rewards: ${inputC || "-"}

## Outputs
`;
    if (!outputs.length) return meta + "\n_No outputs yet._\n";

    const body = outputs
      .map((o, idx) => {
        const h = o.title ? `### ${o.title}\n\n` : `### Output ${idx + 1}\n\n`;
        return `${h}\`\`\`\n${o.content}\n\`\`\`\n`;
      })
      .join("\n");

    return meta + "\n" + body;
  }, [
    outputs,
    currentProject?.name,
    mode,
    workflowType,
    language,
    tone,
    goal,
    inputA,
    inputB,
    inputC,
  ]);

  const combinedJSON = useMemo(() => {
    return JSON.stringify(
      {
        project: currentProject?.name || null,
        projectSlug,
        mode,
        modeOS: modeMeta[mode].osLabel,
        modeRaw: modeMeta[mode].rawLabel,
        workflowType,
        language,
        tone,
        goal,
        constraints,
        input: { topic: inputA, details: inputB, rewards: inputC },
        outputs,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }, [
    currentProject?.name,
    projectSlug,
    mode,
    workflowType,
    language,
    tone,
    goal,
    constraints,
    inputA,
    inputB,
    inputC,
    outputs,
  ]);

  const baseName = safeFileName(
    `${currentProject?.name || "project"}-${workflowType}-${goal}`
  );

  // ======= generate =======
  async function onGenerate() {
    setError("");
    setOutputs([]);
    setLoading(true);

    try {
      const projectVoice = stringifyVoice((currentProject as any)?.voice);

      // ✅ Unified Studio payload -> apiClient (workflowType decides backend type)
      const res = await generate({
        mode,
        workflowType,
        projectSlug,
        language,
        tone,
        goal,
        constraints,
        input: {
          topic: inputA,
          details: inputB,
          rewards: inputC,
          // chat workflows use these; harmless for others
          message: inputA,
          context: inputB,
          projectVoice,
          hint: modeMeta[mode].hint,
        },
        options: { maxAttempts: 3, templateVersion: 1 },
      } as any);

      const data =
        (res as any)?.data ??
        (res as any)?.output ??
        (res as any)?.text ??
        res;

      // ✅ OS renderer selection by workflowType
      const renderer = outputRenderers[workflowType] || rendererFallback;
      const normalized = renderer(data);

      setOutputs(normalized);

      pushHistory({
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        createdAt: Date.now(),
        projectSlug,
        projectName: currentProject?.name,
        mode,
        workflowType,
        language,
        tone,
        goal,
        constraints,
        input: { topic: inputA, details: inputB, rewards: inputC },
        outputs: normalized,
      });
    } catch (e: any) {
      setError(e?.message || "Generate failed");
    } finally {
      setLoading(false);
    }
  }

  // ======= shortcuts =======
  useEffect(() => {
    function isMac() {
      return (
        typeof navigator !== "undefined" &&
        /Mac|iPhone|iPad/.test(navigator.platform)
      );
    }

    function handler(e: KeyboardEvent) {
      const mod = isMac() ? e.metaKey : e.ctrlKey;

      if (e.key === "Escape") {
        setHistoryOpen(false);
        return;
      }
      if (!mod) return;

      // Cmd/Ctrl + Enter => generate
      if (e.key === "Enter") {
        e.preventDefault();
        if (!loading) onGenerate();
        return;
      }

      // Cmd/Ctrl + Shift + C => copy all
      if (e.shiftKey && (e.key === "C" || e.key === "c")) {
        e.preventDefault();
        if (combinedText) navigator.clipboard.writeText(combinedText);
        return;
      }

      // Cmd/Ctrl + Shift + E => export md
      if (e.shiftKey && (e.key === "E" || e.key === "e")) {
        e.preventDefault();
        if (outputs.length) {
          downloadTextFile(`${baseName}.md`, combinedMarkdown, "text/markdown");
        }
        return;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, combinedText, outputs.length, combinedMarkdown, baseName]);

  const historyLabel = useMemo(() => {
    const n = history.length;
    return n ? `History (${n})` : "History";
  }, [history.length]);

  const headerBadges = (
    <div className="flex flex-wrap items-center gap-2">
      <Badge className="border border-amber-400/35 bg-black text-amber-200 font-semibold">
        {modeMeta[mode].osLabel} · {modeMeta[mode].rawLabel}
      </Badge>
      <Badge className="border border-black/10 bg-white text-black font-semibold">
        {workflowType}
      </Badge>
      <Badge className="border border-black/10 bg-white text-black font-semibold">
        {currentProject?.name || "Project"}
      </Badge>
      <Badge className="border border-black/10 bg-white text-black font-semibold">
        {language.toUpperCase()}
      </Badge>
      <Badge className="border border-black/10 bg-white text-black font-semibold">
        {tone}
      </Badge>
      <Badge className="border border-black/10 bg-white text-black font-semibold">
        {goal}
      </Badge>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* OS Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-black">
            Studio
          </h1>
          <p className="mt-1 text-sm text-black/60">
            OneAI OS entry — choose OS Mode + Workflow Type → generate structured outputs.
          </p>
          <div className="mt-2 text-xs text-black/50">
            Shortcuts: <b className="text-black">⌘/Ctrl+Enter</b> Generate ·{" "}
            <b className="text-black">⌘/Ctrl+⇧C</b> Copy all ·{" "}
            <b className="text-black">⌘/Ctrl+⇧E</b> Export .md
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 md:items-end">
          {headerBadges}
          <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs text-black/60">
            Tip: pick <b className="text-black">Workflow Type</b> first. Output parsing is OS-rendered.
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left: Workspace */}
        <Card className="lg:col-span-7 bg-white">
          <CardHeader>
            <CardTitle className="text-black">Workspace</CardTitle>
            <CardDescription className="text-black/60">
              {workflowHint}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* OS Mode panel */}
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-black">
                  OS Mode
                  <span className="ml-2 text-xs font-normal text-black/55">
                    semantic entry + workflow routing
                  </span>
                </div>
                <div className="text-xs text-black/55">OS v4</div>
              </div>

              <div className="mt-3">
                <Tabs
                  value={mode}
                  onChange={(v) => setMode(v as StudioMode)}
                  items={[
                    { value: "tweet", label: "Broadcast" },
                    { value: "mission", label: "Tasks" },
                    { value: "command", label: "Ops" },
                    { value: "thread", label: "Narrative" },
                  ]}
                />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-12">
                <div className="md:col-span-7">
                  <div className="mb-1 text-xs font-medium text-black/60">
                    Workflow Type
                  </div>
                  <Select
                    value={workflowType}
                    onChange={(e) => setWorkflowType(e.target.value)}
                  >
                    {workflowOptionsForMode.map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="md:col-span-5">
                  <div className="mb-1 text-xs font-medium text-black/60">
                    Hint
                  </div>
                  <div className="rounded-xl border border-black/10 bg-white p-3 text-sm text-black/70">
                    {workflowHint}
                  </div>
                </div>
              </div>
            </div>

            {/* Params */}
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <div className="mb-1 text-xs font-medium text-black/60">
                  Project
                </div>
                <Select
                  value={projectSlug}
                  onChange={(e) => setProjectSlug(e.target.value)}
                >
                  {projects.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <div className="mb-1 text-xs font-medium text-black/60">
                  Language
                </div>
                <Select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Lang)}
                >
                  <option value="en">English</option>
                  <option value="zh">中文</option>
                </Select>
              </div>

              <div>
                <div className="mb-1 text-xs font-medium text-black/60">
                  Tone
                </div>
                <Select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as Tone)}
                >
                  <option value="minimal">minimal</option>
                  <option value="tech">tech</option>
                  <option value="civilization">civilization</option>
                  <option value="battle">battle</option>
                </Select>
              </div>

              <div>
                <div className="mb-1 text-xs font-medium text-black/60">
                  Goal
                </div>
                <Input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="launch / growth / recruiting..."
                />
              </div>
            </div>

            {/* Inputs */}
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-medium text-black/60">
                  Message / Topic
                </div>
                <Input
                  value={inputA}
                  onChange={(e) => setInputA(e.target.value)}
                  placeholder="What do you want to generate?"
                />
              </div>

              <div>
                <div className="mb-1 text-xs font-medium text-black/60">
                  Context / Details
                </div>
                <Input
                  value={inputB}
                  onChange={(e) => setInputB(e.target.value)}
                  placeholder="community / onboarding / mission / mechanics..."
                />
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-black/60">
                Rewards / Links (optional)
              </div>
              <Input
                value={inputC}
                onChange={(e) => setInputC(e.target.value)}
                placeholder="Links, reward, deadline..."
              />
            </div>

            {/* Constraints */}
            <div>
              <div className="mb-1 text-xs font-medium text-black/60">
                Constraints
              </div>
              <Textarea
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
              />
              <div className="mt-1 text-xs text-black/55">
                Keep it short. Avoid fluff. Include CTA if applicable.
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={onGenerate}
                disabled={loading}
                className={btnPrimary}
              >
                {loading ? "Generating..." : "Generate"}
              </Button>

              <Button
                variant="secondary"
                className={btnSecondary}
                onClick={() => {
                  setOutputs([]);
                  setError("");
                }}
              >
                Clear Output
              </Button>

              <Button
                variant="ghost"
                className={btnGhost}
                onClick={() => {
                  setInputA("");
                  setInputB("");
                  setInputC("");
                }}
              >
                Reset Inputs
              </Button>

              <div className="ml-auto text-xs text-black/60">
                Project voice:{" "}
                <span className="font-semibold text-black">
                  {(currentProject as any)?.voice ? "enabled" : "none"}
                </span>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Right: Outputs + History */}
        <div className="lg:col-span-5 lg:self-start lg:sticky lg:top-6 space-y-4">
          <Card className="bg-white">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-black">Outputs</CardTitle>
                  <CardDescription className="text-black/60">
                    OS-rendered outputs (copy/export/reuse).
                  </CardDescription>
                </div>

                <Badge className="border border-amber-400/35 bg-black text-amber-200 font-semibold">
                  {workflowType}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className={btnPrimary}
                  disabled={!combinedText || loading}
                  onClick={async () => {
                    if (combinedText) await navigator.clipboard.writeText(combinedText);
                  }}
                >
                  Copy All
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  className={btnGhost}
                  disabled={!outputs.length}
                  onClick={() => {
                    downloadTextFile(`${baseName}.md`, combinedMarkdown, "text/markdown");
                  }}
                >
                  Export .md
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  className={btnGhost}
                  disabled={!outputs.length}
                  onClick={() => {
                    downloadTextFile(`${baseName}.json`, combinedJSON, "application/json");
                  }}
                >
                  Export .json
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className={btnSecondary}
                  onClick={() => setHistoryOpen((v) => !v)}
                >
                  {historyLabel}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {outputs.length === 0 ? (
                <div className="rounded-2xl border border-black/10 bg-white p-4 text-sm text-black/60">
                  No output yet. Fill inputs and click{" "}
                  <b className="text-black">Generate</b>.
                </div>
              ) : (
                outputs.map((o, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-black/10 bg-white p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-black">
                        {o.title || `Output ${idx + 1}`}
                      </div>
                      <Badge className="border border-black/10 bg-white text-black font-semibold">
                        {modeMeta[mode].osLabel}
                      </Badge>
                    </div>

                    <pre className="whitespace-pre-wrap rounded-xl border border-black/10 bg-black/[0.02] p-3 text-sm leading-relaxed text-black/85">
                      {o.content}
                    </pre>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className={btnPrimary}
                        onClick={async () => {
                          await navigator.clipboard.writeText(o.content);
                        }}
                      >
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className={btnSecondary}
                        onClick={() => {
                          setInputA(o.content.slice(0, 140));
                          setInputB("");
                          setInputC("");
                        }}
                      >
                        Iterate
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* History panel */}
          {historyOpen ? (
            <Card className="bg-white">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-black">History</CardTitle>
                    <CardDescription className="text-black/60">
                      Last {HISTORY_LIMIT} generations saved locally. Restore anytime.
                    </CardDescription>
                  </div>

                  <Button
                    size="sm"
                    variant="secondary"
                    className={history.length ? btnDanger : btnGhost}
                    disabled={!history.length}
                    onClick={clearHistory}
                  >
                    Clear
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                {history.length === 0 ? (
                  <div className="rounded-2xl border border-black/10 bg-white p-4 text-sm text-black/60">
                    No history yet.
                  </div>
                ) : (
                  history.map((h) => (
                    <div
                      key={h.id}
                      className="rounded-2xl border border-black/10 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-black truncate">
                            {h.projectName || h.projectSlug} · {modeMeta[h.mode].osLabel} ·{" "}
                            {h.workflowType} · {h.goal}
                          </div>
                          <div className="mt-1 text-xs text-black/60">
                            {new Date(h.createdAt).toLocaleString()}
                          </div>
                          <div className="mt-2 text-xs text-black/60 line-clamp-2">
                            <span className="font-semibold text-black">Topic:</span>{" "}
                            {h.input?.topic || "-"}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col gap-2">
                          <Button
                            size="sm"
                            className={btnPrimary}
                            onClick={() => restoreFromHistory(h)}
                          >
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className={btnGhost}
                            onClick={async () => {
                              const text = (h.outputs || [])
                                .map((o) =>
                                  o.title ? `${o.title}\n${o.content}` : o.content
                                )
                                .join("\n\n---\n\n");
                              await navigator.clipboard.writeText(text);
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Templates */}
      <Card className="bg-white">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle className="text-black">Templates</CardTitle>
              <CardDescription className="text-black/60">
                Search + filter presets for current OS mode.
              </CardDescription>
            </div>

            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
              <div className="w-full md:w-64">
                <Input
                  value={templateQuery}
                  onChange={(e) => setTemplateQuery(e.target.value)}
                  placeholder="Search templates..."
                />
              </div>

              <div className="w-full md:w-48">
                <Select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c === "all" ? "All categories" : c}
                    </option>
                  ))}
                </Select>
              </div>

              <Badge className="border border-black/10 bg-white text-black font-semibold">
                {filteredTemplates.length} shown
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredTemplates.length === 0 ? (
            <div className="rounded-2xl border border-black/10 bg-white p-4 text-sm text-black/60">
              No templates found. Try another keyword or category.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t.id)}
                  className="group w-full rounded-2xl border border-black/10 bg-white p-4 text-left shadow-sm transition hover:bg-black/[0.02] hover:shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-black">
                        {t.title}
                      </div>
                      <div className="mt-1 text-xs text-black/60">
                        {t.description}
                      </div>
                    </div>
                    <Badge className="border border-black/10 bg-white text-black font-semibold">
                      {t.category}
                    </Badge>
                  </div>

                  <div className="mt-3 text-xs text-black/55">
                    Click to apply → updates constraints & resets inputs.
                  </div>

                  <div className="mt-3 h-px bg-black/10" />
                  <div className="mt-3 text-xs text-black/60">
                    Mode:{" "}
                    <span className="font-semibold text-black">
                      {modeMeta[t.mode as StudioMode]?.osLabel} ·{" "}
                      {modeMeta[t.mode as StudioMode]?.rawLabel}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}