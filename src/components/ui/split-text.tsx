import { useEffect, useRef, useState, type CSSProperties, type ElementType } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText as GSAPSplitText } from "gsap/SplitText";

import { shouldReduceMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, GSAPSplitText, useGSAP);

type SplitTextElement = HTMLElement & {
  _rbsplitInstance?: InstanceType<typeof GSAPSplitText> | null;
};

type SplitTextTarget = "chars" | "words" | "lines";

type SplitTextProps = {
  animateTarget?: SplitTextTarget;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  from?: gsap.TweenVars;
  id?: string;
  mask?: SplitTextTarget;
  onLetterAnimationComplete?: () => void;
  onLetterAnimationHalfway?: () => void;
  replayOnEnter?: boolean;
  rootMargin?: string;
  splitType?: "chars" | "words" | "lines" | "words, chars" | "words,lines";
  startAnimation?: boolean;
  triggerOnScroll?: boolean;
  style?: CSSProperties;
  tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p";
  text?: string;
  textAlign?: CSSProperties["textAlign"];
  threshold?: number;
  to?: gsap.TweenVars;
} & Record<`data-${string}`, string | boolean | undefined>;

export function SplitText({
  animateTarget,
  className = "",
  delay = 50,
  duration = 1.25,
  ease = "power3.out",
  from = { opacity: 0, y: 40 },
  mask,
  onLetterAnimationComplete,
  onLetterAnimationHalfway,
  replayOnEnter = false,
  rootMargin = "-100px",
  splitType = "chars",
  startAnimation = true,
  triggerOnScroll = true,
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
  const animationHalfwayRef = useRef(false);
  const onCompleteRef = useRef(onLetterAnimationComplete);
  const onHalfwayRef = useRef(onLetterAnimationHalfway);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    onCompleteRef.current = onLetterAnimationComplete;
  }, [onLetterAnimationComplete]);

  useEffect(() => {
    onHalfwayRef.current = onLetterAnimationHalfway;
  }, [onLetterAnimationHalfway]);

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

      if (!element || !text) {
        return;
      }

      if (!fontsLoaded || !startAnimation) {
        gsap.set(element, { autoAlpha: 0 });
        return;
      }

      if (!replayOnEnter && animationCompletedRef.current) {
        return;
      }

      if (shouldReduceMotion()) {
        gsap.set(element, { autoAlpha: 1, clearProps: "transform" });
        animationHalfwayRef.current = true;
        animationCompletedRef.current = true;
        onHalfwayRef.current?.();
        onCompleteRef.current?.();
        return;
      }

      if (element._rbsplitInstance) {
        element._rbsplitInstance.revert();
        element._rbsplitInstance = null;
      }

      gsap.set(element, { autoAlpha: 1 });
      animationHalfwayRef.current = false;

      const handleAnimationUpdate = (animation: gsap.core.Animation) => {
        if (!animationHalfwayRef.current && animation.progress() >= 0.5) {
          animationHalfwayRef.current = true;
          onHalfwayRef.current?.();
        }
      };

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
        autoSplit: splitType.includes("lines"),
        charsClass: "split-char",
        linesClass: "split-line",
        mask,
        onSplit: (self) => {
          if (animateTarget && self[animateTarget].length > 0) {
            targets = self[animateTarget];
          } else if (splitType.includes("chars") && self.chars.length > 0) {
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
            const resetTween = () => {
              animationHalfwayRef.current = false;
              tween.pause(0);
            };
            const tween = gsap.fromTo(targets, from, {
              ...to,
              duration,
              ease,
              force3D: true,
              onComplete: () => {
                onCompleteRef.current?.();
              },
              onUpdate() {
                handleAnimationUpdate(this);
              },
              paused: true,
              stagger: delay / 1000,
              willChange: "transform, opacity",
            });

            ScrollTrigger.create({
              anticipatePin: 0.4,
              end: "bottom top",
              fastScrollEnd: true,
              onEnter: () => {
                animationHalfwayRef.current = false;
                tween.restart();
              },
              onEnterBack: () => {
                animationHalfwayRef.current = false;
                tween.restart();
              },
              onLeave: resetTween,
              onLeaveBack: resetTween,
              start,
              trigger: element,
            });

            return tween;
          }

          const tweenVars: gsap.TweenVars = {
            ...to,
            duration,
            ease,
            force3D: true,
            onComplete: () => {
              animationCompletedRef.current = true;
              onCompleteRef.current?.();
            },
            onUpdate() {
              handleAnimationUpdate(this);
            },
            stagger: delay / 1000,
            willChange: "transform, opacity",
          };

          if (triggerOnScroll) {
            tweenVars.scrollTrigger = {
              anticipatePin: 0.4,
              fastScrollEnd: true,
              once: true,
              start,
              trigger: element,
            };
          }

          return gsap.fromTo(targets, from, tweenVars);
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
        animateTarget,
        mask,
        splitType,
        startAnimation,
        triggerOnScroll,
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
