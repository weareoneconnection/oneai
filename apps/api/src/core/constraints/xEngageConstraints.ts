type ConstraintResult = {
  ok: boolean;
  errors: string[];
};

type CandidateTweet = {
  tweetId: string;
  authorId?: string;
  text?: string;
  createdAt?: string;
  conversationId?: string;
  referencedTweets?: Array<{
    type?: string;
    id?: string;
  }>;
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

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function isRootCandidate(tweet: CandidateTweet): boolean {
  const tweetId = asString(tweet.tweetId);
  const conversationId = asString(tweet.conversationId);
  return Boolean(tweetId) && Boolean(conversationId) && tweetId === conversationId;
}

function isReplyLikeCandidate(tweet: CandidateTweet): boolean {
  return Boolean(
    tweet.referencedTweets?.some((item) => asString(item?.type) === "replied_to"),
  );
}

function hasOpenReplySignal(tweet: CandidateTweet): boolean {
  const text = normalizeWhitespace(asString(tweet.text));
  const lowered = text.toLowerCase();

  if (
    lowered.includes("what do you think") ||
    lowered.includes("how do you think") ||
    lowered.includes("share your") ||
    lowered.includes("drop below") ||
    lowered.includes("reply below") ||
    lowered.includes("comment below") ||
    lowered.includes("builders") ||
    lowered.includes("thread") ||
    lowered.includes("thoughts?") ||
    lowered.includes("agree?") ||
    lowered.includes("disagree?")
  ) {
    return true;
  }

  if (text.includes("?")) return true;

  return false;
}

function looksRestrictedOrLowProbability(tweet: CandidateTweet): boolean {
  const text = normalizeWhitespace(asString(tweet.text));
  const lowered = text.toLowerCase();

  if (!text || text.length < 35) return true;
  if (!isRootCandidate(tweet)) return true;
  if (isReplyLikeCandidate(tweet)) return true;

  if (
    lowered.includes("introducing") ||
    lowered.includes("we are launching") ||
    lowered.includes("our product") ||
    lowered.includes("we're rolling out") ||
    lowered.includes("officially launching") ||
    lowered.includes("now live") ||
    lowered.includes("giveaway") ||
    lowered.includes("airdrop") ||
    lowered.includes("whitelist") ||
    lowered.includes("dm me") ||
    lowered.includes("follow me") ||
    lowered.includes("100x")
  ) {
    return true;
  }

  return false;
}

function isReplyLikelyAllowed(
  replyToTweetId: string,
  candidateTweets: CandidateTweet[],
): boolean {
  const tweet = candidateTweets.find((item) => asString(item.tweetId) === replyToTweetId);
  if (!tweet) return false;
  if (looksRestrictedOrLowProbability(tweet)) return false;
  if (!hasOpenReplySignal(tweet)) return false;
  return true;
}

export function checkXEngageConstraints(
  data: unknown,
  candidateTweets: CandidateTweet[] = [],
): ConstraintResult {
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

  if (steps.length > 2) {
    errors.push("oneclawTask.steps must contain at most 2 steps");
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
    } else if (!isReplyLikelyAllowed(replyToTweetId, candidateTweets)) {
      errors.push(`step[${i}] reply target is low-probability or likely restricted`);
    }
  }

  return { ok: errors.length === 0, errors };
}