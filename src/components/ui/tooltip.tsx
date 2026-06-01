import { AnimatePresence, motion, type Transition } from "motion/react";
import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

type TooltipSide = "bottom" | "left" | "right" | "top";
type TooltipAlign = "center" | "end" | "start";
type TooltipLayout = boolean | "position" | "preserve-aspect" | "size";

type TooltipRegisteredContent = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  children: ReactNode;
  className?: string;
  layout: TooltipLayout;
  transition?: Transition;
};

type ActiveTooltip = {
  align: TooltipAlign;
  alignOffset: number;
  anchor: HTMLElement;
  content: TooltipRegisteredContent;
  id: string;
  side: TooltipSide;
  sideOffset: number;
};

type TooltipPosition = {
  left: number;
  top: number;
  transform: string;
};

type TooltipProviderContextValue = {
  activeId: string | null;
  closeDelay: number;
  hideTooltip: () => void;
  isOpen: boolean;
  keepTooltipOpen: () => void;
  openDelay: number;
  showTooltip: (tooltip: ActiveTooltip) => void;
  transition: Transition;
};

type TooltipContextValue = {
  align: TooltipAlign;
  alignOffset: number;
  contentId: string;
  contentRef: React.MutableRefObject<TooltipRegisteredContent | null>;
  side: TooltipSide;
  sideOffset: number;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
};

type TooltipProviderProps = {
  children: ReactNode;
  closeDelay?: number;
  openDelay?: number;
  transition?: Transition;
};

type TooltipProps = {
  align?: TooltipAlign;
  alignOffset?: number;
  children: ReactNode;
  side?: TooltipSide;
  sideOffset?: number;
};

type TooltipTriggerProps = ComponentPropsWithoutRef<"button"> & {
  asChild?: boolean;
};

type TooltipContentProps = ComponentPropsWithoutRef<"div"> & {
  layout?: TooltipLayout;
  transition?: Transition;
};

const defaultTooltipTransition = {
  damping: 35,
  stiffness: 300,
  type: "spring",
} satisfies Transition;

const TooltipProviderContext = createContext<TooltipProviderContextValue | null>(null);
const TooltipContext = createContext<TooltipContextValue | null>(null);

function useTooltipProvider() {
  const context = useContext(TooltipProviderContext);

  if (!context) {
    throw new Error("Tooltip components must be used inside TooltipProvider.");
  }

  return context;
}

function useTooltip() {
  const context = useContext(TooltipContext);

  if (!context) {
    throw new Error("Tooltip components must be used inside Tooltip.");
  }

  return context;
}

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) {
    return;
  }

  if (typeof ref === "function") {
    ref(value);
    return;
  }

  ref.current = value;
}

function composeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (value: T | null) => {
    refs.forEach((ref) => setRef(ref, value));
  };
}

function composeEventHandlers<Event extends { defaultPrevented: boolean }>(
  externalHandler: ((event: Event) => void) | undefined,
  internalHandler: (event: Event) => void,
) {
  return (event: Event) => {
    externalHandler?.(event);

    if (!event.defaultPrevented) {
      internalHandler(event);
    }
  };
}

function getAxisPosition({
  align,
  alignOffset,
  end,
  center,
  start,
}: {
  align: TooltipAlign;
  alignOffset: number;
  center: number;
  end: number;
  start: number;
}) {
  if (align === "start") {
    return {
      position: start + alignOffset,
      transform: "0%",
    };
  }

  if (align === "end") {
    return {
      position: end + alignOffset,
      transform: "-100%",
    };
  }

  return {
    position: center + alignOffset,
    transform: "-50%",
  };
}

