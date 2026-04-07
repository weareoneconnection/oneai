export type AgentPlanData = {
  summary: string;
  tweets: string[];
  missions: string[];
  actions: string[];
  proofLabel: string;
  aiReasoning: string[];
  rawText: string;
};

export function checkAgentPlanConstraints(data: Partial<AgentPlanData>) {
  const errors: string[] = [];

  const summary = String(data.summary ?? "").trim();
  if (!summary) errors.push("summary is required");

  const tweets = Array.isArray(data.tweets) ? data.tweets.map(String) : [];
  if (tweets.length !== 2) {
    errors.push("tweets must contain exactly 2 items");
  }

  const missions = Array.isArray(data.missions) ? data.missions.map(String) : [];
  if (missions.length !== 4) {
    errors.push("missions must contain exactly 4 items");
  }

  const actions = Array.isArray(data.actions) ? data.actions.map(String) : [];
  if (actions.length !== 4) {
    errors.push("actions must contain exactly 4 items");
  }

  const proofLabel = String(data.proofLabel ?? "").trim();
  if (!proofLabel) errors.push("proofLabel is required");

  const aiReasoning = Array.isArray(data.aiReasoning)
    ? data.aiReasoning.map(String).filter(Boolean)
    : [];
  if (aiReasoning.length < 3 || aiReasoning.length > 6) {
    errors.push("aiReasoning must contain 3 to 6 items");
  }

  const rawText = String(data.rawText ?? "").trim();
  if (!rawText) errors.push("rawText is required");

  for (const item of tweets) {
    if (!item.trim()) errors.push("tweets cannot contain empty items");
  }

  for (const item of missions) {
    if (!item.trim()) errors.push("missions cannot contain empty items");
  }

  for (const item of actions) {
    if (!item.trim()) errors.push("actions cannot contain empty items");
  }

  for (const item of aiReasoning) {
    if (!item.trim()) errors.push("aiReasoning cannot contain empty items");
  }

  return {
    ok: errors.length === 0,
    errors
  };
}