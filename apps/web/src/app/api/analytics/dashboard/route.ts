// apps/web/src/app/api/analytics/dashboard/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  // TODO: 这里换成真实数据来源：
  // - Prisma（DB）
  // - Redis（统计缓存）
  // - ClickHouse / PostHog / etc
  // 先返回一个可用结构（你也可以先复制 mock，再逐步替换）

  const now = new Date();
  const toISO = now.toISOString();
  const fromISO = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();

  // 临时：先返回固定结构（你后续替换成真实）
  return NextResponse.json({
    range: { fromISO, toISO },
    kpis: {
      requests24h: 12482,
      tokens24h: 8100000,
      cost24hUSD: 31.2,
      activeKeys: 4,
      p95LatencyMs: 920,
      errorRatePct: 0.36,
    },
    timeseries24h: Array.from({ length: 24 }).map((_, i) => ({
      hour: `${String(i).padStart(2, "0")}:00`,
      requests: Math.floor(250 + Math.random() * 700),
      tokens: Math.floor(200000 + Math.random() * 600000),
      costUSD: Number((0.7 + Math.random() * 2.4).toFixed(2)),
    })),
    modelBreakdown: [
      { model: "gpt-4o", tokens: 2400000, requests: 4200, costUSD: 14.2 },
      { model: "gpt-4o-mini", tokens: 1800000, requests: 5200, costUSD: 7.8 },
      { model: "claude-3", tokens: 1200000, requests: 2200, costUSD: 6.1 },
      { model: "deepseek", tokens: 900000, requests: 882, costUSD: 3.1 },
    ],
    envSegmentation: [
      { env: "prod", requests: 9800, tokens: 6500000, costUSD: 26.8 },
      { env: "dev", requests: 2682, tokens: 1600000, costUSD: 4.4 },
    ],
    keyUsage: [
      { key: "prod_live_1", env: "prod", requests: 4200, tokens: 3400000, costUSD: 12.4, lastUsedISO: new Date(now.getTime() - 2 * 60 * 1000).toISOString() },
      { key: "prod_live_2", env: "prod", requests: 3800, tokens: 2100000, costUSD: 9.1, lastUsedISO: new Date(now.getTime() - 12 * 60 * 1000).toISOString() },
      { key: "dev_key_1", env: "dev", requests: 2200, tokens: 900000, costUSD: 2.1, lastUsedISO: new Date(now.getTime() - 6 * 3600 * 1000).toISOString() },
      { key: "dev_key_2", env: "dev", requests: 482, tokens: 700000, costUSD: 2.3, lastUsedISO: new Date(now.getTime() - 10 * 3600 * 1000).toISOString() },
    ],
    forecast7d: Array.from({ length: 7 }).map((_, i) => ({
      day: `D${i + 1}`,
      forecastCostUSD: Number((31.2 * (0.95 + i * 0.06)).toFixed(2)),
    })),
  });
}