import { CheckIcon, CopyIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion, useAnimationControls, type HTMLMotionProps } from "motion/react";
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

type SharedLabelRange = {
  copiedStart: number;
  copyStart: number;
  length: number;
};

const blurTransition = { duration: 0.16, ease: "easeOut" } as const;
const buttonWidthTransition = { damping: 24, mass: 0.8, stiffness: 360, type: "spring" } as const;

function getSharedLabelRange(copyLabel: string, copiedLabel: string): SharedLabelRange | null {
  let bestRange: SharedLabelRange = { copiedStart: 0, copyStart: 0, length: 0 };

  for (let copyIndex = 0; copyIndex < copyLabel.length; copyIndex += 1) {
    for (let copiedIndex = 0; copiedIndex < copiedLabel.length; copiedIndex += 1) {
      let length = 0;

      while (
        copyLabel[copyIndex + length] &&
        copyLabel[copyIndex + length] === copiedLabel[copiedIndex + length]
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

function BlurredLabelSlot({ slotKey, text }: { slotKey: string; text: string }) {
  const [exitingText, setExitingText] = useState<string | null>(null);
  const previousText = useRef(text);

  useEffect(() => {
    if (previousText.current === text) {
      return;
    }

    setExitingText(previousText.current || null);
    previousText.current = text;
  }, [text]);

  return (
    <span className="relative inline-block h-[1lh] overflow-visible leading-[inherit]">
      {text ? (
        <motion.span
          animate={{ opacity: 1, filter: "blur(0px)" }}
          className="relative inline-block leading-[inherit]"
          initial={{ opacity: 0, filter: "blur(6px)" }}
          key={`${slotKey}-${text}`}
          transition={blurTransition}
        >
          {text}
        </motion.span>
      ) : null}
      {exitingText ? (
        <motion.span
          animate={{ opacity: 0, filter: "blur(6px)" }}
          className="pointer-events-none absolute top-0 left-0 inline-block leading-[inherit]"
          initial={{ opacity: 1, filter: "blur(0px)" }}
          key={`${slotKey}-exiting-${exitingText}`}
          onAnimationComplete={() => {
            setExitingText(null);
          }}
          transition={blurTransition}
        >
          {exitingText}
        </motion.span>
      ) : null}
    </span>
  );
}

function SharedLabelText({ animationKey, children }: { animationKey: string; children: string }) {
  const controls = useAnimationControls();
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    void controls.start({
      filter: ["blur(4px)", "blur(0px)"],
      transition: blurTransition,
    });
  }, [animationKey, controls]);

  return (
    <motion.span animate={controls} initial={false}>
      {children}
    </motion.span>
  );
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
      <span className="relative inline-grid min-w-16 place-items-center overflow-visible">
        <BlurredLabelSlot slotKey="label" text={currentLabel} />
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
    <span className="relative inline-flex items-center justify-center overflow-visible whitespace-nowrap">
      <BlurredLabelSlot slotKey={`${stateKey}-prefix`} text={prefix} />
      <SharedLabelText animationKey={stateKey}>{shared}</SharedLabelText>
      <BlurredLabelSlot slotKey={`${stateKey}-suffix`} text={suffix} />
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
  style,
  type = "button",
  value,
  ...props
}: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [buttonWidth, setButtonWidth] = useState<number>();
  const copiedMeasureRef = useRef<HTMLSpanElement>(null);
  const copyMeasureRef = useRef<HTMLSpanElement>(null);
  const icon = isCopied ? CheckIcon : CopyIcon;
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
        "group relative inline-flex h-10 w-fit cursor-pointer items-center justify-center rounded-none border-0 bg-transparent px-4 text-sm font-semibold tracking-normal whitespace-nowrap text-white shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500",
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
          "pointer-events-none invisible absolute top-0 left-0 z-[-1] inline-flex h-10 items-center justify-center gap-2.5 rounded-none border-0 bg-transparent px-4 text-sm font-semibold tracking-normal whitespace-nowrap",
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
          "pointer-events-none invisible absolute top-0 left-0 z-[-1] inline-flex h-10 items-center justify-center gap-2.5 rounded-none border-0 bg-transparent px-4 text-sm font-semibold tracking-normal whitespace-nowrap",
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
      <span className="relative z-10 inline-flex items-center justify-center gap-2.5">
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            className="inline-flex size-5 items-center justify-center overflow-visible"
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
      </span>
    </motion.button>
  );
}
