// apps/web/src/components/ui/Textarea.tsx
"use client";

import React from "react";

export function Textarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={[
        "min-h-[96px] w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm text-black",
        "placeholder:text-black/35",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-black/15 focus-visible:border-black/20",
        "shadow-[0_1px_0_rgba(0,0,0,0.03)]",
        className,
      ].join(" ")}
      {...props}
    />
  );
}