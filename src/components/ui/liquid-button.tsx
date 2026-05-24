import { motion } from "motion/react";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

type LiquidMotionProps = {
  children: ReactNode;
  delay?: string;
  fillHeight?: string;
  hoverScale?: number;
  tapScale?: number;
};

type LiquidButtonProps = ComponentProps<typeof motion.button> & LiquidMotionProps;
type LiquidLinkProps = ComponentProps<typeof motion.a> & LiquidMotionProps;

export function LiquidButton({
  delay = "0.3s",
  fillHeight = "3px",
  hoverScale = 1.05,
  tapScale = 0.95,
  ...props
}: LiquidButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: tapScale }}
      whileHover={{
        scale: hoverScale,
        "--liquid-button-fill-width": "100%",
        "--liquid-button-fill-height": "100%",
        "--liquid-button-delay": delay,
        transition: {
          "--liquid-button-fill-width": { duration: 0 },
          "--liquid-button-fill-height": { duration: 0 },
          "--liquid-button-delay": { duration: 0 },
        },
      }}
      style={
        {
          "--liquid-button-fill-width": "-1%",
          "--liquid-button-fill-height": fillHeight,
          "--liquid-button-delay": "0s",
          background:
            "linear-gradient(var(--liquid-button-color) 0 0) no-repeat calc(200% - var(--liquid-button-fill-width, -1%)) 100% / 200% var(--liquid-button-fill-height, 0.2em)",
          backgroundColor: "var(--liquid-button-background-color)",
          transition: `background ${delay} var(--liquid-button-delay, 0s), color ${delay} ${delay}, background-position ${delay} calc(${delay} - var(--liquid-button-delay, 0s))`,
        } as CSSProperties
      }
      {...props}
    />
  );
}

export function LiquidLink({
  delay = "0.3s",
  fillHeight = "3px",
  hoverScale = 1.05,
  tapScale = 0.95,
  ...props
}: LiquidLinkProps) {
  return (
    <motion.a
      whileTap={{ scale: tapScale }}
      whileHover={{
        scale: hoverScale,
        "--liquid-button-fill-width": "100%",
        "--liquid-button-fill-height": "100%",
        "--liquid-button-delay": delay,
        transition: {
          "--liquid-button-fill-width": { duration: 0 },
          "--liquid-button-fill-height": { duration: 0 },
          "--liquid-button-delay": { duration: 0 },
        },
      }}
      style={
        {
          "--liquid-button-fill-width": "-1%",
          "--liquid-button-fill-height": fillHeight,
          "--liquid-button-delay": "0s",
          background:
            "linear-gradient(var(--liquid-button-color) 0 0) no-repeat calc(200% - var(--liquid-button-fill-width, -1%)) 100% / 200% var(--liquid-button-fill-height, 0.2em)",
          backgroundColor: "var(--liquid-button-background-color)",
          transition: `background ${delay} var(--liquid-button-delay, 0s), color ${delay} ${delay}, background-position ${delay} calc(${delay} - var(--liquid-button-delay, 0s))`,
        } as CSSProperties
      }
      {...props}
    />
  );
}
