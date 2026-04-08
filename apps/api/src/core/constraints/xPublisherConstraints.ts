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
export function checkXPublisherConstraints(data: unknown): ConstraintResult {
  const errors: string[] = [];

  if (!isObject(data)) {
    return {
      ok: false,
      errors: ["root must be an object"],
    };
  }

  const reply = asString(data.reply);
  const shouldExecute = Boolean(data.shouldExecute);
  const posture = asString(data.posture);
  const oneclawTask = data.oneclawTask;

  if (!reply) {
    errors.push("reply is required");
  }

  if (!["launch", "growth", "proof", "quiet"].includes(posture)) {
    errors.push("posture must be one of: launch, growth, proof, quiet");
  }

  if (!shouldExecute) {
    if (oneclawTask !== null) {
      errors.push("if shouldExecute=false, oneclawTask must be null");
    }

    return {
      ok: errors.length === 0,
      errors,
    };
  }

  if (!isObject(oneclawTask)) {
    errors.push("if shouldExecute=true, oneclawTask must be an object");
    return {
      ok: false,
      errors,
    };
  }

  const taskName = asString(oneclawTask.taskName);
  const steps = Array.isArray(oneclawTask.steps) ? oneclawTask.steps : [];

  if (!taskName) {
    errors.push("oneclawTask.taskName is required");
  }

  if (steps.length < 1) {
    errors.push("oneclawTask.steps must contain at least one step");
    return {
      ok: false,
      errors,
    };
  }

  // 🔥 限制：最多2个 step（更干净）
  if (steps.length > 2) {
    errors.push("xPublisher should not generate more than 2 steps");
  }

  let mainPostCount = 0;

  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];

    if (!isObject(step)) {
      errors.push(`step[${i}] must be an object`);
      continue;
    }

    const stepId = asString(step.id);
    const action = asString(step.action);
    const input = step.input;
    const dependsOn = Array.isArray(step.dependsOn) ? step.dependsOn : [];

    if (!stepId) {
      errors.push(`step[${i}].id is required`);
    }

    if (action !== "social.post") {
      errors.push(`step[${i}].action must be social.post`);
    }

    if (!isObject(input)) {
      errors.push(`step[${i}].input must be an object`);
      continue;
    }

    const content = asString(input.content);
    const replyToTweetId = asString(input.replyToTweetId);
    const mediaPaths = Array.isArray(input.mediaPaths) ? input.mediaPaths : [];

    if (!content) {
      errors.push(`step[${i}].input.content is required`);
      continue;
    }

    // 🔥🔥🔥 关键升级：内容质量过滤
    const lowered = content.toLowerCase();

    if (content.length < 20) {
      errors.push(`step[${i}] content too short (low value)`);
    }

    if (content.length > 280) {
      errors.push(`step[${i}] content exceeds X limit`);
    }

    // 🚫 AI废话过滤
    if (
      lowered.includes("the future is here") ||
      lowered.includes("ai is changing everything") ||
      lowered.includes("exciting times ahead") ||
      lowered.includes("we are building the future")
    ) {
      errors.push(`step[${i}] content is generic/low-signal`);
    }

    // 🚫 太泛
    if (
      lowered.includes("everything") &&
      lowered.includes("ai")
    ) {
      errors.push(`step[${i}] content too vague`);
    }

    // 🚫 过多emoji
    const emojiCount = (content.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length;
    if (emojiCount > 2) {
      errors.push(`step[${i}] too many emojis`);
    }

    if (replyToTweetId) {
      if (!isNumericTweetId(replyToTweetId)) {
        errors.push(
          `step[${i}].input.replyToTweetId must be numeric`
        );
      }

      if (dependsOn.length === 0) {
        errors.push(
          `step[${i}] reply step should include dependsOn`
        );
      }
    } else {
      mainPostCount += 1;
    }

    if (mediaPaths.length > 0) {
      for (let j = 0; j < mediaPaths.length; j += 1) {
        const mediaPath = asString(mediaPaths[j]);
        if (!mediaPath) {
          errors.push(`step[${i}].input.mediaPaths[${j}] invalid`);
        }
      }
    }
  }

  // 🔥 只允许1个主帖（关键）
  if (mainPostCount > 1) {
    errors.push("only 1 main post allowed");
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}