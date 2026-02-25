"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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

export default function ProjectDetail() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();

  const p = useMemo(
    () => projects.find((x) => x.slug === params?.slug),
    [params?.slug]
  );

  if (!p) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white/60 p-6 text-sm text-black/60">
        <div className="text-base font-semibold text-black">
          Project not found
        </div>
        <div className="mt-2 font-mono text-xs">
          /projects/{String(params?.slug)}
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={() => router.push("/projects")}>
            Back to Projects
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

  const hasVoice = !!p?.voice;

  const copyPayload = `Project: ${p.name}
Slug: ${p.slug}
Tagline: ${p.tagline}
Language: ${p.defaults.language}
Tone: ${p.defaults.tone}
`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{p.slug}</Badge>
            <Badge>{p.defaults.tone}</Badge>
            <Badge>{p.defaults.language}</Badge>
          </div>

          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-black">
            {p.name}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-black/55">
            {p.tagline}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/studio?mode=tweet`}>
            <Button>Use in Studio</Button>
          </Link>

          <Button
            variant="ghost"
            className="border border-black/10 bg-white/60 hover:bg-white"
            onClick={async () => {
              await navigator.clipboard.writeText(copyPayload);
            }}
          >
            Copy Info
          </Button>

          <Link href="/projects">
            <Button variant="secondary">Back</Button>
          </Link>
        </div>
      </div>

      {/* Layout */}
      <div className="grid gap-4 md:grid-cols-12">
        {/* Left column */}
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Project Profile</CardTitle>
            <CardDescription>
              Core configuration for this space
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <InfoRow label="Slug" value={p.slug} mono />
            <InfoRow label="Default language" value={p.defaults.language} />
            <InfoRow label="Default tone" value={p.defaults.tone} />
            <InfoRow
              label="Voice preset"
              value={hasVoice ? "Enabled" : "None"}
            />
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="md:col-span-8 space-y-4">
          {/* Links */}
          <Card>
            <CardHeader>
              <CardTitle>Official Links</CardTitle>
              <CardDescription>
                External entry points & resources
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {p.links?.length === 0 ? (
                <div className="text-sm text-black/50">
                  No links configured.
                </div>
              ) : (
                p.links.map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-sm text-black/70 hover:bg-white"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-black">
                        {l.label}
                      </span>
                      <span className="text-xs text-black/45 truncate max-w-[50%]">
                        {l.url}
                      </span>
                    </div>
                  </a>
                ))
              )}
            </CardContent>
          </Card>

          {/* Voice */}
          <Card>
            <CardHeader>
              <CardTitle>Voice</CardTitle>
              <CardDescription>
                Key phrases & constraints applied in Studio
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-3">
              <VoiceBox
                title="Key Phrases"
                items={p.voice?.keyPhrases || []}
              />
              <VoiceBox title="Do" items={p.voice?.do || []} />
              <VoiceBox title="Don't" items={p.voice?.dont || []} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-black/55">{label}</span>
      <span
        className={`font-medium text-black ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function VoiceBox({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
      <div className="text-sm font-semibold text-black">{title}</div>

      {items.length === 0 ? (
        <div className="mt-2 text-sm text-black/45">
          No items configured.
        </div>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-black/60">
          {items.map((x) => (
            <li key={x} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-black/30" />
              <span>{x}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}