"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";

type UsageResp = {
  totalRequests: number;
  totalTokens: number;
  totalCostUSD: number;
  byModel: { model: string; requests: number; tokens: number; costUSD: number }[];
  recent: { id: string; type: string; model: string | null; tokens: number; costUSD: number; createdAt: string }[];
};

type RangeKey = "7d" | "30d" | "all";

function fmtNum(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}
function fmtUSD(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/60 p-4 shadow-sm backdrop-blur">
      <div className="text-xs text-black/55">{label}</div>
      <div className="mt-2 text-xl font-semibold text-black">{value}</div>
      {sub ? <div className="mt-1 text-xs text-black/45">{sub}</div> : null}
    </div>
  );
}

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export default function UsagePage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [data, setData] = useState<UsageResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const rangeLabel = useMemo(() => {
    if (range === "7d") return "Last 7 days";
    if (range === "30d") return "Last 30 days";
    return "All time";
  }, [range]);

  async function load(rng: RangeKey) {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`/api/usage?range=${rng}`, { cache: "no-store" });
      const j = await safeJson(res);

      if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      if (!j?.success) throw new Error(j?.error || "Failed to load usage");

      setData(j.data);
    } catch (e: any) {
      setErr(e?.message || "Failed to load usage");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const topModels = useMemo(() => {
    if (!data?.byModel?.length) return [];
    return [...data.byModel].sort((a, b) => b.costUSD - a.costUSD).slice(0, 6);
  }, [data?.byModel]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Console</Badge>
            <Badge>Usage</Badge>
            <span className="text-xs text-black/45">
              Range: <b className="text-black">{rangeLabel}</b>
            </span>
            {err ? <span className="text-xs text-red-600">Error: {err}</span> : null}
          </div>

          <h1 className="mt-3 text-2xl font-extrabold text-black">Usage</h1>
          <p className="mt-1 text-sm text-black/55">Requests, tokens, cost — by model, plus recent activity.</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={range} onChange={(e) => setRange(e.target.value as RangeKey)} className="min-w-[180px]">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All</option>
          </Select>

          <Button variant="secondary" onClick={() => load(range)} disabled={loading} className="whitespace-nowrap">
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Empty */}
      {!data ? (
        <Card>
          <CardContent className="p-6">
            <div className="rounded-2xl border border-black/10 bg-white/60 p-4 text-sm text-black/70">
              No data yet. Trigger a few requests via your API key, then refresh.
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI */}
          <div className="grid gap-3 md:grid-cols-3">
            <Stat label="Total requests" value={fmtNum(data.totalRequests)} />
            <Stat label="Total tokens" value={fmtNum(data.totalTokens)} />
            <Stat label="Estimated cost" value={fmtUSD(data.totalCostUSD)} sub="Aggregated from request logs" />
          </div>

          {/* By model */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <CardTitle>By model</CardTitle>
                  <CardDescription>Requests / tokens / cost per model</CardDescription>
                </div>

                {topModels.length ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-black/50">
                    <span>Top by cost:</span>
                    {topModels.map((m) => (
                      <span key={m.model} className="rounded-full border border-black/10 bg-white/60 px-2 py-0.5">
                        {m.model}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </CardHeader>

            <CardContent>
              <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/60">
                <div className="grid grid-cols-12 gap-2 bg-black/5 px-3 py-2 text-xs font-semibold text-black/60">
                  <div className="col-span-5">Model</div>
                  <div className="col-span-2 text-right">Requests</div>
                  <div className="col-span-3 text-right">Tokens</div>
                  <div className="col-span-2 text-right">Cost</div>
                </div>

                {data.byModel?.length ? (
                  data.byModel.map((m) => (
                    <div key={m.model} className="grid grid-cols-12 gap-2 border-t border-black/10 px-3 py-3 text-sm">
                      <div className="col-span-5">
                        <code className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs text-black/75">
                          {m.model}
                        </code>
                      </div>
                      <div className="col-span-2 text-right text-black/75">{fmtNum(m.requests)}</div>
                      <div className="col-span-3 text-right text-black/75">{fmtNum(m.tokens)}</div>
                      <div className="col-span-2 text-right font-semibold text-black">{fmtUSD(m.costUSD)}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-sm text-black/60">No model usage yet.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent */}
          <Card>
            <CardHeader>
              <CardTitle>Recent requests</CardTitle>
              <CardDescription>Latest calls recorded by the gateway</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/60">
                <div className="grid grid-cols-12 gap-2 bg-black/5 px-3 py-2 text-xs font-semibold text-black/60">
                  <div className="col-span-2">ID</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-3">Model</div>
                  <div className="col-span-2 text-right">Tokens</div>
                  <div className="col-span-3 text-right">Time</div>
                </div>

                {data.recent?.length ? (
                  data.recent.map((r) => (
                    <div key={r.id} className="grid grid-cols-12 gap-2 border-t border-black/10 px-3 py-3 text-sm">
                      <div className="col-span-2">
                        <code className="text-xs text-black/75">{r.id.slice(0, 8)}</code>
                      </div>
                      <div className="col-span-2 text-black/75">{r.type}</div>
                      <div className="col-span-3">
                        <code className="text-xs text-black/75">{r.model || "-"}</code>
                      </div>
                      <div className="col-span-2 text-right text-black/75">{fmtNum(r.tokens)}</div>
                      <div className="col-span-3 text-right text-black/55">{fmtTime(r.createdAt)}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-sm text-black/60">No recent requests.</div>
                )}
              </div>

              <div className="mt-3 text-xs text-black/45">
                Tip: later we can add env segmentation (prod/dev) and key-level grouping once those fields exist in logs.
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}