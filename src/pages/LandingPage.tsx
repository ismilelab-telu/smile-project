import { type SVGProps, useCallback, useEffect, useRef, useState } from "react";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText as GSAPSplitText } from "gsap/SplitText";

import { LandingIntroAxes } from "@/components/LandingIntroAxes";
import { LandingIntroDots } from "@/components/LandingIntroDots";
import { LandingIntroHands } from "@/components/LandingIntroHands";
import { LandingIntroRegressionLine } from "@/components/LandingIntroRegressionLine";
import { DeferredCinematicFooter } from "@/components/DeferredCinematicFooter";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { GlassSurface } from "@/components/ui/glass-surface";
import { OrchestratedEaseReverseMenu } from "@/components/ui/orchestrated-ease-reverse-menu";
import { SplitText } from "@/components/ui/split-text";
import { shouldReduceMotion } from "@/lib/motion";

gsap.registerPlugin(useGSAP, DrawSVGPlugin, ScrollTrigger, GSAPSplitText);

const introEyebrow = "Introducing";
const introTitle = "Interactive ML Playground";
const introSubtitleCopy =
  "A visual-first playground for exploring how machine learning models learn.";
const blackBoxCodeSegments = [
  [
    { className: "text-fuchsia-300", text: "from" },
    { text: " " },
    { className: "text-sky-300", text: "sklearn.model_selection" },
    { text: " " },
    { className: "text-fuchsia-300", text: "import" },
    { text: " " },
    { className: "text-emerald-300", text: "train_test_split" },
  ],
  [
    { className: "text-fuchsia-300", text: "from" },
    { text: " " },
    { className: "text-sky-300", text: "sklearn.linear_model" },
    { text: " " },
    { className: "text-fuchsia-300", text: "import" },
    { text: " " },
    { className: "text-emerald-300", text: "LinearRegression" },
  ],
  [],
  [
    { className: "text-neutral-100", text: "X_train" },
    { className: "text-neutral-500", text: ", " },
    { className: "text-neutral-100", text: "X_test" },
    { className: "text-neutral-500", text: ", " },
    { className: "text-neutral-100", text: "y_train" },
    { className: "text-neutral-500", text: ", " },
    { className: "text-neutral-100", text: "y_test" },
    { text: " " },
    { className: "text-fuchsia-300", text: "=" },
    { text: " " },
    { className: "text-emerald-300", text: "train_test_split" },
    { className: "text-neutral-500", text: "(" },
    { className: "text-neutral-100", text: "X" },
    { className: "text-neutral-500", text: ", " },
    { className: "text-neutral-100", text: "y" },
    { className: "text-neutral-500", text: ")" },
  ],
  [],
  [
    { className: "text-neutral-100", text: "model" },
    { text: " " },
    { className: "text-fuchsia-300", text: "=" },
    { text: " " },
    { className: "text-emerald-300", text: "LinearRegression" },
    { className: "text-neutral-500", text: "()" },
  ],
  [
    { className: "text-neutral-100", text: "model" },
    { className: "text-neutral-500", text: "." },
    { className: "text-amber-300", text: "fit" },
    { className: "text-neutral-500", text: "(" },
    { className: "text-neutral-100", text: "X_train" },
    { className: "text-neutral-500", text: ", " },
    { className: "text-neutral-100", text: "y_train" },
    { className: "text-neutral-500", text: ")" },
  ],
  [],
  [
    { className: "text-neutral-100", text: "model" },
    { className: "text-neutral-500", text: "." },
    { className: "text-amber-300", text: "coef_" },
  ],
  [
    { className: "text-neutral-100", text: "model" },
    { className: "text-neutral-500", text: "." },
    { className: "text-amber-300", text: "intercept_" },
  ],
  [
    { className: "text-neutral-100", text: "model" },
    { className: "text-neutral-500", text: "." },
    { className: "text-amber-300", text: "predict" },
    { className: "text-neutral-500", text: "(" },
    { className: "text-neutral-100", text: "X_test" },
    { className: "text-neutral-500", text: ")" },
  ],
] as const;
const blackBoxCodeLines = blackBoxCodeSegments.map((line) =>
  line.map((segment) => segment.text).join(""),
);
const teachingHeadlineCopy = "We don't just teach\nyou Machine Learning.";
const teachingHeadlineLines = teachingHeadlineCopy.split("\n");
const finalHeadlineAriaLabel = "We make you fall in love with it.";
const finalLeadWordLabels = ["We", "make", "you"];
const representationQuote =
  "The key to artificial intelligence has always been the representation. —Jeff Hawkins";
const finalLeadWordMoveDuration = 0.24;
const finalLeadWordStarts = [0, 0.24, 0.42] as const;
const finalLeadWordStartY = 420;
const finalLoveDockStart = 1.78;
const finalLoveDockMoveDuration = 0.24;
const finalLoveBounceRiseDuration = 0.18;
const finalLoveBounceFallDuration = 0.14;
const finalLoveBounceYOffset = -128;
const finalZoomedWordScale = 14;
const finalLoveBounceStart = finalLoveDockStart + finalLoveDockMoveDuration;
const finalWithWordStart =
  finalLoveBounceStart + finalLoveBounceRiseDuration + finalLoveBounceFallDuration + 0.02;
const finalItWordStart = finalWithWordStart + 0.28;
const finalDotRevealStart = finalItWordStart + 0.24;
const finalDotZoomStart = finalDotRevealStart + 0.24;
const compactViewportQuery = "(max-width: 767px)";
const storyStickyOffset = 64;
const introRevealScrollUnits = 4.85;
const introExitScrollUnits = 1;
const firstSlideEntryViewportStart = 0.58;
const stackPrimaryZoomScale = 0.775;
const stackSecondaryZoomScale = 0.825;
const landingTitleClassName =
  "max-w-full whitespace-nowrap text-[clamp(2.8rem,min(10vw,13svh),8.6rem)] leading-[0.9] tracking-normal text-foreground font-semibold";
const landingSubtitleClassName =
  "mt-6 max-w-2xl text-[clamp(1rem,min(2vw,2.4svh),1.3rem)] leading-[1.65] text-muted-foreground";
const landingSubtitleText =
  "Make sense of machine learning by interacting with models instead of just reading about them.";

type LandingPageProps = {
  onRendered?: () => void;
  skipIntroAnimation?: boolean;
};

type LandingExperienceProps = {
  skipIntroAnimation?: boolean;
};

function useIsCompactViewport() {
  const [isCompactViewport, setIsCompactViewport] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia(compactViewportQuery).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(compactViewportQuery);
    const syncViewportState = () => {
      setIsCompactViewport(mediaQuery.matches);
    };

    syncViewportState();
    mediaQuery.addEventListener("change", syncViewportState);

    return () => {
      mediaQuery.removeEventListener("change", syncViewportState);
    };
  }, []);

  return isCompactViewport;
}

export function LandingPage({ onRendered, skipIntroAnimation = false }: LandingPageProps) {
  const isCompactViewport = useIsCompactViewport();

  useEffect(() => {
    onRendered?.();
  }, [onRendered]);

  return isCompactViewport ? (
    <DesktopOnlyNotice />
  ) : (
    <LandingExperience skipIntroAnimation={skipIntroAnimation} />
  );
}

function DesktopOnlyNotice() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-6 py-10 text-foreground">
      <section
        aria-labelledby="desktop-only-title"
        className="mx-auto flex w-full max-w-md flex-col items-center text-center"
      >
        <h1
          className="text-[clamp(2.55rem,13vw,4.7rem)] leading-[0.94] font-semibold tracking-normal"
          id="desktop-only-title"
        >
          Best viewed with room to think.
        </h1>
        <p className="mt-6 text-base leading-7 text-muted-foreground">
          Small screens are still being shaped. Open it on desktop for the intended experience.
        </p>
      </section>
    </main>
  );
}

