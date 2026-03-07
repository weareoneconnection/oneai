import Link from "next/link";
import { DocShell, DocSectionTitle } from "../_components/DocShell";

export default function Page() {
  return (
    <DocShell
      title="API Basics"
      description="Authentication, request shape, and response conventions."
      pills={["x-api-key", "type + input", "options.maxAttempts"]}
      prev={{ href: "/docs/quickstart", label: "Quickstart" }}
      next={{ href: "/docs/templates", label: "Templates" }}
    >
      <DocSectionTitle title="Authentication" desc="Send your key using x-api-key." />
      <div className="mt-6 rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
        <pre className="whitespace-pre-wrap text-sm text-black/80">{`-H "x-api-key:YOUR_KEY"`}</pre>
      </div>

      <div className="mt-10">
        <DocSectionTitle title="Request format" desc="OneAI routes by type and validates output with schemas." />
        <div className="mt-6 rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
          <pre className="whitespace-pre-wrap text-sm text-black/80">{`{
  "type": "viral_hook",
  "input": { "topic": "...", "details": "..." },
  "options": { "templateVersion": 1, "maxAttempts": 3 }
}`}</pre>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/docs/reference/generate" className="rounded-full bg-black px-5 py-2 text-sm font-extrabold text-white hover:bg-neutral-900">
            Generate endpoint →
          </Link>
          <Link href="/docs/reference/errors" className="rounded-full border border-black/15 bg-white px-5 py-2 text-sm font-extrabold hover:bg-black/[0.04]">
            Errors →
          </Link>
        </div>
      </div>
    </DocShell>
  );
}