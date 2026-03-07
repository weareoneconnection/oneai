import { DocShell, DocSectionTitle } from "../_components/DocShell";

export default function Page() {
  return (
    <DocShell
      title="Core Concepts"
      description="The mental model: templates → structure → validation → retries → export → workflow."
      pills={["Execution layer", "Schemas", "Reliability"]}
      prev={{ href: "/docs/workflows", label: "Workflows" }}
      next={{ href: "/docs/reference/generate", label: "API Reference: Generate" }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {[
          { t: "Template", d: "A reusable blueprint that shapes intent into a predictable request." },
          { t: "Schema", d: "A contract for output structure. Valid or retry." },
          { t: "Validator", d: "AJV checks the output; issues are reported on failure." },
          { t: "Retries", d: "Controlled attempts to reach valid structured output." },
        ].map((x) => (
          <div key={x.t} className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
            <div className="text-sm font-extrabold text-black">{x.t}</div>
            <div className="mt-2 text-sm text-black/65 leading-relaxed">{x.d}</div>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <DocSectionTitle title="Design principle" desc="OneAI is not a chat UI. It is a coordination layer for execution." />
      </div>
    </DocShell>
  );
}