"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { workflows } from "@/lib/data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function WorkflowDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const w = useMemo(
    () => workflows.find((x) => x.id === params?.id),
    [params?.id]
  );

  if (!w) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white/60 p-6 text-sm text-black/60">
        <div className="text-base font-semibold text-black">
          Workflow not found
        </div>
        <div className="mt-2">
          The workflow id{" "}
          <span className="font-mono">{String(params?.id)}</span> does not exist.
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={() => router.push("/workflows")}>
            Back to Workflows
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

  const stepCount = w?.steps?.length ?? 0;

  const payload = `Workflow: ${w.title}

Description:
${w.description}

Steps:
${w.steps
  .map((s: any, i: number) => `${i + 1}. ${s.title}\n${s.detail}`)
  .join("\n\n")}
`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge>{stepCount} steps</Badge>
            <Badge>repeatable</Badge>
          </div>

          <h1 className="mt-3 truncate text-2xl font-extrabold tracking-tight text-black">
            {w.title}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-black/55">
            {w.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/studio">
            <Button>Use Studio</Button>
          </Link>

          <Button
            variant="ghost"
            className="border border-black/10 bg-white/60 hover:bg-white"
            onClick={async () => {
              await navigator.clipboard.writeText(payload);
            }}
          >
            Copy Workflow
          </Button>

          <Link href="/workflows">
            <Button variant="secondary">Back</Button>
          </Link>
        </div>
      </div>

      {/* Layout */}
      <div className="grid gap-4 md:grid-cols-12">
        {/* Left meta */}
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Workflow Info</CardTitle>
            <CardDescription>
              Execution chain & repeatable logic
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
              <div className="text-xs font-semibold text-black/60">
                Total Steps
              </div>
              <div className="mt-1 text-lg font-bold text-black">
                {stepCount}
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/60 p-4 text-xs text-black/55">
              Workflows allow you to turn generation into repeatable execution
              loops — structured, auditable, scalable.
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <Card className="md:col-span-8">
          <CardHeader>
            <CardTitle>Steps</CardTitle>
            <CardDescription>
              Trigger → Chain → Output
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {w.steps.map((s: any, idx: number) => (
              <div
                key={idx}
                className="rounded-2xl border border-black/10 bg-white/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-sm font-semibold text-black">
                      {idx + 1}
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-black">
                        {s.title}
                      </div>
                      <div className="mt-1 text-sm text-black/60">
                        {s.detail}
                      </div>
                    </div>
                  </div>

                  <Badge>Step</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}