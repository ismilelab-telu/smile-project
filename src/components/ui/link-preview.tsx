"use client";

import { encode } from "qss";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  type SpringOptions,
} from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
  type MouseEvent,
} from "react";

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

type LinkPreviewItem = {
  height: number;
  id: string;
  layout: string;
  previewSrc: string;
  url: string;
  width: number;
};

type LinkPreviewContextValue = {
  hidePreview: (id?: string) => void;
  keepPreviewOpen: () => void;
  movePreview: (id: string, anchor: HTMLElement, clientX: number) => void;
  showPreview: (item: LinkPreviewItem, anchor: HTMLElement, clientX?: number) => void;
};

const previewSpringConfig = { damping: 24, stiffness: 210 } satisfies SpringOptions;
const cursorSpringConfig = { damping: 15, stiffness: 100 } satisfies SpringOptions;
const previewViewportPadding = 12;
const previewGap = 14;
const previewHideDelayMs = 140;
const previewExitDelayMs = 180;

const LinkPreviewContext = createContext<LinkPreviewContextValue | null>(null);

function getPreviewSource({
  height,
  imageSrc,
  isStatic,
  quality,
  url,
  width,
}: Pick<LinkPreviewProps, "height" | "imageSrc" | "isStatic" | "quality" | "url" | "width"> & {
  height: number;
  quality: number;
  width: number;
}) {
  if (isStatic && imageSrc) {
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
}

function getClampedPreviewPosition(anchor: HTMLElement, item: LinkPreviewItem) {
  const rect = anchor.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxX = Math.max(
    previewViewportPadding,
    viewportWidth - item.width - previewViewportPadding,
  );
  const centeredX = rect.left + rect.width / 2 - item.width / 2;
  const x = Math.min(Math.max(centeredX, previewViewportPadding), maxX);
  const yAbove = rect.top - item.height - previewGap;
  const yBelow = rect.bottom + previewGap;
  const fitsAbove = yAbove >= previewViewportPadding;
  const maxY = Math.max(
    previewViewportPadding,
    viewportHeight - item.height - previewViewportPadding,
  );
  const preferredY = fitsAbove ? yAbove : yBelow;
  const y = Math.min(Math.max(preferredY, previewViewportPadding), maxY);

  return { x, y };
}

export function LinkPreviewProvider({ children }: { children: ReactNode }) {
  const [activePreview, setActivePreview] = useState<LinkPreviewItem | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const activePreviewRef = useRef<LinkPreviewItem | null>(null);
  const activeAnchorRef = useRef<HTMLElement | null>(null);
  const isVisibleRef = useRef(false);
  const hideTimerRef = useRef<number | undefined>(undefined);
  const clearTimerRef = useRef<number | undefined>(undefined);
  const previewX = useMotionValue(0);
  const previewY = useMotionValue(0);
  const cursorX = useMotionValue(0);
  const springX = useSpring(previewX, previewSpringConfig);
  const springY = useSpring(previewY, previewSpringConfig);
  const springCursorX = useSpring(cursorX, cursorSpringConfig);

  const clearTimers = useCallback(() => {
    if (hideTimerRef.current !== undefined) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = undefined;
    }

    if (clearTimerRef.current !== undefined) {
      window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = undefined;
    }
  }, []);

  const updatePosition = useCallback(
    (anchor: HTMLElement, item: LinkPreviewItem, immediate = false) => {
      const nextPosition = getClampedPreviewPosition(anchor, item);

      if (immediate) {
        previewX.jump(nextPosition.x);
        previewY.jump(nextPosition.y);
        springX.jump(nextPosition.x);
        springY.jump(nextPosition.y);
        return;
      }

      previewX.set(nextPosition.x);
      previewY.set(nextPosition.y);
    },
    [previewX, previewY, springX, springY],
  );

  const updateCursorOffset = useCallback(
    (anchor: HTMLElement, clientX?: number) => {
      if (clientX === undefined) {
        cursorX.jump(0);
        springCursorX.jump(0);
        cursorX.set(0);
        return;
      }

      const targetRect = anchor.getBoundingClientRect();
      const eventOffsetX = clientX - targetRect.left;
      const offsetFromCenter = (eventOffsetX - targetRect.width / 2) / 2;

      if (!isVisibleRef.current) {
        cursorX.jump(offsetFromCenter);
        springCursorX.jump(offsetFromCenter);
        return;
      }

      cursorX.set(offsetFromCenter);
    },
    [cursorX, springCursorX],
  );

  const keepPreviewOpen = useCallback(() => {
    clearTimers();
  }, [clearTimers]);

  const showPreview = useCallback(
    (item: LinkPreviewItem, anchor: HTMLElement, clientX?: number) => {
      clearTimers();
      const shouldJumpToAnchor = !isVisibleRef.current || activePreviewRef.current === null;

      activePreviewRef.current = item;
      activeAnchorRef.current = anchor;
      setActivePreview(item);
      updatePosition(anchor, item, shouldJumpToAnchor);
      updateCursorOffset(anchor, clientX);
      isVisibleRef.current = true;
      setIsVisible(true);
    },
    [clearTimers, updateCursorOffset, updatePosition],
  );

  const movePreview = useCallback(
    (id: string, anchor: HTMLElement, clientX: number) => {
      const activePreviewItem = activePreviewRef.current;

      if (!activePreviewItem || activePreviewItem.id !== id) {
        return;
      }

      activeAnchorRef.current = anchor;
      updatePosition(anchor, activePreviewItem);
      updateCursorOffset(anchor, clientX);
    },
    [updateCursorOffset, updatePosition],
  );

  const hidePreview = useCallback((id?: string) => {
    if (id && activePreviewRef.current?.id !== id) {
      return;
    }

    if (hideTimerRef.current !== undefined) {
      window.clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = window.setTimeout(() => {
      isVisibleRef.current = false;
      setIsVisible(false);
      activeAnchorRef.current = null;
      hideTimerRef.current = undefined;
      clearTimerRef.current = window.setTimeout(() => {
        activePreviewRef.current = null;
        setActivePreview(null);
        clearTimerRef.current = undefined;
      }, previewExitDelayMs);
    }, previewHideDelayMs);
  }, []);

  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }

    const syncActivePosition = () => {
      const activePreviewItem = activePreviewRef.current;
      const activeAnchor = activeAnchorRef.current;

      if (activePreviewItem && activeAnchor) {
        updatePosition(activeAnchor, activePreviewItem);
      }
    };

    window.addEventListener("resize", syncActivePosition);
    window.addEventListener("scroll", syncActivePosition, true);

    return () => {
      window.removeEventListener("resize", syncActivePosition);
      window.removeEventListener("scroll", syncActivePosition, true);
    };
  }, [isVisible, updatePosition]);

  useEffect(
    () => () => {
      clearTimers();
    },
    [clearTimers],
  );

  const contextValue = useMemo(
    () => ({
      hidePreview,
      keepPreviewOpen,
      movePreview,
      showPreview,
    }),
    [hidePreview, keepPreviewOpen, movePreview, showPreview],
  );

  return (
    <LinkPreviewContext.Provider value={contextValue}>
      {children}
      <AnimatePresence>
        {activePreview && isVisible ? (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="fixed top-0 left-0 z-50 rounded-lg shadow-xl"
            data-link-preview-card
            exit={{ opacity: 0, scale: 0.92 }}
            initial={{ opacity: 0, scale: 0.92 }}
            onMouseEnter={keepPreviewOpen}
            onMouseLeave={() => hidePreview()}
            style={{ x: springX, y: springY }}
            transition={{ damping: 20, stiffness: 260, type: "spring" }}
          >
            <motion.a
              className="block rounded-lg border border-neutral-200 bg-white p-1 text-[0px] shadow-sm transition-colors hover:border-neutral-300"
              href={activePreview.url}
              onMouseDown={() => hidePreview()}
              rel="noopener noreferrer"
              style={{ x: springCursorX }}
              target="_blank"
            >
              <img
                alt=""
                className="rounded-md"
                data-layout={activePreview.layout}
                height={activePreview.height}
                src={activePreview.previewSrc}
                width={activePreview.width}
              />
            </motion.a>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </LinkPreviewContext.Provider>
  );
}

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
  const linkPreviewContext = useContext(LinkPreviewContext);
  const generatedId = useId();
  const previewSrc = useMemo(
    () =>
      getPreviewSource({
        height,
        imageSrc,
        isStatic,
        quality,
        url,
        width,
      }),
    [height, imageSrc, isStatic, quality, url, width],
  );

  const previewItem = useMemo(
    () => ({
      height,
      id: generatedId,
      layout,
      previewSrc,
      url,
      width,
    }),
    [generatedId, height, layout, previewSrc, url, width],
  );

  const handleMouseEnter = (event: MouseEvent<HTMLAnchorElement>) => {
    linkPreviewContext?.showPreview(previewItem, event.currentTarget, event.clientX);
  };

  const handleMouseMove = (event: MouseEvent<HTMLAnchorElement>) => {
    linkPreviewContext?.movePreview(previewItem.id, event.currentTarget, event.clientX);
  };

  const handleFocus = (event: FocusEvent<HTMLAnchorElement>) => {
    linkPreviewContext?.showPreview(previewItem, event.currentTarget);
  };

  return (
    <>
      <div className="hidden">
        <img alt="" height={height} src={previewSrc} width={width} />
      </div>
      <a
        className={cn("font-medium text-foreground underline underline-offset-4", className)}
        data-link-preview-trigger
        href={url}
        onBlur={() => linkPreviewContext?.hidePreview(previewItem.id)}
        onFocus={handleFocus}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            linkPreviewContext?.hidePreview(previewItem.id);
          }
        }}
        onMouseDown={() => linkPreviewContext?.hidePreview(previewItem.id)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => linkPreviewContext?.hidePreview(previewItem.id)}
        onMouseMove={handleMouseMove}
        rel="noopener noreferrer"
        target="_blank"
      >
        {children}
      </a>
    </>
  );
}
