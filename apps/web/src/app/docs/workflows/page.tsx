import Link from "next/link";
import { DocShell, DocSectionTitle } from "../_components/DocShell";

export default function Page() {
  return (
    <DocShell
      title="Workflows"
      description="Chain steps, enforce validation, and ship reliable automation."
      pills={["Chaining", "Validation", "Retries"]}
      prev={{ href: "/docs/templates", label: "Templates" }}
      next={{ href: "/docs/concepts", label: "Core Concepts" }}
    >
      <DocSectionTitle
        title="Core idea"
        desc="Workflows turn structured outputs into repeatable execution. Think: steps + validators + retries + exports."
      />

      <div className="mt-6 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <pre className="whitespace-pre-wrap text-sm text-black/80">{`Step 1: Prepare prompt
Step 2: Generate (LLM)
Step 3: Parse JSON
Step 4: Validate schema (AJV)
Step 5: Retry if invalid (maxAttempts)
Step 6: Export / Run next step`}</pre>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/docs/guides/validation-retries" className="rounded-full bg-black px-5 py-2 text-sm font-extrabold text-white hover:bg-neutral-900">
          Validation + Retries guide →
        </Link>
        <Link href="/docs/reference/schemas" className="rounded-full border border-black/15 bg-white px-5 py-2 text-sm font-extrabold hover:bg-black/[0.04]">
          Schemas reference →
        </Link>
      </div>
    </DocShell>
  );
}