import { type SVGProps, useCallback, useRef, useState } from "react";
import { IconArrowRight } from "@tabler/icons-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText as GSAPSplitText } from "gsap/SplitText";

import { PlaygroundIntroAxes } from "@/components/PlaygroundIntroAxes";
import { PlaygroundIntroDots } from "@/components/PlaygroundIntroDots";
import { PlaygroundIntroHands } from "@/components/PlaygroundIntroHands";
import { PlaygroundIntroRegressionLine } from "@/components/PlaygroundIntroRegressionLine";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { GlassSurface } from "@/components/ui/glass-surface";
import { CinematicFooter } from "@/components/ui/motion-footer";
import { OrchestratedEaseReverseMenu } from "@/components/ui/orchestrated-ease-reverse-menu";
import { SplitText } from "@/components/ui/split-text";
import quoteWinkEmojiStaticSrc from "../../assets/quote-wink-smile.png";

gsap.registerPlugin(useGSAP, DrawSVGPlugin, ScrollTrigger, GSAPSplitText);

const playgroundIntroEyebrow = "Introducing";
const playgroundIntroTitle = "Interactive ML Playground";
const playgroundIntroSubtitle =
  "A visual-first playground for exploring how machine learning models learn.";
const blackBoxStoryCodeSegments = [
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
    { className: "text-zinc-100", text: "X_train" },
    { className: "text-zinc-500", text: ", " },
    { className: "text-zinc-100", text: "X_test" },
    { className: "text-zinc-500", text: ", " },
    { className: "text-zinc-100", text: "y_train" },
    { className: "text-zinc-500", text: ", " },
    { className: "text-zinc-100", text: "y_test" },
    { text: " " },
    { className: "text-fuchsia-300", text: "=" },
    { text: " " },
    { className: "text-emerald-300", text: "train_test_split" },
    { className: "text-zinc-500", text: "(" },
    { className: "text-zinc-100", text: "X" },
    { className: "text-zinc-500", text: ", " },
    { className: "text-zinc-100", text: "y" },
    { className: "text-zinc-500", text: ")" },
  ],
  [],
  [
    { className: "text-zinc-100", text: "model" },
    { text: " " },
    { className: "text-fuchsia-300", text: "=" },
    { text: " " },
    { className: "text-emerald-300", text: "LinearRegression" },
    { className: "text-zinc-500", text: "()" },
  ],
  [
    { className: "text-zinc-100", text: "model" },
    { className: "text-zinc-500", text: "." },
    { className: "text-amber-300", text: "fit" },
    { className: "text-zinc-500", text: "(" },
    { className: "text-zinc-100", text: "X_train" },
    { className: "text-zinc-500", text: ", " },
    { className: "text-zinc-100", text: "y_train" },
    { className: "text-zinc-500", text: ")" },
  ],
  [],
  [
    { className: "text-zinc-100", text: "model" },
    { className: "text-zinc-500", text: "." },
    { className: "text-amber-300", text: "coef_" },
  ],
  [
    { className: "text-zinc-100", text: "model" },
    { className: "text-zinc-500", text: "." },
    { className: "text-amber-300", text: "intercept_" },
  ],
  [
    { className: "text-zinc-100", text: "model" },
    { className: "text-zinc-500", text: "." },
    { className: "text-amber-300", text: "predict" },
    { className: "text-zinc-500", text: "(" },
    { className: "text-zinc-100", text: "X_test" },
    { className: "text-zinc-500", text: ")" },
  ],
] as const;
const blackBoxStoryCodeLines = blackBoxStoryCodeSegments.map((line) =>
  line.map((segment) => segment.text).join(""),
);
const playgroundTeachingCopy = "We don't just teach\nyou Machine Learning.";
const playgroundTeachingLines = playgroundTeachingCopy.split("\n");
const playgroundFinalAriaLabel = "We make you fall in love with it.";
const playgroundFinalLeadWords = ["We", "make", "you"];
const representationQuote =
  "The key to artificial intelligence has always been the representation. —Jeff Hawkins";
const playgroundFinalLeadWordMoveDuration = 0.24;
const playgroundFinalLeadWordStarts = [0, 0.24, 0.42] as const;
const playgroundFinalLeadWordStartY = 420;
const quoteWinkEmojiWebpSrc = "https://fonts.gstatic.com/s/e/notoemoji/latest/1f609/512.webp";
const quoteWinkEmojiGifSrc = "https://fonts.gstatic.com/s/e/notoemoji/latest/1f609/512.gif";
const quoteWinkEmojiPlaybackDuration = 2.25;
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

