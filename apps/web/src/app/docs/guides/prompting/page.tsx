import { DocShell, DocSectionTitle } from "../../_components/DocShell";

export default function Page() {
  return (
    <DocShell
      title="Guide: Prompting for Execution"
      description="Write prompts that behave like contracts, not chats."
      pills={["Constraints", "No fluff", "Determinism"]}
      prev={{ href: "/docs/guides/validation-retries", label: "Validation + Retries" }}
      next={{ href: "/docs/guides/deploy", label: "Deploying OneAI" }}
    >
      <DocSectionTitle title="Rule of thumb" desc="Tell the model what to output, not how to think." />
      <div className="mt-6 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <ul className="list-disc pl-5 text-sm text-black/70 space-y-2">
          <li>Be explicit about fields and types</li>
          <li>Keep constraints short and enforceable</li>
          <li>Prefer examples over long explanations</li>
        </ul>
      </div>
    </DocShell>
  );
}