import type { WorkflowContext, WorkflowStep } from "../types.js";

type HasTopicLike = {
  topic?: string;
  instruction?: string;
};

export function generateReplyStrategyStep<TInput, TData>(): WorkflowStep<
  WorkflowContext<TInput, any>
> {
  return async (ctx) => {
    // ✅ TS-safe: 不要求 TInput 一定有 topic
    const input = (ctx.input ?? {}) as unknown as HasTopicLike;
    const topic = (input.topic ?? input.instruction ?? "your topic").trim();

    ctx.data.reply_strategy = [
      `Ask a sharp question about ${topic}`,
      "Challenge a common assumption (politely).",
      "Add one practical step people can try today.",
      "Share a short personal insight (1 sentence).",
      "Invite others to reply with their experience."
    ];

    return { ok: true };
  };
}