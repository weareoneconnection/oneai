"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type BillingData = {
  plan: "free" | "pro" | "team" | string;
  status: "active" | "trialing" | "past_due" | "canceled" | "inactive" | string;
  currentPeriodEnd?: string | null;
};

type Notice = { type: "success" | "warn" | "error"; text: string };

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
}

function PlanBadge({ plan }: { plan: BillingData["plan"] }) {
  const label =
    plan === "pro" ? "Pro" : plan === "team" ? "Team" : plan === "free" ? "Free" : String(plan || "Free");

  const klass =
    plan === "pro"
      ? "bg-black text-white"
      : plan === "team"
      ? "bg-white text-black border border-black/10"
      : "bg-black/5 text-black/70 border border-black/10";

  return <span className={cx("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", klass)}>{label}</span>;
}

function StatusBadge({ status }: { status: BillingData["status"] }) {
  const s = (status || "inactive").toLowerCase();

  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Active", cls: "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20" },
    trialing: { label: "Trial", cls: "bg-amber-500/10 text-amber-700 border border-amber-500/20" },
    past_due: { label: "Past due", cls: "bg-red-500/10 text-red-700 border border-red-500/20" },
    canceled: { label: "Canceled", cls: "bg-black/5 text-black/60 border border-black/10" },
    inactive: { label: "Inactive", cls: "bg-black/5 text-black/60 border border-black/10" },
  };

  const pick = map[s] || { label: String(status || "Inactive"), cls: "bg-black/5 text-black/60 border border-black/10" };

  return (
    <span className={cx("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", pick.cls)}>
      {pick.label}
    </span>
  );
}

