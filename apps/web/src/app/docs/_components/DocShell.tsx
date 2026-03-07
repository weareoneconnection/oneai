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
      <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-black">{title}</h2>
      {desc ? <p className="mt-2 text-sm md:text-base text-black/65 leading-relaxed">{desc}</p> : null}
    </div>
  );
}

export function DocShell({
  title,
  description,
  pills,
  children,
  prev,
  next,
}: {
  title: string;
  description?: string;
  pills?: string[];
  children: React.ReactNode;
  prev?: { href: string; label: string };
  next?: { href: string; label: string };
}) {
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
            <Link href="/studio" className="hover:text-black">Product</Link>
            <Link href="/developers" className="hover:text-black">Developers</Link>
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

        {/* Hero */}
        <section className="pt-10 pb-8 md:pt-14 md:pb-10">
          {pills?.length ? (
            <div className="flex flex-wrap gap-2">
              {pills.map((p) => <Pill key={p}>{p}</Pill>)}
            </div>
          ) : null}

          <h1 className="mt-6 text-4xl md:text-5xl font-extrabold tracking-tight text-black">{title}</h1>
          {description ? (
            <p className="mt-4 max-w-2xl text-black/70 leading-relaxed">{description}</p>
          ) : null}
        </section>

        {/* Body */}
        <section className="py-10 border-t border-black/10">
          {children}
        </section>

        {/* Prev/Next */}
        {(prev || next) ? (
          <section className="py-10 border-t border-black/10">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                {prev ? (
                  <Link
                    href={prev.href}
                    className="block rounded-3xl border border-black/10 bg-white p-5 shadow-sm hover:border-black/25 hover:bg-black/[0.02]"
                  >
                    <div className="text-xs font-bold text-black/50">Previous</div>
                    <div className="mt-1 text-sm font-extrabold text-black">{prev.label}</div>
                  </Link>
                ) : null}
              </div>
              <div className="md:text-right">
                {next ? (
                  <Link
                    href={next.href}
                    className="block rounded-3xl border border-black/10 bg-white p-5 shadow-sm hover:border-black/25 hover:bg-black/[0.02]"
                  >
                    <div className="text-xs font-bold text-black/50">Next</div>
                    <div className="mt-1 text-sm font-extrabold text-black">{next.label}</div>
                  </Link>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

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

export function DocSectionTitle(props: { title: string; desc?: string }) {
  return <SectionTitle {...props} />;
}