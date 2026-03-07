import Link from "next/link";

function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-black">{title}</h1>
      {desc ? <p className="mt-4 text-black/70 leading-relaxed">{desc}</p> : null}
    </div>
  );
}

function Item({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
      <div className="text-sm font-extrabold text-black">{title}</div>
      <div className="mt-2 text-sm text-black/65 leading-relaxed">{desc}</div>
    </div>
  );
}

export default function SecurityPage() {
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
            <Link href="/security" className="text-black">Security</Link>
            <Link href="/pricing" className="hover:text-black">Pricing</Link>
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
          <SectionTitle
            title="Security"
            desc="OneAI is designed for operational use: structured outputs, reliable execution, and clear controls for projects, keys, and usage. This page summarizes our security posture and recommended practices."
          />

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="rounded-full bg-black px-8 py-4 text-white font-extrabold shadow-lg hover:bg-neutral-900 transition"
            >
              Report an issue
            </Link>
            <Link
              href="/developers"
              className="rounded-full border border-black/15 bg-white px-8 py-4 font-extrabold hover:bg-black/[0.04] transition"
            >
              Developers →
            </Link>
          </div>

          <div className="mt-6 text-sm text-black/50">
            Note: replace placeholder statements below with your exact implementation details when ready (hosting, encryption, retention).
          </div>
        </section>

        <section className="py-12 border-t border-black/10">
          <div className="grid gap-4 md:grid-cols-3">
            <Item
              title="API keys & access"
              desc="Use per-project keys. Rotate regularly. Store keys in server-side secrets (never client). Restrict admin routes with strong auth."
            />
            <Item
              title="Data handling"
              desc="Minimize stored data. Store only what you need for operations (usage, billing, workflow metadata). Avoid logging sensitive inputs."
            />
            <Item
              title="Operational reliability"
              desc="Validation + retries reduce malformed outputs. Prefer schema-validated structured outputs for production workflows."
            />
          </div>
        </section>

        <section className="py-12 border-t border-black/10">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-black">
            Recommended best practices
          </h2>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Item
              title="Least privilege by default"
              desc="Separate keys for dev/test/prod. Use role-based access in Console. Limit who can create keys and view billing."
            />
            <Item
              title="Logging hygiene"
              desc="Avoid storing raw prompts/outputs by default. If you must, redact secrets and personal data. Keep short retention windows."
            />
            <Item
              title="Webhook security"
              desc="Verify Stripe (or other) webhook signatures. Use raw body handling for signature verification and fail closed on mismatch."
            />
            <Item
              title="Rate limiting"
              desc="Apply per-key rate limits. Reject abusive traffic early. Monitor spikes and rotate keys if compromised."
            />
          </div>
        </section>

        <section className="py-12 border-t border-black/10">
          <div className="rounded-3xl border border-black/10 bg-black/[0.02] p-6">
            <div className="text-sm font-extrabold text-black">Security contact</div>
            <p className="mt-2 text-sm text-black/65 leading-relaxed">
              For security reports, please contact us with reproduction steps, impact analysis, and any relevant logs.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="rounded-full bg-black px-6 py-3 text-white font-extrabold shadow-lg hover:bg-neutral-900 transition"
              >
                Contact
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border border-black/15 bg-white px-6 py-3 font-extrabold hover:bg-black/[0.04] transition"
              >
                Pricing →
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