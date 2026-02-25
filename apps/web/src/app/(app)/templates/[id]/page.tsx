// apps/web/src/app/(app)/templates/[id]/page.tsx
"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { templates } from "@/lib/data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

function pill(label: string) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/10 bg-white/60 px-2.5 py-1 text-xs text-black/60">
      {label}
    </span>
  );
}

export default function TemplateDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const t = useMemo(
    () => templates.find((x) => x.id === params?.id),
    [params?.id]
  );

  if (!t) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white/60 p-6 text-sm text-black/60">
        <div className="text-base font-semibold text-black">Template not found</div>
        <div className="mt-1">
          The template id <span className="font-mono">{String(params?.id)}</span>{" "}
          doesn’t exist.
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => router.push("/templates")}
          >
            Back to Templates
          </Button>
          <Button
            variant="ghost"
            className="border border-black/10 bg-white/60 hover:bg-white"
            onClick={() => router.back()}
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const payload = `Template: ${t.title}
Mode: ${t.mode}
Category: ${t.category}

Description:
${t.description}

Required fields:
- ${t.fields.join("\n- ")}

Seed prompt:
${t.seedPrompt}
`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{t.category}</Badge>
            {pill(String(t.mode).toUpperCase())}
            {pill(`${t.fields.length} fields`)}
          </div>

          <h1 className="mt-3 truncate text-2xl font-extrabold tracking-tight text-black">
            {t.title}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-black/55">
            {t.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/studio?mode=${t.mode}`}>
            <Button>Use in Studio</Button>
          </Link>

          <Button
            variant="ghost"
            className="border border-black/10 bg-white/60 hover:bg-white"
            onClick={async () => {
              await navigator.clipboard.writeText(payload);
            }}
          >
            Copy template
          </Button>

          <Link href="/templates">
            <Button variant="secondary">Back</Button>
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="grid gap-4 md:grid-cols-12">
        {/* Left: meta */}
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Spec</CardTitle>
            <CardDescription>What this template expects and how to use it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
              <div className="text-xs font-semibold text-black/60">Mode</div>
              <div className="mt-1 text-sm font-semibold text-black">
                {String(t.mode).toUpperCase()}
              </div>
              <div className="mt-2 text-xs text-black/55">
                Open Studio with this mode preselected.
              </div>
              <div className="mt-3">
                <Link href={`/studio?mode=${t.mode}`}>
                  <Button size="sm">Open Studio</Button>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
              <div className="text-xs font-semibold text-black/60">
                Required fields
              </div>
              <ul className="mt-2 space-y-2 text-sm text-black/70">
                {t.fields.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border border-black/10 bg-white text-xs text-black/60">
                      ✓
                    </span>
                    <span className="leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/60 p-4 text-xs text-black/55">
              Tip: keep the seed prompt short and structured — it’s designed to be
              reused across projects.
            </div>
          </CardContent>
        </Card>

        {/* Right: seed */}
        <Card className="md:col-span-8">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle>Seed Prompt</CardTitle>
                <CardDescription>
                  Copy this into Studio constraints, then fill fields.
                </CardDescription>
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="border border-black/10 bg-white/60 hover:bg-white"
                onClick={async () => {
                  await navigator.clipboard.writeText(t.seedPrompt);
                }}
              >
                Copy seed
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-black/80">
                {t.seedPrompt}
              </pre>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={`/studio?mode=${t.mode}`}>
                <Button>Use in Studio</Button>
              </Link>

              <Link href="/templates">
                <Button variant="secondary">Back to list</Button>
              </Link>

              <Button
                variant="ghost"
                className="border border-black/10 bg-white/60 hover:bg-white"
                onClick={async () => {
                  await navigator.clipboard.writeText(payload);
                }}
              >
                Copy all
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}