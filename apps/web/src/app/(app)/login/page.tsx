"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

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

function FeatureCard(props: {
  title: string;
  desc: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/60 p-4 shadow-sm backdrop-blur">
      <div className="text-sm font-semibold text-black">{props.title}</div>
      <div className="mt-1 text-xs text-black/55">{props.desc}</div>
      <ul className="mt-3 space-y-2 text-sm text-black/70">
        {props.bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-black/30" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniStat(props: { k: string; v: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/60 p-4 shadow-sm backdrop-blur">
      <div className="text-xs text-black/55">{props.k}</div>
      <div className="mt-2 text-lg font-semibold text-black">{props.v}</div>
      {props.sub ? (
        <div className="mt-1 text-xs text-black/45">{props.sub}</div>
      ) : null}
    </div>
  );
}

export default function LoginLandingPage() {
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [email, setEmail] = useState("");
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/dashboard";

  const features = useMemo(
    () => [
      {
        title: "Studio (Generate)",
        desc: "Structured outputs for builders.",
        bullets: [
          "Tweet spec engine",
          "Mission templates",
          "Command / workflow formats",
        ],
      },
      {
        title: "Console (Ops)",
        desc: "Keys, usage, billing — unified.",
        bullets: [
          "Key-level usage",
          "Env segmentation",
          "Cost controls & forecast",
        ],
      },
      {
        title: "Routing (Multi-model)",
        desc: "One interface, many models.",
        bullets: [
          "Unified keys",
          "Policy constraints",
          "Consistent logging",
        ],
      },
    ],
    []
  );

  async function handleGoogle() {
    setLoading("google");
    await signIn("google", { callbackUrl });
  }

  async function handleEmail() {
    if (!email) return;
    setLoading("email");
    await signIn("email", { email, callbackUrl });
  }

  return (
    <div className="min-h-dvh bg-[#f5f4f1] text-[#111]">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_10%,rgba(99,102,241,0.12),transparent_55%),radial-gradient(900px_circle_at_80%_0%,rgba(16,185,129,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.55),rgba(245,244,241,1))]" />
      </div>

      {/* Top Bar */}
      <div className="border-b border-black/10 bg-white/70 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white shadow-sm">
              <span className="text-sm font-semibold">OA</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">OneAI OS</div>
              <div className="text-xs text-black/50">
                One interface · Many models · One billing layer
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/docs">
              <Button variant="secondary">Docs</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost">Pricing</Button>
            </Link>
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-10 md:grid-cols-12">
        {/* LEFT SIDE */}
        <section className="md:col-span-7 lg:col-span-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Platform-grade</Badge>
            <Badge>Unified Keys</Badge>
            <Badge>Usage Analytics</Badge>
            <Badge>Multi-model</Badge>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold md:text-5xl">
            OneAI OS —
            <span className="text-black/70">
              {" "}
              the operating system for AI execution.
            </span>
          </h1>

          <p className="mt-4 max-w-2xl text-base text-black/60 md:text-lg">
            Build repeatable generation pipelines with structured outputs,
            traceable usage, environment segmentation, and unified billing.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MiniStat k="Unified Keys" v="One Layer" sub="Across projects" />
            <MiniStat k="Usage Analytics" v="Real-time" sub="Tokens & cost" />
            <MiniStat k="Routing" v="Multi-model" sub="Policy execution" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {features.map((f) => (
              <FeatureCard
                key={f.title}
                title={f.title}
                desc={f.desc}
                bullets={f.bullets}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/dashboard">
              <Button>Open Console</Button>
            </Link>
            <Link href="/generate/studio">
              <Button variant="secondary">Open Studio</Button>
            </Link>
            <Link href="/templates">
              <Button variant="ghost">Browse Templates</Button>
            </Link>
          </div>
        </section>

        {/* RIGHT SIDE AUTH */}
        <aside className="md:col-span-5 lg:col-span-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge>Auth</Badge>
                <Badge>Console Access</Badge>
              </div>
              <CardTitle className="mt-3">Sign in</CardTitle>
              <CardDescription>
                Continue with Google or email magic link.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <Button
                className="w-full"
                onClick={handleGoogle}
                disabled={loading !== null}
              >
                {loading === "google"
                  ? "Redirecting..."
                  : "Continue with Google"}
              </Button>

              <div className="rounded-2xl border border-black/10 bg-white/60 p-3">
                <div className="text-xs font-semibold text-black/70">
                  Email magic link
                </div>
                <div className="mt-2 space-y-2">
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    type="email"
                  />
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={handleEmail}
                    disabled={loading !== null || !email}
                  >
                    {loading === "email"
                      ? "Sending link..."
                      : "Send sign-in link"}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-black/10 bg-white/60 p-3 text-xs text-black/55">
                By continuing, you agree to use OneAI under your organization’s
                policies.
              </div>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}