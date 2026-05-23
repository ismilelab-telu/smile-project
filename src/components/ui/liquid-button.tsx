import { motion } from "motion/react";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type LiquidStyle = CSSProperties & {
  "--liquid-button-background-color"?: string;
  "--liquid-button-color"?: string;
  "--liquid-button-delay"?: string;
  "--liquid-button-fill-width"?: string;
  "--liquid-button-fill-height"?: string;
};

type LiquidMotionProps = {
  children: ReactNode;
  delay?: string;
  fillHeight?: string;
  hoverScale?: number;
  tapScale?: number;
};

type LiquidButtonProps = ComponentProps<typeof motion.button> & LiquidMotionProps;
type LiquidLinkProps = ComponentProps<typeof motion.a> & LiquidMotionProps;

const liquidButtonClassName =
  "relative inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:pointer-events-none disabled:opacity-50";

function getLiquidStyle(
  style: CSSProperties | undefined,
  fillHeight: string,
  delay: string,
): LiquidStyle {
  return {
    "--liquid-button-background-color": "transparent",
    "--liquid-button-color": "oklch(76.5% 0.177 163.223)",
    "--liquid-button-delay": "0s",
    "--liquid-button-fill-height": fillHeight,
    "--liquid-button-fill-width": "-1%",
    background:
      "linear-gradient(var(--liquid-button-color) 0 0) no-repeat calc(200% - var(--liquid-button-fill-width, -1%)) 100% / 200% var(--liquid-button-fill-height, 0.2em)",
    backgroundColor: "var(--liquid-button-background-color)",
    transition: `background ${delay} var(--liquid-button-delay, 0s), color ${delay} ${delay}, background-position ${delay} calc(${delay} - var(--liquid-button-delay, 0s))`,
    ...style,
  };
}

function getHoverState(hoverScale: number, delay: string) {
  return {
    "--liquid-button-delay": delay,
    "--liquid-button-fill-height": "100%",
    "--liquid-button-fill-width": "100%",
    scale: hoverScale,
    transition: {
      "--liquid-button-delay": { duration: 0 },
      "--liquid-button-fill-height": { duration: 0 },
      "--liquid-button-fill-width": { duration: 0 },
    },
  };
}

export function LiquidButton({
  children,
  className,
  delay = "0.3s",
  fillHeight = "3px",
  hoverScale = 1.05,
  style,
  tapScale = 0.95,
  whileHover,
  whileTap,
  ...props
}: LiquidButtonProps) {
  return (
    <motion.button
      className={cn(liquidButtonClassName, className)}
      style={getLiquidStyle(style, fillHeight, delay)}
      whileHover={whileHover ?? getHoverState(hoverScale, delay)}
      whileTap={whileTap ?? { scale: tapScale }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function LiquidLink({
  children,
  className,
  delay = "0.3s",
  fillHeight = "3px",
  hoverScale = 1.05,
  style,
  tapScale = 0.95,
  whileHover,
  whileTap,
  ...props
}: LiquidLinkProps) {
  return (
    <motion.a
      className={cn(liquidButtonClassName, className)}
      style={getLiquidStyle(style, fillHeight, delay)}
      whileHover={whileHover ?? getHoverState(hoverScale, delay)}
      whileTap={whileTap ?? { scale: tapScale }}
      {...props}
    >
      {children}
    </motion.a>
  );
}
