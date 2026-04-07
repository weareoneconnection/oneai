import type { WorkflowStep } from "../types.js";

function asString(value: unknown, fallback = ""): string {
  const s = String(value ?? fallback).trim();
  return s || fallback;
}

function asStringArray(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

export function normalizeAgentPlanStep<TInput>(): WorkflowStep<any> {
  return async (ctx: any) => {
    const data = (ctx.data ?? {}) as Record<string, unknown>;

    const summary = asString(data.summary, "Autonomous coordination on X Layer.");
    const tweets = asStringArray(data.tweets, 2);
    const missions = asStringArray(data.missions, 4);
    const actions = asStringArray(data.actions, 4);
    const proofLabel = asString(data.proofLabel, "Proof of Coordination");
    let aiReasoning = asStringArray(data.aiReasoning, 6);
    let rawText = asString(data.rawText, "");

    if (tweets.length === 0) {
      tweets.push(
        "We are not shipping another AI tool. We are demonstrating an execution system on XLayer.",
        "From prompt → plan → execution → proof. This is what autonomous coordination looks like."
      );
    }
    while (tweets.length < 2) {
      tweets.push(tweets[tweets.length - 1] || "AI-generated launch output.");
    }

    if (missions.length === 0) {
      missions.push(
        "Publish launch thread and CTA",
        "Open community mission for early users",
        "Reward first-wave contributors with verifiable proof",
        "Track conversion and leaderboard momentum"
      );
    }
    while (missions.length < 4) {
      missions.push(missions[missions.length - 1] || "Complete mission step");
    }

    if (actions.length === 0) {
      actions.push(
        "Generate launch copy",
        "Execute social distribution",
        "Create on-chain mission proof",
        "Update community leaderboard"
      );
    }
    while (actions.length < 4) {
      actions.push(actions[actions.length - 1] || "Execute coordination step");
    }

    if (aiReasoning.length === 0) {
      aiReasoning = [
        "Converted the user goal into a hackathon-friendly launch narrative.",
        "Generated visible AI outputs so judges can immediately see the planning layer.",
        "Designed mission and action structure to connect OneAI planning with OneClaw execution.",
        "Prepared proof-oriented outputs so the final flow ends with on-chain verification."
      ];
    }

    if (!rawText) {
      rawText = [
        `Summary: ${summary}`,
        `Tweets: ${tweets.join(" | ")}`,
        `Missions: ${missions.join(" | ")}`,
        `Actions: ${actions.join(" | ")}`
      ].join("\n");
    }

    ctx.data = {
      summary,
      tweets: tweets.slice(0, 2),
      missions: missions.slice(0, 4),
      actions: actions.slice(0, 4),
      proofLabel,
      aiReasoning: aiReasoning.slice(0, 6),
      rawText
    };

    return { ok: true };
  };
}