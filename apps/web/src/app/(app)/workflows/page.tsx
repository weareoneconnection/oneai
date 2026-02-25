// apps/web/src/app/(app)/workflows/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { workflows } from "@/lib/data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";

function countSteps(w: any) {
  const steps =
    w?.steps?.length ??
    w?.chain?.length ??
    w?.actions?.length ??
    w?.nodes?.length ??
    w?.stages?.length ??
    0;
  return Number.isFinite(steps) ? steps : 0;
}

export default function WorkflowsPage() {
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = workflows || [];
    const filtered = !query
      ? list
      : list.filter((w: any) => {
          const hay = `${w?.title ?? ""} ${w?.description ?? ""}`.toLowerCase();
          return hay.includes(query);
        });

    // sort: more steps first, then title
    return [...filtered].sort((a: any, b: any) => {
      const da = countSteps(a);
      const db = countSteps(b);
      if (db !== da) return db - da;
      return String(a?.title ?? "").localeCompare(String(b?.title ?? ""));
    });
  }, [q]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Workflows</Badge>
            <Badge >Repeatable execution</Badge>
            <Badge >{items.length} workflows</Badge>
          </div>

          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-black">
            Workflows
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-black/55">
            Turn generation into repeatable execution loops — templates, chains,
            publishing, and metrics.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="w-full sm:w-72">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search workflows…"
            />
          </div>
          <Link href="/studio">
            <Button>Open Studio</Button>
          </Link>
        </div>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 text-sm text-black/60">
          No workflows match <span className="font-mono">{q}</span>.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((w: any) => {
            const steps = countSteps(w);

            return (
              <Card key={w.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{w.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {w.description}
                      </CardDescription>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge >
                        {steps > 0 ? `${steps} steps` : "workflow"}
                      </Badge>
                      {w?.category ? <Badge>{w.category}</Badge> : null}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Lightweight “capabilities” row */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-black/10 bg-white/60 px-2.5 py-1 text-black/60">
                      Trigger → Steps → Output
                    </span>
                    <span className="rounded-full border border-black/10 bg-white/60 px-2.5 py-1 text-black/60">
                      Reusable & auditable
                    </span>
                    <span className="rounded-full border border-black/10 bg-white/60 px-2.5 py-1 text-black/60">
                      Project voice
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/workflows/${w.id}`}>
                      <Button>Open</Button>
                    </Link>

                    <Link href={`/studio?mode=${w?.mode ?? "tweet"}`}>
                      <Button
                        variant="ghost"
                        className="border border-black/10 bg-white/60 hover:bg-white"
                      >
                        Use in Studio
                      </Button>
                    </Link>

                    <Button
                      variant="secondary"
                      onClick={async () => {
                        const payload = `Workflow: ${w.title}
${w.description ?? ""}

ID: ${w.id}
Steps: ${steps}
`;
                        await navigator.clipboard.writeText(payload);
                      }}
                    >
                      Copy info
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}