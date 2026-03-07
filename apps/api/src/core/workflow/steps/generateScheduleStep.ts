import type { WorkflowContext, WorkflowStep } from "../types.js";

export function generateScheduleStep<TInput, TData>(): WorkflowStep<
  WorkflowContext<TInput, any>
> {
  return async (ctx) => {
    const hooks = ctx.data?.hooks ?? [];
    const tweets = ctx.data?.tweets ?? [];

    ctx.data.schedule = [
      {
        day: 1,
        content_type: "hook",
        description: hooks[0] ?? "Post best hook"
      },
      {
        day: 2,
        content_type: "thread",
        description: "Publish thread expanding the hook"
      },
      {
        day: 3,
        content_type: "tweet",
        description: tweets[0] ?? "Follow-up insight"
      },
      {
        day: 4,
        content_type: "engagement",
        description: "Reply to comments and start conversations"
      }
    ];

    return { ok: true };
  };
}