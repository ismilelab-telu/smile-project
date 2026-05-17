import { type KeyboardEvent, type MouseEvent, useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";

import smileIcon from "../../../assets/smile.svg";

gsap.registerPlugin(useGSAP, MorphSVGPlugin);

const islandCirclePath =
  "M25 2 C37.7 2 48 12.3 48 25 C48 37.7 37.7 48 25 48 C12.3 48 2 37.7 2 25 C2 12.3 12.3 2 25 2 Z";
const islandHeartPath =
  "M25 45 C20 40 6 29 6 17 C6 9.8 11.1 5 17.3 5 C20.9 5 23.7 6.8 25 9.5 C26.3 6.8 29.1 5 32.7 5 C38.9 5 44 9.8 44 17 C44 29 30 40 25 45 Z";
const islandDefaultFill = "oklch(100% 0 0)";
const islandDefaultStroke = "oklch(87.1108% 0.0055 286.29)";
const islandDefaultStrokeWidth = 1;
const islandShapeRestFill = islandDefaultFill;
const islandShapeRestStroke = islandDefaultStroke;
const islandHeartFill = "oklch(61.224% 0.2313 22.61)";
const islandHeartStroke = "oklch(61.224% 0.2313 22.61)";
const islandHeartScale = 2.55;
const islandMenuStroke = "oklch(17.7638% 0 0)";
const islandLoveMenuStroke = "oklch(100% 0 0)";
const closedIslandSize = 50;
const loveDockYOffset = 1;
const heroTitleCutoffTop = 96;
const topRightInset = 16;
const footerHideZoneSelector = "[data-navigation-menu-hide-zone]";
const footerHideAnimationDuration = 0.24;

const menuItems = [
  { href: "/404", label: "Work", number: "01" },
  { href: "/404", label: "Milestone", number: "02" },
  { href: "/404", label: "About", number: "03" },
  { href: "/404", label: "Support", number: "04" },
  { href: "/404", label: "Contacts", number: "05" },
];

export function OrchestratedEaseReverseMenu() {
  const rootRef = useRef<HTMLDivElement>(null);
  const islandRef = useRef<HTMLDivElement>(null);
  const islandSurfaceRef = useRef<HTMLDivElement>(null);
  const islandSvgRef = useRef<SVGSVGElement>(null);
  const islandShapeRef = useRef<SVGPathElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const topBarRef = useRef<SVGLineElement>(null);
  const midBarRef = useRef<SVGLineElement>(null);
  const bottomBarRef = useRef<SVGLineElement>(null);
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const isAwayFromTopRef = useRef(false);
  const isOpenRef = useRef(false);
  const isLoveDockedRef = useRef(false);
  const isLoveExitingRef = useRef(false);
  const isLoveMenuDisabledRef = useRef(false);
  const isLoveSectionActiveRef = useRef(false);
  const isLoveHeldAfterSectionRef = useRef(false);
  const isLoveScrollUpExitLockedRef = useRef(false);
  const isFooterMenuHiddenRef = useRef(false);
  const exitSpeedRef = useRef(1.5);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoveMenuDisabled, setIsLoveMenuDisabled] = useState(false);
  const [isFooterMenuHidden, setIsFooterMenuHidden] = useState(false);
  const useReverseEase = true;

  isOpenRef.current = isOpen;

  const { contextSafe } = useGSAP(
    () => {
      const island = islandRef.current;
      const islandSurface = islandSurfaceRef.current;
      const islandSvg = islandSvgRef.current;
      const islandShape = islandShapeRef.current;
      const logo = logoRef.current;
      const overlay = overlayRef.current;
      const backdrop = backdropRef.current;
      const panel = panelRef.current;
      const topBar = topBarRef.current;
      const midBar = midBarRef.current;
      const bottomBar = bottomBarRef.current;
      const links = linkRefs.current.filter((link): link is HTMLAnchorElement => link !== null);

      if (
        !island ||
        !islandSurface ||
        !islandSvg ||
        !islandShape ||
        !logo ||
        !overlay ||
        !backdrop ||
        !panel ||
        !topBar ||
        !midBar ||
        !bottomBar
      ) {
        return;
      }

      gsap.set(overlay, { pointerEvents: "none" });
      gsap.set(island, {
        borderRadius: 999,
        force3D: false,
        x: 0,
        xPercent: -50,
        y: 0,
      });
      gsap.set(islandSurface, {
        autoAlpha: 1,
        backgroundColor: islandDefaultFill,
        borderColor: islandDefaultStroke,
        borderRadius: 999,
        borderStyle: "solid",
        borderWidth: islandDefaultStrokeWidth,
      });
      gsap.set(islandSvg, {
        autoAlpha: 0,
        scale: 1,
        transformOrigin: "50% 50%",
      });
      gsap.set(islandShape, {
        attr: { d: islandCirclePath },
        fill: islandShapeRestFill,
        stroke: islandShapeRestStroke,
        strokeWidth: islandDefaultStrokeWidth,
      });

      const motionPreferences = gsap.matchMedia();

      motionPreferences.add("(prefers-reduced-motion: no-preference)", () => {
        const loveTarget = document.querySelector<HTMLElement>("[data-love-scroll-target]");
        const heroTitle = document.querySelector<HTMLElement>("[data-landing-scroll-title]");

        if (!loveTarget) {
          return undefined;
        }

        const heartMorph = gsap.to(islandShape, {
          duration: 1,
          ease: "none",
          morphSVG: islandHeartPath,
          paused: true,
        });

        const menuBars = [topBar, midBar, bottomBar];
        let lastLoveCoverProgress = 0;
        let lastLoveProgress = 0;
        let isLoveScrollActive = false;

        const snapToDevicePixel = (value: number) => {
          const pixelRatio = window.devicePixelRatio || 1;

          return Math.round(value * pixelRatio) / pixelRatio;
        };

        const interpolate = (start: number, end: number, progress: number) =>
          start + (end - start) * progress;

        const getLoveTargetPosition = () => {
          const targetBounds = loveTarget.getBoundingClientRect();
          const islandTop = Number.parseFloat(window.getComputedStyle(island).top) || 0;
          const islandHeight = island.offsetHeight || closedIslandSize;

          return {
            x: snapToDevicePixel(
              targetBounds.left + targetBounds.width / 2 - window.innerWidth / 2,
            ),
            y: snapToDevicePixel(
              targetBounds.top +
                targetBounds.height / 2 -
                islandTop -
                islandHeight / 2 +
                loveDockYOffset,
            ),
          };
        };

        const getTopRightX = () => window.innerWidth / 2 - topRightInset - closedIslandSize / 2;
        const getDockProgress = () => {
          if (!heroTitle) {
            return window.scrollY > 1 ? 1 : 0;
          }

          const titlePageTop = heroTitle.getBoundingClientRect().top + window.scrollY;
          const dockEndScroll = Math.max(1, titlePageTop - heroTitleCutoffTop);

          return gsap.utils.clamp(0, 1, window.scrollY / dockEndScroll);
        };
        const getBaseX = (dockProgress = getDockProgress()) =>
          snapToDevicePixel(interpolate(0, getTopRightX(), dockProgress));

        const setRestVisual = (dockProgress = getDockProgress()) => {
          const shapeAlpha = gsap.utils.clamp(0, 1, dockProgress);

          heartMorph.progress(0).pause();
          gsap.set(islandSurface, {
            autoAlpha: 1 - shapeAlpha,
            backgroundColor: islandDefaultFill,
            borderColor: islandDefaultStroke,
            borderWidth: islandDefaultStrokeWidth,
          });
          gsap.set(islandSvg, {
            autoAlpha: shapeAlpha,
          });
          gsap.set(islandShape, {
            attr: { d: islandCirclePath },
            fill: islandShapeRestFill,
            stroke: islandShapeRestStroke,
            strokeWidth: islandDefaultStrokeWidth,
          });
          gsap.set(menuBars, { opacity: 1, stroke: islandMenuStroke });
        };

        const applyBasePosition = (duration = 0) => {
          if (isOpenRef.current || isLoveScrollActive) {
            return;
          }

          const dockProgress = getDockProgress();
          isAwayFromTopRef.current = dockProgress > 0.001;
          setRestVisual(dockProgress);

          const positionVars = {
            autoAlpha: isFooterMenuHiddenRef.current ? 0 : 1,
            force3D: false,
            scale: 1,
            transformOrigin: "50% 50%",
            x: getBaseX(dockProgress),
            xPercent: -50,
            y: 0,
            zIndex: 1000,
          };

          if (duration === 0) {
            gsap.set(island, positionVars);
            return;
          }

          gsap.to(island, {
            ...positionVars,
            duration,
            ease: "power2.out",
            overwrite: "auto",
          });
        };

        const applyLoveScrollProgress = (progress: number, active: boolean, coverProgress = 0) => {
          const clampedProgress = gsap.utils.clamp(0, 1, progress);
          const clampedCoverProgress = gsap.utils.clamp(0, 1, coverProgress);
          const isActive = active || clampedProgress > 0.001 || clampedCoverProgress > 0.001;

          lastLoveCoverProgress = clampedCoverProgress;
          lastLoveProgress = clampedProgress;
          isLoveScrollActive = isActive;
          isLoveSectionActiveRef.current = isActive;
          isLoveDockedRef.current =
            isActive && clampedCoverProgress < 0.995 && clampedProgress >= 0.995;
          isLoveExitingRef.current = false;
          isLoveHeldAfterSectionRef.current = false;
          isLoveScrollUpExitLockedRef.current = false;
          isLoveMenuDisabledRef.current = isActive;
          setIsLoveMenuDisabled(isActive);

          if (!isActive) {
            applyBasePosition();
            return;
          }

          if (isOpenRef.current) {
            return;
          }

          const dockProgress = getDockProgress();
          isAwayFromTopRef.current = dockProgress > 0.001;

          const targetPosition = getLoveTargetPosition();
          const baseX = getBaseX(dockProgress);
          const x = snapToDevicePixel(interpolate(baseX, targetPosition.x, clampedProgress));
          const y = snapToDevicePixel(interpolate(0, targetPosition.y, clampedProgress));

          gsap.killTweensOf(island, "x,y,scale");
          gsap.killTweensOf([islandSurface, islandSvg], "autoAlpha");
          gsap.killTweensOf(menuBars, "opacity,stroke");
          heartMorph.progress(clampedProgress).pause();
          gsap.set(islandSurface, { autoAlpha: 0 });
          gsap.set(islandSvg, { autoAlpha: 1 });
          gsap.set(islandShape, {
            fill: islandHeartFill,
            stroke: islandHeartStroke,
            strokeWidth: 0,
          });
          gsap.set(island, {
            autoAlpha: clampedProgress >= 0.995 ? 0 : 1,
            force3D: false,
            scale: interpolate(1, islandHeartScale, clampedProgress),
            transformOrigin: "50% 50%",
            x,
            xPercent: -50,
            y,
            zIndex: 1000,
          });
          gsap.set(menuBars, {
            opacity: 1 - clampedProgress,
            stroke: clampedProgress > 0.42 ? islandLoveMenuStroke : islandMenuStroke,
          });
        };

        const handleLoveScrollProgress = (event: Event) => {
          const detail = (
            event as CustomEvent<{ active?: boolean; coverProgress?: number; progress?: number }>
          ).detail;

          applyLoveScrollProgress(
            detail?.progress ?? 0,
            detail?.active ?? false,
            detail?.coverProgress ?? 0,
          );
        };

        const handleScroll = () => {
          if (isLoveScrollActive) {
            applyLoveScrollProgress(lastLoveProgress, true, lastLoveCoverProgress);
            return;
          }

          applyBasePosition(0.18);
        };

        const handleResize = () => {
          if (isOpenRef.current) {
            return;
          }

          if (isLoveScrollActive) {
            applyLoveScrollProgress(lastLoveProgress, true, lastLoveCoverProgress);
            return;
          }

          applyBasePosition();
        };

        applyBasePosition();
        window.addEventListener("smile:love-scroll-progress", handleLoveScrollProgress);
        window.addEventListener("scroll", handleScroll, { passive: true });
        window.addEventListener("resize", handleResize);

        return () => {
          heartMorph.kill();
          window.removeEventListener("smile:love-scroll-progress", handleLoveScrollProgress);
          gsap.killTweensOf(island);
          window.removeEventListener("scroll", handleScroll);
          window.removeEventListener("resize", handleResize);
        };
      });

      motionPreferences.add("(prefers-reduced-motion: reduce)", () => {
        isAwayFromTopRef.current = false;
        isLoveDockedRef.current = false;
        isLoveMenuDisabledRef.current = false;
        isLoveSectionActiveRef.current = false;
        isLoveHeldAfterSectionRef.current = false;
        isLoveScrollUpExitLockedRef.current = false;
        setIsLoveMenuDisabled(false);
        gsap.set(island, {
          scale: 1,
          x: 0,
          y: 0,
        });
        gsap.set(islandSurface, {
          autoAlpha: 1,
          backgroundColor: islandDefaultFill,
          borderColor: islandDefaultStroke,
          borderWidth: islandDefaultStrokeWidth,
        });
        gsap.set(islandSvg, {
          autoAlpha: 0,
          scale: 1,
        });
        gsap.set(islandShape, {
          attr: { d: islandCirclePath },
          fill: islandShapeRestFill,
          stroke: islandShapeRestStroke,
          strokeWidth: islandDefaultStrokeWidth,
        });
        gsap.set([topBar, midBar, bottomBar], { opacity: 1, stroke: islandMenuStroke });
      });

      const timeline = gsap
        .timeline({ paused: true })
        .set(overlay, { pointerEvents: "auto" })
        .set(island, { scale: 1 }, 0)
        .set(
          islandSurface,
          {
            autoAlpha: 1,
            backgroundColor: islandDefaultFill,
            borderColor: islandDefaultStroke,
            borderWidth: islandDefaultStrokeWidth,
          },
          0,
        )
        .set(islandSvg, { autoAlpha: 0 }, 0)
        .set(
          islandShape,
          {
            fill: islandShapeRestFill,
            stroke: islandShapeRestStroke,
            strokeWidth: islandDefaultStrokeWidth,
          },
          0,
        )
        .set([topBar, midBar, bottomBar], { stroke: islandMenuStroke }, 0)
        .to(
          island,
          {
            duration: 0.8,
            ease: "back.out(2)",
            easeReverse: useReverseEase ? "power2.out" : false,
            width: () => Math.min(window.innerWidth * 0.9, 400),
          },
          0,
        )
        .to(
          logo,
          {
            autoAlpha: 1,
            duration: 0.5,
            ease: "back.out",
            easeReverse: useReverseEase ? "power4.out" : false,
            rotation: 0,
          },
          0.12,
        )
        .to(
          midBar,
          {
            duration: 0.15,
            ease: "power2.in",
            easeReverse: useReverseEase,
            opacity: 0,
          },
          0,
        )
        .to(
          topBar,
          {
            attr: { x1: 3, x2: 13, y1: 3, y2: 13 },
            duration: 0.28,
            ease: "power3.inOut",
          },
          0,
        )
        .to(
          bottomBar,
          {
            attr: { x1: 13, x2: 3, y1: 3, y2: 13 },
            duration: 0.28,
            ease: "power3.inOut",
          },
          0,
        )
        .to(
          backdrop,
          {
            duration: 0.3,
            ease: "power2.out",
            opacity: 1,
          },
          0,
        )
        .fromTo(
          panel,
          {
            autoAlpha: 0,
            scale: 0.6,
            yPercent: -10,
          },
          {
            autoAlpha: 1,
            duration: 0.8,
            ease: "back.out(2)",
            easeReverse: useReverseEase ? "power3.out" : false,
            scale: 1,
            transformOrigin: "top center",
            yPercent: 0,
          },
          0.1,
        )
        .fromTo(
          links,
          {
            opacity: 0,
            y: 6,
          },
          {
            duration: 0.32,
            ease: "power2.out",
            easeReverse: useReverseEase,
            opacity: 1,
            stagger: 0.05,
            y: 0,
          },
          0.22,
        );

      timelineRef.current = timeline;

      return () => {
        motionPreferences.revert();
        timeline.kill();
        timelineRef.current = null;
      };
    },
    { scope: rootRef },
  );

  const restoreClosedIsland = contextSafe((duration = 0.7) => {
    const island = islandRef.current;
    const islandSurface = islandSurfaceRef.current;
    const islandSvg = islandSvgRef.current;
    const islandShape = islandShapeRef.current;
    const menuBars = [topBarRef.current, midBarRef.current, bottomBarRef.current].filter(
      (bar): bar is SVGLineElement => bar !== null,
    );

    if (!island || !islandSurface || !islandSvg || !islandShape) {
      return;
    }

    const getDockProgress = () => {
      const heroTitle = document.querySelector<HTMLElement>("[data-landing-scroll-title]");

      if (!heroTitle) {
        return window.scrollY > 1 ? 1 : 0;
      }

      const titlePageTop = heroTitle.getBoundingClientRect().top + window.scrollY;
      const dockEndScroll = Math.max(1, titlePageTop - heroTitleCutoffTop);

      return gsap.utils.clamp(0, 1, window.scrollY / dockEndScroll);
    };
    const snapToDevicePixel = (value: number) => {
      const pixelRatio = window.devicePixelRatio || 1;

      return Math.round(value * pixelRatio) / pixelRatio;
    };
    const dockProgress = getDockProgress();
    const getBaseX = () =>
      snapToDevicePixel(
        gsap.utils.interpolate(
          0,
          window.innerWidth / 2 - topRightInset - closedIslandSize / 2,
          dockProgress,
        ),
      );
    const isLoveActive = isLoveDockedRef.current;
    isLoveMenuDisabledRef.current = isLoveActive;
    isAwayFromTopRef.current = dockProgress > 0.001;
    setIsLoveMenuDisabled(isLoveActive);

    const shapeAlpha = isLoveActive ? 1 : dockProgress;

    gsap.killTweensOf([islandSurface, islandSvg], "autoAlpha");
    gsap.killTweensOf(islandShape, "fill,stroke,strokeWidth");
    gsap.killTweensOf(menuBars, "stroke");
    gsap.set(islandSurface, {
      backgroundColor: islandDefaultFill,
      borderColor: islandDefaultStroke,
      borderWidth: islandDefaultStrokeWidth,
    });
    gsap.set(islandShape, {
      fill: isLoveActive ? islandHeartFill : islandShapeRestFill,
      stroke: isLoveActive ? islandHeartStroke : islandShapeRestStroke,
      strokeWidth: isLoveActive ? 0 : islandDefaultStrokeWidth,
    });
    gsap.set(menuBars, {
      stroke: isLoveActive ? islandLoveMenuStroke : islandMenuStroke,
    });

    gsap.to(islandSurface, {
      autoAlpha: isLoveActive ? 0 : 1 - shapeAlpha,
      duration: Math.min(duration, 0.2),
      ease: "power2.out",
    });
    gsap.to(islandSvg, {
      autoAlpha: shapeAlpha,
      duration: Math.min(duration, 0.2),
      ease: "power2.out",
    });

    gsap.to(islandShape, {
      duration,
      ease: "power2.out",
      morphSVG: isLoveActive ? islandHeartPath : islandCirclePath,
    });

    gsap.to(menuBars, {
      duration,
      ease: "power2.out",
      opacity: isLoveActive ? 0 : 1,
    });

    if (isLoveDockedRef.current) {
      const loveTarget = document.querySelector<HTMLElement>("[data-love-scroll-target]");

      if (loveTarget) {
        const targetBounds = loveTarget.getBoundingClientRect();
        const islandTop = Number.parseFloat(window.getComputedStyle(island).top) || 0;
        const islandHeight = island.offsetHeight || closedIslandSize;

        gsap.to(island, {
          duration,
          ease: "power2.out",
          force3D: false,
          scale: isLoveActive ? islandHeartScale : 1,
          x: targetBounds.left + targetBounds.width / 2 - window.innerWidth / 2,
          xPercent: -50,
          y:
            targetBounds.top +
            targetBounds.height / 2 -
            islandTop -
            islandHeight / 2 +
            loveDockYOffset,
        });
        return;
      }
    }

    gsap.to(island, {
      duration,
      ease: "power2.out",
      force3D: false,
      scale: isLoveActive ? islandHeartScale : 1,
      x: getBaseX,
      xPercent: -50,
      y: 0,
    });
  });

  const closeMenu = contextSafe(() => {
    const timeline = timelineRef.current;

    if (!timeline || !isOpenRef.current) {
      return;
    }

    isOpenRef.current = false;
    setIsOpen(false);
    timeline.eventCallback("onReverseComplete", () => {
      const overlay = overlayRef.current;

      if (overlay) {
        gsap.set(overlay, { pointerEvents: "none" });
      }

      restoreClosedIsland();
    });
    timeline.timeScale(exitSpeedRef.current).reverse();
  });

  useEffect(() => {
    const island = islandRef.current;

    if (!island) {
      return;
    }

    let frameId: number | null = null;

    const shouldHideForFooter = () => {
      const hideZone = document.querySelector<HTMLElement>(footerHideZoneSelector);

      if (!hideZone) {
        return false;
      }

      const bounds = hideZone.getBoundingClientRect();

      return bounds.top < window.innerHeight && bounds.bottom > 0;
    };

    const applyFooterVisibility = () => {
      frameId = null;

      const nextIsHidden = shouldHideForFooter();

      if (isFooterMenuHiddenRef.current === nextIsHidden) {
        return;
      }

      isFooterMenuHiddenRef.current = nextIsHidden;
      setIsFooterMenuHidden(nextIsHidden);

      if (nextIsHidden) {
        if (
          document.activeElement instanceof HTMLElement &&
          rootRef.current?.contains(document.activeElement)
        ) {
          document.activeElement.blur();
        }

        closeMenu();
      }

      gsap.killTweensOf(island, "autoAlpha");
      gsap.set(island, { pointerEvents: nextIsHidden ? "none" : "auto" });

      if (!nextIsHidden && isLoveSectionActiveRef.current) {
        window.dispatchEvent(new Event("scroll"));
        return;
      }

      gsap.to(island, {
        autoAlpha: nextIsHidden ? 0 : 1,
        duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : footerHideAnimationDuration,
        ease: "power2.out",
        overwrite: true,
      });
    };

    const scheduleFooterVisibilityUpdate = () => {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(applyFooterVisibility);
    };

    applyFooterVisibility();
    window.addEventListener("scroll", scheduleFooterVisibilityUpdate, { passive: true });
    window.addEventListener("resize", scheduleFooterVisibilityUpdate);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener("scroll", scheduleFooterVisibilityUpdate);
      window.removeEventListener("resize", scheduleFooterVisibilityUpdate);
    };
  }, [closeMenu]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!isOpenRef.current || !(event.target instanceof Node)) {
        return;
      }

      const island = islandRef.current;
      const panel = panelRef.current;

      if (island?.contains(event.target) || panel?.contains(event.target)) {
        return;
      }

      closeMenu();
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [closeMenu]);

  const toggleMenu = contextSafe(() => {
    const timeline = timelineRef.current;

    if (
      !timeline ||
      ((isLoveMenuDisabledRef.current || isFooterMenuHiddenRef.current) && !isOpenRef.current)
    ) {
      return;
    }

    const nextIsOpen = !isOpenRef.current;
    isOpenRef.current = nextIsOpen;
    setIsOpen(nextIsOpen);

    if (nextIsOpen) {
      const island = islandRef.current;
      const playOpenTimeline = () => {
        timeline.invalidate().eventCallback("onReverseComplete", null).timeScale(1).play();
      };

      if (island) {
        if (isAwayFromTopRef.current) {
          gsap.to(island, {
            duration: 0.46,
            ease: "power2.out",
            force3D: false,
            onComplete: playOpenTimeline,
            x: 0,
            xPercent: -50,
            y: 0,
          });
          return;
        }

        gsap.set(island, { x: 0, xPercent: -50, y: 0 });
      }

      playOpenTimeline();
      return;
    }

    timeline.eventCallback("onReverseComplete", () => {
      const overlay = overlayRef.current;

      if (overlay) {
        gsap.set(overlay, { pointerEvents: "none" });
      }

      restoreClosedIsland();
    });
    timeline.timeScale(exitSpeedRef.current).reverse();
  });

  const handleIslandClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || !isOpenRef.current) {
      return;
    }

    closeMenu();
  };

  const handleMenuButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    toggleMenu();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || !isOpenRef.current) {
      return;
    }

    closeMenu();
    menuButtonRef.current?.focus();
  };

  const handleOverlayKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isOpenRef.current || event.key !== "Tab") {
      return;
    }

    const overlay = overlayRef.current;
    const focusable = overlay
      ? Array.from(overlay.querySelectorAll<HTMLElement>("[data-orchestrated-focusable]")).filter(
          (element) => !element.hasAttribute("disabled") && element.tabIndex >= 0,
        )
      : [];

    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      aria-hidden={isFooterMenuHidden ? true : undefined}
      data-orchestrated-menu
      onKeyDown={handleKeyDown}
      ref={rootRef}
    >
      <div
        className={`fixed top-2 left-1/2 z-[1000] flex h-[50px] w-[50px] items-center justify-between overflow-visible rounded-[99px] whitespace-nowrap ${isOpen ? "cursor-pointer" : ""}`}
        onClick={handleIslandClick}
        ref={islandRef}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 rounded-[99px] border border-[oklch(87.1108%_0.0055_286.29)] bg-[oklch(100%_0_0)]"
          ref={islandSurfaceRef}
        />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] size-full overflow-visible"
          preserveAspectRatio="none"
          ref={islandSvgRef}
          viewBox="0 0 50 50"
        >
          <path
            d={islandCirclePath}
            fill={islandShapeRestFill}
            ref={islandShapeRef}
            stroke={islandShapeRestStroke}
            strokeWidth={islandDefaultStrokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="pointer-events-none absolute top-1/2 left-[15px] z-10 flex size-8 -translate-y-1/2 items-center justify-center">
          <img
            alt=""
            aria-hidden="true"
            className="size-14 max-w-none opacity-0"
            draggable={false}
            ref={logoRef}
            src={smileIcon}
          />
        </div>
        <button
          aria-controls="orchestrated-menu-overlay"
          aria-disabled={isLoveMenuDisabled || isFooterMenuHidden}
          aria-expanded={isOpen}
          aria-label={
            isLoveMenuDisabled
              ? "Navigation menu disabled"
              : isOpen
                ? "Close navigation menu"
                : "Open navigation menu"
          }
          className={`absolute top-1/2 right-2 z-10 flex size-[34px] -translate-y-1/2 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 ${isLoveMenuDisabled || isFooterMenuHidden ? "cursor-default" : "cursor-pointer"}`}
          disabled={isLoveMenuDisabled || isFooterMenuHidden}
          onClick={handleMenuButtonClick}
          ref={menuButtonRef}
          tabIndex={isFooterMenuHidden ? -1 : undefined}
          type="button"
        >
          <span className="flex size-[34px] items-center justify-center">
            <svg
              aria-hidden="true"
              className="overflow-visible"
              fill="none"
              height="16"
              viewBox="0 0 16 16"
              width="16"
            >
              <line
                ref={topBarRef}
                stroke={islandMenuStroke}
                strokeLinecap="round"
                strokeWidth="1.5"
                x1="2"
                x2="14"
                y1="5"
                y2="5"
              />
              <line
                ref={midBarRef}
                stroke={islandMenuStroke}
                strokeLinecap="round"
                strokeWidth="1.5"
                x1="2"
                x2="14"
                y1="8"
                y2="8"
              />
              <line
                ref={bottomBarRef}
                stroke={islandMenuStroke}
                strokeLinecap="round"
                strokeWidth="1.5"
                x1="2"
                x2="14"
                y1="11"
                y2="11"
              />
            </svg>
          </span>
        </button>
      </div>

      <div
        aria-hidden={!isOpen}
        aria-label="Navigation menu"
        aria-modal="true"
        className="pointer-events-none fixed inset-0 z-[900]"
        id="orchestrated-menu-overlay"
        onKeyDown={handleOverlayKeyDown}
        ref={overlayRef}
        role="dialog"
      >
        <button
          aria-label="Close navigation menu"
          className="absolute inset-0 cursor-default bg-white/82 opacity-0 backdrop-blur-[3px]"
          onClick={closeMenu}
          ref={backdropRef}
          tabIndex={-1}
          type="button"
        />
        <div className="absolute inset-x-4 top-[68px] flex justify-center">
          <div
            className="w-full max-w-[400px] rounded-[18px] border border-[oklch(87.1108%_0.0055_286.29)] bg-[oklch(98.5%_0_0)] p-1.5 opacity-0 shadow-[0_14px_40px_oklch(17.7638%_0_0_/_0.08)]"
            ref={panelRef}
          >
            <nav aria-label="Navigation menu links">
              {menuItems.map((item, index) => (
                <a
                  aria-label={`${item.label} ${item.number}`}
                  className="group flex items-center justify-between px-4 py-[13px] text-base leading-none font-normal text-zinc-800 outline-none transition-colors first:rounded-t-[10px] last:rounded-b-[10px] hover:text-emerald-500 focus-visible:bg-zinc-100 focus-visible:text-emerald-500 [&+&]:border-t [&+&]:border-zinc-200"
                  data-app-link
                  data-orchestrated-focusable
                  href={item.href}
                  key={item.label}
                  ref={(node) => {
                    linkRefs.current[index] = node;
                  }}
                  tabIndex={isOpen ? 0 : -1}
                >
                  <span className="relative after:pointer-events-none after:absolute after:right-0 after:-bottom-1 after:left-0 after:h-px after:origin-left after:scale-x-0 after:bg-emerald-500 after:transition-transform after:duration-200 after:ease-out group-hover:after:scale-x-100 group-focus-visible:after:scale-x-100">
                    {item.label}
                  </span>
                  <span className="relative text-[0.7rem] text-zinc-400 transition-colors after:pointer-events-none after:absolute after:right-0 after:-bottom-1 after:left-0 after:h-px after:origin-left after:scale-x-0 after:bg-emerald-500 after:transition-transform after:duration-200 after:ease-out group-hover:text-zinc-500 group-hover:after:scale-x-100 group-focus-visible:text-zinc-500 group-focus-visible:after:scale-x-100">
                    {item.number}
                  </span>
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
