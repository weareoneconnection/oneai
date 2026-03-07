import { DocShell, DocSectionTitle } from "../../_components/DocShell";

export default function Page() {
  return (
    <DocShell
      title="Reference: Generate"
      description="POST /v1/generate — the primary execution endpoint."
      pills={["POST /v1/generate", "type", "input", "options"]}
      prev={{ href: "/docs/concepts", label: "Core Concepts" }}
      next={{ href: "/docs/reference/schemas", label: "Schemas" }}
    >
      <DocSectionTitle title="Request" desc="Route by type. Validate output against schema." />
      <div className="mt-6 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <pre className="whitespace-pre-wrap text-sm text-black/80">{`{
  "type": "viral_hook",
  "input": { "topic": "string", "details": "string" },
  "options": { "templateVersion": 1, "maxAttempts": 3 }
}`}</pre>
      </div>
    </DocShell>
  );
}