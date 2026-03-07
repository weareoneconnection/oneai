import Link from "next/link";
import { DocShell, DocSectionTitle } from "../_components/DocShell";

export default function Page() {
  return (
    <DocShell
      title="Quickstart"
      description="Make your first request and get schema-valid structured outputs."
      pills={["POST /v1/generate", "Structured outputs", "Validation + retries"]}
      prev={{ href: "/docs", label: "Docs Home" }}
      next={{ href: "/docs/api", label: "API Basics" }}
    >
      <DocSectionTitle
        title="1) Get an API key"
        desc="Create a key in Console, then pass it via x-api-key."
      />
      <div className="mt-6 rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
        <pre className="whitespace-pre-wrap text-sm leading-relaxed text-black/80">{`curl -X POST http://localhost:4000/v1/generate \\
  -H "Content-Type: application/json" \\
  -H "x-api-key:YOUR_KEY" \\
  -d '{
    "type":"viral_hook",
    "input":{"topic":"OneAI Studio Lite","details":"PWA, templates-first, export md/json"},
    "options":{"templateVersion":1,"maxAttempts":3}
  }'`}</pre>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/dashboard/keys" className="rounded-full bg-black px-5 py-2 text-sm font-extrabold text-white hover:bg-neutral-900">
            Get API key →
          </Link>
          <Link href="/docs/reference/generate" className="rounded-full border border-black/15 bg-white px-5 py-2 text-sm font-extrabold hover:bg-black/[0.04]">
            Generate reference →
          </Link>
        </div>
      </div>

      <div className="mt-10">
        <DocSectionTitle
          title="2) Understand the response"
          desc="Your backend enforces structure. If validation fails, it retries up to maxAttempts."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-black/10 bg-black/[0.02] p-5">
            <div className="text-sm font-extrabold text-black">Success</div>
            <pre className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-black/80">{`{
  "success": true,
  "data": { ...schema-valid output... },
  "attempts": 1
}`}</pre>
          </div>
          <div className="rounded-3xl border border-black/10 bg-black/[0.02] p-5">
            <div className="text-sm font-extrabold text-black">Failure</div>
            <pre className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-black/80">{`{
  "success": false,
  "error": "Failed to produce valid structured output",
  "details": { "code":"VALIDATION_FAILED", "issues":[...] }
}`}</pre>
          </div>
        </div>
      </div>
    </DocShell>
  );
}