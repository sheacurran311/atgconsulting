import type { CSSProperties } from "react";

/**
 * Inline SVG logo mark — 100×100 viewBox terminal icon.
 * Renders crisp at any size; no external file load.
 * The `blink` prop animates the blue underscore with a cursor-blink
 * keyframe that is suppressed when the user prefers reduced motion.
 */
interface LogoMarkProps {
  /** Colour mode — determines stroke colour (blue underscore always stays blue). */
  variant?: "dark" | "light";
  /** px height. Width scales proportionally (1:1). Default 32. */
  size?: number;
  /** Enable cursor-blink animation on the blue underscore. */
  blink?: boolean;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean;
}

export default function LogoMark({
  variant = "dark",
  size = 32,
  blink = false,
  className,
  style,
  "aria-hidden": ariaHidden,
}: LogoMarkProps) {
  const stroke = variant === "dark" ? "#FAFAF9" : "#0A0A0B";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      style={style}
      aria-hidden={ariaHidden}
      role={ariaHidden ? undefined : "img"}
      aria-label={ariaHidden ? undefined : "ATG Consulting"}
    >
      <rect x="3" y="3" width="94" height="94" rx="20" fill="none" stroke={stroke} strokeWidth="6" />
      <path d="M26 34 L44 50 L26 66" fill="none" stroke={stroke} strokeWidth="9" strokeLinecap="square" />
      <rect
        x="52" y="60" width="24" height="9"
        fill="#3B6BFF"
        className={blink ? "logo-cursor-blink" : undefined}
      />
    </svg>
  );
}
