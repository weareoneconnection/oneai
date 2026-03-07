import { DocShell, DocSectionTitle } from "../../_components/DocShell";

export default function Page() {
  return (
    <DocShell
      title="Reference: Errors"
      description="How OneAI reports validation failures and execution errors."
      pills={["VALIDATION_FAILED", "issues[]", "attempts"]}
      prev={{ href: "/docs/reference/schemas", label: "Schemas" }}
      next={{ href: "/docs/reference/rate-limits", label: "Rate limits" }}
    >
      <DocSectionTitle title="Validation failure shape" desc="Use issues[] to pinpoint where schema mismatched." />
      <div className="mt-6 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <pre className="whitespace-pre-wrap text-sm text-black/80">{`{
  "success": false,
  "error": "...",
  "details": {
    "code": "VALIDATION_FAILED",
    "issues": [{ "path": ["hooks", 0], "message": "..." }]
  }
}`}</pre>
      </div>
    </DocShell>
  );
}