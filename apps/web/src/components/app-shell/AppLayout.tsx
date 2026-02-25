// apps/web/src/components/app-shell/AppLayout.tsx
import React from "react";
import { TopNav } from "./TopNav";
import { SideNav } from "./SideNav";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#f5f4f1] text-[#111]">
      {/* Background (clean + premium) */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        {/* soft gradient wash */}
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_15%_0%,rgba(16,163,127,0.10),transparent_55%),radial-gradient(900px_circle_at_80%_0%,rgba(99,102,241,0.08),transparent_55%),radial-gradient(900px_circle_at_60%_90%,rgba(236,72,153,0.05),transparent_60%)]" />
        {/* subtle paper texture */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.55),rgba(245,244,241,0.85))]" />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-40">
        <div className="border-b border-black/10 bg-white/70 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex h-14 items-center">
              <TopNav />
            </div>
          </div>
        </div>
      </header>

      {/* Main shell */}
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-12 gap-6 py-6">
          {/* Sidebar */}
          <aside className="col-span-12 md:col-span-3 lg:col-span-2">
            <div className="sticky top-[80px]">
              <div className="rounded-2xl border border-black/10 bg-white/70 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur">
                <div className="max-h-[calc(100dvh-120px)] overflow-auto p-2">
                  <SideNav />
                </div>
              </div>

              {/* tiny hint / footer */}
              <div className="mt-3 hidden text-xs text-black/45 md:block">
                <div className="rounded-xl border border-black/10 bg-white/50 px-3 py-2">
                  Tip: Use <span className="font-medium text-black/70">⌘K</span>{" "}
                  for quick actions.
                </div>
              </div>
            </div>
          </aside>

          {/* Content */}
          <main className="col-span-12 md:col-span-9 lg:col-span-10">
            <div className="rounded-2xl border border-black/10 bg-white/70 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur">
              {/* Top padding band */}
              <div className="border-b border-black/5 px-5 py-4 md:px-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold tracking-tight">
                    Workspace
                  </div>
                  <div className="text-xs text-black/45">
                    OneAI OS · Unified tools
                  </div>
                </div>
              </div>

              {/* Page content */}
              <div className="p-5 md:p-6">{children}</div>
            </div>

            {/* Bottom breathing space */}
            <div className="h-8" />
          </main>
        </div>
      </div>
    </div>
  );
}