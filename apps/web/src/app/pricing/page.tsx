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

function Card({
  title,
  price,
  desc,
  highlights,
  ctaLabel,
  ctaHref,
  featured,
  footnote,
}: {
  title: string;
  price: string;
  desc: string;
  highlights: string[];
  ctaLabel: string;
  ctaHref: string;
  featured?: boolean;
  footnote?: string;
}) {
  return (
    <div
      className={cx(
        "relative rounded-3xl border bg-white p-6 shadow-sm",
        featured ? "border-black shadow-md bg-black/[0.02]" : "border-black/10"
      )}
    >
      {featured ? (
        <div className="absolute -top-3 left-6">
          <span className="rounded-full bg-black px-3 py-1 text-xs font-extrabold text-white">
            Recommended
          </span>
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold text-black">{title}</div>
          <div className="mt-2 text-4xl font-extrabold tracking-tight text-black">{price}</div>
          <div className="mt-2 text-sm text-black/65 leading-relaxed">{desc}</div>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {highlights.map((h) => (
          <div key={h} className="flex gap-2 text-sm text-black/75">
            <span className="mt-[2px] inline-block h-2 w-2 rounded-full bg-black" />
            <span className="leading-relaxed">{h}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Link
          href={ctaHref}
          className={cx(
            "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-extrabold transition",
            featured
              ? "bg-black text-white shadow-lg hover:bg-neutral-900"
              : "border border-black/15 bg-white text-black hover:bg-black/[0.04]"
          )}
        >
          {ctaLabel}
        </Link>

        {footnote ? (
          <div className="text-xs text-black/50 leading-relaxed">{footnote}</div>
        ) : null}
      </div>
    </div>
  );
}

function FeatureRow({ name, items }: { name: string; items: Array<{ plan: string; text: string }> }) {
  return (
    <div className="grid gap-3 rounded-3xl border border-black/10 bg-white p-5 md:grid-cols-12">
      <div className="md:col-span-4">
        <div className="text-sm font-extrabold text-black">{name}</div>
      </div>
      <div className="md:col-span-8 grid gap-3 md:grid-cols-3">
        {items.map((x) => (
          <div key={x.plan} className="rounded-2xl border border-black/10 bg-black/[0.02] p-4">
            <div className="text-[11px] font-extrabold text-black/50">{x.plan}</div>
            <div className="mt-1 text-sm font-semibold text-black/80">{x.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <main className="relative overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 -right-48 h-[560px] w-[560px] rounded-full bg-black/[0.04]" />
        <div className="absolute -bottom-48 -left-48 h-[560px] w-[560px] rounded-full bg-black/[0.03]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(0,0,0,0.05),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(0,0,0,0.04),transparent_45%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <header className="flex items-center justify-between py-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl border border-black/10 bg-white shadow-sm" />
            <div className="leading-tight">
              <div className="text-sm font-extrabold tracking-tight">OneAI</div>
              <div className="text-xs text-black/55">AI-native coordination</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-black/70">
            <Link href="/studio" className="hover:text-black">Product</Link>
            <Link href="/developers" className="hover:text-black">Developers</Link>
            <Link href="/security" className="hover:text-black">Security</Link>
            <Link href="/pricing" className="text-black">Pricing</Link>
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

        <section className="pt-12 pb-10 md:pt-16 md:pb-14">
          <div className="flex flex-wrap gap-2">
            <Pill>Templates-first</Pill>
            <Pill>Structured outputs</Pill>
            <Pill>Validation + retries</Pill>
            <Pill>Export MD/JSON</Pill>
          </div>

          <h1 className="mt-8 text-4xl md:text-5xl font-extrabold tracking-tight text-black">
            Pricing built for execution.
          </h1>
          <p className="mt-4 max-w-2xl text-black/70 leading-relaxed">
            Start free. Upgrade when you need higher throughput, team workflows, and operational controls.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Card
              title="Free"
              price="$0"
              desc="Try Studio Lite and structured outputs. No credit card."
              highlights={[
                "Studio Lite templates",
                "Export Markdown / JSON",
                "Basic validation + retries",
                "Community templates",
              ]}
              ctaLabel="Start free"
              ctaHref="/studio"
              footnote="Best for exploring templates and quick outputs."
            />

            <Card
              title="Pro"
              price="$29/mo"
              desc="For individual builders who ship daily."
              highlights={[
                "Higher rate limits",
                "Priority models / routing (if enabled)",
                "Saved templates + history",
                "Usage tracking",
              ]}
              ctaLabel="Upgrade to Pro"
              ctaHref="/dashboard/billing"
              featured
              footnote="Recommended for creators + solo founders."
            />

            <Card
              title="Team"
              price="Contact"
              desc="For teams that need coordination infrastructure."
              highlights={[
                "Projects, keys, and roles",
                "Workflow governance + templates",
                "Audit-friendly usage reports",
                "SLA / support options",
              ]}
              ctaLabel="Talk to us"
              ctaHref="/contact"
              footnote="Best for orgs running repeatable execution."
            />
          </div>
        </section>

        <section className="py-12 border-t border-black/10">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-black">
            What you get (at a glance)
          </h2>
          <p className="mt-3 max-w-2xl text-black/65 leading-relaxed">
            OneAI is designed for predictable outputs and operational reliability.
          </p>

          <div className="mt-8 grid gap-4">
            <FeatureRow
              name="Structured outputs"
              items={[
                { plan: "Free", text: "Core schemas + export" },
                { plan: "Pro", text: "More templates + faster iteration" },
                { plan: "Team", text: "Org-wide standards + governance" },
              ]}
            />
            <FeatureRow
              name="Reliability"
              items={[
                { plan: "Free", text: "Basic retries" },
                { plan: "Pro", text: "Higher throughput + priority" },
                { plan: "Team", text: "SLA options + reporting" },
              ]}
            />
            <FeatureRow
              name="Console"
              items={[
                { plan: "Free", text: "Basic usage" },
                { plan: "Pro", text: "Projects + keys" },
                { plan: "Team", text: "Roles + audit-friendly exports" },
              ]}
            />
          </div>

          <div className="mt-10 rounded-3xl border border-black/10 bg-black/[0.02] p-6">
            <div className="text-sm font-extrabold text-black">Need custom billing or enterprise setup?</div>
            <p className="mt-2 text-sm text-black/65 leading-relaxed">
              We can enable organization-level governance, higher limits, and tailored workflows.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="rounded-full bg-black px-6 py-3 text-white font-extrabold shadow-lg hover:bg-neutral-900 transition"
              >
                Contact Sales
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
              <Link className="hover:text-black" href="/security">Security</Link>
              <Link className="hover:text-black" href="/contact">Contact</Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}