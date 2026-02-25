// apps/web/src/app/(app)/projects/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { projects } from "@/lib/data";
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
import { Select } from "@/components/ui/Select";

type ToneFilter = "all" | string;

function pill(label: string) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/10 bg-white/60 px-2.5 py-1 text-xs text-black/60">
      {label}
    </span>
  );
}

export default function ProjectsPage() {
  const [q, setQ] = useState("");
  const [tone, setTone] = useState<ToneFilter>("all");

  const tones = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) {
      const t = p?.defaults?.tone;
      if (t) set.add(String(t));
    }
    return ["all", ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return projects.filter((p: any) => {
      const hay = `${p?.name ?? ""} ${p?.tagline ?? ""} ${p?.slug ?? ""} ${p?.defaults?.tone ?? ""}`.toLowerCase();
      const matchQ = !query || hay.includes(query);
      const matchTone = tone === "all" ? true : String(p?.defaults?.tone) === tone;
      return matchQ && matchTone;
    });
  }, [q, tone]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Projects</Badge>
            <Badge>{filtered.length} spaces</Badge>
            {pill("voice presets")}
            {pill("defaults")}
          </div>

          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-black">
            Projects
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-black/55">
            Project spaces define voice, links, defaults, constraints — so your
            outputs stay consistent across Studio, Templates, and Workflows.
          </p>
        </div>

        {/* Controls */}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
          <div className="w-full sm:w-72">
            <div className="mb-1 text-xs font-medium text-black/60">Search</div>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name / slug / tagline..."
            />
          </div>

          <div className="w-full sm:w-48">
            <div className="mb-1 text-xs font-medium text-black/60">Tone</div>
            <Select value={tone} onChange={(e) => setTone(e.target.value)}>
              {tones.map((t) => (
                <option key={t} value={t}>
                  {t === "all" ? "All tones" : t}
                </option>
              ))}
            </Select>
          </div>

          <Button
            variant="ghost"
            className="border border-black/10 bg-white/60 hover:bg-white"
            onClick={() => {
              setQ("");
              setTone("all");
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Empty */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 text-sm text-black/60">
          No projects found. Try another keyword or reset filters.
        </div>
      ) : null}

      {/* Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((p: any) => {
          const projectTone = String(p?.defaults?.tone ?? "tone");
          const hasVoice = !!p?.voice;

          return (
            <Card key={p.slug} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{p.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {p.tagline}
                    </CardDescription>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge>{projectTone}</Badge>
                      <span className="rounded-full border border-black/10 bg-white/60 px-2.5 py-1 text-xs text-black/60">
                        /projects/{p.slug}
                      </span>
                      <span className="rounded-full border border-black/10 bg-white/60 px-2.5 py-1 text-xs text-black/60">
                        voice: {hasVoice ? "enabled" : "none"}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-xs font-medium text-black/50">
                      Defaults
                    </div>
                    <div className="mt-1 text-xs text-black/55">
                      tone · constraints · links
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Preview / meta block */}
                <div className="rounded-2xl border border-black/10 bg-white/60 p-4 text-sm text-black/60">
                  <div className="text-xs font-semibold text-black/60">
                    Quick profile
                  </div>
                  <div className="mt-2 grid gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <span>Default tone</span>
                      <span className="font-semibold text-black/70">
                        {projectTone}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Slug</span>
                      <span className="font-mono text-black/65">{p.slug}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Voice preset</span>
                      <span className="font-semibold text-black/70">
                        {hasVoice ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-wrap gap-2">
                  <Link href={`/projects/${p.slug}`}>
                    <Button>Open Project</Button>
                  </Link>

                  <Link href={`/studio?mode=tweet`}>
                    <Button variant="secondary">Use in Studio</Button>
                  </Link>

                  <Button
                    variant="ghost"
                    className="border border-black/10 bg-white/60 hover:bg-white"
                    onClick={async () => {
                      const payload = `Project: ${p.name}
Slug: ${p.slug}
Tagline: ${p.tagline}
Default tone: ${projectTone}
Voice preset: ${hasVoice ? "enabled" : "none"}
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
    </div>
  );
}