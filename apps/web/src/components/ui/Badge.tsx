// apps/web/src/components/ui/Badge.tsx
import React from "react";

export function Badge({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/75 ${className}`}
      {...props}
    />
  );
}