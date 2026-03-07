import Link from "next/link";
import { DocShell, DocSectionTitle } from "../_components/DocShell";

export default function Page() {
  return (
    <DocShell
      title="Templates"
      description="Templates-first execution: reusable blueprints that produce consistent outputs."
      pills={["Reusable", "Stable outputs", "Team-ready"]}
      prev={{ href: "/docs/api", label: "API Basics" }}
      next={{ href: "/docs/workflows", label: "Workflows" }}
    >
      <DocSectionTitle
        title="Why templates"
        desc="Templates convert intent into predictable structure: less prompt chaos, more execution."
      />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          <div className="text-sm font-extrabold text-black">Template → Schema</div>
          <p className="mt-2 text-sm text-black/65 leading-relaxed">
            A template defines how to ask; a schema defines what “valid” means.
          </p>
        </div>
        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          <div className="text-sm font-extrabold text-black">Export-ready</div>
          <p className="mt-2 text-sm text-black/65 leading-relaxed">
            Outputs can be copied, exported to MD/JSON, or used as payloads in your stack.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <Link href="/studio" className="rounded-full bg-black px-6 py-3 text-white font-extrabold hover:bg-neutral-900">
          Try templates in Studio →
        </Link>
      </div>
    </DocShell>
  );
}