import { type HTMLAttributes, type ReactNode, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type AnimatedContentProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  animateOpacity?: boolean;
  children: ReactNode;
  container?: HTMLElement | string | null;
  delay?: number;
  disappearAfter?: number;
  disappearDuration?: number;
  disappearEase?: string;
  distance?: number;
  direction?: "horizontal" | "vertical";
  duration?: number;
  ease?: string;
  initialOpacity?: number;
  onComplete?: () => void;
  onDisappearanceComplete?: () => void;
  once?: boolean;
  reverse?: boolean;
  resetOnLeaveBack?: boolean;
  scale?: number;
  threshold?: number;
};

export default function AnimatedContent({
  animateOpacity = true,
  children,
  className = "",
  container = null,
  delay = 0,
  disappearAfter = 0,
  disappearDuration = 0.5,
  disappearEase = "power3.in",
  distance = 100,
  direction = "vertical",
  duration = 0.8,
  ease = "power3.out",
  initialOpacity = 0,
  once = true,
  onComplete,
  onDisappearanceComplete,
  reverse = false,
  resetOnLeaveBack = false,
  scale = 1,
  threshold = 0.1,
  ...props
}: AnimatedContentProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      gsap.set(element, {
        opacity: 1,
        scale: 1,
        visibility: "visible",
        x: 0,
        y: 0,
      });
      onComplete?.();
      return;
    }

    let scrollerTarget = container || document.getElementById("snap-main-container") || null;

    if (typeof scrollerTarget === "string") {
      scrollerTarget = document.querySelector<HTMLElement>(scrollerTarget);
    }

    const axis = direction === "horizontal" ? "x" : "y";
    const offset = reverse ? -distance : distance;
    const startPct = (1 - threshold) * 100;

    const initialState = {
      [axis]: offset,
      opacity: animateOpacity ? initialOpacity : 1,
      scale,
      visibility: "visible",
    };

    gsap.set(element, initialState);

    const timeline = gsap.timeline({
      delay,
      onComplete: () => {
        onComplete?.();

        if (disappearAfter > 0) {
          gsap.to(element, {
            [axis]: reverse ? distance : -distance,
            delay: disappearAfter,
            duration: disappearDuration,
            ease: disappearEase,
            onComplete: () => onDisappearanceComplete?.(),
            opacity: animateOpacity ? initialOpacity : 0,
            scale: 0.8,
          });
        }
      },
      paused: true,
    });

    timeline.to(element, {
      [axis]: 0,
      duration,
      ease,
      opacity: 1,
      scale: 1,
    });

    const resetTimeline = () => {
      timeline.pause(0);
      gsap.set(element, initialState);
    };

    const playTimeline = () => {
      timeline.restart(true);
    };

    const scrollTrigger = ScrollTrigger.create({
      onEnter: playTimeline,
      onEnterBack: once || resetOnLeaveBack ? undefined : playTimeline,
      onLeaveBack: resetOnLeaveBack ? resetTimeline : undefined,
      once: once && !resetOnLeaveBack,
      scroller: scrollerTarget || undefined,
      start: `top ${startPct}%`,
      trigger: element,
    });

    return () => {
      scrollTrigger.kill();
      timeline.kill();
      gsap.killTweensOf(element);
    };
  }, [
    animateOpacity,
    container,
    delay,
    disappearAfter,
    disappearDuration,
    disappearEase,
    direction,
    distance,
    duration,
    ease,
    initialOpacity,
    onComplete,
    onDisappearanceComplete,
    once,
    reverse,
    resetOnLeaveBack,
    scale,
    threshold,
  ]);

  return (
    <div className={`invisible ${className}`} ref={ref} {...props}>
      {children}
    </div>
  );
}
