// src/core/workflow/priceWorkflow.ts
import { registerWorkflow } from "./registry.js";
import type { WorkflowContext } from "./types.js";
import type { WorkflowDefinition } from "./engine.js";

type PriceInput = {
  symbol?: string;
  message?: string;
  lang?: "en" | "zh" | "mixed";
};

type PriceData = {
  reply: string;
  suggestedAction: "/price";
};

type PriceCtx = WorkflowContext<PriceInput, PriceData> & {
  templateVersion: number;
};

function norm(s: unknown) {
  return String(s ?? "").trim();
}

function lower(s: unknown) {
  return norm(s).toLowerCase();
}

function formatUsd(n: number) {
  try {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: n >= 100 ? 0 : 2,
      maximumFractionDigits: n >= 100 ? 0 : 6,
    }).format(n);
  } catch {
    return String(n);
  }
}

function detectLang(input: PriceInput): "en" | "zh" | "mixed" {
  if (input.lang === "zh" || input.lang === "en" || input.lang === "mixed") {
    return input.lang;
  }

  const text = norm(input.message);
  const hasZh = /[\u4e00-\u9fff]/.test(text);
  const hasEn = /[a-zA-Z]/.test(text);

  if (hasZh && hasEn) return "mixed";
  if (hasZh) return "zh";
  return "en";
}

const SYMBOL_ALIASES: Record<string, string> = {
  // BTC
  btc: "btc",
  bitcoin: "btc",
  "比特币": "btc",

  // ETH
  eth: "eth",
  ethereum: "eth",
  "以太坊": "eth",

  // SOL
  sol: "sol",
  solana: "sol",

  // BNB
  bnb: "bnb",
  binancecoin: "bnb",
  "币安币": "bnb",

  // XRP
  xrp: "xrp",
  ripple: "xrp",

  // DOGE
  doge: "doge",
  dogecoin: "doge",
  "狗狗币": "doge",

  // ADA
  ada: "ada",
  cardano: "ada",

  // TON
  ton: "ton",
  "toncoin": "ton",

  // TRX
  trx: "trx",
  tron: "trx",

  // AVAX
  avax: "avax",
  avalanche: "avax",

  // LINK
  link: "link",
  chainlink: "link",

  // MATIC / POL
  matic: "matic",
  polygon: "matic",
  pol: "matic",

  // WAOC aliases, map if you later support it
  waoc: "waoc",
  "$waoc": "waoc",
};

const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  sol: "solana",
  bnb: "binancecoin",
  xrp: "ripple",
  doge: "dogecoin",
  ada: "cardano",
  ton: "the-open-network",
  trx: "tron",
  avax: "avalanche-2",
  link: "chainlink",
  matic: "matic-network",
  // waoc intentionally omitted until you have a verified mapping
};

function extractSymbol(input: PriceInput): string | undefined {
  const direct = lower(input.symbol);

  if (direct) {
    const cleanedDirect = direct.replace(/^\$/, "");
    if (SYMBOL_ALIASES[direct]) return SYMBOL_ALIASES[direct];
    if (SYMBOL_ALIASES[cleanedDirect]) return SYMBOL_ALIASES[cleanedDirect];
  }

  const msg = lower(input.message);

  if (!msg) return undefined;

  // 1) explicit $SYMBOL, e.g. $BTC
  const dollarMatch = msg.match(/\$([a-z]{2,10})\b/i)?.[1];
  if (dollarMatch) {
    const normalized = SYMBOL_ALIASES[dollarMatch];
    if (normalized) return normalized;
  }

  // 2) exact word-ish aliases, longer keys first to avoid partial collisions
  const aliasKeys = Object.keys(SYMBOL_ALIASES).sort((a, b) => b.length - a.length);
  for (const key of aliasKeys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // English-ish token boundary
    if (/^[a-z$0-9_-]+$/i.test(key)) {
      const re = new RegExp(`(^|[^a-z0-9_])${escaped}([^a-z0-9_]|$)`, "i");
      if (re.test(msg)) {
        return SYMBOL_ALIASES[key];
      }
    } else {
      // Chinese alias
      if (msg.includes(key)) {
        return SYMBOL_ALIASES[key];
      }
    }
  }

  return undefined;
}

