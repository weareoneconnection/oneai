import Link from "next/link";

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
      <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-black">{title}</h2>
      {desc ? <p className="mt-3 text-black/65 leading-relaxed">{desc}</p> : null}
    </div>
  );
}

function Block({
  title,
  desc,
  href,
  label,
}: {
  title: string;
  desc: string;
  href: string;
  label: string;
}) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
      <div className="text-sm font-extrabold text-black">{title}</div>
      <div className="mt-2 text-sm text-black/65 leading-relaxed">{desc}</div>
      <div className="mt-5">
        <Link
          href={href}
          className="inline-flex rounded-full border border-black/15 bg-white px-4 py-2 text-xs font-extrabold hover:bg-black/[0.04] transition"
        >
          {label} →
        </Link>
      </div>
    </div>
  );
}

export default function DevelopersPage() {
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
            <Link href="/developers" className="text-black">Developers</Link>
            <Link href="/security" className="hover:text-black">Security</Link>
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
          <div className="flex flex-wrap gap-2">
            <Pill>API-first</Pill>
            <Pill>Structured outputs</Pill>
            <Pill>Workflows</Pill>
            <Pill>Validation + retries</Pill>
          </div>

          <h1 className="mt-8 text-4xl md:text-5xl font-extrabold tracking-tight text-black">
            Developers
          </h1>
          <p className="mt-4 max-w-2xl text-black/70 leading-relaxed">
            OneAI provides an execution layer: predictable, schema-valid outputs that plug into workflows and systems.
            Start in Studio, then move into Console and API.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/docs"
              className="rounded-full bg-black px-8 py-4 text-white font-extrabold shadow-lg hover:bg-neutral-900 transition"
            >
              Read Docs
            </Link>
            <Link
              href="/dashboard/keys"
              className="rounded-full border border-black/15 bg-white px-8 py-4 font-extrabold hover:bg-black/[0.04] transition"
            >
              Get API Key →
            </Link>
          </div>
        </section>

        <section className="py-12 border-t border-black/10">
          <SectionTitle
            title="Core building blocks"
            desc="Design for reliability: structure → validate → export → automate."
          />

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Block
              title="Templates"
              desc="Reusable blueprints for repeatable results. Great for teams and products."
              href="/templates"
              label="Browse templates"
            />
            <Block
              title="Workflows"
              desc="Chained steps with retries. Turn outputs into actions."
              href="/workflows"
              label="Explore workflows"
            />
            <Block
              title="Console"
              desc="Projects, keys, usage, billing. Built to operate."
              href="/dashboard"
              label="Open console"
            />
          </div>
        </section>

        <section className="py-12 border-t border-black/10">
          <SectionTitle
            title="Recommended path"
            desc="Ship fast without breaking your systems."
          />

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              { n: "01", t: "Prototype in Studio", d: "Pick a template. Get real outputs fast." },
              { n: "02", t: "Lock schema", d: "Define what “valid” means for your use case." },
              { n: "03", t: "Add workflow", d: "Chain steps. Add retries. Make it reliable." },
              { n: "04", t: "Operate in Console", d: "Keys, usage, projects, billing." },
            ].map((x) => (
              <div key={x.n} className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
                <div className="text-xs font-extrabold text-black/50">{x.n}</div>
                <div className="mt-2 text-sm font-extrabold text-black">{x.t}</div>
                <div className="mt-2 text-sm text-black/65 leading-relaxed">{x.d}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="py-12 border-t border-black/10">
          <div className="rounded-3xl border border-black/10 bg-black/[0.02] p-6">
            <div className="text-sm font-extrabold text-black">Security & reliability</div>
            <p className="mt-2 text-sm text-black/65 leading-relaxed">
              If you run OneAI in production, you need trust. Read our security posture and operational controls.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/security"
                className="rounded-full bg-black px-6 py-3 text-white font-extrabold shadow-lg hover:bg-neutral-900 transition"
              >
                Security
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
              <Link className="hover:text-black" href="/docs">Docs</Link>
              <Link className="hover:text-black" href="/security">Security</Link>
              <Link className="hover:text-black" href="/contact">Contact</Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}