function getTooltipPosition({
  align,
  alignOffset,
  anchor,
  side,
  sideOffset,
}: ActiveTooltip): TooltipPosition {
  const rect = anchor.getBoundingClientRect();
  const horizontal = getAxisPosition({
    align,
    alignOffset,
    center: rect.left + rect.width / 2,
    end: rect.right,
    start: rect.left,
  });
  const vertical = getAxisPosition({
    align,
    alignOffset,
    center: rect.top + rect.height / 2,
    end: rect.bottom,
    start: rect.top,
  });

  if (side === "bottom") {
    return {
      left: horizontal.position,
      top: rect.bottom + sideOffset,
      transform: `translate(${horizontal.transform}, 0)`,
    };
  }

  if (side === "left") {
    return {
      left: rect.left - sideOffset,
      top: vertical.position,
      transform: `translate(-100%, ${vertical.transform})`,
    };
  }

  if (side === "right") {
    return {
      left: rect.right + sideOffset,
      top: vertical.position,
      transform: `translate(0, ${vertical.transform})`,
    };
  }

  return {
    left: horizontal.position,
    top: rect.top - sideOffset,
    transform: `translate(${horizontal.transform}, -100%)`,
  };
}

export function TooltipProvider({
  children,
  closeDelay = 300,
  openDelay = 0,
  transition = defaultTooltipTransition,
}: TooltipProviderProps) {
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltip | null>(null);
  const [activeTooltipPosition, setActiveTooltipPosition] = useState<TooltipPosition | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const activeTooltipRef = useRef<ActiveTooltip | null>(null);
  const closeTimerRef = useRef<number | undefined>(undefined);
  const isOpenRef = useRef(false);
  const openTimerRef = useRef<number | undefined>(undefined);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current !== undefined) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = undefined;
    }

    if (closeTimerRef.current !== undefined) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
  }, []);

  const openActiveTooltip = useCallback(() => {
    isOpenRef.current = true;
    setIsOpen(true);
  }, []);

  const showTooltip = useCallback(
    (tooltip: ActiveTooltip) => {
      clearTimers();
      activeTooltipRef.current = tooltip;
      setActiveTooltip(tooltip);
      setActiveTooltipPosition(getTooltipPosition(tooltip));

      if (isOpenRef.current) {
        openActiveTooltip();
        return;
      }

      if (openDelay > 0) {
        openTimerRef.current = window.setTimeout(openActiveTooltip, openDelay);
        return;
      }

      openActiveTooltip();
    },
    [clearTimers, openActiveTooltip, openDelay],
  );

  const hideTooltip = useCallback(() => {
    if (openTimerRef.current !== undefined) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = undefined;
    }

    if (closeDelay > 0) {
      closeTimerRef.current = window.setTimeout(() => {
        isOpenRef.current = false;
        setIsOpen(false);
      }, closeDelay);
      return;
    }

    isOpenRef.current = false;
    setIsOpen(false);
  }, [closeDelay]);

  const keepTooltipOpen = useCallback(() => {
    clearTimers();
    if (activeTooltipRef.current) {
      openActiveTooltip();
    }
  }, [clearTimers, openActiveTooltip]);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        isOpenRef.current = false;
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !activeTooltip) {
      return;
    }

    const updatePosition = () => {
      setActiveTooltipPosition(getTooltipPosition(activeTooltip));
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [activeTooltip, isOpen]);

  const contextValue = useMemo(
    () => ({
      activeId: isOpen ? (activeTooltip?.id ?? null) : null,
      closeDelay,
      hideTooltip,
      isOpen,
      keepTooltipOpen,
      openDelay,
      showTooltip,
      transition,
    }),
    [
      activeTooltip?.id,
      closeDelay,
      hideTooltip,
      isOpen,
      keepTooltipOpen,
      openDelay,
      showTooltip,
      transition,
    ],
  );

  return (
    <TooltipProviderContext.Provider value={contextValue}>
      {children}
      {portalTarget
        ? createPortal(
            <AnimatePresence
              onExitComplete={() => {
                if (!isOpenRef.current) {
                  activeTooltipRef.current = null;
                  setActiveTooltip(null);
                }
              }}
            >
              {isOpen && activeTooltip && activeTooltipPosition
                ? (() => {
                    const {
                      children: tooltipChildren,
                      className,
                      layout,
                      onMouseEnter,
                      onMouseLeave,
                      transition: contentTransition,
                      ...contentProps
                    } = activeTooltip.content;

                    return (
                      <div
                        className="z-[80]"
                        onMouseEnter={keepTooltipOpen}
                        onMouseLeave={hideTooltip}
                        style={{
                          left: activeTooltipPosition.left,
                          position: "fixed",
                          top: activeTooltipPosition.top,
                          transform: activeTooltipPosition.transform,
                        }}
                      >
                        <motion.div
                          animate={{ filter: "blur(0px)", opacity: 1 }}
                          className={cn(
                            "max-w-[min(20rem,calc(100vw-1rem))] border border-neutral-950 bg-neutral-100 px-3 py-2 text-xs leading-5 font-medium text-neutral-950 shadow-[4px_4px_0_0_rgba(10,10,10,0.18)]",
                            className,
                          )}
                          exit={{ filter: "blur(2px)", opacity: 0 }}
                          id={activeTooltip.id}
                          initial={{ filter: "blur(2px)", opacity: 0 }}
                          key="shared-tooltip"
                          layout={layout}
                          role="tooltip"
                          transition={contentTransition ?? transition}
                          {...contentProps}
                          onMouseEnter={composeEventHandlers(onMouseEnter, keepTooltipOpen)}
                          onMouseLeave={composeEventHandlers(onMouseLeave, hideTooltip)}
                        >
                          {tooltipChildren}
                        </motion.div>
                      </div>
                    );
                  })()
                : null}
            </AnimatePresence>,
            portalTarget,
          )
        : null}
    </TooltipProviderContext.Provider>
  );
}