function NoticeBar({ notice, onClose }: { notice: Notice; onClose?: () => void }) {
  const cls =
    notice.type === "success"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-800"
      : notice.type === "warn"
      ? "border-amber-500/20 bg-amber-500/10 text-amber-900"
      : "border-red-500/20 bg-red-500/10 text-red-900";

  return (
    <div className={cx("flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm", cls)}>
      <div className="leading-relaxed">{notice.text}</div>
      {onClose ? (
        <button
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xs font-semibold opacity-70 hover:opacity-100"
          aria-label="Close"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"pro" | "team" | "portal" | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const pricePro = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO;
  const priceTeam = process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM;

  const plan = data?.plan ?? "free";
  const status = data?.status ?? "inactive";

  const canPortal = plan !== "free" && status !== "inactive";

  const periodEnd = useMemo(() => {
    if (!data?.currentPeriodEnd) return null;
    return formatDate(data.currentPeriodEnd);
  }, [data?.currentPeriodEnd]);

  // 读订阅状态 + URL 提示
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success")) setNotice({ type: "success", text: "✅ Subscription updated successfully." });
    if (params.get("canceled")) setNotice({ type: "warn", text: "⚠️ Checkout canceled." });

    const load = async () => {
      try {
        const r = await fetch("/api/billing/status", { cache: "no-store" });
        const j = await r.json();
        if (j?.success && j?.data) setData(j.data);
      } catch (e: any) {
        setNotice({ type: "error", text: e?.message || "Failed to load billing status." });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const checkout = async (tier: "pro" | "team") => {
    const priceId = tier === "pro" ? pricePro : priceTeam;
    if (!priceId) {
      setNotice({
        type: "error",
        text: `Missing env: NEXT_PUBLIC_STRIPE_PRICE_${tier.toUpperCase()}. Set it in .env.local and restart dev server.`,
      });
      return;
    }

    setBusy(tier);
    setNotice(null);

    try {
      const r = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const j = await r.json();
      if (!j?.data?.url) throw new Error(j?.message || "Checkout URL not returned");
      window.location.href = j.data.url;
    } catch (e: any) {
      setNotice({ type: "error", text: e?.message || "Checkout failed." });
      setBusy(null);
    }
  };

  const openPortal = async () => {
    if (!canPortal) {
      setNotice({ type: "warn", text: "Portal is available only for active paid subscriptions." });
      return;
    }

    setBusy("portal");
    setNotice(null);

    try {
      const r = await fetch("/api/billing/portal", { method: "POST" });
      const j = await r.json();
      if (!j?.data?.url) throw new Error(j?.message || "Portal URL not returned");
      window.location.href = j.data.url;
    } catch (e: any) {
      setNotice({ type: "error", text: e?.message || "Failed to open billing portal." });
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-black">Billing</h1>
          <p className="mt-1 text-sm text-black/60">Manage subscription, upgrade plan, and access invoices.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PlanBadge plan={plan} />
          <StatusBadge status={status} />
          {periodEnd ? (
            <span className="text-xs text-black/45">
              Renews / ends: <span className="font-semibold text-black/70">{periodEnd}</span>
            </span>
          ) : null}
        </div>
      </div>

      {notice ? <NoticeBar notice={notice} onClose={() => setNotice(null)} /> : null}

      {/* Current subscription */}
      <Card>
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
          <CardDescription>Real-time status from Stripe.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="rounded-2xl border border-black/10 bg-white/60 p-4 text-sm text-black/60">
              Loading billing status…
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
                <div className="text-xs font-semibold text-black/50">Plan</div>
                <div className="mt-2 flex items-center gap-2">
                  <PlanBadge plan={plan} />
                </div>
                <div className="mt-2 text-xs text-black/45">Used across console features & limits.</div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
                <div className="text-xs font-semibold text-black/50">Status</div>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={status} />
                </div>
                <div className="mt-2 text-xs text-black/45">Payment state and access.</div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
                <div className="text-xs font-semibold text-black/50">Billing Portal</div>
                <div className="mt-2">
                  <Button
                    variant="secondary"
                    onClick={openPortal}
                    disabled={busy === "portal" || !canPortal}
                    className="w-full"
                  >
                    {busy === "portal" ? "Opening…" : "Manage Billing"}
                  </Button>
                </div>
                <div className="mt-2 text-xs text-black/45">Invoices, payment method, cancel / resume.</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Plans</CardTitle>
            <CardDescription>Upgrade in one click. Pricing IDs are configured via env.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {/* Pro */}
            <div className="rounded-2xl border border-black/10 bg-white/60 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-black">Pro</div>
                  <div className="mt-1 text-xs text-black/50">For solo builders shipping fast.</div>
                </div>
                <span className="rounded-full border border-black/10 bg-black/5 px-3 py-1 text-xs font-semibold text-black/70">
                  Recommended
                </span>
              </div>

              <ul className="mt-4 space-y-2 text-sm text-black/70">
                <li className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-lg border border-black/10 bg-white text-xs">
                    ✓
                  </span>
                  Higher rate limits & priority
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-lg border border-black/10 bg-white text-xs">
                    ✓
                  </span>
                  Usage analytics + exports
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-lg border border-black/10 bg-white text-xs">
                    ✓
                  </span>
                  Project voice presets
                </li>
              </ul>

              <div className="mt-5 flex flex-col gap-2">
                <Button
                  onClick={() => checkout("pro")}
                  disabled={busy !== null || !pricePro}
                  className="w-full"
                >
                  {busy === "pro" ? "Redirecting…" : "Upgrade to Pro"}
                </Button>
                {!pricePro ? (
                  <div className="text-xs text-black/45">
                    Missing <span className="font-semibold">NEXT_PUBLIC_STRIPE_PRICE_PRO</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Team */}
            <div className="rounded-2xl border border-black/10 bg-white/60 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-black">Team</div>
                  <div className="mt-1 text-xs text-black/50">For small teams & shared billing.</div>
                </div>
                <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-black/70">
                  Multi-user
                </span>
              </div>

              <ul className="mt-4 space-y-2 text-sm text-black/70">
                <li className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-lg border border-black/10 bg-white text-xs">
                    ✓
                  </span>
                  Shared org usage & limits
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-lg border border-black/10 bg-white text-xs">
                    ✓
                  </span>
                  Key-level stats & audit
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-lg border border-black/10 bg-white text-xs">
                    ✓
                  </span>
                  Environment segmentation
                </li>
              </ul>

              <div className="mt-5 flex flex-col gap-2">
                <Button
                  variant="secondary"
                  onClick={() => checkout("team")}
                  disabled={busy !== null || !priceTeam}
                  className="w-full"
                >
                  {busy === "team" ? "Redirecting…" : "Upgrade to Team"}
                </Button>
                {!priceTeam ? (
                  <div className="text-xs text-black/45">
                    Missing <span className="font-semibold">NEXT_PUBLIC_STRIPE_PRICE_TEAM</span>
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes / Compliance */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Operational details for production.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-black/70">
            <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
              <div className="text-xs font-semibold text-black/50">Invoices</div>
              <div className="mt-2">
                Use <span className="font-semibold">Manage Billing</span> to download invoices and update payment method.
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
              <div className="text-xs font-semibold text-black/50">Webhook</div>
              <div className="mt-2">Ensure Stripe webhooks update your billing status endpoint for accuracy.</div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
              <div className="text-xs font-semibold text-black/50">Environment</div>
              <div className="mt-2">
                If this is dev, keep plan as <span className="font-semibold">free</span> and wire prices only on prod.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer hint */}
      <div className="text-xs text-black/45">
        Tip: keep pricing IDs in <span className="font-semibold">.env.local</span> and restart <span className="font-semibold">next dev</span> after changes.
      </div>
    </div>
  );
}