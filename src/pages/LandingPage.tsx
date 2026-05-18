import { useCallback, useRef, useState } from "react";
import { IconArrowRight } from "@tabler/icons-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { DottedSurface } from "@/components/ui/dotted-surface";
import { GlassSurface } from "@/components/ui/glass-surface";
import { CinematicFooter } from "@/components/ui/motion-footer";
import { OrchestratedEaseReverseMenu } from "@/components/ui/orchestrated-ease-reverse-menu";
import { SplitText } from "@/components/ui/split-text";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const playgroundIntroEyebrow = "Introducing";
const playgroundIntroTitle = "Interactive ML Playground";
const playgroundIntroSubtitle =
  "Turn complex Machine Learning algorithms into visual, hands-on learning.";
const playgroundFrictionAriaLabel =
  "We stripped away heavy coding. We opened up the black box. And found the sweet spot for learning.";
const playgroundTeachingCopy = "We don't just teach\nyou Machine Learning.";
const playgroundTeachingLines = playgroundTeachingCopy.split("\n");
const playgroundFinalAriaLabel = "We make you fall in love with it.";
const playgroundFinalLeadWords = ["We", "make", "you"];
const playgroundFinalLeadWordMoveDuration = 0.24;
const playgroundFinalLeadWordStarts = [0, 0.24, 0.42] as const;
const playgroundFinalLeadWordStartY = 420;

