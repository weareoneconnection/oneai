// apps/web/src/components/ui/Select.tsx
import React from "react";

export function Select({
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 ${className}`}
      {...props}
    />
  );
}