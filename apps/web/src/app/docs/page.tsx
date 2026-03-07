import Link from "next/link";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-black/70">
      {children}
    </span>
  );
}

function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-black">{title}</h2>
      {desc ? <p className="mt-2 text-sm md:text-base text-black/65 leading-relaxed">{desc}</p> : null}
    </div>
  );
}

function DocCard({
  title,
  desc,
  href,
  badge,
}: {
  title: string;
  desc: string;
  href: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-black/10 bg-white p-6 shadow-sm transition hover:border-black/25 hover:bg-black/[0.02] hover:shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-black">{title}</div>
          <div className="mt-2 text-sm text-black/65 leading-relaxed">{desc}</div>
        </div>
        {badge ? (
          <span className="shrink-0 rounded-full border border-black/10 bg-black/[0.03] px-2 py-[2px] text-[10px] font-bold text-black/70">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="mt-4 text-xs font-extrabold text-black/70 group-hover:text-black">
        Open →
      </div>
    </Link>
  );
}

function SmallLink({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-left shadow-sm transition hover:border-black/25 hover:bg-black/[0.02]"
    >
      <div className="text-xs font-extrabold text-black">{title}</div>
      <div className="mt-1 text-xs text-black/60 leading-relaxed">{desc}</div>
    </Link>
  );
}

export default function DocsHomePage() {
  const quick = [
    { t: "Quickstart", d: "Make your first structured output.", href: "/docs/quickstart" },
    { t: "API Basics", d: "Auth, requests, response format.", href: "/docs/api" },
    { t: "Templates", d: "Templates-first execution.", href: "/docs/templates" },
    { t: "Workflows", d: "Chaining steps, retries, validation.", href: "/docs/workflows" },
  ];

  const references = [
    { t: "Generate endpoint", d: "POST /v1/generate", href: "/docs/reference/generate" },
    { t: "Schemas", d: "Output validation and guarantees.", href: "/docs/reference/schemas" },
    { t: "Errors", d: "Retries, failures, and debugging.", href: "/docs/reference/errors" },
    { t: "Rate limits", d: "Limits, quotas, and best practices.", href: "/docs/reference/rate-limits" },
  ];

  const guides = [
    {
      title: "Structured Outputs",
      desc: "Make outputs predictable, schema-valid, and production-safe.",
      href: "/docs/guides/structured-outputs",
      badge: "Guide",
    },
    {
      title: "Validation + Retries",
      desc: "Reduce failures using attempts, validators, and fallbacks.",
      href: "/docs/guides/validation-retries",
      badge: "Guide",
    },
    {
      title: "Prompting for Execution",
      desc: "Write prompts that behave like contracts, not chats.",
      href: "/docs/guides/prompting",
      badge: "Guide",
    },
    {
      title: "Deploying OneAI",
      desc: "Local dev, environment variables, and production setup.",
      href: "/docs/guides/deploy",
      badge: "Guide",
    },
  ];

  return (
    <main className="relative overflow-hidden bg-white">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 -right-48 h-[560px] w-[560px] rounded-full bg-black/[0.04]" />
        <div className="absolute -bottom-48 -left-48 h-[560px] w-[560px] rounded-full bg-black/[0.03]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(0,0,0,0.05),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(0,0,0,0.04),transparent_45%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Top nav */}
        <header className="flex items-center justify-between py-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl border border-black/10 bg-white shadow-sm" />
            <div className="leading-tight">
              <div className="text-sm font-extrabold tracking-tight">OneAI</div>
              <div className="text-xs text-black/55">Docs</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-black/70">
            <Link href="/studio" className="hover:text-black">
              Product
            </Link>
            <Link href="/developers" className="hover:text-black">
              Developers
            </Link>
            <Link href="/security" className="hover:text-black">
              Security
            </Link>
            <Link href="/pricing" className="hover:text-black">
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-bold text-black hover:bg-black/[0.04] transition"
            >
              Console
            </Link>
            <Link
              href="/studio"
              className="inline-flex rounded-full bg-black px-5 py-2 text-sm font-extrabold text-white shadow-lg hover:bg-neutral-900 transition"
            >
              Try Studio
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="pt-12 pb-10 md:pt-16 md:pb-14">
          <div className="flex flex-wrap gap-2">
            <Pill>AI-native coordination</Pill>
            <Pill>Templates-first</Pill>
            <Pill>Structured outputs</Pill>
            <Pill>Export MD/JSON</Pill>
          </div>

          <h1 className="mt-8 text-4xl md:text-5xl font-extrabold tracking-tight text-black">
            Documentation
          </h1>
          <p className="mt-4 max-w-2xl text-black/70 leading-relaxed">
            OneAI is an execution layer: turn intent into reliable, schema-valid outputs you can ship,
            run, and automate.
          </p>

          {/* Search (UI only; hook your real search later) */}
          <div className="mt-8 rounded-3xl border border-black/10 bg-white p-3 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <div className="flex-1">
                <input
                  placeholder="Search docs… (Quickstart, API, templates, workflows)"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <Link
                href="/docs/quickstart"
                className="inline-flex items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-extrabold text-white shadow-lg hover:bg-neutral-900 transition"
              >
                Quickstart
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {quick.map((q) => (
                <Link
                  key={q.href}
                  href={q.href}
                  className="rounded-full border border-black/10 bg-black/[0.02] px-3 py-1 text-xs font-semibold text-black/70 hover:bg-black/[0.04]"
                >
                  {q.t}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/docs/quickstart"
              className="rounded-full bg-black px-8 py-4 text-white font-extrabold shadow-lg hover:bg-neutral-900 transition"
            >
              Get started
            </Link>
            <Link
              href="/dashboard/keys"
              className="rounded-full border border-black/15 bg-white px-8 py-4 font-extrabold hover:bg-black/[0.04] transition"
            >
              Get API key →
            </Link>
          </div>
        </section>

        {/* Getting started */}
        <section className="py-12 border-t border-black/10">
          <SectionTitle
            title="Start here"
            desc="If you're new: start with Quickstart, then learn how OneAI enforces structure and reliability."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <DocCard
              title="Quickstart"
              desc="Run your first request and get structured outputs."
              href="/docs/quickstart"
              badge="Start"
            />
            <DocCard
              title="Core Concepts"
              desc="Templates, workflows, validation, retries, exports."
              href="/docs/concepts"
              badge="Concepts"
            />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {quick.map((q) => (
              <SmallLink key={q.href} title={q.t} desc={q.d} href={q.href} />
            ))}
          </div>
        </section>

        {/* Guides */}
        <section className="py-12 border-t border-black/10">
          <SectionTitle
            title="Guides"
            desc="Practical patterns for building production workflows."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {guides.map((g) => (
              <DocCard key={g.href} title={g.title} desc={g.desc} href={g.href} badge={g.badge} />
            ))}
          </div>
        </section>

        {/* API Reference */}
        <section className="py-12 border-t border-black/10">
          <SectionTitle
            title="API Reference"
            desc="Everything you need to integrate OneAI into your product."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {references.map((r) => (
              <DocCard key={r.href} title={r.t} desc={r.d} href={r.href} badge="Reference" />
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-12 border-t border-black/10">
          <div className="rounded-3xl border border-black/10 bg-black/[0.02] p-6">
            <div className="text-sm font-extrabold text-black">Need an OpenAI-console level workflow?</div>
            <p className="mt-2 text-sm text-black/65 leading-relaxed">
              Use Studio for speed, Console for operations, and Workflows for reliability.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/studio"
                className="rounded-full bg-black px-6 py-3 text-white font-extrabold shadow-lg hover:bg-neutral-900 transition"
              >
                Open Studio
              </Link>
              <Link
                href="/developers"
                className="rounded-full border border-black/15 bg-white px-6 py-3 font-extrabold hover:bg-black/[0.04] transition"
              >
                Developers →
              </Link>
              <Link
                href="/security"
                className="rounded-full border border-black/15 bg-white px-6 py-3 font-extrabold hover:bg-black/[0.04] transition"
              >
                Security →
              </Link>
            </div>
          </div>
        </section>

        <footer className="py-10 text-sm text-black/50">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-t border-black/10 pt-6">
            <div>© {new Date().getFullYear()} OneAI — AI-native coordination infrastructure.</div>
            <div className="flex gap-4">
              <Link className="hover:text-black" href="/developers">Developers</Link>
              <Link className="hover:text-black" href="/pricing">Pricing</Link>
              <Link className="hover:text-black" href="/contact">Contact</Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}