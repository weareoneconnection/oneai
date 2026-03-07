import { DocShell, DocSectionTitle } from "../../_components/DocShell";

export default function Page() {
  return (
    <DocShell
      title="Guide: Structured Outputs"
      description="Make outputs predictable, schema-valid, and production-safe."
      pills={["Schemas", "Predictability", "JSON/MD"]}
      prev={{ href: "/docs", label: "Docs Home" }}
      next={{ href: "/docs/guides/validation-retries", label: "Validation + Retries" }}
    >
      <DocSectionTitle
        title="What you get"
        desc="A stable output surface you can render in UI, export, or feed into tools."
      />
      <div className="mt-6 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <ul className="list-disc pl-5 text-sm text-black/70 space-y-2">
          <li>Predictable keys and types</li>
          <li>Front-end renderers become deterministic</li>
          <li>Fewer “object vs string” schema mismatches</li>
        </ul>
      </div>
    </DocShell>
  );
}