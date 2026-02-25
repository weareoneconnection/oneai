// apps/web/src/components/ui/Input.tsx
import React from "react";

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 ${className}`}
      {...props}
    />
  );
}