export function LandingPage() {
  const landingRef = useRef<HTMLElement>(null);
  const playgroundSectionRef = useRef<HTMLElement>(null);
  const horizontalQuoteSectionRef = useRef<HTMLElement>(null);
  const finalDotMorphSvgRef = useRef<SVGSVGElement>(null);
  const finalDotMorphCircleRef = useRef<SVGCircleElement>(null);
  const heroActionRef = useRef<HTMLDivElement>(null);
  const exploreZoneRef = useRef<HTMLDivElement>(null);
  const exploreButtonRef = useRef<HTMLAnchorElement>(null);
  const exploreLabelRef = useRef<HTMLSpanElement>(null);
  const [canStartDescriptionAnimation, setCanStartDescriptionAnimation] = useState(false);
  const [canRevealHeroAction, setCanRevealHeroAction] = useState(false);
  const startDescriptionAnimation = useCallback(() => {
    setCanStartDescriptionAnimation(true);
  }, []);
  const revealHeroAction = useCallback(() => {
    setCanRevealHeroAction(true);
  }, []);

  useGSAP(
    () => {
      const fadeTarget = "[data-landing-scroll-fade]";
      const surfaceTarget = "[data-landing-scroll-surface]";
      const contentTarget = "[data-landing-scroll-content]";
      const visibleTargets = `${contentTarget}, ${surfaceTarget}`;

      if (typeof window.matchMedia !== "function") {
        gsap.set(visibleTargets, { autoAlpha: 1, clearProps: "all" });
        gsap.set(fadeTarget, { autoAlpha: 0 });
        return;
      }

      const motionPreferences = gsap.matchMedia();

      motionPreferences.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(visibleTargets, { autoAlpha: 1, clearProps: "all" });
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
          gsap.set(magneticTargets, { clearProps: "transform" });
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

      if (
        typeof window.matchMedia !== "function" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        gsap.set(heroAction, { autoAlpha: 1, clearProps: "transform" });
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
      const root = playgroundSectionRef.current;

      if (!root) {
        return;
      }

      const introSection = root.querySelector<HTMLElement>("[data-playground-intro-panel]");
      const introCard = root.querySelector<HTMLElement>("[data-playground-intro-card]");
      const introMeet = root.querySelector<HTMLElement>("[data-playground-intro-meet]");
      const introProduct = root.querySelector<HTMLElement>("[data-playground-intro-product]");
      const introSubtitle = root.querySelector<HTMLElement>("[data-playground-intro-subtitle]");
      const introChart = root.querySelector<HTMLElement>("[data-playground-intro-chart]");
      const introDots = root.querySelector<HTMLElement>("[data-playground-intro-dots]");
      const introDotElements = Array.from(
        introDots?.querySelectorAll<SVGPathElement>("[data-playground-intro-dot]") ?? [],
      );
      const introAxisXLine = root.querySelector<SVGPathElement>("[data-playground-axis-x-line]");
      const introAxisXArrow = root.querySelector<SVGPathElement>("[data-playground-axis-x-arrow]");
      const introAxisYLine = root.querySelector<SVGPathElement>("[data-playground-axis-y-line]");
      const introAxisYArrow = root.querySelector<SVGPathElement>("[data-playground-axis-y-arrow]");
      const introRegressionLine = root.querySelector<SVGPathElement>(
        "[data-playground-regression-line]",
      );
      const introHandElements = Array.from(
        root.querySelectorAll<SVGGElement>("[data-playground-intro-hand]"),
      );
      const introRightHand = root.querySelector<SVGGElement>("[data-playground-intro-right-hand]");
      const introAxisElements = [
        introAxisXLine,
        introAxisXArrow,
        introAxisYLine,
        introAxisYArrow,
      ].filter((axisElement): axisElement is SVGPathElement => axisElement !== null);

      if (
        !introSection ||
        !introCard ||
        !introMeet ||
        !introProduct ||
        !introSubtitle ||
        !introChart ||
        !introDots ||
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

      const motionPreferences = gsap.matchMedia();

      motionPreferences.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(introSection, { autoAlpha: 1, clearProps: "transform" });
        gsap.set(introCard, { autoAlpha: 1, clearProps: "transform" });
        gsap.set(introMeet, {
          clearProps: "filter",
          scale: 0.44,
          transformOrigin: "50% 50%",
          x: 0,
          y: -116,
          yPercent: -50,
        });
        gsap.set(introProduct, {
          autoAlpha: 1,
          transformOrigin: "50% 50%",
          y: -10,
          yPercent: -50,
        });
        gsap.set(introSubtitle, {
          autoAlpha: 1,
          clearProps: "transform",
        });
        gsap.set(introChart, {
          autoAlpha: 1,
          clearProps: "transform",
        });
        gsap.set(introDots, {
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
      });

      motionPreferences.add("(prefers-reduced-motion: no-preference)", () => {
        const getIntroMeetTextNode = () =>
          Array.from(introMeet.childNodes).find(
            (node): node is Text =>
              node.nodeType === Node.TEXT_NODE &&
              node.textContent?.includes(playgroundIntroEyebrow) === true,
          );
        const measureIntroMeetCutX = () => {
          const textNode = getIntroMeetTextNode();
          const cutCharacterIndex = playgroundIntroEyebrow.indexOf("c");

          if (!textNode || cutCharacterIndex < 0) {
            return -window.innerWidth * 0.14;
          }

          const currentX = Number(gsap.getProperty(introMeet, "x")) || 0;
          const currentScale = Number(gsap.getProperty(introMeet, "scale")) || 1;
          const range = document.createRange();

          gsap.set(introMeet, { scale: 1, x: 0 });
          range.setStart(textNode, cutCharacterIndex);
          range.setEnd(textNode, cutCharacterIndex + 1);

          const characterBounds = range.getBoundingClientRect();

          gsap.set(introMeet, { scale: currentScale, x: currentX });

          if (characterBounds.width <= 0) {
            return -window.innerWidth * 0.14;
          }

          return window.innerWidth / 2 - (characterBounds.left + characterBounds.width / 2);
        };
        const getIntroMeetStartX = () => measureIntroMeetCutX() + window.innerWidth * 0.86;
        const introProductSplit = GSAPSplitText.create(introProduct, {
          aria: "hidden",
          tag: "span",
          type: "words",
          wordsClass: "intro-product-word",
        });
        const introProductWords =
          introProductSplit.words.length > 0 ? introProductSplit.words : [introProduct];
        const introSubtitleSplit = GSAPSplitText.create(introSubtitle, {
          aria: "hidden",
          tag: "span",
          type: "words",
          wordsClass: "intro-subtitle-word",
        });
        const introSubtitleWords =
          introSubtitleSplit.words.length > 0 ? introSubtitleSplit.words : [introSubtitle];

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
        gsap.set(introMeet, {
          autoAlpha: 0,
          filter: "blur(18px)",
          scale: 1,
          transformOrigin: "50% 50%",
          x: getIntroMeetStartX,
          y: 0,
          yPercent: -50,
        });
        gsap.set(introProduct, {
          autoAlpha: 0,
          transformOrigin: "50% 50%",
          y: 230,
          yPercent: -50,
        });
        gsap.set(introProductWords, {
          autoAlpha: 0,
          filter: "blur(14px)",
          yPercent: 70,
        });
        gsap.set(introSubtitle, {
          autoAlpha: 0,
          y: 28,
        });
        gsap.set(introSubtitleWords, {
          autoAlpha: 0,
          filter: "blur(8px)",
          yPercent: 80,
        });
        gsap.set(introChart, {
          autoAlpha: 1,
        });
        gsap.set(introDots, {
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

        const introRevealScrollUnits = 4.85;
        const introExitScrollUnits = 1;
        const introExitStart = introRevealScrollUnits;
        const syncIntroPanelSpacing = () => {
          introSection.style.marginBottom = `${window.innerHeight * introRevealScrollUnits}px`;
        };

        syncIntroPanelSpacing();

        let introTimeline: gsap.core.Timeline;

        introTimeline = gsap.timeline({
          scrollTrigger: {
            end: () => `+=${window.innerHeight * (introRevealScrollUnits + introExitScrollUnits)}`,
            invalidateOnRefresh: true,
            onRefreshInit: syncIntroPanelSpacing,
            pin: true,
            pinSpacing: false,
            scrub: true,
            start: "bottom bottom",
            trigger: introSection,
          },
        });

        introTimeline
          .to(
            introMeet,
            {
              autoAlpha: 1,
              duration: 0.04,
              ease: "none",
            },
            0,
          )
          .to(
            introMeet,
            {
              duration: 0.42,
              ease: "power3.out",
              x: measureIntroMeetCutX,
            },
            0,
          )
          .to(
            introMeet,
            {
              duration: 0.24,
              ease: "power2.out",
              filter: "blur(0px)",
            },
            0,
          )
          .to(introMeet, { x: 0 }, 0.42)
          .to(
            introMeet,
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
            introProduct,
            {
              autoAlpha: 1,
              duration: 0.24,
              ease: "power3.out",
              y: -10,
            },
            0.8,
          )
          .to(
            introProductWords,
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
            introSubtitle,
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
            introSection,
            {
              duration: 0.9,
              ease: "none",
              scale: 0.7,
            },
            introExitStart,
          )
          .to(
            introSection,
            {
              duration: 0.1,
              ease: "none",
              opacity: 0,
            },
            introExitStart + 0.9,
          );

        return () => {
          introSection.style.marginBottom = "";
          introSubtitleSplit.revert();
          introProductSplit.revert();
        };
      });

      return () => motionPreferences.revert();
    },
    { scope: playgroundSectionRef },
  );

  useGSAP(
    () => {
      const root = playgroundSectionRef.current;

      if (!root) {
        return;
      }

      const storySection = root.querySelector<HTMLElement>("[data-blackbox-story-section]");
      const storyStage = root.querySelector<HTMLElement>("[data-blackbox-floating-stage]");
      const storyVisual = root.querySelector<HTMLElement>("[data-blackbox-visual]");
      const editorShell = root.querySelector<HTMLElement>("[data-blackbox-editor-shell]");
      const boxContent = root.querySelector<HTMLElement>("[data-blackbox-box-content]");
      const diagramContent = root.querySelector<HTMLElement>("[data-blackbox-diagram-content]");
      const conclusionSlide = root.querySelector<HTMLElement>("[data-understand-slide]");
      const conclusionTitle = root.querySelector<HTMLElement>("[data-understand-title]");
      const codeCharacters = Array.from(
        root.querySelectorAll<HTMLElement>("[data-blackbox-code-char]"),
      );
      const diagramNodes = Array.from(
        root.querySelectorAll<SVGGElement>("[data-blackbox-diagram-node]"),
      );
      const diagramStrokes = Array.from(
        root.querySelectorAll<SVGPathElement>("[data-blackbox-diagram-stroke]"),
      );

      if (
        !storySection ||
        !storyStage ||
        !storyVisual ||
        !editorShell ||
        !boxContent ||
        !diagramContent ||
        !conclusionSlide ||
        !conclusionTitle ||
        codeCharacters.length === 0 ||
        diagramNodes.length === 0 ||
        diagramStrokes.length === 0
      ) {
        return;
      }

      const getVisualBaseWidth = () => Math.min(window.innerWidth * 0.9, 900);
      const getVisualBaseHeight = () => Math.min(window.innerHeight * 0.58, 500);
      const getBlackBoxSize = () => Math.min(getVisualBaseWidth(), getVisualBaseHeight()) * 0.46;
      const getBoardWidth = () => getVisualBaseWidth() * 0.92;
      const getBoardHeight = () => getVisualBaseHeight() * 0.92;
      const motionPreferences = gsap.matchMedia();

      motionPreferences.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(storySection, { backgroundColor: "#71717a" });
        gsap.set(storyStage, { clearProps: "backgroundColor" });
        gsap.set(storyVisual, {
          autoAlpha: 1,
          backgroundColor: "#fafafa",
          borderColor: "rgba(9, 9, 11, 0.12)",
          borderRadius: 28,
          height: getBoardHeight,
          scale: 1,
          width: getBoardWidth,
          xPercent: -50,
          y: 0,
          yPercent: -50,
        });
        gsap.set(editorShell, { autoAlpha: 0 });
        gsap.set(boxContent, { autoAlpha: 0 });
        gsap.set(diagramContent, { autoAlpha: 1 });
        gsap.set(diagramNodes, { autoAlpha: 1, scale: 1 });
        gsap.set(diagramStrokes, { drawSVG: "0% 100%" });
        gsap.set(conclusionTitle, { autoAlpha: 1, clearProps: "filter,transform" });
      });

      motionPreferences.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(storySection, { backgroundColor: "#71717a" });
        gsap.set(storyStage, { clearProps: "backgroundColor" });
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
          y: 0,
          yPercent: -50,
        });
        gsap.set(editorShell, {
          autoAlpha: 1,
          filter: "blur(0px)",
          scale: 1,
          transformOrigin: "50% 50%",
          willChange: "filter, opacity, transform",
        });
        gsap.set(codeCharacters, { autoAlpha: 0 });
        gsap.set(boxContent, {
          autoAlpha: 0,
          filter: "blur(0px)",
          scale: 1,
          transformOrigin: "50% 50%",
          willChange: "filter, opacity, transform",
        });
        gsap.set(diagramContent, {
          autoAlpha: 0,
          willChange: "opacity",
        });
        gsap.set(diagramNodes, {
          autoAlpha: 0,
          scale: 0.92,
          transformBox: "fill-box",
          transformOrigin: "50% 50%",
        });
        gsap.set(diagramStrokes, {
          autoAlpha: 1,
          drawSVG: "0% 0%",
        });
        gsap.set(conclusionTitle, {
          autoAlpha: 0,
          filter: "blur(18px)",
          y: 36,
          willChange: "filter, opacity, transform",
        });

        const storyTimeline = gsap.timeline({
          defaults: { ease: "power2.out" },
          scrollTrigger: {
            end: "bottom bottom",
            invalidateOnRefresh: true,
            scrub: true,
            start: "top top+=64",
            trigger: storySection,
          },
        });

        storyTimeline
          .addLabel("call", 0)
          .to(
            codeCharacters,
            {
              autoAlpha: 1,
              duration: 0.01,
              ease: "none",
              stagger: 0.008,
            },
            "call+=0.16",
          )
          .addLabel("open", 1.32)
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
            },
            "open",
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
            "open+=0.06",
          )
          .to(
            boxContent,
            {
              autoAlpha: 1,
              duration: 0.28,
              ease: "power2.out",
              scale: 1,
            },
            "open+=0.42",
          )
          .addLabel("unpack", 2.58)
          .to(
            storyVisual,
            {
              backgroundColor: "#fafafa",
              borderColor: "rgba(9, 9, 11, 0.12)",
              borderRadius: 28,
              boxShadow: "0 34px 110px rgba(9, 9, 11, 0.28)",
              duration: 0.78,
              ease: "power3.inOut",
              height: getBoardHeight,
              scale: 1,
              width: getBoardWidth,
            },
            "unpack",
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
            "unpack",
          )
          .to(
            diagramContent,
            {
              autoAlpha: 1,
              duration: 0.26,
              ease: "none",
            },
            "unpack+=0.26",
          )
          .to(
            diagramNodes,
            {
              autoAlpha: 1,
              duration: 0.38,
              ease: "back.out(1.35)",
              scale: 1,
              stagger: 0.06,
            },
            "unpack+=0.4",
          )
          .to(
            diagramStrokes,
            {
              drawSVG: "0% 100%",
              duration: 0.48,
              ease: "power2.out",
              stagger: 0.05,
            },
            "unpack+=0.62",
          )
          .to(
            storyVisual,
            {
              autoAlpha: 0,
              duration: 0.34,
              ease: "power2.in",
              y: -30,
            },
            "unpack+=1.8",
          );

        gsap
          .timeline({
            scrollTrigger: {
              end: "center center",
              scrub: true,
              start: "top 78%",
              trigger: conclusionSlide,
            },
          })
          .to(conclusionTitle, {
            autoAlpha: 1,
            duration: 1,
            ease: "power2.out",
            filter: "blur(0px)",
            y: 0,
          });
      });

      return () => motionPreferences.revert();
    },
    { scope: playgroundSectionRef },
  );

  useGSAP(
    () => {
      const root = playgroundSectionRef.current;

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
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
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
            gsap.set(storyStage, { backgroundColor: "#fafafa" });
            gsap.set(dotMorphSvg, { autoAlpha: 0 });
          },
          scrub: true,
          start: "top top",
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
    { scope: playgroundSectionRef },
  );

  useGSAP(
    () => {
      const root = playgroundSectionRef.current;

      if (!root) {
        return;
      }

      const finalSection = root.querySelector<HTMLElement>("[data-final-love-story-section]");
      const finalStage = root.querySelector<HTMLElement>("[data-final-love-story-stage]");
      const finalLeadWords = Array.from(
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
        finalLeadWords.length !== playgroundFinalLeadWords.length ||
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

      const [weWord, makeWord, youWord] = finalLeadWords as [HTMLElement, HTMLElement, HTMLElement];
      const finalWords = [weWord, makeWord, youWord, fallWord, inWord, withWord, itWord, finalDot];
      const loveScrollState = { coverProgress: 0, progress: 0 };
      const loveBounceState = { y: 0 };
      const dispatchLoveScrollProgress = (
        progress = loveScrollState.progress,
        coverProgress = loveScrollState.coverProgress,
        bounceOffsetY = loveBounceState.y,
      ) => {
        const clampedProgress = gsap.utils.clamp(0, 1, progress);
        const clampedCoverProgress = gsap.utils.clamp(0, 1, coverProgress);
        const safeBounceOffsetY = Number.isFinite(bounceOffsetY) ? bounceOffsetY : 0;

        window.dispatchEvent(
          new CustomEvent("smile:love-scroll-progress", {
            detail: {
              active:
                clampedProgress > 0.001 ||
                clampedCoverProgress > 0.001 ||
                Math.abs(safeBounceOffsetY) > 0.001,
              bounceOffsetY: safeBounceOffsetY,
              coverProgress: clampedCoverProgress,
              progress: clampedProgress,
            },
          }),
        );
      };

      if (
        typeof window.matchMedia !== "function" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        gsap.set(finalSection, { backgroundColor: "#09090b" });
        gsap.set(finalWords, { autoAlpha: 1, clearProps: "filter,transform" });
        gsap.set(loveTarget, { autoAlpha: 1, clearProps: "transform" });
        gsap.set(inlineLove, { autoAlpha: 0 });
        gsap.set(loveBounceDot, { autoAlpha: 0, clearProps: "transform" });
        gsap.set(dotMorphSvg, { autoAlpha: 0 });
        dispatchLoveScrollProgress(0, 0);
        return;
      }

      const dotMorphState = { progress: 0 };

      gsap.set(finalSection, { backgroundColor: "#09090b" });
      finalLeadWords.forEach((word) => {
        gsap.set(word, {
          autoAlpha: 0,
          y: playgroundFinalLeadWordStartY,
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
      gsap.set(loveTarget, { autoAlpha: 1, clearProps: "transform" });
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
            dispatchLoveScrollProgress(0, 0);
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

      finalLeadWords.forEach((word, index) => {
        const start = playgroundFinalLeadWordStarts[index] ?? index * 0.25;

        finalTimeline.to(
          word,
          {
            autoAlpha: 1,
            duration: playgroundFinalLeadWordMoveDuration,
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
          { coverProgress: 1, duration: 0.18, ease: "power1.in" },
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
    { scope: playgroundSectionRef },
  );

  useGSAP(
    () => {
      const section = horizontalQuoteSectionRef.current;
      const headline = section?.querySelector<HTMLElement>("[data-horizontal-quote-text]");
      const emoji = section?.querySelector<HTMLElement>("[data-horizontal-quote-emoji]");
      const emojiStaticLayer = section?.querySelector<HTMLElement>(
        "[data-horizontal-quote-emoji-static]",
      );
      const emojiAnimatedLayer = section?.querySelector<HTMLElement>(
        "[data-horizontal-quote-emoji-animated]",
      );
      const emojiAnimatedSource = section?.querySelector<HTMLSourceElement>(
        "[data-horizontal-quote-emoji-source]",
      );
      const emojiAnimatedImage = section?.querySelector<HTMLImageElement>(
        "[data-horizontal-quote-emoji-image]",
      );

      if (
        !section ||
        !headline ||
        !emoji ||
        !emojiStaticLayer ||
        !emojiAnimatedLayer ||
        !emojiAnimatedSource ||
        !emojiAnimatedImage
      ) {
        return;
      }

      if (
        typeof window.matchMedia !== "function" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        gsap.set(headline, {
          autoAlpha: 1,
          clearProps: "transform",
          paddingLeft: 0,
          whiteSpace: "normal",
          width: "auto",
        });
        gsap.set(emoji, {
          autoAlpha: 1,
          clearProps: "filter,transform",
        });
        gsap.set(emojiStaticLayer, { autoAlpha: 1 });
        gsap.set(emojiAnimatedLayer, { autoAlpha: 0 });
        return;
      }

      const quoteScrollDistance = 5000;
      const quoteEmojiScrollDistance = 2600;

      const resetAnimatedEmojiSource = () => {
        emojiAnimatedSource.removeAttribute("srcset");
        emojiAnimatedImage.removeAttribute("src");
      };
      const restartAnimatedEmoji = () => {
        resetAnimatedEmojiSource();

        void emojiAnimatedImage.offsetWidth;
        emojiAnimatedSource.setAttribute("srcset", quoteWinkEmojiWebpSrc);
        emojiAnimatedImage.setAttribute("src", quoteWinkEmojiGifSrc);
      };
      const resetEmoji = () => {
        resetAnimatedEmojiSource();
        gsap.set(emoji, {
          autoAlpha: 0,
          filter: "blur(26px)",
          scale: 2.35,
          transformOrigin: "50% 50%",
        });
        gsap.set(emojiStaticLayer, { autoAlpha: 1 });
        gsap.set(emojiAnimatedLayer, { autoAlpha: 0 });
      };

      resetEmoji();

      const quoteSplit = GSAPSplitText.create(headline, {
        aria: "auto",
        charsClass: "horizontal-quote-char",
        tag: "span",
        type: "chars, words",
        wordsClass: "horizontal-quote-word",
      });

      const quotePinTrigger = ScrollTrigger.create({
        anticipatePin: 0.4,
        end: () => `+=${quoteScrollDistance + quoteEmojiScrollDistance}`,
        invalidateOnRefresh: true,
        pin: true,
        start: "top top",
        trigger: section,
      });

      const getQuotePinStart = () => quotePinTrigger.start;
      const getQuoteEmojiStart = () => getQuotePinStart() + quoteScrollDistance;
      const getQuoteEmojiEnd = () => getQuoteEmojiStart() + quoteEmojiScrollDistance;

      const emojiTimeline = gsap
        .timeline({
          paused: true,
          onInterrupt: resetAnimatedEmojiSource,
        })
        .call(resetAnimatedEmojiSource, [], 0)
        .set(emojiStaticLayer, { autoAlpha: 1 }, 0)
        .set(emojiAnimatedLayer, { autoAlpha: 0 }, 0)
        .fromTo(
          emoji,
          {
            autoAlpha: 0,
            filter: "blur(26px)",
            scale: 2.35,
          },
          {
            autoAlpha: 1,
            duration: 0.62,
            ease: "power3.out",
            filter: "blur(0px)",
            scale: 1,
          },
          0,
        )
        .call(restartAnimatedEmoji, [], 0.62)
        .set(emojiAnimatedLayer, { autoAlpha: 1 }, 0.62)
        .set(emojiStaticLayer, { autoAlpha: 0 }, 0.62)
        .to(emoji, { duration: quoteWinkEmojiPlaybackDuration, ease: "none" }, 0.62)
        .to(emoji, {
          autoAlpha: 0,
          duration: 0.46,
          ease: "power3.in",
          filter: "blur(22px)",
          scale: 0.34,
        })
        .call(resetAnimatedEmojiSource);

      const playEmoji = () => {
        resetEmoji();
        emojiTimeline.restart();
      };

      const stopEmoji = () => {
        emojiTimeline.pause(0);
        resetEmoji();
      };

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

      const emojiWindowTrigger = ScrollTrigger.create({
        end: getQuoteEmojiEnd,
        invalidateOnRefresh: true,
        onEnter: playEmoji,
        onEnterBack: playEmoji,
        onLeave: stopEmoji,
        onLeaveBack: stopEmoji,
        start: getQuoteEmojiStart,
        trigger: section,
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
        emojiWindowTrigger.kill();
        scrollTween.scrollTrigger?.kill();
        scrollTween.kill();
        emojiTimeline.kill();
        quotePinTrigger.kill();
        resetAnimatedEmojiSource();
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
        className="pointer-events-none fixed inset-0 z-[2000] h-[100svh] w-screen opacity-0"
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
          className="relative z-10 mx-auto flex min-h-[100svh] w-[min(1180px,calc(100%_-_32px))] flex-col items-center justify-center pt-28 pb-28 text-center"
          aria-labelledby="landing-title"
          data-landing-scroll-content
        >
          <div className="flex flex-col items-center">
            <SplitText
              className="max-w-full whitespace-nowrap text-[clamp(2.8rem,10vw,8.6rem)] leading-[0.9] tracking-normal text-foreground font-semibold"
              data-landing-scroll-title
              delay={50}
              duration={1.3}
              ease="power3.out"
              from={{ opacity: 0, y: 40 }}
              id="landing-title"
              onLetterAnimationHalfway={startDescriptionAnimation}
              splitType="chars"
              style={{ overflow: "visible", whiteSpace: "nowrap" }}
              tag="h1"
              text="Smile Project"
              textAlign="center"
              to={{ opacity: 1, y: 0 }}
              triggerOnScroll={false}
            />
            <SplitText
              animateTarget="lines"
              className="mt-6 max-w-2xl text-[clamp(1rem,2vw,1.3rem)] leading-[1.65] text-muted-foreground"
              delay={100}
              duration={0.6}
              ease="expo.out"
              from={{ opacity: 0, yPercent: 100 }}
              mask="lines"
              onLetterAnimationHalfway={revealHeroAction}
              splitType="words,lines"
              startAnimation={canStartDescriptionAnimation}
              tag="p"
              text="Make sense of machine learning by interacting with models instead of just reading about them."
              textAlign="center"
              to={{ opacity: 1, yPercent: 0 }}
              triggerOnScroll={false}
            />
          </div>
          <div
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
            data-hero-action
            ref={heroActionRef}
          >
            <div
              className="flex size-[200px] cursor-pointer items-center justify-center -my-[76px]"
              data-hero-explore-zone
              data-mode="true"
              data-wiggle="false"
              ref={exploreZoneRef}
            >
              <a
                aria-label="Open model picker"
                className="relative isolate inline-flex min-h-12 items-center justify-center overflow-hidden rounded-[99px] border-0 bg-transparent px-8 font-semibold text-foreground outline-none will-change-transform"
                data-app-link
                data-hero-explore-button
                href="/model-picker"
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
                  <IconArrowRight aria-hidden="true" size={18} />
                </span>
              </a>
            </div>
          </div>
        </section>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[46svh] bg-gradient-to-b from-transparent via-background/82 to-background opacity-0"
          data-landing-scroll-fade
        />
      </main>

      <section
        className="relative bg-zinc-50 px-6 text-zinc-950"
        aria-label="Interactive ML Playground introduction"
        ref={playgroundSectionRef}
      >
        <div className="relative -mx-6 w-[calc(100%+3rem)]" data-playground-slides-region>
          <div
            aria-hidden="true"
            className="pointer-events-none sticky top-0 z-50 h-16 bg-zinc-50"
            data-playground-slides-header
          />
          <div
            className="relative z-10 flex h-[calc(100svh-4rem)] w-full items-stretch justify-center overflow-hidden rounded-t-md bg-zinc-50"
            data-playground-intro-panel
          >
            <article
              aria-labelledby="playground-intro-title"
              className="relative h-full w-full overflow-hidden rounded-t-2xl border-t border-zinc-50 bg-zinc-200"
              data-playground-intro-card
            >
              <h2
                aria-label={`${playgroundIntroEyebrow} ${playgroundIntroTitle}. ${playgroundIntroSubtitle}`}
                className="absolute inset-x-10 top-[calc(31%-140px)] z-10 h-[280px] text-center"
                id="playground-intro-title"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-1/2 block text-[clamp(5rem,11vw,11.5rem)] leading-[0.82] font-normal tracking-normal text-zinc-950 will-change-transform"
                  data-playground-intro-meet
                >
                  {playgroundIntroEyebrow}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-1/2 block text-[clamp(3.4rem,6.8vw,7rem)] leading-[0.88] font-medium tracking-normal text-zinc-950 opacity-0 will-change-[transform,opacity]"
                  data-playground-intro-product
                >
                  {playgroundIntroTitle}
                </span>
              </h2>

              <p
                className="absolute inset-x-12 top-[39%] z-10 mx-auto max-w-4xl text-center text-[clamp(1.1rem,1.65vw,1.45rem)] leading-[1.5] font-normal text-zinc-600 opacity-0 will-change-[transform,opacity]"
                data-playground-intro-subtitle
              >
                {playgroundIntroSubtitle}
              </p>

              <figure
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-[55%] z-10 aspect-[170/95] w-[min(28vw,680px)] -translate-x-1/2 opacity-0 will-change-[opacity]"
                data-playground-intro-chart
              >
                <PlaygroundIntroAxes className="absolute inset-0 z-0 h-full w-full overflow-visible text-zinc-700" />
                <PlaygroundIntroRegressionLine className="absolute inset-0 z-20 h-full w-full overflow-visible text-[#2575F2]" />
                <PlaygroundIntroDots
                  className="relative z-10 h-full w-full overflow-visible text-[#05C68E]"
                  data-playground-intro-dots
                />
                <PlaygroundIntroHands className="absolute inset-0 z-40 h-full w-full overflow-visible text-zinc-950" />
              </figure>
            </article>
          </div>

          <section
            aria-label="ML can look simple from the outside. So we open the black box. We unpack every step."
            className="relative z-20 h-[440svh] w-full rounded-t-2xl bg-zinc-500 text-zinc-950"
            data-blackbox-story-section
          >
            <div className="absolute inset-x-0 top-0 z-10" data-blackbox-copy-track>
              <section
                aria-hidden="true"
                className="flex h-[calc(100svh-4rem)] items-start justify-center rounded-t-2xl px-4 pt-[9svh] text-center"
                data-blackbox-copy-slide="simple"
              >
                <h2
                  className="text-[clamp(2.6rem,5.9vw,7rem)] leading-[0.92] font-semibold tracking-normal text-zinc-50"
                  data-blackbox-headline="call"
                >
                  <span className="block whitespace-nowrap">ML can look simple</span>
                  <span className="block whitespace-nowrap">from the outside.</span>
                </h2>
              </section>

              <section
                aria-hidden="true"
                className="flex h-[calc(100svh-4rem)] items-start justify-center px-4 pt-[9svh] text-center"
                data-blackbox-copy-slide="open"
              >
                <h2
                  className="text-[clamp(2.35rem,5.8vw,7rem)] leading-[0.94] font-semibold tracking-normal text-zinc-50"
                  data-blackbox-headline="hidden"
                >
                  <span className="block whitespace-nowrap">So we open the</span>
                  <span className="block whitespace-nowrap text-zinc-950">black box.</span>
                </h2>
              </section>

              <section
                aria-hidden="true"
                className="flex h-[calc(100svh-4rem)] items-start justify-center px-4 pt-[9svh] text-center"
                data-blackbox-copy-slide="unpack"
              >
                <h2
                  className="text-[clamp(2.5rem,6.1vw,7.2rem)] leading-[0.94] font-semibold tracking-normal text-zinc-50"
                  data-blackbox-headline="unpack"
                >
                  We unpack every step.
                </h2>
              </section>
            </div>

            <div
              className="pointer-events-none sticky top-16 z-40 h-[calc(100svh-4rem)] overflow-visible px-6"
              data-blackbox-floating-stage
            >
              <div
                className="absolute top-[61%] left-1/2 z-20 h-[min(58svh,500px)] w-[min(90vw,900px)] overflow-hidden border bg-zinc-900 text-zinc-50"
                data-blackbox-visual
              >
                <div className="absolute inset-0 flex flex-col" data-blackbox-editor-shell>
                  <div className="flex h-11 shrink-0 items-center gap-2 border-b border-zinc-700/70 bg-zinc-950/72 px-4">
                    <span className="size-3 rounded-full bg-red-400" />
                    <span className="size-3 rounded-full bg-yellow-300" />
                    <span className="size-3 rounded-full bg-emerald-400" />
                    <span className="ml-3 text-xs font-medium tracking-normal text-zinc-400">
                      model.py
                    </span>
                  </div>
                  <pre
                    aria-label={blackBoxStoryCodeLines.join("\n")}
                    className="min-h-0 flex-1 overflow-hidden p-5 font-mono text-[clamp(0.72rem,1.4vw,1rem)] leading-[1.58] whitespace-pre text-zinc-100 sm:p-7"
                  >
                    {blackBoxStoryCodeSegments.map((line, lineIndex) => (
                      <code
                        aria-hidden="true"
                        className="block min-h-[1.58em]"
                        key={`blackbox-code-line-${lineIndex}`}
                      >
                        {line.map((segment, segmentIndex) =>
                          segment.text.split("").map((character, characterIndex) => (
                            <span
                              className={segment.className}
                              data-blackbox-code-char
                              key={`blackbox-code-char-${lineIndex}-${segmentIndex}-${characterIndex}`}
                            >
                              {character}
                            </span>
                          )),
                        )}
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
                  className="absolute inset-0 flex items-center justify-center p-3 opacity-0 sm:p-6"
                  data-blackbox-diagram-content
                >
                  <BlackBoxProcessDiagram className="h-full w-full overflow-visible" />
                </div>
              </div>
            </div>
          </section>

          <section
            aria-labelledby="understand-process-title"
            className="relative z-20 flex h-[calc(100svh-4rem)] w-full items-center justify-center overflow-hidden bg-zinc-50 px-6 text-zinc-950"
            data-understand-slide
          >
            <h2
              className="max-w-7xl text-center text-[clamp(2.65rem,8.4vw,8.8rem)] leading-[0.92] font-semibold tracking-normal opacity-0"
              data-understand-title
              id="understand-process-title"
            >
              Understand the process,
              <br />
              not just the output.
            </h2>
          </section>
        </div>

        <div
          className="relative z-30 -mx-6 h-[320svh] w-[calc(100%+3rem)] bg-zinc-50"
          data-teaching-story-section
        >
          <div
            className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden bg-zinc-50 px-6 py-20 sm:py-24 lg:py-28"
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
              aria-label={playgroundTeachingCopy.replace("\n", " ")}
              className="relative z-10 my-5 mx-auto w-full max-w-screen-2xl pb-[0.5em] text-center"
            >
              <span
                aria-hidden="true"
                className="inline-block text-4xl leading-[1.14] font-extrabold tracking-normal sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl"
              >
                {playgroundTeachingLines.map((line, lineIndex) => (
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
                              lineIndex === playgroundTeachingLines.length - 1 &&
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
                    {lineIndex < playgroundTeachingLines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </span>
            </h2>
          </div>
        </div>

        <div
          className="relative -mx-6 h-[560svh] w-[calc(100%+3rem)] bg-zinc-950"
          data-final-love-story-section
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-[45%] left-0 h-[260svh] w-px"
            data-love-scroll-section
          />
          <div
            className="pointer-events-none sticky top-0 z-[1400] flex h-[100svh] items-center justify-center overflow-hidden px-6 py-20 text-zinc-50 sm:py-24 lg:py-28"
            data-final-love-story-stage
          >
            <h2
              aria-label={playgroundFinalAriaLabel}
              className="relative z-[1400] mx-auto flex w-full max-w-screen-2xl flex-col items-center justify-center text-center font-extrabold tracking-normal"
            >
              <span
                aria-hidden="true"
                className="flex max-w-full items-center justify-center gap-x-[0.18em] overflow-visible pb-[0.14em] text-4xl leading-[1.04] whitespace-nowrap sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl"
                data-final-lead-text
              >
                {playgroundFinalLeadWords.map((word) => (
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
                className="mt-7 flex max-w-full flex-wrap items-center justify-center gap-x-[0.18em] gap-y-3 text-4xl leading-[0.9] whitespace-nowrap sm:mt-9 sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl"
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
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-[calc(100%+0.08em)] left-[calc(50%-0.05em)] block h-[0.18em] w-[0.18em] -translate-x-1/2 opacity-0"
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
          className="relative -mx-6 flex h-[100svh] w-[calc(100%+3rem)] items-center overflow-hidden bg-zinc-50 text-zinc-950"
          data-horizontal-quote-section
          ref={horizontalQuoteSectionRef}
        >
          <div className="container mx-auto">
            <h3
              className="flex w-max gap-[4vw] pl-[100vw] text-[clamp(2rem,10vw,12rem)] leading-[1.1] font-semibold tracking-normal whitespace-nowrap motion-reduce:w-auto motion-reduce:flex-wrap motion-reduce:pl-0 motion-reduce:whitespace-normal"
              data-horizontal-quote-text
              id="horizontal-quote-title"
            >
              {representationQuote}
            </h3>
          </div>
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div
              className="relative size-[clamp(5.25rem,12vw,10rem)] opacity-0 will-change-[filter,transform,opacity]"
              data-horizontal-quote-emoji
            >
              <picture
                className="absolute inset-0 block size-full"
                data-horizontal-quote-emoji-static
              >
                <img
                  alt="😉"
                  className="block size-full"
                  draggable={false}
                  height="512"
                  src={quoteWinkEmojiStaticSrc}
                  width="512"
                />
              </picture>
              <picture
                className="absolute inset-0 block size-full opacity-0"
                data-horizontal-quote-emoji-animated
              >
                <source data-horizontal-quote-emoji-source type="image/webp" />
                <img
                  alt="😉"
                  className="block size-full"
                  data-horizontal-quote-emoji-image
                  draggable={false}
                  height="512"
                  width="512"
                />
              </picture>
            </div>
          </div>
        </section>
      </section>

      <CinematicFooter />
    </>
  );
}

function BlackBoxProcessDiagram(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 820 300" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <pattern height="8" id="diagram-model-hatch" patternUnits="userSpaceOnUse" width="8">
          <path d="M-2 8 L8 -2 M2 10 L10 2" stroke="#60a5fa" strokeWidth="1.2" />
        </pattern>
        <pattern height="8" id="diagram-train-hatch" patternUnits="userSpaceOnUse" width="8">
          <path d="M-2 8 L8 -2 M2 10 L10 2" stroke="#86efac" strokeWidth="1.2" />
        </pattern>
        <pattern height="8" id="diagram-result-hatch" patternUnits="userSpaceOnUse" width="8">
          <path d="M-2 8 L8 -2 M2 10 L10 2" stroke="#c4b5fd" strokeWidth="1.2" />
        </pattern>
        <pattern height="8" id="diagram-predict-hatch" patternUnits="userSpaceOnUse" width="8">
          <path d="M-2 8 L8 -2 M2 10 L10 2" stroke="#fde047" strokeWidth="1.2" />
        </pattern>
      </defs>

      <g
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
        letterSpacing="0"
      >
        <g data-blackbox-diagram-node>
          <text fill="#27272a" fontSize="18" fontWeight="700" x="34" y="73">
            Input
          </text>
          <rect
            fill="#fff"
            height="42"
            rx="10"
            stroke="#18181b"
            strokeWidth="2"
            width="46"
            x="26"
            y="91"
          />
          <text fill="#18181b" fontSize="20" fontWeight="700" textAnchor="middle" x="49" y="118">
            x
          </text>
          <rect
            fill="#fff"
            height="42"
            rx="10"
            stroke="#18181b"
            strokeWidth="2"
            width="46"
            x="26"
            y="169"
          />
          <text fill="#18181b" fontSize="20" fontWeight="700" textAnchor="middle" x="49" y="196">
            y
          </text>
        </g>

        <path
          d="M74 112 C92 122 104 137 121 148"
          data-blackbox-diagram-stroke
          stroke="#27272a"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
        <path
          d="M74 190 C94 181 106 171 121 162"
          data-blackbox-diagram-stroke
          stroke="#27272a"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
        <path
          d="M112 144 L123 152 L110 158"
          data-blackbox-diagram-stroke
          stroke="#27272a"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />

        <g data-blackbox-diagram-node>
          <text fill="#27272a" fontSize="18" fontWeight="700" textAnchor="middle" x="184" y="106">
            Model
          </text>
          <rect fill="#dbeafe" height="58" rx="12" width="132" x="118" y="128" />
          <rect
            fill="url(#diagram-model-hatch)"
            height="58"
            opacity="0.82"
            rx="12"
            width="132"
            x="118"
            y="128"
          />
          <rect height="58" rx="12" stroke="#18181b" strokeWidth="2" width="132" x="118" y="128" />
          <text fill="#18181b" fontSize="17" fontWeight="700" textAnchor="middle" x="184" y="151">
            Linear
          </text>
          <text fill="#18181b" fontSize="17" fontWeight="700" textAnchor="middle" x="184" y="172">
            Regression
          </text>
        </g>

        <path
          d="M254 158 H296"
          data-blackbox-diagram-stroke
          stroke="#27272a"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
        <path
          d="M286 151 L298 158 L286 165"
          data-blackbox-diagram-stroke
          stroke="#27272a"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />

        <g data-blackbox-diagram-node>
          <text fill="#27272a" fontSize="18" fontWeight="700" textAnchor="middle" x="405" y="30">
            Train
          </text>
          <rect fill="#dcfce7" height="228" rx="28" width="196" x="307" y="42" />
          <rect
            fill="url(#diagram-train-hatch)"
            height="228"
            opacity="0.9"
            rx="28"
            width="196"
            x="307"
            y="42"
          />
          <rect height="228" rx="28" stroke="#18181b" strokeWidth="2" width="196" x="307" y="42" />
        </g>

        <g data-blackbox-diagram-node>
          <rect
            fill="#fff"
            height="34"
            rx="9"
            stroke="#18181b"
            strokeWidth="2"
            width="86"
            x="362"
            y="63"
          />
          <text fill="#18181b" fontSize="16" fontWeight="700" textAnchor="middle" x="405" y="85">
            pred
          </text>
        </g>
        <path
          d="M405 99 V119"
          data-blackbox-diagram-stroke
          stroke="#18181b"
          strokeLinecap="round"
          strokeWidth="2.2"
        />
        <path
          d="M399 112 L405 121 L411 112"
          data-blackbox-diagram-stroke
          stroke="#18181b"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />

        <g data-blackbox-diagram-node>
          <rect
            fill="#fff"
            height="34"
            rx="9"
            stroke="#18181b"
            strokeWidth="2"
            width="126"
            x="342"
            y="121"
          />
          <text fill="#18181b" fontSize="16" fontWeight="700" textAnchor="middle" x="405" y="143">
            find error
          </text>
        </g>
        <path
          d="M405 157 V177"
          data-blackbox-diagram-stroke
          stroke="#18181b"
          strokeLinecap="round"
          strokeWidth="2.2"
        />
        <path
          d="M399 170 L405 179 L411 170"
          data-blackbox-diagram-stroke
          stroke="#18181b"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />

        <g data-blackbox-diagram-node>
          <rect
            fill="#fff"
            height="34"
            rx="9"
            stroke="#18181b"
            strokeWidth="2"
            width="154"
            x="328"
            y="179"
          />
          <text fill="#18181b" fontSize="16" fontWeight="700" textAnchor="middle" x="405" y="201">
            minimize error
          </text>
        </g>
        <path
          d="M405 215 V235"
          data-blackbox-diagram-stroke
          stroke="#18181b"
          strokeLinecap="round"
          strokeWidth="2.2"
        />
        <path
          d="M399 228 L405 237 L411 228"
          data-blackbox-diagram-stroke
          stroke="#18181b"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />

        <g data-blackbox-diagram-node>
          <rect
            fill="#fff"
            height="34"
            rx="9"
            stroke="#18181b"
            strokeWidth="2"
            width="108"
            x="351"
            y="237"
          />
          <text fill="#18181b" fontSize="16" fontWeight="700" textAnchor="middle" x="405" y="259">
            get params
          </text>
        </g>

        <path
          d="M508 158 H548"
          data-blackbox-diagram-stroke
          stroke="#27272a"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
        <path
          d="M538 151 L550 158 L538 165"
          data-blackbox-diagram-stroke
          stroke="#27272a"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />

        <g data-blackbox-diagram-node>
          <text fill="#27272a" fontSize="18" fontWeight="700" textAnchor="middle" x="618" y="106">
            Result
          </text>
          <rect fill="#ede9fe" height="58" rx="12" width="136" x="552" y="128" />
          <rect
            fill="url(#diagram-result-hatch)"
            height="58"
            opacity="0.82"
            rx="12"
            width="136"
            x="552"
            y="128"
          />
          <rect height="58" rx="12" stroke="#18181b" strokeWidth="2" width="136" x="552" y="128" />
          <text fill="#18181b" fontSize="15" fontWeight="700" textAnchor="middle" x="620" y="151">
            coef_(w)
          </text>
          <text fill="#18181b" fontSize="15" fontWeight="700" textAnchor="middle" x="620" y="172">
            intercept_(b)
          </text>
        </g>

        <path
          d="M692 158 H724"
          data-blackbox-diagram-stroke
          stroke="#27272a"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
        <path
          d="M714 151 L726 158 L714 165"
          data-blackbox-diagram-stroke
          stroke="#27272a"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />

        <g data-blackbox-diagram-node>
          <text fill="#27272a" fontSize="18" fontWeight="700" textAnchor="middle" x="766" y="106">
            Predict
          </text>
          <rect fill="#fef9c3" height="58" rx="12" width="94" x="728" y="128" />
          <rect
            fill="url(#diagram-predict-hatch)"
            height="58"
            opacity="0.82"
            rx="12"
            width="94"
            x="728"
            y="128"
          />
          <rect height="58" rx="12" stroke="#18181b" strokeWidth="2" width="94" x="728" y="128" />
          <text fill="#18181b" fontSize="16" fontWeight="700" textAnchor="middle" x="775" y="164">
            Y_pred
          </text>
        </g>
      </g>
    </svg>
  );
}
