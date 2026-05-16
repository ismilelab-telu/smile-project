import { type KeyboardEvent, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import smileIcon from "../../../assets/smile.svg";

gsap.registerPlugin(useGSAP, MorphSVGPlugin, ScrollTrigger);

const islandCirclePath =
  "M25 2 C37.7 2 48 12.3 48 25 C48 37.7 37.7 48 25 48 C12.3 48 2 37.7 2 25 C2 12.3 12.3 2 25 2 Z";
const islandHeartPath =
  "M25 45 C20 40 6 29 6 17 C6 9.8 11.1 5 17.3 5 C20.9 5 23.7 6.8 25 9.5 C26.3 6.8 29.1 5 32.7 5 C38.9 5 44 9.8 44 17 C44 29 30 40 25 45 Z";
const islandExpandedPillPath =
  "M3.125 2 H46.875 C48.6 2 50 12.3 50 25 C50 37.7 48.6 48 46.875 48 H3.125 C1.4 48 0 37.7 0 25 C0 12.3 1.4 2 3.125 2 Z";

const menuItems = [
  { href: "#work", label: "Work", number: "01" },
  { href: "#about", label: "About", number: "02" },
  { href: "#studio", label: "Studio", number: "03" },
  { href: "#journal", label: "Journal", number: "04" },
  { href: "#contact", label: "Contact", number: "05" },
];

export function OrchestratedEaseReverseMenu() {
  const rootRef = useRef<HTMLDivElement>(null);
  const islandRef = useRef<HTMLDivElement>(null);
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
  const isOpenRef = useRef(false);
  const isLoveSectionActiveRef = useRef(false);
  const exitSpeedRef = useRef(1.5);
  const [isOpen, setIsOpen] = useState(false);
  const useReverseEase = true;

  isOpenRef.current = isOpen;

  const { contextSafe } = useGSAP(
    () => {
      const island = islandRef.current;
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
      gsap.set(island, { x: 0, xPercent: -50, y: 0 });
      gsap.set(islandShape, { attr: { d: islandCirclePath } });

      const motionPreferences = gsap.matchMedia();

      motionPreferences.add("(prefers-reduced-motion: no-preference)", () => {
        const loveSection = document.querySelector<HTMLElement>("[data-love-scroll-section]");

        if (!loveSection) {
          return undefined;
        }

        const heartMorph = gsap.to(islandShape, {
          duration: 0.36,
          ease: "power2.out",
          morphSVG: islandHeartPath,
          paused: true,
        });

        const setLoveShape = (isActive: boolean, immediate = false) => {
          isLoveSectionActiveRef.current = isActive;

          if (isOpenRef.current) {
            return;
          }

          if (immediate) {
            heartMorph.progress(isActive ? 1 : 0).pause();
            return;
          }

          if (isActive) {
            heartMorph.play();
            return;
          }

          heartMorph.reverse();
        };

        const trigger = ScrollTrigger.create({
          end: "bottom 35%",
          invalidateOnRefresh: true,
          onEnter: () => setLoveShape(true),
          onEnterBack: () => setLoveShape(true),
          onLeave: () => setLoveShape(false),
          onLeaveBack: () => setLoveShape(false),
          onRefresh: (self) => setLoveShape(self.isActive, true),
          start: "top 65%",
          trigger: loveSection,
        });

        return () => {
          trigger.kill();
          heartMorph.kill();
        };
      });

      motionPreferences.add("(prefers-reduced-motion: reduce)", () => {
        isLoveSectionActiveRef.current = false;
        gsap.set(island, { x: 0, y: 0 });
        gsap.set(islandShape, { attr: { d: islandCirclePath } });
      });

      const timeline = gsap
        .timeline({ paused: true })
        .set(overlay, { pointerEvents: "auto" })
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
          islandShape,
          {
            duration: 0.8,
            ease: "back.out(2)",
            easeReverse: useReverseEase ? "power2.out" : false,
            morphSVG: islandExpandedPillPath,
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

      const islandShape = islandShapeRef.current;

      if (islandShape) {
        gsap.to(islandShape, {
          duration: 0.24,
          ease: "power2.out",
          morphSVG: isLoveSectionActiveRef.current ? islandHeartPath : islandCirclePath,
        });
      }
    });
    timeline.timeScale(exitSpeedRef.current).reverse();
  });

  const toggleMenu = contextSafe(() => {
    const timeline = timelineRef.current;

    if (!timeline) {
      return;
    }

    const nextIsOpen = !isOpenRef.current;
    isOpenRef.current = nextIsOpen;
    setIsOpen(nextIsOpen);

    if (nextIsOpen) {
      timeline.invalidate().eventCallback("onReverseComplete", null).timeScale(1).play();
      return;
    }

    timeline.eventCallback("onReverseComplete", () => {
      const overlay = overlayRef.current;

      if (overlay) {
        gsap.set(overlay, { pointerEvents: "none" });
      }

      const islandShape = islandShapeRef.current;

      if (islandShape) {
        gsap.to(islandShape, {
          duration: 0.24,
          ease: "power2.out",
          morphSVG: isLoveSectionActiveRef.current ? islandHeartPath : islandCirclePath,
        });
      }
    });
    timeline.timeScale(exitSpeedRef.current).reverse();
  });

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
    <div data-orchestrated-menu onKeyDown={handleKeyDown} ref={rootRef}>
      <div
        className="fixed top-2 left-1/2 z-[1000] flex h-[50px] w-[50px] items-center justify-between whitespace-nowrap"
        ref={islandRef}
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 size-full overflow-visible drop-shadow-[0_6px_18px_rgba(17,17,17,0.06)]"
          preserveAspectRatio="none"
          viewBox="0 0 50 50"
        >
          <path
            d={islandCirclePath}
            fill="white"
            ref={islandShapeRef}
            stroke="#d4d4d8"
            strokeWidth="1.5"
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
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          className="absolute top-1/2 right-2 flex size-[34px] -translate-y-1/2 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
          onClick={toggleMenu}
          ref={menuButtonRef}
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
                stroke="#111111"
                strokeLinecap="round"
                strokeWidth="1.5"
                x1="2"
                x2="14"
                y1="5"
                y2="5"
              />
              <line
                ref={midBarRef}
                stroke="#111111"
                strokeLinecap="round"
                strokeWidth="1.5"
                x1="2"
                x2="14"
                y1="8"
                y2="8"
              />
              <line
                ref={bottomBarRef}
                stroke="#111111"
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
            className="w-full max-w-[400px] rounded-[18px] border border-zinc-300 bg-white p-1.5 opacity-0 shadow-[0_14px_40px_rgba(17,17,17,0.08)]"
            ref={panelRef}
          >
            <nav aria-label="Navigation menu links">
              {menuItems.map((item, index) => (
                <a
                  aria-label={`${item.label} ${item.number}`}
                  className="group flex items-center justify-between px-4 py-[13px] text-base leading-none font-normal text-zinc-800 outline-none transition-colors first:rounded-t-[10px] last:rounded-b-[10px] hover:text-emerald-500 focus-visible:bg-zinc-100 focus-visible:text-emerald-500 [&+&]:border-t [&+&]:border-zinc-200"
                  data-orchestrated-focusable
                  href={item.href}
                  key={item.label}
                  onClick={(event) => event.preventDefault()}
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
