import { CheckIcon, CopyIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { motion, type HTMLMotionProps } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type CopyButtonProps = Omit<HTMLMotionProps<"button">, "children" | "onClick" | "value"> & {
  copiedAriaLabel?: string;
  copiedLabel?: string;
  copyAriaLabel?: string;
  copyLabel?: string;
  resetDelay?: number;
  value: string;
};

const blurTransition = { duration: 0.14, ease: "easeOut" } as const;
const buttonWidthTransition = { damping: 32, mass: 0.7, stiffness: 520, type: "spring" } as const;

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";

  document.body.append(textarea);
  textarea.select();

  try {
    if (typeof document.execCommand !== "function" || !document.execCommand("copy")) {
      throw new Error("Clipboard copy is unavailable.");
    }
  } finally {
    textarea.remove();
  }
}

function CopyButtonContent({
  icon,
  isVisible,
  label,
}: {
  icon: IconSvgElement;
  isVisible: boolean;
  label: string;
}) {
  return (
    <motion.span
      animate={{
        opacity: isVisible ? 1 : 0,
        filter: isVisible ? "blur(0px)" : "blur(6px)",
      }}
      aria-hidden={!isVisible}
      className="col-start-1 row-start-1 inline-flex items-center justify-center gap-2.5 overflow-visible whitespace-nowrap"
      initial={false}
      transition={blurTransition}
    >
      <HugeiconsIcon aria-hidden="true" className="size-5" icon={icon} size={20} strokeWidth={2} />
      <span>{label}</span>
    </motion.span>
  );
}

export function CopyButton({
  className,
  copiedAriaLabel,
  copiedLabel = "Copied!",
  copyAriaLabel,
  copyLabel = "Copy",
  resetDelay = 1600,
  style,
  type = "button",
  value,
  ...props
}: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [buttonWidth, setButtonWidth] = useState<number>();
  const copiedMeasureRef = useRef<HTMLSpanElement>(null);
  const copyMeasureRef = useRef<HTMLSpanElement>(null);
  const ariaLabel = isCopied ? (copiedAriaLabel ?? copiedLabel) : (copyAriaLabel ?? copyLabel);

  useLayoutEffect(() => {
    const measureButtonWidth = () => {
      const measureElement = isCopied ? copiedMeasureRef.current : copyMeasureRef.current;

      if (!measureElement) {
        return;
      }

      const measuredWidth = Math.ceil(measureElement.getBoundingClientRect().width);

      if (measuredWidth > 0) {
        setButtonWidth(measuredWidth);
      }
    };

    measureButtonWidth();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(measureButtonWidth);

    if (copyMeasureRef.current) {
      resizeObserver.observe(copyMeasureRef.current);
    }

    if (copiedMeasureRef.current) {
      resizeObserver.observe(copiedMeasureRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [className, copiedLabel, copyLabel, isCopied]);

  useEffect(() => {
    if (!isCopied) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsCopied(false);
    }, resetDelay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isCopied, resetDelay]);

  return (
    <motion.button
      animate={buttonWidth ? { width: buttonWidth } : undefined}
      aria-label={ariaLabel}
      className={cn(
        "group relative inline-flex h-9 w-fit cursor-pointer items-center justify-center rounded-none border-0 bg-transparent px-4 text-sm font-semibold tracking-normal whitespace-nowrap text-white shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500",
        isCopied && "text-emerald-400",
        className,
      )}
      initial={false}
      onClick={() => {
        void copyTextToClipboard(value)
          .then(() => {
            setIsCopied(true);
          })
          .catch(() => undefined);
      }}
      style={style}
      type={type}
      transition={buttonWidthTransition}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none invisible absolute top-0 left-0 z-[-1] inline-flex h-9 items-center justify-center gap-2.5 rounded-none border-0 bg-transparent px-4 text-sm font-semibold tracking-normal whitespace-nowrap",
          className,
        )}
        ref={copyMeasureRef}
      >
        <HugeiconsIcon aria-hidden="true" className="size-5" icon={CopyIcon} size={20} />
        <span>{copyLabel}</span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none invisible absolute top-0 left-0 z-[-1] inline-flex h-9 items-center justify-center gap-2.5 rounded-none border-0 bg-transparent px-4 text-sm font-semibold tracking-normal whitespace-nowrap",
          className,
        )}
        ref={copiedMeasureRef}
      >
        <HugeiconsIcon aria-hidden="true" className="size-5" icon={CheckIcon} size={20} />
        <span>{copiedLabel}</span>
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-0 z-0 rounded-none bg-neutral-950 transition-colors duration-200 group-hover:bg-neutral-900"
      />
      <span className="relative z-10 grid place-items-center overflow-visible">
        <CopyButtonContent icon={CopyIcon} isVisible={!isCopied} label={copyLabel} />
        <CopyButtonContent icon={CheckIcon} isVisible={isCopied} label={copiedLabel} />
      </span>
    </motion.button>
  );
}
