import { DocShell, DocSectionTitle } from "../../_components/DocShell";

export default function Page() {
  return (
    <DocShell
      title="Reference: Rate limits"
      description="Quotas, limits, and best practices for stable production usage."
      pills={["Quotas", "Burst control", "Backoff"]}
      prev={{ href: "/docs/reference/errors", label: "Errors" }}
      next={{ href: "/docs", label: "Docs Home" }}
    >
      <DocSectionTitle title="Best practices" desc="Avoid spikes; add backoff; cache stable outputs." />
      <div className="mt-6 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <ul className="list-disc pl-5 text-sm text-black/70 space-y-2">
          <li>Use client-side debounce for search and form typing</li>
          <li>Retry with exponential backoff on network errors</li>
          <li>Cache template outputs where acceptable</li>
        </ul>
      </div>
    </DocShell>
  );
}