function makeUnknownSymbolReply(lang: "en" | "zh" | "mixed") {
  if (lang === "zh") {
    return "我还没识别出你要查询的币种。\n可以直接发 BTC、ETH、SOL、XRP 或 比特币、以太坊。";
  }

  if (lang === "mixed") {
    return "I could not identify the token symbol.\n可以直接发 BTC、ETH、SOL、XRP 或 比特币、以太坊。";
  }

  return "I could not identify the token symbol.\nTry BTC, ETH, SOL, XRP, or a clearer token name.";
}

function makeUnsupportedSymbolReply(symbol: string, lang: "en" | "zh" | "mixed") {
  const upper = symbol.toUpperCase();

  if (lang === "zh") {
    return `${upper} 暂时还没有接入价格映射。\n可以先补充 CoinGecko symbol 映射。`;
  }

  if (lang === "mixed") {
    return `${upper} is not mapped yet.\n可以先补充 CoinGecko symbol 映射。`;
  }

  return `${upper} is not mapped yet.\nA CoinGecko symbol mapping can be added.`;
}

function makeSourceUnavailableReply(lang: "en" | "zh" | "mixed") {
  if (lang === "zh") {
    return "价格源暂时不可用。\n稍后再试会更稳。";
  }

  if (lang === "mixed") {
    return "The price source is temporarily unavailable.\n稍后再试会更稳。";
  }

  return "The price source is temporarily unavailable.\nTrying again later should be more reliable.";
}

function makePriceUnavailableReply(symbol: string, lang: "en" | "zh" | "mixed") {
  const upper = symbol.toUpperCase();

  if (lang === "zh") {
    return `${upper} 的价格暂时没有查到。\n可以稍后再试。`;
  }

  if (lang === "mixed") {
    return `${upper} price is not available right now.\n可以稍后再试。`;
  }

  return `${upper} price is not available right now.\nTrying again later may help.`;
}

function makeSuccessReply(args: {
  symbol: string;
  price: number;
  change?: number;
  lang: "en" | "zh" | "mixed";
}) {
  const { symbol, price, change, lang } = args;
  const upper = symbol.toUpperCase();
  const priceText = formatUsd(price);
  const changeText =
    typeof change === "number"
      ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`
      : "N/A";

  if (lang === "zh") {
    return `${upper} 价格：$${priceText}\n24h 变化：${changeText}\n来源：CoinGecko`;
  }

  if (lang === "mixed") {
    return `${upper} price: $${priceText}\n24h change: ${changeText}\nSource: CoinGecko`;
  }

  return `${upper} price: $${priceText}\n24h change: ${changeText}\nSource: CoinGecko`;
}

export const priceWorkflowDef: WorkflowDefinition<PriceCtx> = {
  name: "price_workflow",
  maxAttempts: 1,
  steps: [
    async (ctx: PriceCtx) => {
      const lang = detectLang(ctx.input);
      const symbol = extractSymbol(ctx.input);

      if (!symbol) {
        ctx.data = {
          reply: makeUnknownSymbolReply(lang),
          suggestedAction: "/price",
        };
        return { ok: true };
      }

      const coinId = SYMBOL_TO_COINGECKO_ID[symbol];

      if (!coinId) {
        ctx.data = {
          reply: makeUnsupportedSymbolReply(symbol, lang),
          suggestedAction: "/price",
        };
        return { ok: true };
      }

      try {
        const url =
          "https://api.coingecko.com/api/v3/simple/price" +
          `?ids=${encodeURIComponent(coinId)}` +
          "&vs_currencies=usd" +
          "&include_24hr_change=true";

        const res = await fetch(url, {
          headers: {
            accept: "application/json",
          },
        });

        if (!res.ok) {
          ctx.data = {
            reply: makeSourceUnavailableReply(lang),
            suggestedAction: "/price",
          };
          return { ok: true };
        }

        const json = (await res.json()) as Record<
          string,
          { usd?: number; usd_24h_change?: number }
        >;

        const row = json[coinId] || {};
        const price = row.usd;
        const change = row.usd_24h_change;

        if (typeof price !== "number") {
          ctx.data = {
            reply: makePriceUnavailableReply(symbol, lang),
            suggestedAction: "/price",
          };
          return { ok: true };
        }

        ctx.data = {
          reply: makeSuccessReply({
            symbol,
            price,
            change,
            lang,
          }),
          suggestedAction: "/price",
        };

        return { ok: true };
      } catch {
        ctx.data = {
          reply: makeSourceUnavailableReply(lang),
          suggestedAction: "/price",
        };
        return { ok: true };
      }
    },
  ],
};

registerWorkflow({
  task: "price_agent",
  def: priceWorkflowDef,
});