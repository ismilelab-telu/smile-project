import { useEffect, useRef, useState, type CSSProperties, type ElementType } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText as GSAPSplitText } from "gsap/SplitText";

import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, GSAPSplitText, useGSAP);

type SplitTextElement = HTMLElement & {
  _rbsplitInstance?: InstanceType<typeof GSAPSplitText> | null;
};

type SplitTextProps = {
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  from?: gsap.TweenVars;
  id?: string;
  onLetterAnimationComplete?: () => void;
  replayOnEnter?: boolean;
  rootMargin?: string;
  splitType?: "chars" | "words" | "lines" | "words, chars";
  style?: CSSProperties;
  tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p";
  text?: string;
  textAlign?: CSSProperties["textAlign"];
  threshold?: number;
  to?: gsap.TweenVars;
} & Record<`data-${string}`, string | boolean | undefined>;

export function SplitText({
  className = "",
  delay = 50,
  duration = 1.25,
  ease = "power3.out",
  from = { opacity: 0, y: 40 },
  onLetterAnimationComplete,
  replayOnEnter = false,
  rootMargin = "-100px",
  splitType = "chars",
  style,
  tag = "p",
  text = "",
  textAlign = "center",
  threshold = 0.1,
  to = { opacity: 1, y: 0 },
  ...props
}: SplitTextProps) {
  const ref = useRef<SplitTextElement | null>(null);
  const animationCompletedRef = useRef(false);
  const onCompleteRef = useRef(onLetterAnimationComplete);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    onCompleteRef.current = onLetterAnimationComplete;
  }, [onLetterAnimationComplete]);

  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) {
      setFontsLoaded(true);
      return;
    }

    let isMounted = true;
    const fonts = document.fonts;

    if (fonts.status === "loaded") {
      setFontsLoaded(true);
    } else {
      void fonts.ready.then(() => {
        if (isMounted) {
          setFontsLoaded(true);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, []);

  useGSAP(
    () => {
      const element = ref.current;

      if (!element || !text || !fontsLoaded || (!replayOnEnter && animationCompletedRef.current)) {
        return;
      }

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        animationCompletedRef.current = true;
        return;
      }

      if (element._rbsplitInstance) {
        element._rbsplitInstance.revert();
        element._rbsplitInstance = null;
      }

      const startPct = (1 - threshold) * 100;
      const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin);
      const marginValue = marginMatch ? Number.parseFloat(marginMatch[1]) : 0;
      const marginUnit = marginMatch ? (marginMatch[2] ?? "px") : "px";
      const sign =
        marginValue === 0
          ? ""
          : marginValue < 0
            ? `-=${Math.abs(marginValue)}${marginUnit}`
            : `+=${marginValue}${marginUnit}`;
      const start = `top ${startPct}%${sign}`;
      let targets: Element[] = [];

      const splitInstance = new GSAPSplitText(element, {
        autoSplit: splitType === "lines",
        charsClass: "split-char",
        linesClass: "split-line",
        onSplit: (self) => {
          if (splitType.includes("chars") && self.chars.length > 0) {
            targets = self.chars;
          } else if (splitType.includes("words") && self.words.length > 0) {
            targets = self.words;
          } else if (splitType.includes("lines") && self.lines.length > 0) {
            targets = self.lines;
          } else {
            targets =
              self.chars.length > 0 ? self.chars : self.words.length > 0 ? self.words : self.lines;
          }

          if (replayOnEnter) {
            const tween = gsap.fromTo(targets, from, {
              ...to,
              duration,
              ease,
              force3D: true,
              onComplete: () => {
                onCompleteRef.current?.();
              },
              paused: true,
              stagger: delay / 1000,
              willChange: "transform, opacity",
            });

            ScrollTrigger.create({
              anticipatePin: 0.4,
              end: "bottom top",
              fastScrollEnd: true,
              onEnter: () => tween.restart(),
              onEnterBack: () => tween.restart(),
              onLeave: () => tween.pause(0),
              onLeaveBack: () => tween.pause(0),
              start,
              trigger: element,
            });

            return tween;
          }

          return gsap.fromTo(targets, from, {
            ...to,
            duration,
            ease,
            force3D: true,
            onComplete: () => {
              animationCompletedRef.current = true;
              onCompleteRef.current?.();
            },
            scrollTrigger: {
              anticipatePin: 0.4,
              fastScrollEnd: true,
              once: true,
              start,
              trigger: element,
            },
            stagger: delay / 1000,
            willChange: "transform, opacity",
          });
        },
        reduceWhiteSpace: false,
        smartWrap: true,
        type: splitType,
        wordsClass: "split-word",
      });

      element._rbsplitInstance = splitInstance;

      return () => {
        ScrollTrigger.getAll().forEach((scrollTrigger) => {
          if (scrollTrigger.trigger === element) {
            scrollTrigger.kill();
          }
        });

        splitInstance.revert();
        element._rbsplitInstance = null;
      };
    },
    {
      dependencies: [
        text,
        delay,
        duration,
        ease,
        splitType,
        JSON.stringify(from),
        JSON.stringify(to),
        threshold,
        rootMargin,
        fontsLoaded,
        replayOnEnter,
      ],
      scope: ref,
    },
  );

  const Tag = tag as ElementType;

  return (
    <Tag
      ref={ref}
      className={cn("split-parent", className)}
      style={{
        display: "inline-block",
        overflow: "hidden",
        textAlign,
        whiteSpace: "normal",
        willChange: "transform, opacity",
        wordWrap: "break-word",
        ...style,
      }}
      {...props}
    >
      {text}
    </Tag>
  );
}
