import { DocShell, DocSectionTitle } from "../../_components/DocShell";

export default function Page() {
  return (
    <DocShell
      title="Reference: Schemas"
      description="Schemas define what valid output looks like."
      pills={["AJV", "Validation", "Stable renderers"]}
      prev={{ href: "/docs/reference/generate", label: "Generate endpoint" }}
      next={{ href: "/docs/reference/errors", label: "Errors" }}
    >
      <DocSectionTitle title="Why schemas" desc="They protect your UI and your automation layer." />
      <div className="mt-6 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <ul className="list-disc pl-5 text-sm text-black/70 space-y-2">
          <li>Front-end can render without guessing types</li>
          <li>Retries happen automatically on invalid outputs</li>
          <li>Errors return issues[] for debugging</li>
        </ul>
      </div>
    </DocShell>
  );
}