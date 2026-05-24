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

function toSeconds(time: string) {
  const value = time.trim();

  if (value.endsWith("ms")) {
    return Number(value.slice(0, -2)) / 1000;
  }

  if (value.endsWith("s")) {
    return Number(value.slice(0, -1));
  }

  return Number(value);
}

export function LiquidButton({
  delay = "0.3s",
  fillHeight = "3px",
  hoverScale = 1.05,
  tapScale = 0.95,
  ...props
}: LiquidButtonProps) {
  const delaySeconds = toSeconds(delay);

  return (
    <motion.button
      whileTap={{ scale: tapScale }}
      whileHover={{
        scale: hoverScale,
        color: "var(--liquid-button-hover-text-color, var(--liquid-button-background-color))",
        "--liquid-button-fill-width": "100%",
        "--liquid-button-fill-height": "100%",
        "--liquid-button-delay": delay,
        transition: {
          color: { delay: delaySeconds, duration: Math.min(delaySeconds, 0.16) },
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
  const delaySeconds = toSeconds(delay);

  return (
    <motion.a
      whileTap={{ scale: tapScale }}
      whileHover={{
        scale: hoverScale,
        color: "var(--liquid-button-hover-text-color, var(--liquid-button-background-color))",
        "--liquid-button-fill-width": "100%",
        "--liquid-button-fill-height": "100%",
        "--liquid-button-delay": delay,
        transition: {
          color: { delay: delaySeconds, duration: Math.min(delaySeconds, 0.16) },
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
