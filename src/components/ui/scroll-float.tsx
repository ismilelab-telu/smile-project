"use client";

import { useMemo, useRef, type ReactNode, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type ScrollFloatProps = {
  animationDuration?: number;
  children: ReactNode;
  containerClassName?: string;
  ease?: string;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  scrollEnd?: string;
  scrollStart?: string;
  stagger?: number;
  textClassName?: string;
  trailingAnchor?: ReactNode;
};

export function ScrollFloat({
  children,
  scrollContainerRef,
  containerClassName = "",
  textClassName = "",
  animationDuration = 1,
  ease = "back.inOut(2)",
  scrollStart = "center bottom+=50%",
  scrollEnd = "bottom bottom-=40%",
  stagger = 0.03,
  trailingAnchor,
}: ScrollFloatProps) {
  const containerRef = useRef<HTMLHeadingElement | null>(null);

  const splitText = useMemo(() => {
    const text = typeof children === "string" ? children : "";

    return text.split("").map((char, index) => {
      if (char === "\n") {
        return <br key={`line-break-${index}`} />;
      }

      return (
        <span className="inline-block word" key={`${char}-${index}`}>
          {char === " " ? "\u00A0" : char}
        </span>
      );
    });
  }, [children]);

  useGSAP(
    () => {
      const element = containerRef.current;
      if (!element) return;

      if (
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        gsap.set(element.querySelectorAll(".inline-block"), {
          opacity: 1,
          scaleX: 1,
          scaleY: 1,
          yPercent: 0,
        });
        return;
      }

      const scroller = scrollContainerRef?.current ?? window;
      const charElements = element.querySelectorAll(".inline-block");

      gsap.fromTo(
        charElements,
        {
          opacity: 0,
          scaleX: 0.7,
          scaleY: 2.3,
          transformOrigin: "50% 0%",
          willChange: "opacity, transform",
          yPercent: 120,
        },
        {
          duration: animationDuration,
          ease,
          opacity: 1,
          scaleX: 1,
          scaleY: 1,
          scrollTrigger: {
            end: scrollEnd,
            scroller,
            scrub: true,
            start: scrollStart,
            trigger: element,
          },
          stagger,
          yPercent: 0,
        },
      );
    },
    {
      dependencies: [animationDuration, ease, scrollContainerRef, scrollEnd, scrollStart, stagger],
      scope: containerRef,
    },
  );

  return (
    <h2 ref={containerRef} className={`my-5 overflow-hidden ${containerClassName}`}>
      <span className={`inline-block text-[clamp(1.6rem,4vw,3rem)] leading-[1.5] ${textClassName}`}>
        {splitText}
        {trailingAnchor}
      </span>
    </h2>
  );
}

export default ScrollFloat;
