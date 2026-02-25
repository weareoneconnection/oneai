"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";


function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, href);

  return (
    <Link
      href={href}
      className={[
        "rounded-xl px-3 py-2 text-sm font-medium transition",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20",
        active
          ? "bg-black text-white shadow-sm"
          : "text-black/70 hover:bg-black/5 hover:text-black",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="hidden items-center rounded-full border border-black/10 bg-white/60 px-3 py-1 text-xs text-black/60 backdrop-blur md:inline-flex">
      {children}
    </span>
  );
}

export function TopNav() {
  const { data } = useSession();
  const email = data?.user?.email;
  return (
    
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href="/studio" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white shadow-sm">
            <span className="text-sm font-semibold">OA</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">OneAI OS</div>
            <div className="text-xs text-black/50">
              Intelligence for structured contribution
               <div className="text-xs text-black/60">{email || "Not signed in"}</div>
            </div>
          </div>
        </Link>

        <div className="ml-2 hidden h-6 w-px bg-black/10 md:block" />
        <Pill>⌘K Quick Start</Pill>
      </div>

      <div className="flex items-center gap-1">
        <div className="hidden items-center gap-1 md:flex">
          <NavLink href="/studio">Studio</NavLink>
          <NavLink href="/templates">Templates</NavLink>
          <NavLink href="/projects">Projects</NavLink>
          <NavLink href="/workflows">Workflows</NavLink>
        </div>

        <div className="mx-2 hidden h-6 w-px bg-black/10 md:block" />

        <div className="flex items-center gap-1">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/keys">Keys</NavLink>
          <NavLink href="/usage">Usage</NavLink>
          <NavLink href="/billing">Billing</NavLink>
          <NavLink href="/verify">Verify</NavLink>
        </div>
      </div>
    </div>
  );
}