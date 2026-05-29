"use client";

import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { encode } from "qss";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  type SpringOptions,
} from "motion/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type LinkPreviewProps = {
  children: ReactNode;
  className?: string;
  height?: number;
  layout?: string;
  quality?: number;
  url: string;
  width?: number;
} & (
  | {
      imageSrc: string;
      isStatic: true;
    }
  | {
      imageSrc?: never;
      isStatic?: false;
    }
);

export function LinkPreview({
  children,
  className,
  height = 125,
  imageSrc,
  isStatic = false,
  layout = "fixed",
  quality = 50,
  url,
  width = 200,
}: LinkPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const x = useMotionValue(0);
  const translateX = useSpring(x, { damping: 15, stiffness: 100 } satisfies SpringOptions);

  const previewSrc = useMemo(() => {
    if (isStatic) {
      return imageSrc;
    }

    const params = encode({
      colorScheme: "dark",
      embed: "screenshot.url",
      meta: false,
      screenshot: true,
      "screenshot.quality": quality,
      url,
      "viewport.deviceScaleFactor": 1,
      "viewport.height": height * 3,
      "viewport.isMobile": true,
      "viewport.width": width * 3,
    });

    return `https://api.microlink.io/?${params}`;
  }, [height, imageSrc, isStatic, quality, url, width]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleMouseMove = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const targetRect = event.currentTarget.getBoundingClientRect();
    const eventOffsetX = event.clientX - targetRect.left;
    const offsetFromCenter = (eventOffsetX - targetRect.width / 2) / 2;

    x.set(offsetFromCenter);
  };

  return (
    <>
      {isMounted ? (
        <div className="hidden">
          <img alt="" height={height} src={previewSrc} width={width} />
        </div>
      ) : null}

      <HoverCardPrimitive.Root closeDelay={100} onOpenChange={setIsOpen} openDelay={50}>
        <HoverCardPrimitive.Trigger asChild>
          <a
            className={cn("font-medium text-foreground underline underline-offset-4", className)}
            data-link-preview-trigger
            href={url}
            onMouseMove={handleMouseMove}
            rel="noopener noreferrer"
            target="_blank"
          >
            {children}
          </a>
        </HoverCardPrimitive.Trigger>

        <HoverCardPrimitive.Portal>
          <HoverCardPrimitive.Content
            align="center"
            className="z-50 [transform-origin:var(--radix-hover-card-content-transform-origin)]"
            side="top"
            sideOffset={10}
          >
            <AnimatePresence>
              {isOpen ? (
                <motion.div
                  animate={{
                    opacity: 1,
                    scale: 1,
                    transition: {
                      damping: 20,
                      stiffness: 260,
                      type: "spring",
                    },
                    y: 0,
                  }}
                  className="rounded-lg shadow-xl"
                  exit={{ opacity: 0, scale: 0.6, y: 20 }}
                  initial={{ opacity: 0, scale: 0.6, y: 20 }}
                  style={{ x: translateX }}
                >
                  <a
                    className="block rounded-lg border border-neutral-200 bg-white p-1 text-[0px] shadow-sm transition-colors hover:border-neutral-300"
                    href={url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <img
                      alt=""
                      className="rounded-md"
                      data-layout={layout}
                      height={height}
                      src={previewSrc}
                      width={width}
                    />
                  </a>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </HoverCardPrimitive.Content>
        </HoverCardPrimitive.Portal>
      </HoverCardPrimitive.Root>
    </>
  );
}
