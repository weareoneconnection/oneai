// apps/web/src/lib/data.ts
export type StudioMode = "tweet" | "mission" | "command" | "thread";

export type Template = {
  id: string;
  title: string;
  category:
    | "Growth"
    | "Community"
    | "Builders"
    | "Investor"
    | "Crisis"
    | "Narrative";
  mode: StudioMode;
  description: string;
  fields: string[];
  seedPrompt: string;
};

export type Project = {
  slug: string;
  name: string;
  tagline: string;
  links: { label: string; url: string }[];
  voice: {
    keyPhrases: string[];
    do: string[];
    dont: string[];
  };
  defaults: {
    language: "en" | "zh";
    tone: "minimal" | "tech" | "civilization" | "battle";
  };
};

export type Workflow = {
  id: string;
  title: string;
  description: string;
  steps: { title: string; detail: string }[];
};

export const templates: Template[] = [
  {
    id: "viral-giveaway-zh",
    title: "Viral Giveaway Post (中文)",
    category: "Growth",
    mode: "tweet",
    description: "一键生成裂变活动推文：规则清晰、奖励结构、强 CTA。",
    fields: ["活动主题", "奖励结构", "参与步骤", "截止时间", "链接"],
    seedPrompt:
      "Write a high-conversion Chinese viral giveaway post. Use short lines, strong hook, clear steps, reward tiers, deadline, and a final CTA. Include emojis but keep it tech-civilization tone.",
  },
  {
    id: "builder-call-en",
    title: "Builder Call (EN)",
    category: "Builders",
    mode: "tweet",
    description: "Builder 招募推文：明确需求、价值、行动入口。",
    fields: ["What we build", "Who we need", "Incentives", "Link"],
    seedPrompt:
      "Write an English builder recruitment tweet. Clear bullets. Explain what we build, who we need, what builders get, and a direct CTA.",
  },
  {
    id: "mission-structure",
    title: "Mission Spec (Universal)",
    category: "Community",
    mode: "mission",
    description: "把活动变成可衡量任务：Objective / Steps / Proof / Scoring。",
    fields: ["任务目标", "步骤", "Proof", "积分规则", "奖励结构"],
    seedPrompt:
      "Create a mission specification with: Title, Objective, Steps, Proof requirements, Scoring, Anti-spam rules, Reward tiers. Output in clean markdown.",
  },
  {
    id: "command-agent",
    title: "Reusable Command (Agent/Team)",
    category: "Builders",
    mode: "command",
    description: "生成可复用指令：Role/Input/Output/Constraints/Examples。",
    fields: ["Role", "Input", "Output format", "Constraints", "Examples"],
    seedPrompt:
      "Write a reusable command template for an AI agent/team. Include Role, Inputs, Required Output format, Constraints, Style, and 2 examples.",
  },
];

export const projects: Project[] = [
  {
    slug: "oneai",
    name: "OneAI OS",
    tagline: "AI for Builders · Structured Contribution",
    links: [
      { label: "Website", url: "https://oneai.example.com" },
      { label: "Docs", url: "https://oneai.example.com/docs" },
    ],
    voice: {
      keyPhrases: [
        "AI for Builders",
        "Structured Contribution",
        "Execution over hype",
        "Systems that ship",
      ],
      do: ["Be concise", "Use structured bullets", "Always include a CTA"],
      dont: ["Overpromise", "Write generic hype with no steps"],
    },
    defaults: { language: "en", tone: "tech" },
  },
  {
    slug: "waoc",
    name: "WAOC",
    tagline: "Love · Unity · Peace · Conscious Awakening",
    links: [
      { label: "Community", url: "https://t.me/WAOCGlobalCommunity" },
      { label: "One Mission", url: "https://one-mission.vercel.app" },
    ],
    voice: {
      keyPhrases: ["Love", "Unity", "Peace", "We Are One Connection"],
      do: ["Civilization narrative", "Short lines", "Clear reward mechanics"],
      dont: ["Political conflicts", "Toxic callouts"],
    },
    defaults: { language: "zh", tone: "civilization" },
  },
];

export const workflows: Workflow[] = [
  {
    id: "launch-week",
    title: "Launch Week Content Loop",
    description: "7 天内容引擎：生成 → 审核 → 发布 → 追踪 → 迭代。",
    steps: [
      { title: "Generate", detail: "用 Studio 生成 A/B/C 三版" },
      { title: "Review", detail: "压缩字数 + 强化 Hook + CTA" },
      { title: "Publish", detail: "复制发布并记录链接" },
      { title: "Track", detail: "填回浏览/点赞/转发，标记最佳版" },
      { title: "Iterate", detail: "基于最佳版再生成下一条" },
    ],
  },
];