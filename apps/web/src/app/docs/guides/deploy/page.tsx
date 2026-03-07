import { DocShell, DocSectionTitle } from "../../_components/DocShell";

export default function Page() {
  return (
    <DocShell
      title="Guide: Deploying OneAI"
      description="Local dev, environment variables, and production setup."
      pills={["ENV", "Railway/Vercel", "Keys"]}
      prev={{ href: "/docs/guides/prompting", label: "Prompting for Execution" }}
      next={{ href: "/docs/reference/generate", label: "API Reference: Generate" }}
    >
      <DocSectionTitle title="Environment" desc="Keep API base + keys consistent across environments." />
      <div className="mt-6 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <pre className="whitespace-pre-wrap text-sm text-black/80">{`ONEAI_API_BASE_URL=http://127.0.0.1:4000
ONEAI_ADMIN_API_KEY=...`}</pre>
      </div>
    </DocShell>
  );
}