function LandingExperience({ skipIntroAnimation = false }: LandingExperienceProps) {
  const landingRef = useRef<HTMLElement>(null);
  const storySequenceRef = useRef<HTMLElement>(null);
  const horizontalQuoteSectionRef = useRef<HTMLElement>(null);
  const finalDotMorphSvgRef = useRef<SVGSVGElement>(null);
  const finalDotMorphCircleRef = useRef<SVGCircleElement>(null);
  const heroActionRef = useRef<HTMLDivElement>(null);
  const exploreZoneRef = useRef<HTMLDivElement>(null);
  const exploreButtonRef = useRef<HTMLAnchorElement>(null);
  const exploreLabelRef = useRef<HTMLSpanElement>(null);
  const [canBlinkCodeCursor, setCanBlinkCodeCursor] = useState(true);
  const [canStartDescriptionAnimation, setCanStartDescriptionAnimation] =
    useState(skipIntroAnimation);
  const [canRevealHeroAction, setCanRevealHeroAction] = useState(skipIntroAnimation);
  const startDescriptionAnimation = useCallback(() => {
    setCanStartDescriptionAnimation(true);
  }, []);
  const revealHeroAction = useCallback(() => {
    setCanRevealHeroAction(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || shouldReduceMotion()) {
      return;
    }

    const disableCodeCursorBlink = () => {
      setCanBlinkCodeCursor(false);
    };
    const enableCodeCursorBlink = () => {
      setCanBlinkCodeCursor(true);
    };

    ScrollTrigger.addEventListener("scrollStart", disableCodeCursorBlink);
    ScrollTrigger.addEventListener("scrollEnd", enableCodeCursorBlink);

    return () => {
      ScrollTrigger.removeEventListener("scrollStart", disableCodeCursorBlink);
      ScrollTrigger.removeEventListener("scrollEnd", enableCodeCursorBlink);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || shouldReduceMotion()) {
      return;
    }

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, []);

  useGSAP(
    () => {
      const fadeTarget = "[data-landing-scroll-fade]";
      const surfaceTarget = "[data-landing-scroll-surface]";
      const contentTarget = "[data-landing-scroll-content]";
      const visibleTargets = `${contentTarget}, ${surfaceTarget}`;

      if (typeof window.matchMedia !== "function") {
        gsap.set(visibleTargets, {
          autoAlpha: 1,
          clearProps: "all",
        });
        gsap.set(fadeTarget, { autoAlpha: 0 });
        return;
      }

      if (shouldReduceMotion()) {
        gsap.set(visibleTargets, {
          autoAlpha: 1,
          clearProps: "all",
        });
        gsap.set(fadeTarget, { autoAlpha: 0 });
        return;
      }

      const motionPreferences = gsap.matchMedia();

      motionPreferences.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(visibleTargets, {
          autoAlpha: 1,
          clearProps: "all",
        });
        gsap.set(fadeTarget, { autoAlpha: 0 });
      });

      motionPreferences.add("(prefers-reduced-motion: no-preference)", () => {
        const exploreZone = exploreZoneRef.current;
        const exploreButton = exploreButtonRef.current;
        const exploreLabel = exploreLabelRef.current;
        const magneticTargets = [exploreButton, exploreLabel].filter(
          (target): target is HTMLElement => target !== null,
        );
        const strength = 0.4;
        const labelStrength = 0.24;

        gsap
          .timeline({
            scrollTrigger: {
              end: "bottom 44%",
              scrub: 0.75,
              start: "bottom 76%",
              trigger: landingRef.current,
            },
          })
          .fromTo(
            fadeTarget,
            {
              autoAlpha: 0,
            },
            {
              autoAlpha: 1,
              ease: "none",
            },
            0,
          )
          .fromTo(
            visibleTargets,
            {
              autoAlpha: 1,
            },
            {
              autoAlpha: 0,
              ease: "none",
            },
            0,
          );

        if (!exploreZone || !exploreButton || !exploreLabel) {
          return undefined;
        }

        const handleMouseMove = (event: MouseEvent) => {
          const rect = exploreZone.getBoundingClientRect();
          const mapX = gsap.utils.mapRange(
            rect.left,
            rect.right,
            -rect.width / 2,
            rect.width / 2,
            event.clientX,
          );
          const mapY = gsap.utils.mapRange(
            rect.top,
            rect.bottom,
            -rect.height / 2,
            rect.height / 2,
            event.clientY,
          );

          gsap.to(exploreButton, {
            duration: 0.4,
            ease: "power2.out",
            overwrite: true,
            x: mapX * strength,
            y: mapY * strength,
          });

          gsap.to(exploreLabel, {
            duration: 0.4,
            ease: "power2.out",
            overwrite: true,
            x: mapX * labelStrength,
            y: mapY * labelStrength,
          });
        };

        const handleMouseLeave = () => {
          gsap.to(exploreButton, {
            duration: 0.7,
            ease: "elastic.out(1,0.4)",
            overwrite: true,
            x: 0,
            y: 0,
          });

          gsap.to(exploreLabel, {
            duration: 0.7,
            ease: "elastic.out(1,0.4)",
            overwrite: true,
            x: 0,
            y: 0,
          });
        };

        exploreZone.addEventListener("mousemove", handleMouseMove);
        exploreZone.addEventListener("mouseleave", handleMouseLeave);

        return () => {
          exploreZone.removeEventListener("mousemove", handleMouseMove);
          exploreZone.removeEventListener("mouseleave", handleMouseLeave);
          gsap.killTweensOf(magneticTargets);
          gsap.set(magneticTargets, {
            clearProps: "transform",
          });
        };
      });

      return () => {
        motionPreferences.revert();
      };
    },
    { scope: landingRef },
  );

  useGSAP(
    () => {
      const heroAction = heroActionRef.current;

      if (!heroAction) {
        return;
      }

      if (typeof window.matchMedia !== "function" || shouldReduceMotion()) {
        gsap.set(heroAction, {
          autoAlpha: 1,
          clearProps: "transform",
        });
        return;
      }

      if (!canRevealHeroAction) {
        gsap.set(heroAction, { autoAlpha: 0, y: 26 });
        return;
      }

      gsap.to(heroAction, {
        autoAlpha: 1,
        clearProps: "transform,opacity,visibility",
        duration: 0.42,
        ease: "power3.out",
        y: 0,
      });
    },
    { dependencies: [canRevealHeroAction], scope: landingRef },
  );

  useGSAP(
    () => {
      const root = storySequenceRef.current;

      if (!root) {
        return;
      }

      const storySection = root.querySelector<HTMLElement>("[data-blackbox-story-section]");
      const storyStage = root.querySelector<HTMLElement>("[data-blackbox-story-stage]");
      const introSection = root.querySelector<HTMLElement>("[data-landing-intro-panel]");
      const introCard = root.querySelector<HTMLElement>("[data-landing-intro-card]");
      const introEyebrowElement = root.querySelector<HTMLElement>("[data-landing-intro-eyebrow]");
      const introTitleElement = root.querySelector<HTMLElement>("[data-landing-intro-title]");
      const introSubtitleElement = root.querySelector<HTMLElement>("[data-landing-intro-subtitle]");
      const introChartElement = root.querySelector<HTMLElement>("[data-landing-intro-chart]");
      const introDotsSvg = root.querySelector<HTMLElement>("[data-landing-intro-dots]");
      const introDotElements = Array.from(
        introDotsSvg?.querySelectorAll<SVGPathElement>("[data-landing-intro-dot]") ?? [],
      );
      const introAxisXLine = root.querySelector<SVGPathElement>("[data-landing-intro-axis-x-line]");
      const introAxisXArrow = root.querySelector<SVGPathElement>(
        "[data-landing-intro-axis-x-arrow]",
      );
      const introAxisYLine = root.querySelector<SVGPathElement>("[data-landing-intro-axis-y-line]");
      const introAxisYArrow = root.querySelector<SVGPathElement>(
        "[data-landing-intro-axis-y-arrow]",
      );
      const introRegressionLine = root.querySelector<SVGPathElement>(
        "[data-landing-intro-regression-line]",
      );
      const introHandElements = Array.from(
        root.querySelectorAll<SVGGElement>("[data-landing-intro-hand]"),
      );
      const introRightHand = root.querySelector<SVGGElement>("[data-landing-intro-right-hand]");
      const introAxisElements = [
        introAxisXLine,
        introAxisXArrow,
        introAxisYLine,
        introAxisYArrow,
      ].filter((axisElement): axisElement is SVGPathElement => axisElement !== null);

      if (
        !storySection ||
        !storyStage ||
        !introSection ||
        !introCard ||
        !introEyebrowElement ||
        !introTitleElement ||
        !introSubtitleElement ||
        !introChartElement ||
        !introDotsSvg ||
        !introAxisXLine ||
        !introAxisXArrow ||
        !introAxisYLine ||
        !introAxisYArrow ||
        !introRegressionLine ||
        !introRightHand ||
        introHandElements.length === 0 ||
        introDotElements.length === 0
      ) {
        return;
      }

      const applyReducedIntroState = () => {
        gsap.set(introSection, {
          autoAlpha: 1,
          clearProps: "transform",
        });
        gsap.set(introCard, {
          autoAlpha: 1,
          clearProps: "transform",
        });
        gsap.set(introEyebrowElement, {
          clearProps: "filter",
          scale: 0.44,
          transformOrigin: "50% 50%",
          x: 0,
          y: -116,
          yPercent: -50,
        });
        gsap.set(introTitleElement, {
          autoAlpha: 1,
          transformOrigin: "50% 50%",
          y: -10,
          yPercent: -50,
        });
        gsap.set(introSubtitleElement, {
          autoAlpha: 1,
          clearProps: "transform",
        });
        gsap.set(introChartElement, {
          autoAlpha: 1,
          clearProps: "transform",
        });
        gsap.set(introDotsSvg, {
          autoAlpha: 1,
          clearProps: "transform",
        });
        gsap.set(introDotElements, {
          autoAlpha: 1,
          scale: 1,
        });
        gsap.set(introAxisElements, {
          autoAlpha: 1,
          drawSVG: "0% 100%",
        });
        gsap.set(introRegressionLine, {
          autoAlpha: 1,
          drawSVG: "0% 100%",
        });
        gsap.set(introHandElements, {
          autoAlpha: 1,
          clearProps: "transform",
        });
      };

      if (shouldReduceMotion()) {
        applyReducedIntroState();
        return;
      }

      const motionPreferences = gsap.matchMedia();

      motionPreferences.add("(prefers-reduced-motion: reduce)", applyReducedIntroState);

      motionPreferences.add("(prefers-reduced-motion: no-preference)", () => {
        const getIntroEyebrowTextNode = () =>
          Array.from(introEyebrowElement.childNodes).find(
            (node): node is Text =>
              node.nodeType === Node.TEXT_NODE && node.textContent?.includes(introEyebrow) === true,
          );
        const measureIntroEyebrowCutX = () => {
          const textNode = getIntroEyebrowTextNode();
          const cutCharacterIndex = introEyebrow.indexOf("c");

          if (!textNode || cutCharacterIndex < 0) {
            return -window.innerWidth * 0.14;
          }

          const currentX = Number(gsap.getProperty(introEyebrowElement, "x")) || 0;
          const currentScale = Number(gsap.getProperty(introEyebrowElement, "scale")) || 1;
          const range = document.createRange();

          gsap.set(introEyebrowElement, {
            scale: 1,
            x: 0,
          });
          range.setStart(textNode, cutCharacterIndex);
          range.setEnd(textNode, cutCharacterIndex + 1);

          const characterBounds = range.getBoundingClientRect();

          gsap.set(introEyebrowElement, {
            scale: currentScale,
            x: currentX,
          });

          if (characterBounds.width <= 0) {
            return -window.innerWidth * 0.14;
          }

          return window.innerWidth / 2 - (characterBounds.left + characterBounds.width / 2);
        };
        const getIntroEyebrowStartX = () => measureIntroEyebrowCutX() + window.innerWidth * 0.86;
        const introTitleSplit = GSAPSplitText.create(introTitleElement, {
          aria: "hidden",
          tag: "span",
          type: "words",
          wordsClass: "intro-title-word",
        });
        const introTitleWords =
          introTitleSplit.words.length > 0 ? introTitleSplit.words : [introTitleElement];
        const introSubtitleSplit = GSAPSplitText.create(introSubtitleElement, {
          aria: "hidden",
          tag: "span",
          type: "words",
          wordsClass: "intro-subtitle-word",
        });
        const introSubtitleWords =
          introSubtitleSplit.words.length > 0 ? introSubtitleSplit.words : [introSubtitleElement];

        gsap.set(introSection, {
          autoAlpha: 1,
          scale: 1,
          transformOrigin: "50% 50%",
        });
        gsap.set(introCard, {
          autoAlpha: 1,
          scale: 1,
          transformOrigin: "50% 50%",
          y: 0,
        });
        gsap.set(introEyebrowElement, {
          autoAlpha: 0,
          filter: "blur(18px)",
          scale: 1,
          transformOrigin: "50% 50%",
          x: getIntroEyebrowStartX,
          y: 0,
          yPercent: -50,
        });
        gsap.set(introTitleElement, {
          autoAlpha: 0,
          transformOrigin: "50% 50%",
          y: 230,
          yPercent: -50,
        });
        gsap.set(introTitleWords, {
          autoAlpha: 0,
          filter: "blur(14px)",
          yPercent: 70,
        });
        gsap.set(introSubtitleElement, {
          autoAlpha: 0,
          y: 28,
        });
        gsap.set(introSubtitleWords, {
          autoAlpha: 0,
          filter: "blur(8px)",
          yPercent: 80,
        });
        gsap.set(introChartElement, {
          autoAlpha: 1,
        });
        gsap.set(introDotsSvg, {
          autoAlpha: 1,
        });
        gsap.set(introDotElements, {
          autoAlpha: 0,
          scale: 0.55,
          transformBox: "fill-box",
          transformOrigin: "50% 50%",
        });
        gsap.set(introAxisElements, {
          autoAlpha: 1,
          drawSVG: "0% 0%",
        });
        gsap.set(introRegressionLine, {
          autoAlpha: 1,
          drawSVG: "0% 0%",
        });
        gsap.set(introHandElements, {
          autoAlpha: 0,
          scale: 0.92,
          transformBox: "fill-box",
          transformOrigin: "50% 50%",
        });
        gsap.set(introRightHand, {
          rotation: 0,
          x: -115,
          y: 73,
        });

        const getIntroStackScrollDistance = () =>
          window.innerHeight * (introRevealScrollUnits + introExitScrollUnits);
        const introExitStart = introRevealScrollUnits + 0.18;

        let introTimeline: gsap.core.Timeline;
        const introExitHold = { progress: 0 };

        introTimeline = gsap.timeline({
          scrollTrigger: {
            end: () => `+=${getIntroStackScrollDistance()}`,
            invalidateOnRefresh: true,
            scrub: true,
            start: `top top+=${storyStickyOffset}`,
            trigger: storySection,
          },
        });

        introTimeline
          .to(
            introEyebrowElement,
            {
              autoAlpha: 1,
              duration: 0.04,
              ease: "none",
            },
            0,
          )
          .to(
            introEyebrowElement,
            {
              duration: 0.42,
              ease: "power3.out",
              x: measureIntroEyebrowCutX,
            },
            0,
          )
          .to(
            introEyebrowElement,
            {
              duration: 0.24,
              ease: "power2.out",
              filter: "blur(0px)",
            },
            0,
          )
          .to(introEyebrowElement, { x: 0 }, 0.42)
          .to(
            introEyebrowElement,
            {
              clearProps: "filter",
              duration: 0.34,
              ease: "power2.inOut",
              scale: 0.44,
              x: 0,
              y: -116,
            },
            0.72,
          )
          .to(
            introTitleElement,
            {
              autoAlpha: 1,
              duration: 0.24,
              ease: "power3.out",
              y: -10,
            },
            0.8,
          )
          .to(
            introTitleWords,
            {
              autoAlpha: 1,
              duration: 0.56,
              ease: "power2.out",
              filter: "blur(0px)",
              stagger: 0.08,
              yPercent: 0,
            },
            0.86,
          )
          .to(
            introSubtitleElement,
            {
              autoAlpha: 1,
              duration: 0.16,
              ease: "power2.out",
              y: 0,
            },
            1.38,
          )
          .to(
            introSubtitleWords,
            {
              autoAlpha: 1,
              duration: 0.34,
              ease: "power2.out",
              filter: "blur(0px)",
              stagger: 0.015,
              yPercent: 0,
            },
            1.4,
          )
          .to(
            introDotElements,
            {
              autoAlpha: 1,
              duration: 0.32,
              ease: "back.out(1.6)",
              scale: 1,
              stagger: {
                amount: 0.42,
                from: "center",
              },
            },
            1.9,
          )
          .to(
            introAxisXLine,
            {
              drawSVG: "0% 100%",
              duration: 0.28,
              ease: "power2.out",
            },
            2.72,
          )
          .to(
            introAxisXArrow,
            {
              drawSVG: "0% 100%",
              duration: 0.14,
              ease: "power2.out",
            },
            2.96,
          )
          .to(
            introAxisYLine,
            {
              drawSVG: "0% 100%",
              duration: 0.28,
              ease: "power2.out",
            },
            3.08,
          )
          .to(
            introAxisYArrow,
            {
              drawSVG: "0% 100%",
              duration: 0.14,
              ease: "power2.out",
            },
            3.32,
          )
          .to(
            introHandElements,
            {
              autoAlpha: 1,
              duration: 0.28,
              ease: "power2.out",
              scale: 1,
              stagger: 0.08,
            },
            3.48,
          )
          .to(
            introRegressionLine,
            {
              drawSVG: "0% 100%",
              duration: 0.62,
              ease: "power2.out",
            },
            3.9,
          )
          .to(
            introRightHand,
            {
              duration: 0.62,
              ease: "power2.out",
              rotation: 5,
              x: 65,
              y: -5,
            },
            3.9,
          )
          .to(
            introExitHold,
            {
              duration: 0.58,
              ease: "none",
              progress: 1,
            },
            introExitStart,
          );

        return () => {
          introSubtitleSplit.revert();
          introTitleSplit.revert();
        };
      });

      return () => motionPreferences.revert();
    },
    { scope: storySequenceRef },
  );

  useGSAP(
    () => {
      const root = storySequenceRef.current;

      if (!root) {
        return;
      }

      const storySection = root.querySelector<HTMLElement>("[data-blackbox-story-section]");
      const storyStage = root.querySelector<HTMLElement>("[data-blackbox-story-stage]");
      const introSection = root.querySelector<HTMLElement>("[data-landing-intro-panel]");
      const simpleCard = root.querySelector<HTMLElement>("[data-blackbox-card='simple']");
      const openCard = root.querySelector<HTMLElement>("[data-blackbox-card='open']");
      const unpackCard = root.querySelector<HTMLElement>("[data-blackbox-card='unpack']");
      const storyVisual = root.querySelector<HTMLElement>("[data-blackbox-visual]");
      const editorShell = root.querySelector<HTMLElement>("[data-blackbox-editor-shell]");
      const boxContent = root.querySelector<HTMLElement>("[data-blackbox-box-content]");
      const diagramContent = root.querySelector<HTMLElement>("[data-blackbox-diagram-content]");
      const conclusionSlide = root.querySelector<HTMLElement>("[data-understand-slide]");
      const conclusionTitle = root.querySelector<HTMLElement>("[data-understand-title]");
      const codeLines = Array.from(root.querySelectorAll<HTMLElement>("[data-blackbox-code-line]"));
      const codeCharacters = Array.from(
        root.querySelectorAll<HTMLElement>("[data-blackbox-code-char]"),
      );
      const codeCursors = Array.from(
        root.querySelectorAll<HTMLElement>("[data-blackbox-code-cursor]"),
      );
      const diagramNodes = Array.from(
        root.querySelectorAll<SVGGElement>("[data-blackbox-diagram-node]"),
      );
      const diagramStrokes = Array.from(
        root.querySelectorAll<SVGPathElement>("[data-blackbox-diagram-stroke]"),
      );
      const diagramArrowheads = Array.from(
        root.querySelectorAll<SVGPathElement>("[data-blackbox-diagram-arrowhead]"),
      );
      const diagramLineStrokes = diagramStrokes.filter(
        (stroke) => !stroke.hasAttribute("data-blackbox-diagram-arrowhead"),
      );
      const getDiagramNode = (name: string) =>
        root.querySelector<SVGGElement>(`[data-blackbox-diagram-node="${name}"]`);
      const getDiagramLineStrokes = (name: string) =>
        Array.from(
          root.querySelectorAll<SVGPathElement>(
            `[data-blackbox-diagram-stroke="${name}"]:not([data-blackbox-diagram-arrowhead])`,
          ),
        );
      const getDiagramArrowheads = (name: string) =>
        Array.from(
          root.querySelectorAll<SVGPathElement>(
            `[data-blackbox-diagram-stroke="${name}"][data-blackbox-diagram-arrowhead]`,
          ),
        );
      const inputNode = getDiagramNode("input");
      const modelNode = getDiagramNode("model");
      const trainNode = getDiagramNode("train");
      const predNode = getDiagramNode("pred");
      const findErrorNode = getDiagramNode("find-error");
      const minimizeErrorNode = getDiagramNode("minimize-error");
      const getParamsNode = getDiagramNode("get-params");
      const resultNode = getDiagramNode("result");
      const predictNode = getDiagramNode("predict");
      const inputToModelLines = getDiagramLineStrokes("input-to-model");
      const modelToTrainLines = getDiagramLineStrokes("model-to-train");
      const predToFindLines = getDiagramLineStrokes("pred-to-find");
      const findToMinimizeLines = getDiagramLineStrokes("find-to-minimize");
      const minimizeToParamsLines = getDiagramLineStrokes("minimize-to-params");
      const trainToResultLines = getDiagramLineStrokes("train-to-result");
      const resultToPredictLines = getDiagramLineStrokes("result-to-predict");
      const inputToModelArrowheads = getDiagramArrowheads("input-to-model");
      const modelToTrainArrowheads = getDiagramArrowheads("model-to-train");
      const predToFindArrowheads = getDiagramArrowheads("pred-to-find");
      const findToMinimizeArrowheads = getDiagramArrowheads("find-to-minimize");
      const minimizeToParamsArrowheads = getDiagramArrowheads("minimize-to-params");
      const trainToResultArrowheads = getDiagramArrowheads("train-to-result");
      const resultToPredictArrowheads = getDiagramArrowheads("result-to-predict");

      if (
        !storySection ||
        !storyStage ||
        !introSection ||
        !simpleCard ||
        !openCard ||
        !unpackCard ||
        !storyVisual ||
        !editorShell ||
        !boxContent ||
        !diagramContent ||
        !conclusionSlide ||
        !conclusionTitle ||
        codeLines.length === 0 ||
        !inputNode ||
        !modelNode ||
        !trainNode ||
        !predNode ||
        !findErrorNode ||
        !minimizeErrorNode ||
        !getParamsNode ||
        !resultNode ||
        !predictNode ||
        codeCharacters.length === 0 ||
        codeCursors.length !== codeLines.length ||
        diagramNodes.length === 0 ||
        diagramStrokes.length === 0 ||
        diagramLineStrokes.length === 0 ||
        diagramArrowheads.length === 0 ||
        inputToModelLines.length === 0 ||
        modelToTrainLines.length === 0 ||
        predToFindLines.length === 0 ||
        findToMinimizeLines.length === 0 ||
        minimizeToParamsLines.length === 0 ||
        trainToResultLines.length === 0 ||
        resultToPredictLines.length === 0 ||
        inputToModelArrowheads.length === 0 ||
        modelToTrainArrowheads.length === 0 ||
        predToFindArrowheads.length === 0 ||
        findToMinimizeArrowheads.length === 0 ||
        minimizeToParamsArrowheads.length === 0 ||
        trainToResultArrowheads.length === 0 ||
        resultToPredictArrowheads.length === 0
      ) {
        return;
      }

      const codeLineGroups = codeLines.map((line, index) => ({
        characters: Array.from(line.querySelectorAll<HTMLElement>("[data-blackbox-code-char]")),
        cursor: codeCursors[index]!,
      }));

      const getVisualBaseWidth = () => {
        const viewportLimit = Math.min(window.innerWidth * 0.9, 1500);
        const minWidth = Math.min(window.innerWidth * 0.9, 760);
        const preferredWidth = Math.min(window.innerWidth * 0.58, window.innerHeight * 1.18);

        return gsap.utils.clamp(minWidth, viewportLimit, preferredWidth);
      };
      const getVisualBaseHeight = () => {
        const maxHeight = Math.min(window.innerHeight * 0.48, 660);
        const minHeight = Math.min(maxHeight, Math.max(260, window.innerHeight * 0.34));
        const preferredHeight = getVisualBaseWidth() * 0.48;

        return gsap.utils.clamp(minHeight, maxHeight, preferredHeight);
      };
      const getBlackBoxSize = () => Math.min(getVisualBaseWidth(), getVisualBaseHeight()) * 0.46;
      const getStoryStageHeight = () =>
        storyStage.getBoundingClientRect().height || window.innerHeight;
      const getEditorRestY = () => {
        const stageHeight = getStoryStageHeight();
        const visualTopAnchor = stageHeight * 0.61;
        const editorBottomOverflow = gsap.utils.clamp(24, 44, stageHeight * 0.028);

        return stageHeight + editorBottomOverflow - getVisualBaseHeight() / 2 - visualTopAnchor;
      };
      const getBlackBoxY = () => {
        const stageHeight = getStoryStageHeight();
        const visualTopAnchor = stageHeight * 0.61;

        return stageHeight * 0.61 - visualTopAnchor;
      };
      const getBoardWidth = () => {
        const stageHeight = getStoryStageHeight();
        const viewportLimit = Math.min(window.innerWidth * 0.95, 1540);
        const minWidth = Math.min(window.innerWidth * 0.9, 860);
        const preferredWidth = Math.min(window.innerWidth * 0.86, stageHeight * 1.18);

        return gsap.utils.clamp(minWidth, viewportLimit, preferredWidth);
      };
      const getBoardHeight = () => {
        const maxHeight = Math.min(window.innerHeight * 0.54, 600);
        const minHeight = Math.min(maxHeight, Math.max(320, window.innerHeight * 0.4));
        const preferredHeight = getBoardWidth() * 0.38;

        return gsap.utils.clamp(minHeight, maxHeight, preferredHeight);
      };
      const getBoardPaperExtension = () => {
        const stageHeight = getStoryStageHeight();
        const tallViewportProgress = gsap.utils.clamp(0, 1, (stageHeight - 1180) / 180);

        return gsap.utils.interpolate(180, 330, tallViewportProgress);
      };
      const getBoardPaperHeight = () => getBoardHeight() + getBoardPaperExtension();
      const getBoardY = () => {
        const stageHeight = getStoryStageHeight();
        const visualTopAnchor = stageHeight * 0.61;
        const bottomGap = gsap.utils.clamp(12, 24, stageHeight * 0.014);

        return (
          stageHeight -
          bottomGap -
          getBoardHeight() / 2 -
          visualTopAnchor +
          getBoardPaperExtension() / 2
        );
      };
      const getStoryTopScrollY = () => storySection.getBoundingClientRect().top + window.scrollY;
      const getStoryPinnedStartScrollY = () => getStoryTopScrollY() - storyStickyOffset;
      const getStoryPinnedEndScrollY = () =>
        getStoryTopScrollY() + storySection.offsetHeight - window.innerHeight;
      const getIntroStackScrollDistance = () =>
        getStoryStageHeight() + window.innerHeight * introRevealScrollUnits;
      const getFirstSlideEntryDistance = () =>
        window.innerHeight * firstSlideEntryViewportStart - storyStickyOffset;
      const getFirstSlideEntryStartScrollY = () =>
        getStoryPinnedStartScrollY() + getIntroStackScrollDistance() - getFirstSlideEntryDistance();
      const getFirstSlideEntryEndScrollY = () =>
        getStoryPinnedStartScrollY() + getIntroStackScrollDistance();
      const applyReducedStoryState = () => {
        gsap.set(storySection, {
          clearProps: "backgroundColor",
        });
        gsap.set(storyStage, { clearProps: "backgroundColor" });
        gsap.set([simpleCard, openCard, unpackCard], {
          autoAlpha: 0,
        });
        gsap.set(conclusionSlide, {
          autoAlpha: 1,
          clearProps: "transform",
        });
        gsap.set(storyVisual, {
          autoAlpha: 1,
          backgroundColor: "#fafafa",
          borderColor: "rgba(9, 9, 11, 0.12)",
          borderRadius: "28px 28px 0 0",
          height: getBoardPaperHeight,
          scale: 1,
          width: getBoardWidth,
          xPercent: -50,
          y: getBoardY,
          yPercent: -50,
        });
        gsap.set(editorShell, { autoAlpha: 0 });
        gsap.set(boxContent, { autoAlpha: 0 });
        gsap.set(diagramContent, {
          autoAlpha: 1,
          height: getBoardHeight,
        });
        gsap.set(diagramNodes, {
          autoAlpha: 1,
          display: "inline",
          scale: 1,
        });
        gsap.set(diagramLineStrokes, {
          autoAlpha: 1,
          drawSVG: "0% 100%",
        });
        gsap.set(diagramArrowheads, {
          autoAlpha: 1,
          drawSVG: "0% 100%",
        });
        gsap.set(conclusionTitle, {
          autoAlpha: 1,
          clearProps: "filter,transform",
        });
      };

      if (shouldReduceMotion()) {
        applyReducedStoryState();
        return;
      }

      const motionPreferences = gsap.matchMedia();

      motionPreferences.add("(prefers-reduced-motion: reduce)", applyReducedStoryState);

      motionPreferences.add("(prefers-reduced-motion: no-preference)", () => {
        const conclusionTitleSplit = GSAPSplitText.create(conclusionTitle, {
          aria: "auto",
          tag: "span",
          type: "words",
          wordsClass: "understand-title-word",
        });
        const conclusionTitleWords =
          conclusionTitleSplit.words.length > 0 ? conclusionTitleSplit.words : [conclusionTitle];

        gsap.set(storySection, {
          clearProps: "backgroundColor",
        });
        gsap.set(storyStage, {
          clearProps: "backgroundColor",
        });
        gsap.set(introSection, {
          scale: 1,
          transformOrigin: "50% 50%",
          willChange: "transform",
        });
        gsap.set([simpleCard, openCard, unpackCard, conclusionSlide], {
          autoAlpha: 1,
          scale: 1,
          transformOrigin: "50% 50%",
          yPercent: 0,
          willChange: "transform",
        });
        gsap.set([simpleCard, openCard, unpackCard, conclusionSlide], { yPercent: 100 });
        gsap.set(storyVisual, {
          autoAlpha: 1,
          backgroundColor: "#111113",
          borderColor: "rgba(250, 250, 250, 0.16)",
          borderRadius: 22,
          boxShadow: "0 34px 90px rgba(0, 0, 0, 0.42)",
          height: getVisualBaseHeight,
          scale: 1,
          transformOrigin: "50% 50%",
          width: getVisualBaseWidth,
          willChange:
            "background-color, border-color, border-radius, height, opacity, transform, width",
          xPercent: -50,
          y: () => window.innerHeight * 0.7,
          yPercent: -50,
        });
        gsap.set(editorShell, {
          autoAlpha: 1,
          filter: "blur(0px)",
          scale: 1,
          transformOrigin: "50% 50%",
          willChange: "filter, opacity, transform",
        });
        gsap.set(codeCharacters, {
          autoAlpha: 0,
          display: "none",
        });
        gsap.set(codeCursors, {
          autoAlpha: 0,
          display: "inline-block",
          willChange: "opacity",
        });
        gsap.set(boxContent, {
          autoAlpha: 0,
          filter: "blur(0px)",
          scale: 1,
          transformOrigin: "50% 50%",
          willChange: "filter, opacity, transform",
        });
        gsap.set(diagramContent, {
          autoAlpha: 0,
          height: getBoardHeight,
          willChange: "opacity",
        });
        gsap.set(diagramNodes, {
          autoAlpha: 0,
          display: "none",
          scale: 1,
          x: 0,
          y: 0,
        });
        gsap.set(diagramLineStrokes, {
          autoAlpha: 1,
          drawSVG: "0% 0%",
        });
        gsap.set(diagramArrowheads, {
          autoAlpha: 0,
          drawSVG: "50% 50%",
        });
        gsap.set(conclusionTitle, {
          autoAlpha: 1,
          clearProps: "filter,transform",
        });
        gsap.set(conclusionTitleWords, {
          autoAlpha: 0,
          filter: "blur(18px)",
          y: 36,
          willChange: "filter, opacity, transform",
        });

        const codeTypingStart = 0.18;
        const codeTypingStagger = 0.026;
        const codeCharacterRevealDuration = 0.001;
        const codeLinePause = 0.1;
        const codeBlankLinePause = 0.18;
        const getCodeLineTypingDuration = (characterCount: number) =>
          characterCount > 0
            ? Math.max(characterCount - 1, 0) * codeTypingStagger + codeLinePause
            : codeBlankLinePause;
        const codeRevealDuration = codeLineGroups.reduce(
          (duration, { characters }) => duration + getCodeLineTypingDuration(characters.length),
          0,
        );
        const openCardStart = codeTypingStart + codeRevealDuration + 0.72;
        const blackBoxMorphStart = openCardStart + 0.08;
        const unpackCardStart = openCardStart + 1.42;
        const boardMorphStart = unpackCardStart + 0.39;
        const conclusionCardStart = boardMorphStart + 3.45;
        const conclusionWordRevealStart = conclusionCardStart + 0.34;
        const conclusionWordRevealDuration = 0.64;
        const conclusionWordRevealStagger = 0.11;
        const conclusionWordScatterStart =
          conclusionWordRevealStart +
          conclusionWordRevealDuration +
          Math.max(conclusionTitleWords.length - 1, 0) * conclusionWordRevealStagger +
          0.08;
        const scatterWordsAway = (index: number) => {
          const directionPattern = [-1, 1, 0, 1, -1, 0] as const;
          const direction = directionPattern[index % directionPattern.length];

          if (direction === 0) {
            return gsap.utils.random(-window.innerWidth * 0.18, window.innerWidth * 0.18);
          }

          return direction * gsap.utils.random(window.innerWidth * 0.7, window.innerWidth * 1.12);
        };
        const scatterWordsUp = (_index: number, target: Element) => {
          const bounds = target.getBoundingClientRect();

          return -(
            bounds.bottom + gsap.utils.random(window.innerHeight * 0.28, window.innerHeight * 0.54)
          );
        };
        const diagramRevealStartOffset = 0.4;
        const diagramRevealTimeScale = 2 / 3;
        const getDiagramRevealTime = (offset: number) =>
          boardMorphStart +
          diagramRevealStartOffset +
          (offset - diagramRevealStartOffset) * diagramRevealTimeScale;
        const diagramNodeRevealLeadOffset = 0.08;
        const getDiagramNodeRevealTime = (offset: number) =>
          getDiagramRevealTime(offset - diagramNodeRevealLeadOffset);
        const diagramNodeRevealDuration = 0.1;
        const diagramLineDrawDuration = 0.11;
        const diagramArrowheadDrawDuration = 0.08;
        const diagramStrokeStagger = 0.02;

        const storyTimeline = gsap.timeline({
          defaults: { ease: "power2.out" },
          scrollTrigger: {
            end: getStoryPinnedEndScrollY,
            invalidateOnRefresh: true,
            scrub: true,
            start: getFirstSlideEntryEndScrollY,
            trigger: storySection,
          },
        });
        const firstSlideEntryTimeline = gsap.timeline({
          scrollTrigger: {
            end: getFirstSlideEntryEndScrollY,
            invalidateOnRefresh: true,
            scrub: true,
            start: getFirstSlideEntryStartScrollY,
            trigger: storySection,
          },
        });

        firstSlideEntryTimeline
          .to(
            introSection,
            {
              duration: 0.78,
              ease: "power3.inOut",
              scale: stackPrimaryZoomScale,
            },
            0,
          )
          .to(
            simpleCard,
            {
              duration: 0.78,
              ease: "power3.inOut",
              yPercent: 0,
            },
            0,
          )
          .to(
            storyVisual,
            {
              duration: 0.78,
              ease: "power3.inOut",
              y: getEditorRestY,
            },
            0,
          );

        storyTimeline.addLabel("call", 0);

        let codeTypingTime = codeTypingStart;

        codeLineGroups.forEach(({ characters, cursor }) => {
          storyTimeline.set(codeCursors, { autoAlpha: 0 }, codeTypingTime);
          storyTimeline.set(cursor, { autoAlpha: 1 }, codeTypingTime);

          if (characters.length > 0) {
            storyTimeline.to(
              characters,
              {
                autoAlpha: 1,
                display: "inline",
                duration: codeCharacterRevealDuration,
                ease: "steps(1)",
                stagger: codeTypingStagger,
              },
              codeTypingTime,
            );
          }

          codeTypingTime += getCodeLineTypingDuration(characters.length);
        });

        storyTimeline
          .set(codeCursors, { autoAlpha: 0 }, openCardStart - 0.12)
          .addLabel("open", openCardStart)
          .to(
            simpleCard,
            {
              duration: 0.78,
              ease: "power3.inOut",
              scale: stackPrimaryZoomScale,
            },
            "open",
          )
          .to(
            openCard,
            {
              duration: 0.78,
              ease: "power3.inOut",
              yPercent: 0,
            },
            "open",
          )
          .to(
            storyVisual,
            {
              backgroundColor: "#050505",
              borderColor: "rgba(250, 250, 250, 0.2)",
              borderRadius: 36,
              boxShadow: "0 30px 120px rgba(0, 0, 0, 0.68)",
              duration: 0.82,
              ease: "power3.inOut",
              height: getBlackBoxSize,
              scale: 1,
              width: getBlackBoxSize,
              y: getBlackBoxY,
            },
            blackBoxMorphStart,
          )
          .to(
            editorShell,
            {
              autoAlpha: 0,
              duration: 0.46,
              ease: "power3.in",
              filter: "blur(18px)",
              scale: 0.78,
            },
            blackBoxMorphStart + 0.06,
          )
          .to(
            boxContent,
            {
              autoAlpha: 1,
              duration: 0.28,
              ease: "power2.out",
              scale: 1,
            },
            blackBoxMorphStart + 0.42,
          )
          .addLabel("unpack", unpackCardStart)
          .to(
            openCard,
            {
              duration: 0.78,
              ease: "power3.inOut",
              scale: stackSecondaryZoomScale,
            },
            "unpack",
          )
          .to(
            unpackCard,
            {
              duration: 0.78,
              ease: "power3.inOut",
              yPercent: 0,
            },
            "unpack",
          )
          .to(
            storyVisual,
            {
              backgroundColor: "#fafafa",
              borderColor: "rgba(9, 9, 11, 0.12)",
              borderRadius: "28px 28px 0 0",
              boxShadow: "0 34px 110px rgba(0, 0, 0, 0.42)",
              duration: 0.42,
              ease: "power3.inOut",
              height: getBoardPaperHeight,
              scale: 1,
              width: getBoardWidth,
              y: getBoardY,
            },
            boardMorphStart,
          )
          .to(
            boxContent,
            {
              autoAlpha: 0,
              duration: 0.3,
              ease: "power2.in",
              filter: "blur(10px)",
              scale: 0.86,
            },
            boardMorphStart,
          )
          .to(
            diagramContent,
            {
              autoAlpha: 1,
              duration: 0.26,
              ease: "none",
              height: getBoardHeight,
            },
            boardMorphStart + 0.26,
          )
          .to(
            inputNode,
            {
              autoAlpha: 1,
              display: "inline",
              duration: diagramNodeRevealDuration,
              ease: "none",
              scale: 1,
              x: 0,
              y: 0,
            },
            getDiagramRevealTime(0.4),
          )
          .to(
            modelNode,
            {
              autoAlpha: 1,
              display: "inline",
              duration: diagramNodeRevealDuration,
              ease: "none",
              scale: 1,
              x: 0,
              y: 0,
            },
            getDiagramNodeRevealTime(1.16),
          )
          .to(
            inputToModelLines,
            {
              drawSVG: "0% 100%",
              duration: diagramLineDrawDuration,
              ease: "power2.out",
              stagger: diagramStrokeStagger,
            },
            getDiagramRevealTime(0.68),
          )
          .fromTo(
            inputToModelArrowheads,
            {
              autoAlpha: 1,
              drawSVG: "50% 50%",
            },
            {
              autoAlpha: 1,
              drawSVG: "0% 100%",
              duration: diagramArrowheadDrawDuration,
              ease: "power2.out",
              immediateRender: false,
              stagger: diagramStrokeStagger,
            },
            getDiagramRevealTime(0.9),
          )
          .to(
            modelToTrainLines,
            {
              drawSVG: "0% 100%",
              duration: diagramLineDrawDuration,
              ease: "power2.out",
              stagger: diagramStrokeStagger,
            },
            getDiagramRevealTime(1.22),
          )
          .fromTo(
            modelToTrainArrowheads,
            {
              autoAlpha: 1,
              drawSVG: "50% 50%",
            },
            {
              autoAlpha: 1,
              drawSVG: "0% 100%",
              duration: diagramArrowheadDrawDuration,
              ease: "power2.out",
              immediateRender: false,
            },
            getDiagramRevealTime(1.38),
          )
          .to(
            trainNode,
            {
              autoAlpha: 1,
              display: "inline",
              duration: diagramNodeRevealDuration,
              ease: "none",
              scale: 1,
              x: 0,
              y: 0,
            },
            getDiagramNodeRevealTime(1.58),
          )
          .to(
            predNode,
            {
              autoAlpha: 1,
              display: "inline",
              duration: diagramNodeRevealDuration,
              ease: "none",
              scale: 1,
              x: 0,
              y: 0,
            },
            getDiagramNodeRevealTime(1.76),
          )
          .to(
            predToFindLines,
            {
              drawSVG: "0% 100%",
              duration: diagramLineDrawDuration,
              ease: "power2.out",
              stagger: diagramStrokeStagger,
            },
            getDiagramRevealTime(1.94),
          )
          .fromTo(
            predToFindArrowheads,
            {
              autoAlpha: 1,
              drawSVG: "50% 50%",
            },
            {
              autoAlpha: 1,
              drawSVG: "0% 100%",
              duration: diagramArrowheadDrawDuration,
              ease: "power2.out",
              immediateRender: false,
            },
            getDiagramRevealTime(2.1),
          )
          .to(
            findErrorNode,
            {
              autoAlpha: 1,
              display: "inline",
              duration: diagramNodeRevealDuration,
              ease: "none",
              scale: 1,
              x: 0,
              y: 0,
            },
            getDiagramNodeRevealTime(2.3),
          )
          .to(
            findToMinimizeLines,
            {
              drawSVG: "0% 100%",
              duration: diagramLineDrawDuration,
              ease: "power2.out",
              stagger: diagramStrokeStagger,
            },
            getDiagramRevealTime(2.48),
          )
          .fromTo(
            findToMinimizeArrowheads,
            {
              autoAlpha: 1,
              drawSVG: "50% 50%",
            },
            {
              autoAlpha: 1,
              drawSVG: "0% 100%",
              duration: diagramArrowheadDrawDuration,
              ease: "power2.out",
              immediateRender: false,
            },
            getDiagramRevealTime(2.64),
          )
          .to(
            minimizeErrorNode,
            {
              autoAlpha: 1,
              display: "inline",
              duration: diagramNodeRevealDuration,
              ease: "none",
              scale: 1,
              x: 0,
              y: 0,
            },
            getDiagramNodeRevealTime(2.84),
          )
          .to(
            minimizeToParamsLines,
            {
              drawSVG: "0% 100%",
              duration: diagramLineDrawDuration,
              ease: "power2.out",
              stagger: diagramStrokeStagger,
            },
            getDiagramRevealTime(3.02),
          )
          .fromTo(
            minimizeToParamsArrowheads,
            {
              autoAlpha: 1,
              drawSVG: "50% 50%",
            },
            {
              autoAlpha: 1,
              drawSVG: "0% 100%",
              duration: diagramArrowheadDrawDuration,
              ease: "power2.out",
              immediateRender: false,
            },
            getDiagramRevealTime(3.18),
          )
          .to(
            getParamsNode,
            {
              autoAlpha: 1,
              display: "inline",
              duration: diagramNodeRevealDuration,
              ease: "none",
              scale: 1,
              x: 0,
              y: 0,
            },
            getDiagramNodeRevealTime(3.38),
          )
          .to(
            trainToResultLines,
            {
              drawSVG: "0% 100%",
              duration: diagramLineDrawDuration,
              ease: "power2.out",
              stagger: diagramStrokeStagger,
            },
            getDiagramRevealTime(3.56),
          )
          .fromTo(
            trainToResultArrowheads,
            {
              autoAlpha: 1,
              drawSVG: "50% 50%",
            },
            {
              autoAlpha: 1,
              drawSVG: "0% 100%",
              duration: diagramArrowheadDrawDuration,
              ease: "power2.out",
              immediateRender: false,
            },
            getDiagramRevealTime(3.72),
          )
          .to(
            resultNode,
            {
              autoAlpha: 1,
              display: "inline",
              duration: diagramNodeRevealDuration,
              ease: "none",
              scale: 1,
              x: 0,
              y: 0,
            },
            getDiagramNodeRevealTime(3.92),
          )
          .to(
            resultToPredictLines,
            {
              drawSVG: "0% 100%",
              duration: diagramLineDrawDuration,
              ease: "power2.out",
              stagger: diagramStrokeStagger,
            },
            getDiagramRevealTime(4.1),
          )
          .fromTo(
            resultToPredictArrowheads,
            {
              autoAlpha: 1,
              drawSVG: "50% 50%",
            },
            {
              autoAlpha: 1,
              drawSVG: "0% 100%",
              duration: diagramArrowheadDrawDuration,
              ease: "power2.out",
              immediateRender: false,
            },
            getDiagramRevealTime(4.26),
          )
          .to(
            predictNode,
            {
              autoAlpha: 1,
              display: "inline",
              duration: diagramNodeRevealDuration,
              ease: "none",
              scale: 1,
              x: 0,
              y: 0,
            },
            getDiagramNodeRevealTime(4.46),
          )
          .set(storyVisual, { autoAlpha: 1 }, getDiagramRevealTime(4.76))
          .addLabel("understand", conclusionCardStart)
          .to(
            unpackCard,
            {
              duration: 0.78,
              ease: "power3.inOut",
              scale: stackSecondaryZoomScale,
            },
            "understand",
          )
          .to(
            storyVisual,
            {
              duration: 0.78,
              ease: "power3.inOut",
              scale: stackSecondaryZoomScale,
            },
            "understand",
          )
          .to(
            conclusionSlide,
            {
              duration: 0.78,
              ease: "power3.inOut",
              yPercent: 0,
            },
            "understand",
          )
          .to(
            conclusionTitleWords,
            {
              autoAlpha: 1,
              duration: conclusionWordRevealDuration,
              ease: "power2.out",
              filter: "blur(0px)",
              stagger: conclusionWordRevealStagger,
              y: 0,
            },
            conclusionWordRevealStart,
          )
          .to(
            conclusionTitleWords,
            {
              duration: 1.22,
              ease: "power3.inOut",
              rotation: () => gsap.utils.random(-32, 32),
              scale: () => gsap.utils.random(0.78, 1.18),
              x: scatterWordsAway,
              y: scatterWordsUp,
            },
            conclusionWordScatterStart,
          )
          .to(
            conclusionSlide,
            {
              duration: 0.08,
              ease: "none",
            },
            conclusionWordScatterStart + 1.22,
          );

        return () => {
          conclusionTitleSplit.revert();
        };
      });

      return () => motionPreferences.revert();
    },
    { scope: storySequenceRef },
  );

  useGSAP(
    () => {
      const root = storySequenceRef.current;

      if (!root) {
        return;
      }

      const storySection = root.querySelector<HTMLElement>("[data-teaching-story-section]");
      const storyStage = root.querySelector<HTMLElement>("[data-teaching-story-stage]");
      const dotMorphSvg = storyStage?.querySelector<SVGSVGElement>("[data-teaching-dot-morph-svg]");
      const dotMorphCircle = storyStage?.querySelector<SVGCircleElement>(
        "[data-teaching-dot-morph-circle]",
      );

      if (
        !storySection ||
        !storyStage ||
        !dotMorphSvg ||
        !dotMorphCircle ||
        typeof window.matchMedia !== "function" ||
        shouldReduceMotion()
      ) {
        return;
      }

      const characterElements = Array.from(
        storyStage.querySelectorAll<HTMLElement>("[data-teaching-story-char]"),
      );
      const morphDot = storyStage.querySelector<HTMLElement>("[data-teaching-story-dot]");
      const morphDotAnchor = storyStage.querySelector<HTMLElement>(
        "[data-teaching-story-dot-anchor]",
      );
      const otherCharacters = characterElements.filter((character) => character !== morphDot);

      if (!morphDot || !morphDotAnchor || characterElements.length === 0) {
        return;
      }

      gsap.set(storyStage, { backgroundColor: "#fafafa" });
      gsap.set(dotMorphSvg, { autoAlpha: 0 });
      gsap.set(dotMorphCircle, { attr: { cx: 0, cy: 0, r: 0 } });
      gsap.set(characterElements, {
        opacity: 0,
        scaleX: 0.7,
        scaleY: 2.3,
        transformOrigin: "50% 0%",
        visibility: "visible",
        willChange: "opacity, transform",
        yPercent: 120,
      });
      gsap.set(morphDot, {
        transformOrigin: "50% 50%",
      });
      gsap.set(morphDotAnchor, {
        opacity: 0,
        transformOrigin: "50% 50%",
      });

      const syncMorphSvgViewBox = () => {
        const rect = storyStage.getBoundingClientRect();

        dotMorphSvg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
      };

      const getDotCenterX = () => {
        const stageRect = storyStage.getBoundingClientRect();
        const dotRect = morphDotAnchor.getBoundingClientRect();

        return dotRect.left - stageRect.left + dotRect.width / 2;
      };

      const getDotCenterY = () => {
        const stageRect = storyStage.getBoundingClientRect();
        const dotRect = morphDotAnchor.getBoundingClientRect();

        return dotRect.top - stageRect.top + dotRect.height / 2;
      };

      const getDotRadius = () => {
        const rect = morphDotAnchor.getBoundingClientRect();

        return Math.max(rect.width, rect.height) / 2;
      };

      const getStageCenterX = () => storyStage.getBoundingClientRect().width / 2;
      const getStageCenterY = () => storyStage.getBoundingClientRect().height / 2;
      const getCoverRadius = () => {
        const rect = storyStage.getBoundingClientRect();

        return Math.hypot(rect.width, rect.height) * 0.58;
      };
      const dotMorphState = { progress: 0 };
      const updateMorphCircle = () => {
        const progress = dotMorphState.progress;
        const cx = gsap.utils.interpolate(getDotCenterX(), getStageCenterX(), progress);
        const cy = gsap.utils.interpolate(getDotCenterY(), getStageCenterY(), progress);
        const r = gsap.utils.interpolate(getDotRadius(), getCoverRadius(), progress);

        gsap.set(dotMorphCircle, {
          attr: { cx, cy, r },
        });
      };
      const syncMorphCircleToDot = () => {
        dotMorphState.progress = 0;
        gsap.set(dotMorphCircle, {
          attr: {
            cx: getDotCenterX(),
            cy: getDotCenterY(),
            r: getDotRadius(),
          },
        });
      };
      const syncMorphLayer = () => {
        syncMorphSvgViewBox();
        updateMorphCircle();
      };
      const revealDuration = 0.18;
      const revealStagger = 0.006;
      const textRevealDuration =
        revealDuration + Math.max(otherCharacters.length - 1, 0) * revealStagger;
      const dotRevealDuration = 0.3;
      const dotRevealStart = Math.max(textRevealDuration - 0.16, 0);
      const zoomStart = dotRevealStart + dotRevealDuration + 0.02;
      const morphCircleGrowStart = zoomStart;
      const morphCircleGrowDuration = 0.12;
      const morphCircleCoverHoldDuration = 0.04;

      syncMorphSvgViewBox();
      syncMorphCircleToDot();

      const teachingTimeline = gsap.timeline({
        scrollTrigger: {
          end: "bottom bottom",
          invalidateOnRefresh: true,
          onRefresh: syncMorphLayer,
          onLeaveBack: () => {
            gsap.set(storyStage, {
              backgroundColor: "#fafafa",
            });
            gsap.set(dotMorphSvg, { autoAlpha: 0 });
          },
          scrub: true,
          start: "top bottom",
          trigger: storySection,
        },
      });

      teachingTimeline
        .to(
          otherCharacters,
          {
            duration: revealDuration,
            ease: "back.inOut(2)",
            opacity: 1,
            scaleX: 1,
            scaleY: 1,
            stagger: revealStagger,
            yPercent: 0,
          },
          0,
        )
        .to(
          morphDot,
          {
            duration: dotRevealDuration,
            ease: "back.inOut(2)",
            opacity: 1,
            scaleX: 1,
            scaleY: 1,
            yPercent: 0,
          },
          dotRevealStart,
        )
        .set(
          dotMorphSvg,
          {
            autoAlpha: 1,
          },
          zoomStart,
        )
        .call(syncMorphCircleToDot, [], zoomStart)
        .fromTo(
          dotMorphState,
          { progress: 0 },
          {
            duration: morphCircleGrowDuration,
            ease: "power2.in",
            immediateRender: false,
            onUpdate: updateMorphCircle,
            progress: 1,
          },
          morphCircleGrowStart,
        )
        .set(dotMorphSvg, { autoAlpha: 1 }, morphCircleGrowStart + morphCircleGrowDuration)
        .to(
          dotMorphState,
          {
            duration: morphCircleCoverHoldDuration,
            ease: "none",
            progress: 1,
          },
          morphCircleGrowStart + morphCircleGrowDuration,
        );
    },
    { scope: storySequenceRef },
  );

  useGSAP(
    () => {
      const root = storySequenceRef.current;

      if (!root) {
        return;
      }

      const finalSection = root.querySelector<HTMLElement>("[data-final-love-story-section]");
      const finalStage = root.querySelector<HTMLElement>("[data-final-love-story-stage]");
      const finalLeadWordElements = Array.from(
        root.querySelectorAll<HTMLElement>("[data-final-lead-word]"),
      );
      const fallWord = root.querySelector<HTMLElement>("[data-final-word='fall']");
      const inWord = root.querySelector<HTMLElement>("[data-final-word='in']");
      const loveTarget = root.querySelector<HTMLElement>("[data-love-scroll-target]");
      const inlineLove = root.querySelector<HTMLElement>("[data-final-inline-love]");
      const loveBounceDot = root.querySelector<HTMLElement>("[data-love-bounce-dot]");
      const withWord = root.querySelector<HTMLElement>("[data-final-word='with']");
      const itWord = root.querySelector<HTMLElement>("[data-final-word='it']");
      const finalDot = root.querySelector<HTMLElement>("[data-final-dot]");
      const dotMorphSvg = finalDotMorphSvgRef.current;
      const dotMorphCircle = finalDotMorphCircleRef.current;

      if (
        !finalSection ||
        !finalStage ||
        finalLeadWordElements.length !== finalLeadWordLabels.length ||
        !fallWord ||
        !inWord ||
        !loveTarget ||
        !inlineLove ||
        !loveBounceDot ||
        !withWord ||
        !itWord ||
        !finalDot ||
        !dotMorphSvg ||
        !dotMorphCircle
      ) {
        return;
      }

      const [weWord, makeWord, youWord] = finalLeadWordElements as [
        HTMLElement,
        HTMLElement,
        HTMLElement,
      ];
      const finalWordElements = [
        weWord,
        makeWord,
        youWord,
        fallWord,
        inWord,
        withWord,
        itWord,
        finalDot,
      ];
      const loveScrollState = { coverProgress: 0, progress: 0 };
      const loveBounceState = { y: 0 };
      const dispatchLoveScrollProgress = (
        progress = loveScrollState.progress,
        coverProgress = loveScrollState.coverProgress,
        bounceOffsetY = loveBounceState.y,
        forceHidden = false,
      ) => {
        const clampedProgress = gsap.utils.clamp(0, 1, progress);
        const clampedCoverProgress = gsap.utils.clamp(0, 1, coverProgress);
        const safeBounceOffsetY = Number.isFinite(bounceOffsetY) ? bounceOffsetY : 0;
        const shouldForceHidden = Boolean(forceHidden);

        window.dispatchEvent(
          new CustomEvent("smile:love-scroll-progress", {
            detail: {
              active:
                clampedProgress > 0.001 ||
                clampedCoverProgress > 0.001 ||
                Math.abs(safeBounceOffsetY) > 0.001 ||
                shouldForceHidden,
              bounceOffsetY: safeBounceOffsetY,
              coverProgress: clampedCoverProgress,
              forceHidden: shouldForceHidden,
              progress: clampedProgress,
            },
          }),
        );
      };

      if (typeof window.matchMedia !== "function" || shouldReduceMotion()) {
        gsap.set(finalSection, { backgroundColor: "#09090b" });
        gsap.set(finalWordElements, {
          autoAlpha: 1,
          clearProps: "filter,transform",
        });
        gsap.set(loveTarget, {
          autoAlpha: 1,
          clearProps: "transform",
        });
        gsap.set(inlineLove, { autoAlpha: 0 });
        gsap.set(loveBounceDot, {
          autoAlpha: 0,
          clearProps: "transform",
        });
        gsap.set(dotMorphSvg, { autoAlpha: 0 });
        dispatchLoveScrollProgress(0, 0);
        return;
      }

      const dotMorphState = { progress: 0 };

      gsap.set(finalSection, { backgroundColor: "#09090b" });
      finalLeadWordElements.forEach((word) => {
        gsap.set(word, {
          autoAlpha: 0,
          y: finalLeadWordStartY,
          willChange: "opacity, transform",
        });
      });
      gsap.set(fallWord, {
        autoAlpha: 0,
        rotation: -13,
        transformOrigin: "50% 100%",
        willChange: "opacity, transform",
        y: -window.innerHeight * 0.76,
      });
      gsap.set(inWord, {
        autoAlpha: 0,
        scaleX: 1.35,
        willChange: "opacity, transform",
        x: window.innerWidth * 0.84,
      });
      gsap.set(withWord, {
        autoAlpha: 0,
        filter: "blur(24px)",
        scale: finalZoomedWordScale,
        transformOrigin: "50% 50%",
        willChange: "filter, opacity, transform",
        yPercent: 8,
      });
      gsap.set(itWord, {
        autoAlpha: 0,
        filter: "blur(24px)",
        scale: finalZoomedWordScale,
        transformOrigin: "50% 50%",
        willChange: "filter, opacity, transform",
        yPercent: 8,
      });
      gsap.set(finalDot, {
        autoAlpha: 0,
        transformOrigin: "50% 50%",
        willChange: "opacity, transform",
      });
      gsap.set(loveTarget, {
        autoAlpha: 1,
        clearProps: "transform",
      });
      gsap.set(inlineLove, {
        autoAlpha: 0,
        scale: 1,
        transformOrigin: "50% 50%",
        willChange: "opacity, transform",
      });
      gsap.set(loveBounceDot, {
        autoAlpha: 0,
        scale: 0.82,
        transformOrigin: "50% 50%",
        willChange: "opacity, transform",
        y: 0,
      });
      gsap.set(dotMorphSvg, { autoAlpha: 0 });
      gsap.set(dotMorphCircle, { attr: { cx: 0, cy: 0, r: 0 } });

      const syncDotMorphSvgViewBox = () => {
        dotMorphSvg.setAttribute("viewBox", `0 0 ${window.innerWidth} ${window.innerHeight}`);
      };

      const getDotCenterX = () => {
        const dotRect = finalDot.getBoundingClientRect();

        return dotRect.left + dotRect.width / 2;
      };

      const getDotCenterY = () => {
        const dotRect = finalDot.getBoundingClientRect();

        return dotRect.top + dotRect.height / 2;
      };

      const getDotRadius = () => {
        const rect = finalDot.getBoundingClientRect();

        return Math.max(rect.width, rect.height) / 2;
      };

      const getStageCenterX = () => window.innerWidth / 2;
      const getStageCenterY = () => window.innerHeight / 2;
      const getCoverRadius = () => Math.hypot(window.innerWidth, window.innerHeight) * 0.6;
      const updateDotMorphCircle = () => {
        const progress = dotMorphState.progress;
        const cx = gsap.utils.interpolate(getDotCenterX(), getStageCenterX(), progress);
        const cy = gsap.utils.interpolate(getDotCenterY(), getStageCenterY(), progress);
        const r = gsap.utils.interpolate(getDotRadius(), getCoverRadius(), progress);

        gsap.set(dotMorphCircle, {
          attr: { cx, cy, r },
        });
      };
      const syncDotMorphCircleToDot = () => {
        dotMorphState.progress = 0;
        gsap.set(dotMorphCircle, {
          attr: {
            cx: getDotCenterX(),
            cy: getDotCenterY(),
            r: getDotRadius(),
          },
        });
      };
      const syncDotMorphLayer = () => {
        syncDotMorphSvgViewBox();
        updateDotMorphCircle();
      };

      syncDotMorphSvgViewBox();
      syncDotMorphCircleToDot();
      dispatchLoveScrollProgress(0, 0);

      const finalDotMorphGrowStart = finalDotZoomStart + 0.02;
      const finalDotMorphGrowDuration = 0.4;
      const finalDotZoomEnd = finalDotMorphGrowStart + finalDotMorphGrowDuration;

      const finalTimeline = gsap.timeline({
        onUpdate: () => dispatchLoveScrollProgress(),
        scrollTrigger: {
          end: "bottom bottom",
          invalidateOnRefresh: true,
          onLeave: () => {
            gsap.set(dotMorphSvg, { autoAlpha: 0 });
            dispatchLoveScrollProgress(1, 1, 0, true);
          },
          onLeaveBack: () => dispatchLoveScrollProgress(0, 0),
          onRefresh: () => {
            syncDotMorphLayer();
            dispatchLoveScrollProgress();
          },
          scrub: true,
          start: "top top",
          trigger: finalSection,
        },
      });

      finalLeadWordElements.forEach((word, index) => {
        const start = finalLeadWordStarts[index] ?? index * 0.25;

        finalTimeline.to(
          word,
          {
            autoAlpha: 1,
            duration: finalLeadWordMoveDuration,
            ease: "power2.inOut",
            y: 0,
          },
          start,
        );
      });

      finalTimeline
        .to(
          fallWord,
          {
            autoAlpha: 1,
            duration: 0.3,
            ease: "power3.in",
            rotation: 0,
            y: 0,
          },
          0.7,
        )
        .to(
          fallWord,
          {
            duration: 0.12,
            ease: "power2.out",
            rotation: -2,
            scaleX: 0.94,
            scaleY: 1.12,
            y: -72,
          },
          1,
        )
        .to(
          fallWord,
          {
            duration: 0.12,
            ease: "power2.in",
            rotation: 0.8,
            scaleX: 1.08,
            scaleY: 0.88,
            y: 0,
          },
          1.12,
        )
        .to(
          fallWord,
          {
            duration: 0.06,
            ease: "power2.out",
            rotation: 0,
            scaleX: 1.16,
            scaleY: 0.8,
            y: 0,
          },
          1.24,
        )
        .to(
          fallWord,
          {
            duration: 0.14,
            ease: "elastic.out(1, 0.42)",
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            y: 0,
          },
          1.3,
        )
        .to(
          inWord,
          {
            autoAlpha: 1,
            duration: 0.18,
            ease: "expo.out",
            scaleX: 1,
            x: 0,
          },
          1.52,
        )
        .to(
          loveScrollState,
          {
            duration: finalLoveDockMoveDuration,
            ease: "none",
            progress: 1,
          },
          finalLoveDockStart,
        )
        .to(
          loveBounceState,
          {
            duration: finalLoveBounceRiseDuration,
            ease: "power2.out",
            onUpdate: () => dispatchLoveScrollProgress(),
            y: finalLoveBounceYOffset,
          },
          finalLoveBounceStart,
        )
        .to(
          loveBounceDot,
          {
            autoAlpha: 1,
            duration: 0.04,
            ease: "none",
            scale: 1,
          },
          finalLoveBounceStart,
        )
        .to(
          loveBounceDot,
          {
            duration: finalLoveBounceRiseDuration,
            ease: "power2.out",
            y: finalLoveBounceYOffset,
          },
          finalLoveBounceStart,
        )
        .to(
          loveBounceState,
          {
            duration: finalLoveBounceFallDuration,
            ease: "power3.in",
            onUpdate: () => dispatchLoveScrollProgress(),
            y: 0,
          },
          finalLoveBounceStart + finalLoveBounceRiseDuration,
        )
        .to(
          loveBounceDot,
          {
            autoAlpha: 0,
            duration: finalLoveBounceFallDuration,
            ease: "power2.in",
            scale: 0.72,
            y: 0,
          },
          finalLoveBounceStart + finalLoveBounceRiseDuration,
        )
        .to(
          withWord,
          {
            duration: 0.3,
            ease: "expo.out",
            filter: "blur(0px)",
            scale: 1,
            yPercent: 0,
          },
          finalWithWordStart,
        )
        .set(withWord, { autoAlpha: 1 }, finalWithWordStart)
        .to(
          itWord,
          {
            duration: 0.3,
            ease: "expo.out",
            filter: "blur(0px)",
            scale: 1,
            yPercent: 0,
          },
          finalItWordStart,
        )
        .set(itWord, { autoAlpha: 1 }, finalItWordStart)
        .to(finalDot, { autoAlpha: 1, duration: 0.16, ease: "none" }, finalDotRevealStart)
        .set(dotMorphSvg, { autoAlpha: 1 }, finalDotZoomStart)
        .call(syncDotMorphCircleToDot, [], finalDotZoomStart)
        .to(finalDot, { autoAlpha: 0, duration: 0.06, ease: "none" }, finalDotZoomStart)
        .to(
          loveScrollState,
          {
            coverProgress: 1,
            duration: 0.18,
            ease: "power1.in",
          },
          finalDotZoomStart,
        )
        .to(
          dotMorphState,
          {
            duration: finalDotMorphGrowDuration,
            ease: "power2.inOut",
            onUpdate: updateDotMorphCircle,
            progress: 1,
          },
          finalDotMorphGrowStart,
        )
        .set(finalSection, { backgroundColor: "#fafafa" }, finalDotZoomEnd)
        .set(inlineLove, { autoAlpha: 0 }, finalDotZoomEnd)
        .set(dotMorphSvg, { autoAlpha: 1 }, finalDotZoomEnd);

      return () => {
        dispatchLoveScrollProgress(0, 0);
      };
    },
    { scope: storySequenceRef },
  );

  useGSAP(
    () => {
      const section = horizontalQuoteSectionRef.current;
      const headline = section?.querySelector<HTMLElement>("[data-horizontal-quote-text]");

      if (!section || !headline) {
        return;
      }

      if (typeof window.matchMedia !== "function" || shouldReduceMotion()) {
        gsap.set(headline, {
          autoAlpha: 1,
          clearProps: "transform",
          paddingLeft: 0,
          whiteSpace: "normal",
          width: "auto",
        });
        return;
      }

      const quoteScrollDistance = 5000;

      const quoteSplit = GSAPSplitText.create(headline, {
        aria: "auto",
        charsClass: "horizontal-quote-char",
        tag: "span",
        type: "chars, words",
        wordsClass: "horizontal-quote-word",
      });

      const quotePinTrigger = ScrollTrigger.create({
        anticipatePin: 0.4,
        end: () => `+=${quoteScrollDistance}`,
        invalidateOnRefresh: true,
        pin: true,
        start: "top top",
        trigger: section,
      });

      const scrollTween = gsap.to(headline, {
        ease: "none",
        scrollTrigger: {
          end: () => `+=${quoteScrollDistance}`,
          invalidateOnRefresh: true,
          scrub: true,
          start: "top top",
          trigger: section,
        },
        x: () => -(headline.scrollWidth + window.innerWidth * 0.24),
      });

      quoteSplit.chars.forEach((character) => {
        gsap.from(character, {
          ease: "back.out(1.2)",
          rotation: "random(-20, 20)",
          scrollTrigger: {
            containerAnimation: scrollTween,
            end: "left 30%",
            scrub: 1,
            start: "left 100%",
            trigger: character,
          },
          yPercent: "random(-200, 200)",
        });
      });

      return () => {
        scrollTween.scrollTrigger?.kill();
        scrollTween.kill();
        quotePinTrigger.kill();
        quoteSplit.revert();
      };
    },
    { scope: horizontalQuoteSectionRef },
  );

  return (
    <>
      <OrchestratedEaseReverseMenu />
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-2000 h-svh w-full opacity-0"
        data-final-dot-morph-svg
        preserveAspectRatio="none"
        ref={finalDotMorphSvgRef}
      >
        <circle
          cx="0"
          cy="0"
          data-final-dot-morph-circle
          fill="#fafafa"
          r="0"
          ref={finalDotMorphCircleRef}
        />
      </svg>

      <main
        className="relative min-h-screen overflow-x-hidden bg-background text-foreground"
        ref={landingRef}
      >
        <DottedSurface data-landing-scroll-surface />

        <section
          className="relative z-10 mx-auto flex min-h-svh w-[min(1180px,calc(100%-32px))] flex-col items-center justify-center pt-28 pb-28 text-center"
          aria-labelledby="landing-title"
          data-landing-scroll-content
        >
          <div className="flex flex-col items-center">
            {skipIntroAnimation ? (
              <h1
                className={landingTitleClassName}
                data-landing-scroll-title
                id="landing-title"
                style={{
                  overflow: "visible",
                  whiteSpace: "nowrap",
                }}
              >
                Smile Project
              </h1>
            ) : (
              <SplitText
                className={landingTitleClassName}
                data-landing-scroll-title
                delay={50}
                duration={1.3}
                ease="power3.out"
                from={{ opacity: 0, y: 40 }}
                id="landing-title"
                onLetterAnimationHalfway={startDescriptionAnimation}
                splitType="chars"
                style={{
                  overflow: "visible",
                  whiteSpace: "nowrap",
                }}
                tag="h1"
                text="Smile Project"
                textAlign="center"
                to={{ opacity: 1, y: 0 }}
                triggerOnScroll={false}
              />
            )}
            {skipIntroAnimation ? (
              <p className={landingSubtitleClassName}>{landingSubtitleText}</p>
            ) : (
              <SplitText
                animateTarget="lines"
                className={landingSubtitleClassName}
                delay={100}
                duration={0.6}
                ease="expo.out"
                from={{
                  opacity: 0,
                  yPercent: 100,
                }}
                mask="lines"
                onLetterAnimationHalfway={revealHeroAction}
                splitType="words,lines"
                startAnimation={canStartDescriptionAnimation}
                tag="p"
                text={landingSubtitleText}
                textAlign="center"
                to={{ opacity: 1, yPercent: 0 }}
                triggerOnScroll={false}
              />
            )}
          </div>
          <div
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
            data-hero-action
            ref={heroActionRef}
          >
            <div
              className="flex size-50 cursor-pointer items-center justify-center -my-19"
              data-hero-explore-zone
              data-mode="true"
              data-wiggle="false"
              ref={exploreZoneRef}
            >
              <a
                aria-label="Open Explore page"
                className="relative isolate inline-flex min-h-12 items-center justify-center overflow-hidden rounded-[99px] border-0 bg-transparent px-8 font-semibold text-foreground outline-none will-change-transform"
                data-app-link
                data-hero-explore-button
                href="/explore"
                ref={exploreButtonRef}
              >
                <GlassSurface
                  aria-hidden="true"
                  data-hero-glass-surface
                  borderRadius={99}
                  height="100%"
                  style={{
                    inset: 0,
                    opacity: 0.58,
                    pointerEvents: "none",
                    position: "absolute",
                    zIndex: 1,
                  }}
                  width="100%"
                />
                <span
                  className="pointer-events-none relative z-20 inline-flex items-center gap-2"
                  data-hero-explore-label
                  ref={exploreLabelRef}
                >
                  Explore
                  <ArrowRightIcon aria-hidden="true" className="size-4.5 shrink-0" />
                </span>
              </a>
            </div>
          </div>
        </section>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[46svh] bg-linear-to-b from-transparent via-background/82 to-background opacity-0"
          data-landing-scroll-fade
        />
      </main>

      <section
        className="relative bg-neutral-50 px-6 text-neutral-950"
        aria-label="Interactive ML Playground introduction"
        ref={storySequenceRef}
      >
        <div className="relative -mx-6 w-[calc(100%+3rem)]" data-landing-slides-region>
          <div
            aria-hidden="true"
            className="pointer-events-none sticky top-0 z-50 h-16 bg-neutral-50"
            data-landing-slides-header
          />
          <section
            aria-label="Introducing Interactive ML Playground. ML can look simple from the outside. But the logic stays inside a black box. So we unpack every step."
            className="relative z-20 h-[1800svh] w-full bg-transparent text-neutral-950"
            data-blackbox-story-section
          >
            <div
              className="sticky top-16 h-[calc(100svh-4rem)] overflow-hidden rounded-t-2xl bg-transparent"
              data-blackbox-story-stage
            >
              <div
                className="absolute inset-0 z-0 flex items-stretch justify-center overflow-hidden rounded-t-md bg-neutral-50"
                data-landing-intro-panel
              >
                <article
                  aria-labelledby="landing-intro-title"
                  className="relative h-full w-full overflow-hidden rounded-t-2xl border-t border-neutral-50 bg-neutral-200"
                  data-landing-intro-card
                >
                  <h2
                    aria-label={`${introEyebrow} ${introTitle}. ${introSubtitleCopy}`}
                    className="absolute inset-x-10 top-[calc(31%-140px)] z-10 h-70 text-center min-[2200px]:top-[calc(31%-170px)] min-[2200px]:h-85"
                    id="landing-intro-title"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 top-1/2 block text-[clamp(5rem,min(11vw,16svh),11.5rem)] leading-[0.82] font-normal tracking-normal text-neutral-950 will-change-transform min-[2200px]:top-[44%] min-[2200px]:text-[clamp(11.5rem,8.2vw,14rem)]"
                      data-landing-intro-eyebrow
                    >
                      {introEyebrow}
                    </span>
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 top-1/2 block text-[clamp(3.4rem,min(6.8vw,10svh),7rem)] leading-[0.88] font-medium tracking-normal text-neutral-950 opacity-0 will-change-[transform,opacity] min-[2200px]:top-[57%] min-[2200px]:text-[clamp(7rem,5.35vw,9rem)]"
                      data-landing-intro-title
                    >
                      {introTitle}
                    </span>
                  </h2>

                  <p
                    className="absolute inset-x-12 top-[39%] z-10 mx-auto max-w-4xl text-center text-[clamp(1.1rem,min(1.65vw,2.5svh),1.45rem)] leading-normal font-normal text-neutral-600 opacity-0 will-change-[transform,opacity] min-[2200px]:top-[41%] min-[2200px]:max-w-6xl min-[2200px]:text-[clamp(1.45rem,1vw,1.7rem)]"
                    data-landing-intro-subtitle
                  >
                    {introSubtitleCopy}
                  </p>

                  <figure
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-[55%] z-10 aspect-170/95 w-[min(28vw,680px)] -translate-x-1/2 opacity-0 will-change-[opacity]"
                    data-landing-intro-chart
                  >
                    <LandingIntroAxes className="absolute inset-0 z-0 h-full w-full overflow-visible text-neutral-700" />
                    <LandingIntroRegressionLine className="absolute inset-0 z-20 h-full w-full overflow-visible text-[#2575F2]" />
                    <LandingIntroDots
                      className="relative z-10 h-full w-full overflow-visible text-[#05C68E]"
                      data-landing-intro-dots
                    />
                    <LandingIntroHands className="absolute inset-0 z-40 h-full w-full overflow-visible text-neutral-950" />
                  </figure>
                </article>
              </div>
              <section
                aria-hidden="true"
                className="absolute inset-0 z-10 flex items-start justify-center rounded-t-2xl bg-neutral-500 px-4 pt-[12svh] text-center"
                data-blackbox-card="simple"
              >
                <h2
                  className="text-[clamp(2.8rem,min(7.1vw,13svh),10rem)] leading-[0.92] font-semibold tracking-normal text-neutral-50"
                  data-blackbox-headline="call"
                >
                  <span className="block whitespace-nowrap">ML can look simple</span>
                  <span className="block whitespace-nowrap">from the outside.</span>
                </h2>
              </section>

              <section
                aria-hidden="true"
                className="absolute inset-0 z-20 flex items-start justify-center rounded-t-2xl bg-sky-500 px-4 pt-[12svh] text-center"
                data-blackbox-card="open"
              >
                <h2
                  className="text-[clamp(2.6rem,min(7vw,13svh),10rem)] leading-[0.94] font-semibold tracking-normal text-neutral-50"
                  data-blackbox-headline="hidden"
                >
                  <span className="block whitespace-nowrap">But the logic stays</span>
                  <span className="block whitespace-nowrap">
                    inside a <span className="text-neutral-950">black box.</span>
                  </span>
                </h2>
              </section>

              <section
                aria-hidden="true"
                className="absolute inset-0 z-30 flex items-start justify-center rounded-t-2xl bg-emerald-500 px-4 pt-[12svh] text-center"
                data-blackbox-card="unpack"
              >
                <h2
                  className="text-[clamp(2.8rem,min(7.2vw,13.2svh),10.2rem)] leading-[0.94] font-semibold tracking-normal text-neutral-950"
                  data-blackbox-headline="unpack"
                >
                  <span className="block whitespace-nowrap">So we unpack</span>
                  <span className="block whitespace-nowrap text-neutral-50">every step.</span>
                </h2>
              </section>
              <div
                className="pointer-events-none absolute top-[61%] left-1/2 z-50 h-[min(56svh,660px)] w-[min(90vw,1500px)] overflow-hidden border bg-neutral-900 text-neutral-50"
                data-blackbox-visual
              >
                <div className="absolute inset-0 flex flex-col" data-blackbox-editor-shell>
                  <style>
                    {`
                      @keyframes blackbox-code-cursor-blink {
                        0%, 48% {
                          opacity: 1;
                        }

                        49%, 100% {
                          opacity: 0;
                        }
                      }
                    `}
                  </style>
                  <div className="flex h-[clamp(2.75rem,min(4vw,5.4svh),3.65rem)] shrink-0 items-center gap-[clamp(0.5rem,0.7vw,0.75rem)] border-b border-neutral-600/70 bg-neutral-800 px-[clamp(1rem,1.5vw,1.75rem)]">
                    <span className="size-[clamp(0.75rem,0.95vw,1rem)] rounded-full bg-red-400" />
                    <span className="size-[clamp(0.75rem,0.95vw,1rem)] rounded-full bg-yellow-300" />
                    <span className="size-[clamp(0.75rem,0.95vw,1rem)] rounded-full bg-emerald-400" />
                  </div>
                  <pre
                    aria-label={blackBoxCodeLines.join("\n")}
                    className="min-h-0 flex-1 overflow-hidden p-5 font-mono text-[clamp(0.9rem,calc(0.42rem+1.2svh),1.5rem)] leading-[1.58] whitespace-pre text-neutral-100 sm:p-7"
                  >
                    {blackBoxCodeSegments.map((line, lineIndex) => (
                      <code
                        aria-hidden="true"
                        className="block min-h-[1.58em]"
                        data-blackbox-code-line
                        key={`blackbox-code-line-${lineIndex}`}
                      >
                        {line.map((segment, segmentIndex) =>
                          segment.text.split("").map((character, characterIndex) => (
                            <span
                              className={"className" in segment ? segment.className : undefined}
                              data-blackbox-code-char
                              key={`blackbox-code-char-${lineIndex}-${segmentIndex}-${characterIndex}`}
                            >
                              {character}
                            </span>
                          )),
                        )}
                        <span
                          className="inline-block h-[1.08em] w-[0.62em] translate-y-[-0.02em] align-middle opacity-0"
                          data-blackbox-code-cursor
                        >
                          <span
                            className="block h-full w-full rounded-[1px] bg-white shadow-[0_0_16px_rgba(255,255,255,0.55)]"
                            style={{
                              animation: canBlinkCodeCursor
                                ? "blackbox-code-cursor-blink 0.78s steps(1, end) infinite"
                                : "none",
                            }}
                          />
                        </span>
                      </code>
                    ))}
                  </pre>
                </div>

                <div
                  className="absolute inset-0 flex items-center justify-center opacity-0"
                  aria-hidden="true"
                  data-blackbox-box-content
                />

                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 flex h-[min(54svh,600px)] items-center justify-center p-2 opacity-0 sm:p-4"
                  data-blackbox-diagram-content
                >
                  <BlackBoxProcessDiagram className="h-full w-full overflow-visible" />
                </div>
              </div>

              <section
                aria-labelledby="understand-process-title"
                className="absolute inset-0 z-60 flex items-center justify-center overflow-hidden rounded-t-2xl bg-neutral-50 px-6 text-neutral-950"
                data-understand-slide
              >
                <h2
                  className="max-w-7xl text-center text-[clamp(2.65rem,min(8.4vw,13svh),8.8rem)] leading-[0.92] font-semibold tracking-normal opacity-0"
                  data-understand-title
                  id="understand-process-title"
                >
                  Understand the process,
                  <br />
                  not just the output.
                </h2>
              </section>
            </div>
          </section>
        </div>

        <div
          className="relative z-30 -mx-6 h-[320svh] w-[calc(100%+3rem)] bg-neutral-50"
          data-teaching-story-section
        >
          <div
            className="sticky top-0 flex h-svh items-center justify-center overflow-hidden bg-neutral-50 px-6 py-20 sm:py-24 lg:py-28"
            data-teaching-story-stage
          >
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-20 h-full w-full opacity-0"
              data-teaching-dot-morph-svg
              preserveAspectRatio="none"
            >
              <circle cx="0" cy="0" data-teaching-dot-morph-circle fill="#09090b" r="0" />
            </svg>
            <h2
              aria-label={teachingHeadlineCopy.replace("\n", " ")}
              className="relative z-10 my-5 mx-auto w-full max-w-screen-2xl pb-[0.5em] text-center"
            >
              <span
                aria-hidden="true"
                className="inline-block text-[clamp(2.25rem,min(7.5vw,12svh),8rem)] leading-[1.14] font-extrabold tracking-normal"
              >
                {teachingHeadlineLines.map((line, lineIndex) => (
                  <span key={line} className="contents">
                    {line.split(" ").map((word, wordIndex, words) => {
                      const wordStartIndex = words
                        .slice(0, wordIndex)
                        .reduce((total, previousWord) => total + previousWord.length + 1, 0);

                      return (
                        <span
                          className="inline-block whitespace-nowrap"
                          key={`${lineIndex}-${word}`}
                        >
                          {word.split("").map((character, characterIndex) => {
                            const lineCharacterIndex = wordStartIndex + characterIndex;
                            const isMorphDot =
                              lineIndex === teachingHeadlineLines.length - 1 &&
                              lineCharacterIndex === line.lastIndexOf(".");

                            if (isMorphDot) {
                              return (
                                <span
                                  className="relative inline-block will-change-[transform,opacity]"
                                  data-teaching-story-char
                                  data-teaching-story-dot
                                  key={`${lineIndex}-${wordIndex}-dot-${characterIndex}`}
                                >
                                  <span>{character}</span>
                                  <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute bottom-[0.2em] left-1/2 block h-[0.16em] w-[0.16em] -translate-x-1/2 opacity-0"
                                    data-teaching-story-dot-anchor
                                  >
                                    <svg
                                      aria-hidden="true"
                                      className="block h-full w-full overflow-visible"
                                      viewBox="0 0 100 100"
                                    >
                                      <circle cx="50" cy="50" fill="currentColor" r="50" />
                                    </svg>
                                  </span>
                                </span>
                              );
                            }

                            return (
                              <span
                                className="inline-block will-change-[transform,opacity]"
                                data-teaching-story-char
                                key={`${lineIndex}-${wordIndex}-${character}-${characterIndex}`}
                              >
                                {character}
                              </span>
                            );
                          })}
                          {wordIndex < words.length - 1 ? "\u00A0" : null}
                        </span>
                      );
                    })}
                    {lineIndex < teachingHeadlineLines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </span>
            </h2>
          </div>
        </div>

        <div
          className="relative -mx-6 h-[560svh] w-[calc(100%+3rem)] bg-neutral-950"
          data-final-love-story-section
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-[45%] left-0 h-[260svh] w-px"
            data-love-scroll-section
          />
          <div
            className="pointer-events-none sticky top-0 z-1400 flex h-svh items-center justify-center overflow-hidden px-6 py-20 text-neutral-50 sm:py-24 lg:py-28"
            data-final-love-story-stage
          >
            <h2
              aria-label={finalHeadlineAriaLabel}
              className="relative z-1400 mx-auto flex w-full max-w-screen-2xl flex-col items-center justify-center text-center font-extrabold tracking-normal"
            >
              <span
                aria-hidden="true"
                className="flex max-w-full items-center justify-center gap-x-[0.18em] overflow-visible pb-[0.14em] text-[clamp(2.25rem,min(7.5vw,12svh),8rem)] leading-[1.04] whitespace-nowrap"
                data-final-lead-text
              >
                {finalLeadWordLabels.map((word) => (
                  <span
                    className="inline-block will-change-[transform,opacity]"
                    data-final-lead-word={word.toLowerCase()}
                    key={word}
                  >
                    {word}
                  </span>
                ))}
              </span>

              <span
                aria-hidden="true"
                className="mt-[clamp(1.75rem,4svh,2.25rem)] flex max-w-full flex-wrap items-center justify-center gap-x-[0.18em] gap-y-3 text-[clamp(2.25rem,min(7.5vw,12svh),8rem)] leading-[0.9] whitespace-nowrap"
              >
                <span className="inline-block" data-final-word="fall">
                  fall
                </span>
                <span className="inline-block" data-final-word="in">
                  in
                </span>
                <span
                  aria-hidden="true"
                  className="relative z-0 inline-flex h-[0.9em] w-[1em] shrink-0 items-center justify-center"
                  data-love-scroll-target
                >
                  <svg
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full overflow-visible opacity-0"
                    data-final-inline-love
                    viewBox="0 0 50 50"
                  >
                    <path
                      d="M25 45 C20 40 6 29 6 17 C6 9.8 11.1 5 17.3 5 C20.9 5 23.7 6.8 25 9.5 C26.3 6.8 29.1 5 32.7 5 C38.9 5 44 9.8 44 17 C44 29 30 40 25 45 Z"
                      fill="oklch(61.224% 0.2313 22.61)"
                    />
                  </svg>
                  {/* Keep X centering on the wrapper so GSAP owns the dot transform for bounce y/scale. */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-[calc(100%+0.08em)] left-1/2 block -translate-x-1/2"
                  >
                    <span
                      aria-hidden="true"
                      className="block h-[0.18em] w-[0.18em] opacity-0"
                      data-love-bounce-dot
                    >
                      <svg
                        aria-hidden="true"
                        className="block h-full w-full overflow-visible"
                        viewBox="0 0 100 100"
                      >
                        <circle cx="50" cy="50" fill="oklch(61.224% 0.2313 22.61)" r="50" />
                      </svg>
                    </span>
                  </span>
                </span>
                <span className="relative z-10 inline-block" data-final-word="with">
                  with
                </span>
                <span className="relative z-10 inline-block" data-final-word="it">
                  it
                </span>
                <span
                  className="mb-[0.1em] inline-block h-[0.18em] w-[0.18em] self-end"
                  data-final-dot
                >
                  <svg
                    aria-hidden="true"
                    className="block h-full w-full overflow-visible"
                    viewBox="0 0 100 100"
                  >
                    <circle cx="50" cy="50" fill="currentColor" r="50" />
                  </svg>
                </span>
              </span>
            </h2>
          </div>
        </div>

        <section
          aria-labelledby="horizontal-quote-title"
          className="relative -mx-6 flex h-svh w-[calc(100%+3rem)] items-center overflow-hidden bg-neutral-50 text-neutral-950"
          data-horizontal-quote-section
          data-navigation-menu-hide-zone
          ref={horizontalQuoteSectionRef}
        >
          <div className="container mx-auto">
            <h3
              className="flex w-max gap-[4vw] pl-[100vw] text-[clamp(2rem,min(10vw,18svh),12rem)] leading-[1.1] font-semibold tracking-normal whitespace-nowrap motion-reduce:w-auto motion-reduce:flex-wrap motion-reduce:pl-0 motion-reduce:whitespace-normal"
              data-horizontal-quote-text
              id="horizontal-quote-title"
            >
              {representationQuote}
            </h3>
          </div>
        </section>
      </section>

      <DeferredCinematicFooter />
    </>
  );
}

function BlackBoxProcessDiagram(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 870 300" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g fontFamily="Lexend Variable, ui-sans-serif, system-ui, sans-serif" letterSpacing="0">
        <g data-blackbox-diagram-node="input">
          <text fill="#09090b" fontSize="18" fontWeight="500" x="34" y="73">
            Input
          </text>
          <rect
            fill="transparent"
            height="42"
            rx="10"
            stroke="#09090b"
            strokeWidth="2"
            width="46"
            x="26"
            y="91"
          />
          <text fill="#09090b" fontSize="20" fontWeight="500" textAnchor="middle" x="49" y="118">
            x
          </text>
          <rect
            fill="transparent"
            height="42"
            rx="10"
            stroke="#09090b"
            strokeWidth="2"
            width="46"
            x="26"
            y="169"
          />
          <text fill="#09090b" fontSize="20" fontWeight="500" textAnchor="middle" x="49" y="196">
            y
          </text>
        </g>

        <path
          d="M74 112 L116 146"
          data-blackbox-diagram-stroke="input-to-model"
          stroke="#09090b"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
        <path
          d="M105 143 L116 146 L112 136"
          data-blackbox-diagram-arrowhead=""
          data-blackbox-diagram-stroke="input-to-model"
          stroke="#09090b"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
        <path
          d="M74 190 L116 168"
          data-blackbox-diagram-stroke="input-to-model"
          stroke="#09090b"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
        <path
          d="M109 177 L116 168 L105 168"
          data-blackbox-diagram-arrowhead=""
          data-blackbox-diagram-stroke="input-to-model"
          stroke="#09090b"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />

        <g data-blackbox-diagram-node="model">
          <text fill="#09090b" fontSize="18" fontWeight="500" textAnchor="middle" x="184" y="106">
            Model
          </text>
          <rect fill="transparent" height="58" rx="12" width="132" x="118" y="128" />
          <rect height="58" rx="12" stroke="#09090b" strokeWidth="2" width="132" x="118" y="128" />
          <text fill="#09090b" fontSize="17" fontWeight="500" textAnchor="middle" x="184" y="151">
            Linear
          </text>
          <text fill="#09090b" fontSize="17" fontWeight="500" textAnchor="middle" x="184" y="172">
            Regression
          </text>
        </g>

        <path
          d="M254 158 H296"
          data-blackbox-diagram-stroke="model-to-train"
          stroke="#09090b"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
        <path
          d="M286 151 L298 158 L286 165"
          data-blackbox-diagram-arrowhead=""
          data-blackbox-diagram-stroke="model-to-train"
          stroke="#09090b"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />

        <g data-blackbox-diagram-node="train">
          <text fill="#09090b" fontSize="18" fontWeight="500" textAnchor="middle" x="405" y="30">
            Train
          </text>
          <rect fill="transparent" height="258" rx="28" width="196" x="307" y="42" />
          <rect height="258" rx="28" stroke="#09090b" strokeWidth="2" width="196" x="307" y="42" />
        </g>

        <g data-blackbox-diagram-node="pred">
          <rect
            fill="transparent"
            height="34"
            rx="9"
            stroke="#09090b"
            strokeWidth="2"
            width="86"
            x="362"
            y="63"
          />
          <text fill="#09090b" fontSize="16" fontWeight="500" textAnchor="middle" x="405" y="85">
            pred
          </text>
        </g>
        <path
          d="M405 99 V119"
          data-blackbox-diagram-stroke="pred-to-find"
          stroke="#09090b"
          strokeLinecap="round"
          strokeWidth="2.2"
        />
        <path
          d="M399 112 L405 121 L411 112"
          data-blackbox-diagram-arrowhead=""
          data-blackbox-diagram-stroke="pred-to-find"
          stroke="#09090b"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />

        <g data-blackbox-diagram-node="find-error">
          <rect
            fill="transparent"
            height="34"
            rx="9"
            stroke="#09090b"
            strokeWidth="2"
            width="126"
            x="342"
            y="121"
          />
          <text fill="#09090b" fontSize="16" fontWeight="500" textAnchor="middle" x="405" y="143">
            find error
          </text>
        </g>
        <path
          d="M405 157 V177"
          data-blackbox-diagram-stroke="find-to-minimize"
          stroke="#09090b"
          strokeLinecap="round"
          strokeWidth="2.2"
        />
        <path
          d="M399 170 L405 179 L411 170"
          data-blackbox-diagram-arrowhead=""
          data-blackbox-diagram-stroke="find-to-minimize"
          stroke="#09090b"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />

        <g data-blackbox-diagram-node="minimize-error">
          <rect
            fill="transparent"
            height="34"
            rx="9"
            stroke="#09090b"
            strokeWidth="2"
            width="154"
            x="328"
            y="179"
          />
          <text fill="#09090b" fontSize="16" fontWeight="500" textAnchor="middle" x="405" y="201">
            minimize error
          </text>
        </g>
        <path
          d="M405 215 V235"
          data-blackbox-diagram-stroke="minimize-to-params"
          stroke="#09090b"
          strokeLinecap="round"
          strokeWidth="2.2"
        />
        <path
          d="M399 228 L405 237 L411 228"
          data-blackbox-diagram-arrowhead=""
          data-blackbox-diagram-stroke="minimize-to-params"
          stroke="#09090b"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />

        <g data-blackbox-diagram-node="get-params">
          <rect
            fill="transparent"
            height="34"
            rx="9"
            stroke="#09090b"
            strokeWidth="2"
            width="108"
            x="351"
            y="237"
          />
          <text fill="#09090b" fontSize="16" fontWeight="500" textAnchor="middle" x="405" y="259">
            get params
          </text>
        </g>

        <path
          d="M508 158 H548"
          data-blackbox-diagram-stroke="train-to-result"
          stroke="#09090b"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
        <path
          d="M538 151 L550 158 L538 165"
          data-blackbox-diagram-arrowhead=""
          data-blackbox-diagram-stroke="train-to-result"
          stroke="#09090b"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />

        <g data-blackbox-diagram-node="result">
          <text fill="#09090b" fontSize="18" fontWeight="500" textAnchor="middle" x="618" y="106">
            Result
          </text>
          <rect fill="transparent" height="58" rx="12" width="136" x="552" y="128" />
          <rect height="58" rx="12" stroke="#09090b" strokeWidth="2" width="136" x="552" y="128" />
          <text fill="#09090b" fontSize="15" fontWeight="500" textAnchor="middle" x="620" y="151">
            coef_(w)
          </text>
          <text fill="#09090b" fontSize="15" fontWeight="500" textAnchor="middle" x="620" y="172">
            intercept_(b)
          </text>
        </g>

        <path
          d="M692 158 H724"
          data-blackbox-diagram-stroke="result-to-predict"
          stroke="#09090b"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
        <path
          d="M714 151 L726 158 L714 165"
          data-blackbox-diagram-arrowhead=""
          data-blackbox-diagram-stroke="result-to-predict"
          stroke="#09090b"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />

        <g data-blackbox-diagram-node="predict">
          <text fill="#09090b" fontSize="18" fontWeight="500" textAnchor="middle" x="766" y="106">
            Predict
          </text>
          <rect fill="transparent" height="58" rx="12" width="94" x="728" y="128" />
          <rect height="58" rx="12" stroke="#09090b" strokeWidth="2" width="94" x="728" y="128" />
          <text fill="#09090b" fontSize="16" fontWeight="500" textAnchor="middle" x="775" y="164">
            Y_pred
          </text>
        </g>
      </g>
    </svg>
  );
}
