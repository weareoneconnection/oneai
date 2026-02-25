"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

type ApiKeyRow = {
  id: string;
  name: string | null;
  prefix: string;
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
};

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

export default function KeysPage() {
  const [rows, setRows] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newName, setNewName] = useState("default");
  const [newKeyPlain, setNewKeyPlain] = useState<string | null>(null);
  const [toast, setToast] = useState<string>("");

  const activeRows = useMemo(() => rows.filter((r) => !r.revokedAt), [rows]);
  const revokedRows = useMemo(() => rows.filter((r) => !!r.revokedAt), [rows]);

  async function load() {
    setLoading(true);
    setToast("");
    try {
      const r = await fetch("/api/keys", { method: "GET", cache: "no-store" });
      const text = await r.text();
      const j = text ? JSON.parse(text) : null;

      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      if (j?.success) setRows(j.data || []);
      else throw new Error(j?.error || "Failed to load keys");
    } catch (e: any) {
      setToast(e?.message || "Failed to load keys");
    } finally {
      setLoading(false);
    }
  }

  async function createKey() {
    if (!newName.trim()) {
      setToast("Key name is required.");
      return;
    }
    setCreating(true);
    setNewKeyPlain(null);
    setToast("");
    try {
      const r = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      const text = await r.text();
      const j = text ? JSON.parse(text) : null;

      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      if (!j?.success) throw new Error(j?.error || "Failed to create key");

      setNewKeyPlain(j?.data?.plainKey || null);
      setToast("Key created. Copy it now — it will be shown only once.");
      await load();
    } catch (e: any) {
      setToast(e?.message || "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    const ok = window.confirm("Revoke this key? This cannot be undone.");
    if (!ok) return;

    setToast("");
    try {
      const r = await fetch("/api/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const text = await r.text();
      const j = text ? JSON.parse(text) : null;

      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      if (!j?.success) throw new Error(j?.error || "Failed to revoke key");

      setToast("Key revoked.");
      await load();
    } catch (e: any) {
      setToast(e?.message || "Failed to revoke key");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Console</Badge>
            <Badge>Keys</Badge>
            <span className="text-xs text-black/45">Use via header: <b className="text-black">x-api-key</b></span>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold text-black">API Keys</h1>
          <p className="mt-1 text-sm text-black/55">
            Create, rotate, revoke keys. Plaintext key is shown only once.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={load} disabled={loading} className="whitespace-nowrap">
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Active keys" value={`${activeRows.length}`} sub="Not revoked" />
        <Stat label="Revoked keys" value={`${revokedRows.length}`} sub="Disabled permanently" />
        <Stat label="Total keys" value={`${rows.length}`} sub="Across environments" />
      </div>

      {/* Create */}
      <Card>
        <CardHeader>
          <CardTitle>Create key</CardTitle>
          <CardDescription>Name it by environment / service (e.g. prod_web, dev_cli, batch_worker).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {toast ? (
            <div className="rounded-2xl border border-black/10 bg-white/60 p-3 text-sm text-black/70">
              {toast}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <div className="mb-1 text-xs text-black/50">Key name</div>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="default / prod_web / dev_cli ..."
              />
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={createKey} disabled={creating} className="w-full">
                {creating ? "Creating..." : "Create key"}
              </Button>
            </div>
          </div>

          {newKeyPlain ? (
            <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-black">New key (copy now)</div>
                  <div className="text-xs text-black/45">This value will not be shown again.</div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(newKeyPlain);
                    setToast("Copied to clipboard.");
                  }}
                >
                  Copy
                </Button>
              </div>

              <div className="mt-3 rounded-xl border border-black/10 bg-white p-3">
                <code className="break-all text-sm text-black/80">{newKeyPlain}</code>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Keys</CardTitle>
          <CardDescription>Manage access and track last usage.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/60">
            <div className="grid grid-cols-12 gap-2 bg-black/5 px-3 py-2 text-xs font-semibold text-black/60">
              <div className="col-span-4">Name</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Prefix</div>
              <div className="col-span-2">Created</div>
              <div className="col-span-2">Last used</div>
            </div>

            {rows.length === 0 ? (
              <div className="p-4 text-sm text-black/55">No keys yet. Create one above.</div>
            ) : (
              rows.map((r) => {
                const revoked = !!r.revokedAt;
                return (
                  <div
                    key={r.id}
                    className={[
                      "grid grid-cols-12 gap-2 px-3 py-3 text-sm",
                      "border-t border-black/10",
                      revoked ? "opacity-60" : "",
                    ].join(" ")}
                  >
                    <div className="col-span-4">
                      <div className="font-medium text-black">{r.name || "(no name)"}</div>
                      <div className="text-xs text-black/45">id: {r.id}</div>
                    </div>

                    <div className="col-span-2 flex items-center">
                      {revoked ? (
                        <span className="inline-flex items-center rounded-full bg-black/10 px-2 py-0.5 text-xs font-medium text-black">
                          Revoked
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-black px-2 py-0.5 text-xs font-medium text-white">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="col-span-2 flex items-center">
                      <code className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs text-black/75">
                        {r.prefix}
                      </code>
                    </div>

                    <div className="col-span-2 flex items-center text-black/70">{fmtTime(r.createdAt)}</div>
                    <div className="col-span-2 flex items-center justify-between gap-2">
                      <span className="text-black/70">{fmtTime(r.lastUsedAt)}</span>
                      {!revoked ? (
                        <Button variant="secondary" size="sm" onClick={() => revoke(r.id)}>
                          Revoke
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-3 text-xs text-black/45">
            Tip: name keys by <b>env + app</b> to enable key-level analytics later (prod_web / prod_api / dev_cli).
          </div>
        </CardContent>
      </Card>
    </div>
  );
}