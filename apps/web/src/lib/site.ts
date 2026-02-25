// apps/web/src/lib/site.ts
export const site = {
  name: "OneAI OS",
  description:
    "AI application platform for builders: generate tweets, missions, commands, and workflows with structured contribution logic.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  product: {
    tagline: "AI for Builders · Intelligence for Structured Contribution.",
  },
};

export type NavItem = { label: string; href: string };

export const marketingNav: NavItem[] = [
  { label: "Docs", href: "/docs" },
  { label: "Pricing", href: "/pricing" },
  { label: "Status", href: "/status" },
];

export const appNav: NavItem[] = [
  { label: "Studio", href: "/studio" },
  { label: "Templates", href: "/templates" },
  { label: "Workflows", href: "/workflows" },
  { label: "Projects", href: "/projects" },
];

export const consoleNav: NavItem[] = [
  { label: "Keys", href: "/keys" },
  { label: "Usage", href: "/usage" },
  { label: "Billing", href: "/billing" },
  { label: "Verify", href: "/verify" },
];