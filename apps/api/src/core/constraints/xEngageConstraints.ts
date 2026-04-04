type ConstraintResult = {
  ok: boolean;
  errors: string[];
};

function asString(value: unknown): string {
  return String(value ?? "").trim();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNumericTweetId(value: string): boolean {
  return /^[0-9]{1,19}$/.test(value);
}

export function checkXEngageConstraints(data: unknown): ConstraintResult {
  const errors: string[] = [];

  if (!isObject(data)) {
    return { ok: false, errors: ["root must be an object"] };
  }

  const reply = asString(data.reply);
  const shouldExecute = Boolean(data.shouldExecute);
  const posture = asString(data.posture);
  const oneclawTask = data.oneclawTask;

  if (!reply) {
    errors.push("reply is required");
  }

  if (!["growth", "proof", "quiet"].includes(posture)) {
    errors.push("posture must be one of: growth, proof, quiet");
  }

  if (!shouldExecute) {
    if (oneclawTask !== null) {
      errors.push("if shouldExecute=false, oneclawTask must be null");
    }
    return { ok: errors.length === 0, errors };
  }

  if (!isObject(oneclawTask)) {
    errors.push("if shouldExecute=true, oneclawTask must be an object");
    return { ok: false, errors };
  }

  const taskName = asString(oneclawTask.taskName);
  const steps = Array.isArray(oneclawTask.steps) ? oneclawTask.steps : [];

  if (!taskName) {
    errors.push("oneclawTask.taskName is required");
  }

  if (steps.length < 1) {
    errors.push("oneclawTask.steps must contain at least one step");
    return { ok: false, errors };
  }

  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    if (!isObject(step)) {
      errors.push(`step[${i}] must be an object`);
      continue;
    }

    const action = asString(step.action);
    if (action !== "social.post") {
      errors.push(`step[${i}].action must be social.post`);
    }

    if (!isObject(step.input)) {
      errors.push(`step[${i}].input must be an object`);
      continue;
    }

    const content = asString(step.input.content);
    const replyToTweetId = asString(step.input.replyToTweetId);

    if (!content) {
      errors.push(`step[${i}].input.content is required`);
    }

    if (!replyToTweetId) {
      errors.push(`step[${i}].input.replyToTweetId is required for engage workflow`);
    } else if (!isNumericTweetId(replyToTweetId)) {
      errors.push(`step[${i}].input.replyToTweetId must be a numeric tweet id`);
    }
  }

  return { ok: errors.length === 0, errors };
}