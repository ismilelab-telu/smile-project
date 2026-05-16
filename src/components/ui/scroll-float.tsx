"use client";

import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import "./scroll-float.css";

gsap.registerPlugin(ScrollTrigger);

type ScrollFloatProps = {
  animationDuration?: number;
  children: ReactNode;
  containerClassName?: string;
  ease?: string;
  pin?: boolean;
  pinDuration?: string;
  pinStart?: string;
  scrub?: boolean | number;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  scrollEnd?: string;
  scrollStart?: string;
  stagger?: number;
  textClassName?: string;
};

export function ScrollFloat({
  children,
  scrollContainerRef,
  containerClassName = "",
  textClassName = "",
  animationDuration = 1,
  ease = "back.inOut(2)",
  pin = false,
  pinDuration = "+=180%",
  pinStart = "center center",
  scrub = true,
  scrollStart = "center bottom+=50%",
  scrollEnd = "bottom bottom-=40%",
  stagger = 0.03,
}: ScrollFloatProps) {
  const containerRef = useRef<HTMLHeadingElement | null>(null);

  const splitText = useMemo(() => {
    const text = typeof children === "string" ? children : "";
    return text.split(" ").map((word, wordIndex, words) => (
      <span className="word" key={`${word}-${wordIndex}`}>
        {word.split("").map((char, charIndex) => (
          <span className="char" key={`${char}-${wordIndex}-${charIndex}`}>
            {char}
          </span>
        ))}
        {wordIndex < words.length - 1 ? <span className="char">&nbsp;</span> : null}
      </span>
    ));
  }, [children]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      gsap.set(element.querySelectorAll(".char"), {
        opacity: 1,
        scaleX: 1,
        scaleY: 1,
        yPercent: 0,
      });
      return;
    }

    const ctx = gsap.context(() => {
      const scroller = scrollContainerRef?.current ?? window;
      const charElements = element.querySelectorAll(".char");

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
            anticipatePin: pin ? 0.8 : undefined,
            end: pin ? pinDuration : scrollEnd,
            invalidateOnRefresh: true,
            pin: pin ? element : false,
            pinSpacing: pin,
            scroller,
            scrub,
            start: pin ? pinStart : scrollStart,
            trigger: element,
          },
          stagger,
          yPercent: 0,
        },
      );
    }, element);

    return () => ctx.revert();
  }, [
    animationDuration,
    ease,
    pin,
    pinDuration,
    pinStart,
    scrollContainerRef,
    scrollEnd,
    scrollStart,
    scrub,
    stagger,
  ]);

  return (
    <h2 ref={containerRef} className={`scroll-float ${containerClassName}`}>
      <span className={`scroll-float-text ${textClassName}`}>{splitText}</span>
    </h2>
  );
}

export default ScrollFloat;
