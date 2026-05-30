import { CheckIcon, CopyIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion, type HTMLMotionProps } from "motion/react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type CopyButtonProps = Omit<HTMLMotionProps<"button">, "children" | "onClick" | "value"> & {
  copiedAriaLabel?: string;
  copiedLabel?: string;
  copyAriaLabel?: string;
  copyLabel?: string;
  resetDelay?: number;
  value: string;
};

type SharedLabelRange = {
  copiedStart: number;
  copyStart: number;
  length: number;
};

const blurTransition = { duration: 0.16, ease: "easeOut" } as const;

function getSharedLabelRange(copyLabel: string, copiedLabel: string): SharedLabelRange | null {
  const copySearchLabel = copyLabel.toLocaleLowerCase();
  const copiedSearchLabel = copiedLabel.toLocaleLowerCase();
  let bestRange: SharedLabelRange = { copiedStart: 0, copyStart: 0, length: 0 };

  for (let copyIndex = 0; copyIndex < copySearchLabel.length; copyIndex += 1) {
    for (let copiedIndex = 0; copiedIndex < copiedSearchLabel.length; copiedIndex += 1) {
      let length = 0;

      while (
        copySearchLabel[copyIndex + length] &&
        copySearchLabel[copyIndex + length] === copiedSearchLabel[copiedIndex + length]
      ) {
        length += 1;
      }

      if (length > bestRange.length) {
        bestRange = { copiedStart: copiedIndex, copyStart: copyIndex, length };
      }
    }
  }

  return bestRange.length > 1 ? bestRange : null;
}

function renderBlurredLabelSegment(key: string, text: string) {
  if (!text) {
    return null;
  }

  return (
    <motion.span
      animate={{ opacity: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(6px)" }}
      initial={{ opacity: 0, filter: "blur(6px)" }}
      key={key}
      transition={blurTransition}
    >
      {text}
    </motion.span>
  );
}

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

function CopyButtonLabel({
  copiedLabel,
  copyLabel,
  isCopied,
}: {
  copiedLabel: string;
  copyLabel: string;
  isCopied: boolean;
}) {
  const sharedRange = getSharedLabelRange(copyLabel, copiedLabel);
  const currentLabel = isCopied ? copiedLabel : copyLabel;

  if (!sharedRange) {
    return (
      <span className="relative inline-grid min-w-16 place-items-center overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
          {renderBlurredLabelSegment(currentLabel, currentLabel)}
        </AnimatePresence>
      </span>
    );
  }

  const sharedStart = isCopied ? sharedRange.copiedStart : sharedRange.copyStart;
  const sharedEnd = sharedStart + sharedRange.length;
  const prefix = currentLabel.slice(0, sharedStart);
  const shared = currentLabel.slice(sharedStart, sharedEnd);
  const suffix = currentLabel.slice(sharedEnd);
  const stateKey = isCopied ? "copied" : "copy";

  return (
    <span className="relative inline-flex min-w-16 items-center justify-center overflow-hidden">
      <AnimatePresence initial={false}>
        {renderBlurredLabelSegment(`${stateKey}-prefix`, prefix)}
        <span key="shared-label">{shared}</span>
        {renderBlurredLabelSegment(`${stateKey}-suffix`, suffix)}
      </AnimatePresence>
    </span>
  );
}

export function CopyButton({
  className,
  copiedAriaLabel,
  copiedLabel = "Copied!",
  copyAriaLabel,
  copyLabel = "Copy",
  resetDelay = 1600,
  type = "button",
  value,
  ...props
}: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const icon = isCopied ? CheckIcon : CopyIcon;
  const ariaLabel = isCopied ? (copiedAriaLabel ?? copiedLabel) : (copyAriaLabel ?? copyLabel);

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
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-10 min-w-28 cursor-pointer items-center justify-center gap-2.5 rounded-full border border-neutral-700/80 bg-neutral-950 px-4 text-sm font-semibold tracking-normal text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] transition-colors duration-200 hover:bg-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500",
        isCopied &&
          "border-emerald-500/70 bg-emerald-950/40 text-emerald-400 shadow-[0_0_22px_rgba(16,185,129,0.2),inset_0_0_0_1px_rgba(52,211,153,0.12)] hover:bg-emerald-950/50",
        className,
      )}
      onClick={() => {
        void copyTextToClipboard(value)
          .then(() => {
            setIsCopied(true);
          })
          .catch(() => undefined);
      }}
      type={type}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      {...props}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          className="inline-flex size-5 items-center justify-center"
          exit={{ opacity: 0, filter: "blur(6px)", scale: 0.9 }}
          initial={{ opacity: 0, filter: "blur(6px)", scale: 0.9 }}
          key={isCopied ? "copied-icon" : "copy-icon"}
          transition={blurTransition}
        >
          <HugeiconsIcon
            aria-hidden="true"
            className="size-5"
            icon={icon}
            size={20}
            strokeWidth={2}
          />
        </motion.span>
      </AnimatePresence>
      <CopyButtonLabel copiedLabel={copiedLabel} copyLabel={copyLabel} isCopied={isCopied} />
    </motion.button>
  );
}
