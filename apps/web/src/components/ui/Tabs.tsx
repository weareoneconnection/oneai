// apps/web/src/components/ui/Tabs.tsx
import React from "react";
import { Button } from "./Button";

export function Tabs({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (v: string) => void;
  items: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <Button
          key={it.value}
          variant={value === it.value ? "primary" : "secondary"}
          size="sm"
          onClick={() => onChange(it.value)}
        >
          {it.label}
        </Button>
      ))}
    </div>
  );
}