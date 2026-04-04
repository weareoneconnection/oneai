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

  if (steps.length > 5) {
    errors.push("xPublisher should not generate more than 5 steps");
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
    }

    if (replyToTweetId) {
      if (!isNumericTweetId(replyToTweetId)) {
        errors.push(
          `step[${i}].input.replyToTweetId must be a numeric tweet id`,
        );
      }

      if (dependsOn.length === 0) {
        errors.push(
          `step[${i}] reply step should include dependsOn for sequencing`,
        );
      }
    } else {
      mainPostCount += 1;
    }

    if (mediaPaths.length > 0) {
      for (let j = 0; j < mediaPaths.length; j += 1) {
        const mediaPath = asString(mediaPaths[j]);
        if (!mediaPath) {
          errors.push(`step[${i}].input.mediaPaths[${j}] must be non-empty`);
        }
      }
    }
  }

  if (mainPostCount > 3) {
    errors.push("xPublisher should not generate more than 3 non-reply posts");
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}