export function Tooltip({
  align = "center",
  alignOffset = 0,
  children,
  side = "top",
  sideOffset = 10,
}: TooltipProps) {
  const contentId = useId();
  const contentRef = useRef<TooltipRegisteredContent | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const contextValue = useMemo(
    () => ({
      align,
      alignOffset,
      contentId,
      contentRef,
      side,
      sideOffset,
      triggerRef,
    }),
    [align, alignOffset, contentId, side, sideOffset],
  );

  return <TooltipContext.Provider value={contextValue}>{children}</TooltipContext.Provider>;
}

export function TooltipTrigger({ asChild, children, ...props }: TooltipTriggerProps) {
  const { activeId, hideTooltip, showTooltip } = useTooltipProvider();
  const { align, alignOffset, contentId, contentRef, side, sideOffset, triggerRef } = useTooltip();
  const openTooltip = useCallback(() => {
    const anchor = triggerRef.current;
    const content = contentRef.current;

    if (!anchor || !content) {
      return;
    }

    showTooltip({
      align,
      alignOffset,
      anchor,
      content,
      id: contentId,
      side,
      sideOffset,
    });
  }, [align, alignOffset, contentId, contentRef, showTooltip, side, sideOffset, triggerRef]);
  const setTriggerRef = useCallback(
    (value: HTMLElement | null) => {
      triggerRef.current = value;
    },
    [triggerRef],
  );

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<
      ComponentPropsWithoutRef<"span"> & { ref?: Ref<HTMLElement> }
    >;

    return cloneElement(child, {
      "aria-describedby": activeId === contentId ? contentId : undefined,
      onBlur: composeEventHandlers(child.props.onBlur, hideTooltip),
      onFocus: composeEventHandlers(child.props.onFocus, openTooltip),
      onMouseEnter: composeEventHandlers(child.props.onMouseEnter, openTooltip),
      onMouseLeave: composeEventHandlers(child.props.onMouseLeave, hideTooltip),
      ref: composeRefs(child.props.ref, setTriggerRef),
    });
  }

  return (
    <button
      aria-describedby={activeId === contentId ? contentId : undefined}
      ref={setTriggerRef}
      type="button"
      {...props}
      onBlur={composeEventHandlers(props.onBlur, hideTooltip)}
      onFocus={composeEventHandlers(props.onFocus, openTooltip)}
      onMouseEnter={composeEventHandlers(props.onMouseEnter, openTooltip)}
      onMouseLeave={composeEventHandlers(props.onMouseLeave, hideTooltip)}
    >
      {children}
    </button>
  );
}

export function TooltipContent({
  children,
  className,
  layout = "preserve-aspect",
  transition,
  ...props
}: TooltipContentProps) {
  const { contentRef } = useTooltip();

  contentRef.current = {
    ...props,
    children,
    className,
    layout,
    transition,
  };

  return null;
}
