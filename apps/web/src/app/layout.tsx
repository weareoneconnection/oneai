// apps/web/src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    default: site.name,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  metadataBase: new URL(site.url),
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-dvh bg-[var(--bg)] text-[color:var(--text)]">
          {/* OpenAI light: very subtle green wash */}
          <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(16,163,127,.10),transparent_52%)]" />
          <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_bottom,var(--bg-soft),var(--bg))]" />
          <div className="relative">{children}</div>
        </div>
      </body>
    </html>
  );
}