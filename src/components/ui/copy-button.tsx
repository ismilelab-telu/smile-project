import { CheckIcon, CopyIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { AnimatePresence, motion, type HTMLMotionProps } from "motion/react";
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

const contentTransition = { duration: 0.18, ease: [0.22, 1, 0.36, 1] } as const;
const buttonWidthTransition = { duration: 0.2, ease: [0.22, 1, 0.36, 1] } as const;

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

function CopyButtonContent({ icon, label }: { icon: IconSvgElement; label: string }) {
  return (
    <motion.span
      animate={{ filter: "blur(0px)", opacity: 1, scale: 1, y: 0 }}
      aria-hidden="true"
      className="col-start-1 row-start-1 inline-flex transform-gpu items-center justify-center gap-2.5 overflow-visible whitespace-nowrap [will-change:filter,opacity,transform]"
      exit={{ filter: "blur(6px)", opacity: 0, scale: 0.98, y: -3 }}
      initial={{ filter: "blur(6px)", opacity: 0, scale: 0.98, y: 3 }}
      transition={contentTransition}
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
  const [measuredButtonWidths, setMeasuredButtonWidths] = useState<{
    copied?: number;
    copy?: number;
  }>({});
  const copiedMeasureRef = useRef<HTMLSpanElement>(null);
  const copyMeasureRef = useRef<HTMLSpanElement>(null);
  const ariaLabel = isCopied ? (copiedAriaLabel ?? copiedLabel) : (copyAriaLabel ?? copyLabel);
  const buttonWidth = isCopied ? measuredButtonWidths.copied : measuredButtonWidths.copy;

  useLayoutEffect(() => {
    const measureButtonWidths = () => {
      const copyWidth = Math.ceil(copyMeasureRef.current?.getBoundingClientRect().width ?? 0);
      const copiedWidth = Math.ceil(copiedMeasureRef.current?.getBoundingClientRect().width ?? 0);

      if (copyWidth <= 0 && copiedWidth <= 0) {
        return;
      }

      setMeasuredButtonWidths((current) => {
        const nextWidths = {
          copied: copiedWidth > 0 ? copiedWidth : current.copied,
          copy: copyWidth > 0 ? copyWidth : current.copy,
        };

        if (nextWidths.copied === current.copied && nextWidths.copy === current.copy) {
          return current;
        }

        return nextWidths;
      });
    };

    measureButtonWidths();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(measureButtonWidths);

    if (copyMeasureRef.current) {
      resizeObserver.observe(copyMeasureRef.current);
    }

    if (copiedMeasureRef.current) {
      resizeObserver.observe(copiedMeasureRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [className, copiedLabel, copyLabel]);

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
        setIsCopied(true);
        void copyTextToClipboard(value)
          .then(() => undefined)
          .catch(() => {
            setIsCopied(false);
          });
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
      <span className="relative z-10 inline-grid items-center justify-center overflow-visible">
        <AnimatePresence initial={false}>
          {isCopied ? (
            <CopyButtonContent icon={CheckIcon} key="copied" label={copiedLabel} />
          ) : (
            <CopyButtonContent icon={CopyIcon} key="copy" label={copyLabel} />
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  );
}
