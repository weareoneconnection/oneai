import OpenAI from "openai";

console.log("🔥 OPENAI CLIENT FILE LOADED");

let client: OpenAI | null = null;
let cachedKey: string | null = null;

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  console.log("🔥 getOpenAIClient CALLED", {
    hasOpenAIKey: !!apiKey,
    keyPrefix: apiKey?.slice(0, 10),
    keySuffix: apiKey?.slice(-6),
    cachedKeyPrefix: cachedKey?.slice(0, 10),
    cachedKeySuffix: cachedKey?.slice(-6),
  });

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  if (!client || cachedKey !== apiKey) {
    console.log("🔥 INITIALIZING OPENAI CLIENT", {
      keyPrefix: apiKey.slice(0, 10),
      keySuffix: apiKey.slice(-6),
    });

    client = new OpenAI({ apiKey });
    cachedKey = apiKey;
  }

  return client;
}