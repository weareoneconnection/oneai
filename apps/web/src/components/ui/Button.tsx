// apps/web/src/components/ui/Button.tsx
import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
};

/**
 * OneAI OS Button (black/gold-ready)
 * - 默认可读性更强（避免白底白字/透明导致“看不见”）
 * - 支持你在页面传入 className 完全覆盖（建议用 !text / !bg 等）
 * - disabled 视觉一致
 */
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  ...props
}: Props) {
  const base =
    "inline-flex items-center justify-center select-none font-semibold transition " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

  // 圆角/尺寸更“OS”，保持触控友好
  const sizes = size === "sm" ? "h-9 px-3 text-sm" : "h-10 px-4 text-sm";

  // ✅ 默认 variants：高对比（不再用 text-white/80 这种容易在白底消失的）
  const variants =
    variant === "primary"
      ? // 主按钮：黑底白字（OneAI OS 默认主行动）
        "rounded-full bg-black text-white shadow-sm " +
        "hover:bg-black/90 active:translate-y-[1px] " +
        "focus-visible:ring-black/30 focus-visible:ring-offset-white"
      : variant === "secondary"
        ? // 次按钮：白底黑字 + 清晰边框（不会“按钮太白看不见”）
          "rounded-full bg-white text-black border border-black/20 shadow-sm " +
          "hover:bg-black/[0.04] active:translate-y-[1px] " +
          "focus-visible:ring-black/20 focus-visible:ring-offset-white"
        : // ghost：透明也要可见（默认给轻边框，避免融入背景）
          "rounded-full bg-transparent text-black border border-black/15 " +
          "hover:bg-black/[0.04] active:translate-y-[1px] " +
          "focus-visible:ring-black/15 focus-visible:ring-offset-white";

  // ✅ className 放最后，保证页面传入可以覆盖默认样式
  const cls = `${base} ${sizes} ${variants} ${className}`.trim();

  return <button className={cls} disabled={disabled} {...props} />;
}