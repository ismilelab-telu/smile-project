import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ElementType,
} from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

type AnimationSnapshot = Partial<Record<"filter" | "opacity" | "y", number | string>>;
type BlurTextAnimationUnit = "words" | "letters" | "sentence";

type BlurTextProps<TElement extends ElementType = "p"> = {
  animateBy?: BlurTextAnimationUnit;
  animationFrom?: AnimationSnapshot;
  animationTo?: AnimationSnapshot[];
  as?: TElement;
  className?: string;
  delay?: number;
  direction?: "top" | "bottom";
  easing?: (progress: number) => number;
  onAnimationComplete?: () => void;
  replayKey?: number | string;
  rootMargin?: string;
  segmentClassName?: string;
  startAnimation?: boolean;
  stepDuration?: number;
  text?: string;
  threshold?: number;
} & Omit<ComponentPropsWithoutRef<TElement>, "children" | "className">;

const buildKeyframes = (from: AnimationSnapshot, steps: AnimationSnapshot[]) => {
  const keys = new Set([
    ...Object.keys(from),
    ...steps.flatMap((step) => Object.keys(step)),
  ] as Array<keyof AnimationSnapshot>);

  const keyframes: Record<string, Array<number | string | undefined>> = {};

  keys.forEach((key) => {
    keyframes[key] = [from[key], ...steps.map((step) => step[key])];
  });

  return keyframes;
};

const splitTextByAnimationUnit = (text: string, animateBy: BlurTextAnimationUnit) => {
  if (animateBy === "sentence") {
    return [text];
  }

  return animateBy === "words" ? text.split(" ") : text.split("");
};

export function BlurText<TElement extends ElementType = "p">({
  animateBy = "words",
  animationFrom,
  animationTo,
  as,
  className,
  delay = 200,
  direction = "top",
  easing = (progress) => progress,
  onAnimationComplete,
  replayKey = 0,
  rootMargin = "0px",
  segmentClassName,
  startAnimation,
  stepDuration = 0.35,
  text = "",
  threshold = 0.1,
  ...props
}: BlurTextProps<TElement>) {
  const Component = as ?? "p";
  const elements = useMemo(() => splitTextByAnimationUnit(text, animateBy), [animateBy, text]);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (startAnimation !== undefined) {
      setInView(startAnimation);
      return;
    }

    const element = ref.current;

    if (!element) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(element);
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [rootMargin, startAnimation, threshold]);

  const defaultFrom = useMemo(
    () =>
      direction === "top"
        ? { filter: "blur(10px)", opacity: 0, y: -50 }
        : { filter: "blur(10px)", opacity: 0, y: 50 },
    [direction],
  );

  const defaultTo = useMemo(
    () => [
      {
        filter: "blur(5px)",
        opacity: 0.5,
        y: direction === "top" ? 5 : -5,
      },
      { filter: "blur(0px)", opacity: 1, y: 0 },
    ],
    [direction],
  );

  const fromSnapshot = animationFrom ?? defaultFrom;
  const toSnapshots = animationTo ?? defaultTo;
  const stepCount = toSnapshots.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times = Array.from({ length: stepCount }, (_, index) =>
    stepCount === 1 ? 0 : index / (stepCount - 1),
  );

  return (
    <Component
      ref={ref}
      className={cn("flex flex-wrap", className)}
      {...(props as ComponentPropsWithoutRef<TElement>)}
    >
      {elements.map((segment, index) => {
        const animateKeyframes = buildKeyframes(fromSnapshot, toSnapshots);
        const spanTransition = {
          delay: (index * delay) / 1000,
          duration: totalDuration,
          ease: easing,
          times,
        };

        return (
          <motion.span
            animate={inView ? animateKeyframes : fromSnapshot}
            className={cn("inline-block will-change-[transform,filter,opacity]", segmentClassName)}
            initial={fromSnapshot}
            key={`${replayKey}-${segment}-${index}`}
            onAnimationComplete={
              index === elements.length - 1 && inView ? onAnimationComplete : undefined
            }
            transition={spanTransition}
          >
            {segment === " " ? "\u00A0" : segment}
            {animateBy === "words" && index < elements.length - 1 ? "\u00A0" : null}
          </motion.span>
        );
      })}
    </Component>
  );
}