export function LandingPage() {
  const landingRef = useRef<HTMLElement>(null);
  const playgroundSectionRef = useRef<HTMLElement>(null);
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
      const introVisual = root.querySelector<HTMLElement>("[data-playground-intro-visual]");
      const plotLine = root.querySelector<SVGPathElement>("[data-playground-intro-plot-line]");
      const visualGroups = Array.from(
        root.querySelectorAll<SVGElement>("[data-playground-intro-visual-group]"),
      );
      const plotPoints = Array.from(
        root.querySelectorAll<SVGElement>("[data-playground-intro-point]"),
      );
      const controls = Array.from(
        root.querySelectorAll<SVGElement>("[data-playground-intro-control]"),
      );

      if (
        !introSection ||
        !introCard ||
        !introMeet ||
        !introProduct ||
        !introSubtitle ||
        !introVisual ||
        !plotLine
      ) {
        return;
      }

      const plotLineLength = 720;
      const motionPreferences = gsap.matchMedia();

      motionPreferences.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(introSection, { autoAlpha: 1, clearProps: "transform" });
        gsap.set(introCard, { autoAlpha: 1, clearProps: "transform" });
        gsap.set(introMeet, {
          scale: 0.44,
          transformOrigin: "50% 50%",
          y: -116,
          yPercent: -50,
        });
        gsap.set(introProduct, {
          autoAlpha: 1,
          transformOrigin: "50% 50%",
          y: -10,
          yPercent: -50,
        });
        gsap.set([introSubtitle, introVisual], {
          autoAlpha: 1,
          clearProps: "transform",
        });
        gsap.set(plotLine, {
          strokeDasharray: plotLineLength,
          strokeDashoffset: 0,
        });
        gsap.set([...visualGroups, ...plotPoints, ...controls], {
          autoAlpha: 1,
          clearProps: "transform",
        });
      });

      motionPreferences.add("(prefers-reduced-motion: no-preference)", () => {
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
          scale: 1,
          transformOrigin: "50% 50%",
          y: -720,
          yPercent: -50,
        });
        gsap.set(introProduct, {
          autoAlpha: 0,
          transformOrigin: "50% 50%",
          y: 230,
          yPercent: -50,
        });
        gsap.set(introSubtitle, {
          autoAlpha: 0,
          y: 28,
        });
        gsap.set(introVisual, {
          autoAlpha: 0,
          scale: 0.96,
          transformOrigin: "50% 50%",
          y: 48,
        });
        gsap.set(plotLine, {
          strokeDasharray: plotLineLength,
          strokeDashoffset: plotLineLength,
        });
        gsap.set(visualGroups, {
          autoAlpha: 0,
          transformOrigin: "50% 50%",
          y: 18,
        });
        gsap.set(plotPoints, {
          autoAlpha: 0,
          scale: 0,
          transformOrigin: "50% 50%",
        });
        gsap.set(controls, {
          autoAlpha: 0,
          scaleX: 0.72,
          transformOrigin: "0% 50%",
        });

        const introRevealScrollUnits = 1.45;
        const introExitScrollUnits = 1;
        const introExitStart = introRevealScrollUnits;
        const syncIntroPanelSpacing = () => {
          introSection.style.marginBottom = `${window.innerHeight * introRevealScrollUnits}px`;
        };

        syncIntroPanelSpacing();

        const introTimeline = gsap.timeline({
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
              duration: 0.32,
              ease: "power4.in",
              y: 0,
            },
            0,
          )
          .to(
            introMeet,
            {
              duration: 0.16,
              ease: "power2.out",
              y: -86,
            },
            0.32,
          )
          .to(
            introMeet,
            {
              duration: 0.16,
              ease: "power2.in",
              y: 0,
            },
            0.48,
          )
          .to(
            introMeet,
            {
              duration: 0.34,
              ease: "power2.inOut",
              scale: 0.44,
              y: -116,
            },
            0.72,
          )
          .to(
            introProduct,
            {
              autoAlpha: 1,
              duration: 0.36,
              ease: "power3.out",
              y: -10,
            },
            0.8,
          )
          .to(
            introSubtitle,
            {
              autoAlpha: 1,
              duration: 0.2,
              ease: "power2.out",
              y: 0,
            },
            1.08,
          )
          .to(
            introVisual,
            {
              autoAlpha: 1,
              duration: 0.24,
              ease: "power2.out",
              scale: 1,
              y: 0,
            },
            1.14,
          )
          .to(
            visualGroups,
            {
              autoAlpha: 1,
              duration: 0.18,
              ease: "power2.out",
              stagger: 0.035,
              y: 0,
            },
            1.2,
          )
          .to(
            plotLine,
            {
              duration: 0.22,
              ease: "none",
              strokeDashoffset: 0,
            },
            1.25,
          )
          .to(
            plotPoints,
            {
              autoAlpha: 1,
              duration: 0.18,
              ease: "back.out(2.2)",
              scale: 1,
              stagger: 0.025,
            },
            1.3,
          )
          .to(
            controls,
            {
              autoAlpha: 1,
              duration: 0.16,
              ease: "power2.out",
              scaleX: 1,
              stagger: 0.025,
            },
            1.35,
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

      const frictionSection = root.querySelector<HTMLElement>("[data-playground-friction-stage]");
      const frictionCard = root.querySelector<HTMLElement>("[data-playground-friction-card]");
      const setupCopy = root.querySelector<HTMLElement>("[data-playground-friction-copy='setup']");
      const heavyCopy = root.querySelector<HTMLElement>("[data-playground-friction-copy='heavy']");
      const openedCopy = root.querySelector<HTMLElement>(
        "[data-playground-friction-copy='opened']",
      );
      const boxCopy = root.querySelector<HTMLElement>("[data-playground-friction-copy='box']");
      const sweetCopy = root.querySelector<HTMLElement>("[data-playground-friction-copy='sweet']");
      const codeWindow = root.querySelector<SVGElement>("[data-playground-friction-code-window]");
      const codeLines = Array.from(
        root.querySelectorAll<SVGElement>("[data-playground-friction-code-line]"),
      );
      const blackBox = root.querySelector<SVGElement>("[data-playground-friction-black-box]");
      const blackBoxPanels = Array.from(
        root.querySelectorAll<SVGElement>("[data-playground-friction-box-panel]"),
      );
      const blackBoxInterior = root.querySelector<SVGElement>(
        "[data-playground-friction-box-interior]",
      );
      const sweetSpot = root.querySelector<SVGElement>("[data-playground-friction-sweet-spot]");
      const sweetRings = Array.from(
        root.querySelectorAll<SVGElement>("[data-playground-friction-sweet-ring]"),
      );
      const sweetAxis = Array.from(
        root.querySelectorAll<SVGElement>("[data-playground-friction-axis]"),
      );

      if (
        !frictionSection ||
        !frictionCard ||
        !setupCopy ||
        !heavyCopy ||
        !openedCopy ||
        !boxCopy ||
        !sweetCopy ||
        !codeWindow ||
        !blackBox ||
        !blackBoxInterior ||
        !sweetSpot
      ) {
        return;
      }

      const motionPreferences = gsap.matchMedia();

      motionPreferences.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(frictionSection, { autoAlpha: 1, clearProps: "transform" });
        gsap.set(frictionCard, { autoAlpha: 1, clearProps: "transform" });
        gsap.set([setupCopy, heavyCopy, openedCopy, boxCopy, sweetCopy], {
          autoAlpha: 1,
          clearProps: "transform",
        });
        gsap.set([codeWindow, blackBox, blackBoxInterior, sweetSpot], {
          autoAlpha: 1,
          clearProps: "transform",
        });
        gsap.set([...codeLines, ...blackBoxPanels, ...sweetRings, ...sweetAxis], {
          autoAlpha: 1,
          clearProps: "transform",
        });
      });

      motionPreferences.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(frictionSection, {
          autoAlpha: 1,
          scale: 1,
          transformOrigin: "50% 50%",
        });
        gsap.set(frictionCard, {
          autoAlpha: 1,
          scale: 1,
          transformOrigin: "50% 50%",
          y: 0,
        });
        gsap.set([setupCopy, heavyCopy], {
          autoAlpha: 0,
          y: 46,
        });
        gsap.set([openedCopy, boxCopy, sweetCopy], {
          autoAlpha: 0,
          y: 34,
        });
        gsap.set(codeWindow, {
          autoAlpha: 0,
          scale: 0.94,
          transformOrigin: "50% 50%",
          x: -34,
        });
        gsap.set(codeLines, {
          autoAlpha: 0,
          scaleX: 0.6,
          transformOrigin: "0% 50%",
        });
        gsap.set(blackBox, {
          autoAlpha: 0,
          scale: 0.68,
          transformOrigin: "50% 50%",
        });
        gsap.set(blackBoxPanels, {
          transformOrigin: "50% 50%",
          x: 0,
        });
        gsap.set(blackBoxInterior, {
          autoAlpha: 0,
          scale: 0.86,
          transformOrigin: "50% 50%",
        });
        gsap.set(sweetSpot, {
          autoAlpha: 0,
          scale: 0.72,
          transformOrigin: "50% 50%",
        });
        gsap.set(sweetRings, {
          autoAlpha: 0,
          scale: 0.4,
          transformOrigin: "50% 50%",
        });
        gsap.set(sweetAxis, {
          autoAlpha: 0,
          scaleX: 0.4,
          transformOrigin: "50% 50%",
        });

        const frictionRevealScrollUnits = 1.1;
        const frictionExitScrollUnits = 1;
        const frictionExitStart = frictionRevealScrollUnits;
        const syncFrictionPanelSpacing = () => {
          frictionSection.style.marginBottom = `${window.innerHeight * frictionRevealScrollUnits}px`;
        };

        syncFrictionPanelSpacing();

        const frictionTimeline = gsap.timeline({
          scrollTrigger: {
            end: () =>
              `+=${window.innerHeight * (frictionRevealScrollUnits + frictionExitScrollUnits)}`,
            invalidateOnRefresh: true,
            onRefreshInit: syncFrictionPanelSpacing,
            pin: true,
            pinSpacing: false,
            scrub: true,
            start: "bottom bottom",
            trigger: frictionSection,
          },
        });

        frictionTimeline
          .to(
            [setupCopy, heavyCopy],
            {
              autoAlpha: 1,
              duration: 0.2,
              ease: "power3.out",
              stagger: 0.08,
              y: 0,
            },
            0,
          )
          .to(
            codeWindow,
            {
              autoAlpha: 1,
              duration: 0.22,
              ease: "power2.out",
              scale: 1,
              x: 0,
            },
            0.04,
          )
          .to(
            codeLines,
            {
              autoAlpha: 1,
              duration: 0.22,
              ease: "power2.out",
              scaleX: 1,
              stagger: 0.018,
            },
            0.12,
          )
          .to(
            heavyCopy,
            {
              autoAlpha: 0.2,
              duration: 0.16,
              ease: "power2.inOut",
              x: -30,
            },
            0.34,
          )
          .to(
            codeLines,
            {
              autoAlpha: 0.12,
              duration: 0.16,
              ease: "power2.in",
              scaleX: 0.18,
              stagger: 0.01,
            },
            0.34,
          )
          .to(
            codeWindow,
            {
              autoAlpha: 0,
              duration: 0.18,
              ease: "power2.inOut",
              scale: 0.58,
              x: 46,
            },
            0.4,
          )
          .to(
            blackBox,
            {
              autoAlpha: 1,
              duration: 0.2,
              ease: "power3.out",
              scale: 1,
            },
            0.42,
          )
          .to(
            [openedCopy, boxCopy],
            {
              autoAlpha: 1,
              duration: 0.2,
              ease: "power3.out",
              stagger: 0.07,
              y: 0,
            },
            0.46,
          )
          .to(
            blackBoxPanels[0],
            {
              duration: 0.2,
              ease: "power2.inOut",
              x: -76,
            },
            0.58,
          )
          .to(
            blackBoxPanels[1],
            {
              duration: 0.2,
              ease: "power2.inOut",
              x: 76,
            },
            0.58,
          )
          .to(
            blackBoxInterior,
            {
              autoAlpha: 1,
              duration: 0.18,
              ease: "power2.out",
              scale: 1,
            },
            0.62,
          )
          .to(
            [setupCopy, heavyCopy, openedCopy, boxCopy],
            {
              autoAlpha: 0.18,
              duration: 0.18,
              ease: "power2.inOut",
              y: -18,
            },
            0.72,
          )
          .to(
            sweetCopy,
            {
              autoAlpha: 1,
              duration: 0.22,
              ease: "power3.out",
              y: 0,
            },
            0.74,
          )
          .to(
            sweetAxis,
            {
              autoAlpha: 1,
              duration: 0.16,
              ease: "power2.out",
              scaleX: 1,
              stagger: 0.03,
            },
            0.76,
          )
          .to(
            sweetRings,
            {
              autoAlpha: 1,
              duration: 0.2,
              ease: "back.out(2)",
              scale: 1,
              stagger: 0.04,
            },
            0.8,
          )
          .to(
            sweetSpot,
            {
              autoAlpha: 1,
              duration: 0.18,
              ease: "back.out(2.4)",
              scale: 1,
            },
            0.84,
          )
          .to(
            frictionSection,
            {
              duration: 0.9,
              ease: "none",
              scale: 0.7,
            },
            frictionExitStart,
          )
          .to(
            frictionSection,
            {
              duration: 0.1,
              ease: "none",
              opacity: 0,
            },
            frictionExitStart + 0.9,
          );

        return () => {
          frictionSection.style.marginBottom = "";
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
      const dispatchLoveScrollProgress = (
        progress = loveScrollState.progress,
        coverProgress = loveScrollState.coverProgress,
      ) => {
        const clampedProgress = gsap.utils.clamp(0, 1, progress);
        const clampedCoverProgress = gsap.utils.clamp(0, 1, coverProgress);

        window.dispatchEvent(
          new CustomEvent("smile:love-scroll-progress", {
            detail: {
              active: clampedProgress > 0.001 || clampedCoverProgress > 0.001,
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
        gsap.set(finalStage, { backgroundColor: "#09090b" });
        gsap.set(finalWords, { autoAlpha: 1, clearProps: "transform" });
        gsap.set(loveTarget, { autoAlpha: 1, clearProps: "transform" });
        gsap.set(inlineLove, { autoAlpha: 0 });
        gsap.set(dotMorphSvg, { autoAlpha: 0 });
        dispatchLoveScrollProgress(0, 0);
        return;
      }

      const dotMorphState = { progress: 0 };

      gsap.set(finalStage, { backgroundColor: "#09090b" });
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
        scale: 6.8,
        transformOrigin: "50% 50%",
        willChange: "opacity, transform",
        yPercent: 8,
      });
      gsap.set(itWord, {
        autoAlpha: 0,
        scale: 6.8,
        transformOrigin: "50% 50%",
        willChange: "opacity, transform",
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

      const finalDotRevealStart = 3.22;
      const finalDotZoomStart = 3.46;
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
            duration: 0.34,
            ease: "power3.in",
            rotation: 0,
            y: 0,
          },
          0.9,
        )
        .to(
          fallWord,
          {
            duration: 0.18,
            ease: "power2.out",
            rotation: -2,
            scaleX: 0.94,
            scaleY: 1.12,
            y: -72,
          },
          1.24,
        )
        .to(
          fallWord,
          {
            duration: 0.16,
            ease: "power2.in",
            rotation: 0.8,
            scaleX: 1.08,
            scaleY: 0.88,
            y: 0,
          },
          1.42,
        )
        .to(
          fallWord,
          {
            duration: 0.08,
            ease: "power2.out",
            rotation: 0,
            scaleX: 1.16,
            scaleY: 0.8,
            y: 0,
          },
          1.58,
        )
        .to(
          fallWord,
          {
            duration: 0.18,
            ease: "elastic.out(1, 0.42)",
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            y: 0,
          },
          1.66,
        )
        .to(
          inWord,
          {
            autoAlpha: 1,
            duration: 0.28,
            ease: "expo.out",
            scaleX: 1,
            x: 0,
          },
          1.86,
        )
        .to(
          loveScrollState,
          {
            duration: 0.46,
            ease: "none",
            progress: 1,
          },
          2.2,
        )
        .to(
          withWord,
          {
            duration: 0.3,
            ease: "expo.out",
            scale: 1,
            yPercent: 0,
          },
          2.7,
        )
        .set(withWord, { autoAlpha: 1 }, 2.7)
        .to(
          itWord,
          {
            duration: 0.3,
            ease: "expo.out",
            scale: 1,
            yPercent: 0,
          },
          2.98,
        )
        .set(itWord, { autoAlpha: 1 }, 2.98)
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
        .set(finalStage, { backgroundColor: "#fafafa" }, finalDotZoomEnd)
        .set(inlineLove, { autoAlpha: 0 }, finalDotZoomEnd)
        .set(dotMorphSvg, { autoAlpha: 1 }, finalDotZoomEnd);

      return () => {
        dispatchLoveScrollProgress(0, 0);
      };
    },
    { scope: playgroundSectionRef },
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
              delay={55}
              duration={0.72}
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
              text="Explore ML models through visual feedback, fully-animated, and built to make learning ML feel fun."
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
        className="relative z-10 bg-zinc-50 px-6 text-zinc-950"
        aria-label="Interactive ML Playground introduction"
        ref={playgroundSectionRef}
      >
        <div
          className="relative z-10 -mx-6 flex h-[100svh] w-[calc(100%+3rem)] items-stretch justify-center overflow-hidden rounded-t-md bg-zinc-50 pt-10"
          data-playground-intro-panel
        >
          <article
            aria-labelledby="playground-intro-title"
            className="relative h-[calc(100svh-2.5rem)] w-full overflow-hidden rounded-t-2xl border-t border-zinc-50 bg-zinc-100"
            data-playground-intro-card
          >
            <h2
              aria-label={`${playgroundIntroEyebrow} ${playgroundIntroTitle}. ${playgroundIntroSubtitle}`}
              className="absolute inset-x-10 top-[calc(38%-140px)] z-10 h-[280px] text-center"
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
              className="absolute inset-x-12 top-[46%] z-10 mx-auto max-w-4xl text-center text-[clamp(1.1rem,1.65vw,1.45rem)] leading-[1.5] font-normal text-zinc-600 opacity-0 will-change-[transform,opacity]"
              data-playground-intro-subtitle
            >
              {playgroundIntroSubtitle}
            </p>

            <figure
              aria-label="Interactive ML Playground preview"
              className="absolute inset-x-12 bottom-8 z-10 mx-auto h-[180px] max-w-4xl overflow-hidden rounded-lg border border-zinc-100 bg-white opacity-0 shadow-[0_18px_44px_oklch(0.145_0_0_/_0.08)] will-change-[transform,opacity]"
              data-playground-intro-visual
            >
              <svg
                aria-hidden="true"
                className="h-full w-full"
                preserveAspectRatio="none"
                viewBox="0 0 920 220"
              >
                <rect fill="oklch(1 0 0)" height="220" width="920" />
                <g data-playground-intro-visual-group>
                  <rect fill="oklch(0.985 0 0)" height="220" stroke="oklch(0.88 0 0)" width="210" />
                  <rect fill="oklch(0.145 0 0)" height="16" rx="3" width="108" x="32" y="34" />
                  <rect fill="oklch(0.72 0 0)" height="8" rx="4" width="132" x="32" y="70" />
                  <rect fill="oklch(0.84 0 0)" height="8" rx="4" width="96" x="32" y="92" />
                </g>

                <g data-playground-intro-visual-group>
                  <rect
                    fill="oklch(0.985 0 0)"
                    height="150"
                    rx="8"
                    stroke="oklch(0.86 0 0)"
                    width="410"
                    x="248"
                    y="34"
                  />
                  <line
                    stroke="oklch(0.82 0 0)"
                    strokeDasharray="4 8"
                    x1="288"
                    x2="626"
                    y1="154"
                    y2="154"
                  />
                  <line
                    stroke="oklch(0.82 0 0)"
                    strokeDasharray="4 8"
                    x1="288"
                    x2="626"
                    y1="110"
                    y2="110"
                  />
                  <line
                    stroke="oklch(0.82 0 0)"
                    strokeDasharray="4 8"
                    x1="288"
                    x2="626"
                    y1="66"
                    y2="66"
                  />
                  <path
                    d="M292 158 C338 132 358 142 402 112 C452 78 490 92 532 72 C568 55 594 50 626 46"
                    fill="none"
                    stroke="oklch(0.145 0 0)"
                    strokeLinecap="round"
                    strokeWidth="6"
                    data-playground-intro-plot-line
                  />
                  {[
                    [304, 150],
                    [354, 134],
                    [404, 112],
                    [456, 90],
                    [512, 80],
                    [576, 58],
                    [622, 48],
                  ].map(([cx, cy]) => (
                    <circle
                      cx={cx}
                      cy={cy}
                      data-playground-intro-point
                      fill="oklch(0.145 0 0)"
                      key={`${cx}-${cy}`}
                      r="7"
                    />
                  ))}
                </g>

                <g data-playground-intro-visual-group>
                  <rect
                    fill="oklch(0.985 0 0)"
                    height="150"
                    rx="8"
                    stroke="oklch(0.86 0 0)"
                    width="190"
                    x="696"
                    y="34"
                  />
                  <rect fill="oklch(0.145 0 0)" height="12" rx="3" width="86" x="722" y="60" />
                  <rect
                    data-playground-intro-control
                    fill="oklch(0.145 0 0)"
                    height="10"
                    rx="5"
                    width="118"
                    x="722"
                    y="94"
                  />
                  <rect
                    data-playground-intro-control
                    fill="oklch(0.42 0 0)"
                    height="10"
                    rx="5"
                    width="92"
                    x="722"
                    y="122"
                  />
                  <rect
                    data-playground-intro-control
                    fill="oklch(0.72 0 0)"
                    height="10"
                    rx="5"
                    width="134"
                    x="722"
                    y="150"
                  />
                </g>
              </svg>
            </figure>
          </article>
        </div>

        <div
          className="relative z-20 -mx-6 flex h-[100svh] w-[calc(100%+3rem)] items-center justify-center overflow-hidden rounded-t-2xl bg-zinc-800 px-16 py-16 text-zinc-50"
          data-playground-friction-stage
        >
          <article
            aria-label={playgroundFrictionAriaLabel}
            className="relative grid h-full w-full grid-cols-[0.9fr_1.1fr] items-center gap-12 overflow-hidden"
            data-playground-friction-card
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,oklch(1_0_0_/_0.055)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0_/_0.055)_1px,transparent_1px)] bg-[size:56px_56px] opacity-35"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_72%_50%,oklch(1_0_0_/_0.1)_0%,transparent_44%),linear-gradient(to_bottom,oklch(0.274_0.006_286.033)_0%,oklch(0.21_0.006_285.885)_100%)]"
            />

            <h2 className="relative z-10 max-w-2xl text-[clamp(4.6rem,7.4vw,9.2rem)] leading-[0.88] font-black tracking-normal">
              <span
                className="block will-change-[transform,opacity]"
                data-playground-friction-copy="setup"
              >
                We stripped away
              </span>
              <span
                className="mt-5 block text-zinc-200 will-change-[transform,opacity]"
                data-playground-friction-copy="heavy"
              >
                heavy coding.
              </span>
              <span
                className="mt-16 block text-[0.56em] leading-[0.94] text-zinc-400 will-change-[transform,opacity]"
                data-playground-friction-copy="opened"
              >
                We opened up
              </span>
              <span
                className="mt-4 block text-[0.72em] leading-[0.9] will-change-[transform,opacity]"
                data-playground-friction-copy="box"
              >
                the black box.
              </span>
              <span
                className="absolute top-[42%] left-0 block max-w-[9ch] text-[0.76em] leading-[0.88] will-change-[transform,opacity]"
                data-playground-friction-copy="sweet"
              >
                the sweet spot for learning.
              </span>
            </h2>

            <div className="relative z-10 flex items-center justify-center">
              <svg
                aria-hidden="true"
                className="h-[min(680px,76svh)] w-full max-w-[880px] overflow-visible"
                viewBox="0 0 860 640"
              >
                <g data-playground-friction-code-window>
                  <rect
                    fill="oklch(0.21 0.006 285.885)"
                    height="378"
                    rx="18"
                    stroke="oklch(1 0 0 / 0.18)"
                    width="470"
                    x="70"
                    y="116"
                  />
                  <rect fill="oklch(1 0 0 / 0.08)" height="46" rx="18" width="470" x="70" y="116" />
                  <circle cx="104" cy="139" fill="oklch(1 0 0 / 0.62)" r="6" />
                  <circle cx="126" cy="139" fill="oklch(1 0 0 / 0.38)" r="6" />
                  <circle cx="148" cy="139" fill="oklch(1 0 0 / 0.24)" r="6" />
                  {[
                    [112, 196, 322],
                    [112, 228, 260],
                    [112, 260, 346],
                    [112, 292, 218],
                    [112, 324, 300],
                    [112, 356, 246],
                    [112, 388, 336],
                    [112, 420, 188],
                  ].map(([x, y, width]) => (
                    <rect
                      data-playground-friction-code-line
                      fill="oklch(1 0 0 / 0.62)"
                      height="12"
                      key={`${x}-${y}-${width}`}
                      rx="6"
                      width={width}
                      x={x}
                      y={y}
                    />
                  ))}
                </g>

                <g data-playground-friction-black-box>
                  <rect
                    fill="oklch(0.09 0 0)"
                    height="238"
                    rx="22"
                    stroke="oklch(1 0 0 / 0.2)"
                    width="314"
                    x="288"
                    y="194"
                  />
                  <rect
                    data-playground-friction-box-panel
                    fill="oklch(0.02 0 0)"
                    height="238"
                    rx="22"
                    width="157"
                    x="288"
                    y="194"
                  />
                  <rect
                    data-playground-friction-box-panel
                    fill="oklch(0.02 0 0)"
                    height="238"
                    rx="22"
                    width="157"
                    x="445"
                    y="194"
                  />
                  <g data-playground-friction-box-interior>
                    <path
                      d="M346 315 H416 M474 315 H544 M445 262 V368"
                      fill="none"
                      stroke="oklch(1 0 0 / 0.7)"
                      strokeLinecap="round"
                      strokeWidth="8"
                    />
                    <circle cx="346" cy="315" fill="oklch(1 0 0 / 0.82)" r="12" />
                    <circle cx="445" cy="262" fill="oklch(1 0 0 / 0.82)" r="12" />
                    <circle cx="445" cy="368" fill="oklch(1 0 0 / 0.82)" r="12" />
                    <circle cx="544" cy="315" fill="oklch(1 0 0 / 0.82)" r="12" />
                  </g>
                </g>

                <g data-playground-friction-axis>
                  <line
                    stroke="oklch(1 0 0 / 0.28)"
                    strokeLinecap="round"
                    strokeWidth="3"
                    x1="212"
                    x2="686"
                    y1="520"
                    y2="520"
                  />
                </g>
                <g data-playground-friction-axis>
                  <line
                    stroke="oklch(1 0 0 / 0.28)"
                    strokeLinecap="round"
                    strokeWidth="3"
                    x1="449"
                    x2="449"
                    y1="282"
                    y2="596"
                  />
                </g>
                <circle
                  cx="449"
                  cy="520"
                  data-playground-friction-sweet-ring
                  fill="none"
                  r="116"
                  stroke="oklch(1 0 0 / 0.18)"
                  strokeWidth="2"
                />
                <circle
                  cx="449"
                  cy="520"
                  data-playground-friction-sweet-ring
                  fill="none"
                  r="74"
                  stroke="oklch(1 0 0 / 0.3)"
                  strokeWidth="2"
                />
                <g data-playground-friction-sweet-spot>
                  <circle cx="449" cy="520" fill="oklch(1 0 0)" r="16" />
                  <circle
                    cx="449"
                    cy="520"
                    fill="none"
                    r="28"
                    stroke="oklch(1 0 0)"
                    strokeWidth="3"
                  />
                </g>
              </svg>
            </div>
          </article>
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
          className="relative z-40 -mx-6 h-[560svh] w-[calc(100%+3rem)] bg-zinc-950"
          data-final-love-story-section
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-[45%] left-0 h-[260svh] w-px"
            data-love-scroll-section
          />
          <div
            className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden bg-zinc-950 px-6 py-20 text-zinc-50 sm:py-24 lg:py-28"
            data-final-love-story-stage
          >
            <h2
              aria-label={playgroundFinalAriaLabel}
              className="relative z-[1100] mx-auto flex w-full max-w-screen-2xl flex-col items-center justify-center text-center font-extrabold tracking-normal"
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
      </section>

      <CinematicFooter />
    </>
  );
}
