import { DocShell, DocSectionTitle } from "../../_components/DocShell";

export default function Page() {
  return (
    <DocShell
      title="Guide: Validation + Retries"
      description="Reduce failures using attempts, validators, and fallbacks."
      pills={["AJV", "maxAttempts", "issues[]"]}
      prev={{ href: "/docs/guides/structured-outputs", label: "Structured Outputs" }}
      next={{ href: "/docs/guides/prompting", label: "Prompting for Execution" }}
    >
      <DocSectionTitle title="Recommended defaults" desc="Start stable, then tune." />
      <div className="mt-6 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <pre className="whitespace-pre-wrap text-sm text-black/80">{`options: { templateVersion: 1, maxAttempts: 3 }`}</pre>
      </div>
    </DocShell>
  );
}