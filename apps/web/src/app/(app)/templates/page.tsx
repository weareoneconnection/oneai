// apps/web/src/app/(app)/templates/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { templates } from "@/lib/data";
import type { StudioMode } from "@/lib/data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type ModeFilter = "all" | StudioMode;

function pill(label: string) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/10 bg-white/60 px-2.5 py-1 text-xs text-black/60">
      {label}
    </span>
  );
}

export default function TemplatesPage() {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<ModeFilter>("all");
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of templates) set.add(t.category);
    return ["all", ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return templates.filter((t) => {
      const matchQ =
        !query ||
        t.title.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        String(t.category).toLowerCase().includes(query) ||
        String(t.mode).toLowerCase().includes(query);

      const matchMode = mode === "all" ? true : t.mode === mode;
      const matchCat = category === "all" ? true : t.category === category;

      return matchQ && matchMode && matchCat;
    });
  }, [q, mode, category]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-black">
            Templates
          </h1>
          <p className="mt-1 text-sm text-black/55">
            Reusable blueprints for tweets, missions, commands — consistent
            structure & project voice.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pill(`${filtered.length} results`)}
          {pill("spec-first")}
          {pill("reusable")}
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="space-y-3 p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-12 md:items-center">
            <div className="md:col-span-6">
              <div className="mb-1 text-xs font-medium text-black/60">
                Search
              </div>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search templates by title, mode, category..."
              />
            </div>

            <div className="md:col-span-3">
              <div className="mb-1 text-xs font-medium text-black/60">Mode</div>
              <Select
                value={mode}
                onChange={(e) => setMode(e.target.value as ModeFilter)}
              >
                <option value="all">All</option>
                <option value="tweet">Tweet</option>
                <option value="mission">Mission</option>
                <option value="command">Command</option>
                <option value="thread">Thread</option>
              </Select>
            </div>

            <div className="md:col-span-3">
              <div className="mb-1 text-xs font-medium text-black/60">
                Category
              </div>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? "All" : c}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              className="border border-black/10 bg-white/60 hover:bg-white"
              onClick={() => {
                setQ("");
                setMode("all");
                setCategory("all");
              }}
            >
              Reset
            </Button>

            <div className="text-xs text-black/50">
              Tip: pick a template → open Studio with the right mode.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate">{t.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {t.description}
                  </CardDescription>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge>{t.category}</Badge>
                  <span className="rounded-full border border-black/10 bg-white/60 px-2.5 py-1 text-xs font-medium text-black/60">
                    {String(t.mode).toUpperCase()}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Link href={`/templates/${t.id}`}>
                  <Button variant="secondary" size="sm">
                    View
                  </Button>
                </Link>

                {/* 你现在 Studio 在 (app)/studio */}
                <Link href={`/studio?mode=${t.mode}`}>
                  <Button size="sm">Use in Studio</Button>
                </Link>

                <Button
                  size="sm"
                  variant="ghost"
                  className="border border-black/10 bg-white/60 hover:bg-white"
                  onClick={async () => {
                    const payload = `Template: ${t.title}\nMode: ${t.mode}\nCategory: ${t.category}\n\nSeed:\n${t.seedPrompt}`;
                    await navigator.clipboard.writeText(payload);
                  }}
                >
                  Copy seed
                </Button>
              </div>

              <div className="rounded-xl border border-black/10 bg-white/60 p-3 text-xs text-black/60">
                <div className="font-semibold text-black/70">Seed Prompt</div>
                <div className="mt-1 line-clamp-3 whitespace-pre-wrap">
                  {t.seedPrompt}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 text-sm text-black/60">
          No templates found. Try another keyword or reset filters.
        </div>
      ) : null}
    </div>
  );
}