import { useMemo, useRef, type ReactNode, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { shouldReduceMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type ScrollRevealProps = {
  baseOpacity?: number;
  baseRotation?: number;
  blurStrength?: number;
  children: ReactNode;
  containerClassName?: string;
  enableBlur?: boolean;
  rotationEnd?: string;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  textClassName?: string;
  wordAnimationEnd?: string;
};

export function ScrollReveal({
  children,
  scrollContainerRef,
  enableBlur = true,
  baseOpacity = 0.1,
  baseRotation = 3,
  blurStrength = 4,
  containerClassName = "",
  textClassName = "",
  rotationEnd = "bottom bottom",
  wordAnimationEnd = "bottom bottom",
}: ScrollRevealProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const splitText = useMemo(() => {
    if (typeof children !== "string") {
      return children;
    }

    return children.split(/(\s+)/).map((word, index) => {
      if (/^\s+$/.test(word)) {
        return word;
      }

      return (
        <span className="word inline-block" key={`${word}-${index}`}>
          {word}
        </span>
      );
    });
  }, [children]);

  useGSAP(
    () => {
      const element = containerRef.current;

      if (!element) {
        return;
      }

      const wordElements = element.querySelectorAll<HTMLElement>(".word");

      if (shouldReduceMotion()) {
        gsap.set(element, { clearProps: "transform", rotate: 0 });
        gsap.set(wordElements, {
          clearProps: "filter,opacity,willChange",
          filter: "blur(0px)",
          opacity: 1,
        });
        return;
      }

      const scroller = scrollContainerRef?.current ?? window;

      gsap.fromTo(
        element,
        { rotate: baseRotation, transformOrigin: "0% 50%" },
        {
          ease: "none",
          rotate: 0,
          scrollTrigger: {
            end: rotationEnd,
            scrub: true,
            scroller,
            start: "top bottom",
            trigger: element,
          },
        },
      );

      gsap.fromTo(
        wordElements,
        { opacity: baseOpacity, willChange: "opacity" },
        {
          ease: "none",
          opacity: 1,
          scrollTrigger: {
            end: wordAnimationEnd,
            scrub: true,
            scroller,
            start: "top bottom-=20%",
            trigger: element,
          },
          stagger: 0.05,
        },
      );

      if (enableBlur) {
        gsap.fromTo(
          wordElements,
          { filter: `blur(${blurStrength}px)` },
          {
            ease: "none",
            filter: "blur(0px)",
            scrollTrigger: {
              end: wordAnimationEnd,
              scrub: true,
              scroller,
              start: "top bottom-=20%",
              trigger: element,
            },
            stagger: 0.05,
          },
        );
      }
    },
    {
      dependencies: [
        baseOpacity,
        baseRotation,
        blurStrength,
        enableBlur,
        rotationEnd,
        scrollContainerRef,
        wordAnimationEnd,
      ],
      scope: containerRef,
    },
  );

  return (
    <div className={cn("my-5", containerClassName)} ref={containerRef}>
      <p className={textClassName || "text-[clamp(1.6rem,4vw,3rem)] leading-[1.5] font-semibold"}>
        {splitText}
      </p>
    </div>
  );
}

export default ScrollReveal;
