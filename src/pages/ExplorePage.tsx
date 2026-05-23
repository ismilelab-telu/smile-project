import {
  AcademicCapIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BeakerIcon,
  ChartBarSquareIcon,
  HomeIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import type { ComponentType, SVGProps } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

import { GlassSurface } from "@/components/ui/glass-surface";
import VariableProximity from "@/components/ui/variable-proximity";
import { shouldReduceMotion } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

type Mode = {
  title: string;
  statusTone: "emerald" | "sky" | "neutral";
  href: string;
  actionLabel: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const modes: Mode[] = [
  {
    actionLabel: "Start path",
    href: "/learn",
    icon: AcademicCapIcon,
    statusTone: "emerald",
    title: "Learning Mode",
  },
  {
    actionLabel: "Coming soon",
    href: "/playground",
    icon: BeakerIcon,
    statusTone: "sky",
    title: "ML Playground",
  },
  {
    actionLabel: "Coming soon",
    href: "/algorithm-lab",
    icon: ChartBarSquareIcon,
    statusTone: "neutral",
    title: "Algorithm Lab",
  },
];

const menuLinks = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/learn", label: "Learning Mode" },
  { href: "/playground", label: "ML Playground" },
  { href: "/algorithm-lab", label: "Algorithm Lab" },
];

const iconToneClassName = {
  emerald: "text-emerald-300",
  sky: "text-sky-300",
  neutral: "text-neutral-300",
} satisfies Record<Mode["statusTone"], string>;

export function ExplorePage() {
  const headingRef = useRef<HTMLSpanElement>(null);

  return (
    <main className="relative z-10 isolate min-h-screen overflow-hidden text-neutral-50">
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-[clamp(1.5rem,3vw,2.5rem)] py-[clamp(1.5rem,3vw,2.5rem)] [@media_(min-width:2200px)]:px-14 [@media_(min-width:2200px)]:py-14">
        <a
          aria-label="Back to home"
          className="inline-flex size-10 items-center justify-center rounded-lg bg-transparent text-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 [@media_(min-width:2200px)]:size-12"
          data-app-link
          href="/"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-5 [@media_(min-width:2200px)]:size-6" />
        </a>
        <div className="flex items-center gap-3 [@media_(min-width:2200px)]:gap-4">
          <p className="text-sm font-medium text-neutral-400 [@media_(min-width:2200px)]:text-base">
            Smile Project
          </p>
          <ExploreMenu />
        </div>
      </header>

      <section className="route-content-transition-target relative z-10 grid min-h-screen grid-cols-[24px_minmax(0,1fr)_24px] items-center py-28 sm:grid-cols-[48px_minmax(0,1fr)_48px] lg:grid-cols-[minmax(48px,1fr)_minmax(0,680px)_88px_minmax(0,920px)_minmax(48px,1fr)] lg:py-32 xl:grid-cols-[minmax(7rem,1fr)_minmax(0,clamp(680px,33vw,860px))_clamp(88px,5vw,144px)_minmax(0,clamp(920px,42vw,1180px))_minmax(7rem,1fr)] [@media_(min-width:2200px)]:py-40">
        <div className="col-start-2 grid gap-y-10">
          <h1 className="text-[4rem] leading-[0.9] font-semibold tracking-normal sm:text-[5rem] lg:text-[6.75rem] xl:text-[7.75rem] 2xl:text-[8.5rem] [@media_(min-width:2200px)]:text-[9.75rem]">
            <span className="relative block" ref={headingRef}>
              <VariableProximity
                className="block text-inherit"
                containerRef={headingRef}
                falloff="gaussian"
                fromFontVariationSettings="'wght' 700, 'opsz' 24"
                label="Choose a mode."
                radius={180}
                toFontVariationSettings="'wght' 1000, 'opsz' 96"
              />
            </span>
          </h1>
        </div>

        <div
          className="col-start-2 grid gap-4 lg:col-start-4 [@media_(min-width:2200px)]:gap-5"
          aria-label="Available modes"
        >
          {modes.map((mode) => (
            <ModeCard key={mode.title} mode={mode} />
          ))}
        </div>
      </section>
    </main>
  );
}

function ExploreMenu() {
  const rootRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const enterEndTimeRef = useRef(0);
  const [isOpen, setIsOpen] = useState(false);

  const { contextSafe } = useGSAP(
    () => {
      const root = rootRef.current;

      if (!root) {
        return;
      }

      const nav = root.querySelector<HTMLElement>("[data-explore-menu-nav]");
      const backdrop = root.querySelector<HTMLElement>("[data-explore-menu-backdrop]");
      const panels = gsap.utils.toArray<HTMLElement>("[data-explore-menu-panel]", root);
      const navItems = gsap.utils.toArray<HTMLElement>("[data-explore-menu-item]", root);
      const topBar = root.querySelector<HTMLElement>("[data-explore-menu-bar='top']");
      const middleBar = root.querySelector<HTMLElement>("[data-explore-menu-bar='middle']");
      const bottomBar = root.querySelector<HTMLElement>("[data-explore-menu-bar='bottom']");

      if (!nav || !backdrop || panels.length === 0 || !topBar || !middleBar || !bottomBar) {
        return;
      }

      gsap.set(nav, { pointerEvents: "none", visibility: "hidden" });
      gsap.set(backdrop, { autoAlpha: 0, willChange: "opacity" });
      gsap.set(panels, {
        force3D: true,
        rotation: 0,
        transformOrigin: "50% 50%",
        willChange: "transform",
        x: "112%",
        y: 0,
      });
      gsap.set(navItems, { autoAlpha: 0, force3D: true, willChange: "transform,opacity", x: -18 });

      if (shouldReduceMotion()) {
        gsap.set(panels, { x: 0 });
        gsap.set(navItems, { autoAlpha: 1, x: 0 });
        return;
      }

      const timeline = gsap.timeline({
        onReverseComplete: () => {
          gsap.set(nav, { pointerEvents: "none", visibility: "hidden" });
        },
        paused: true,
      });

      timeline
        .set(nav, { pointerEvents: "auto", visibility: "visible" })
        .to(
          backdrop,
          {
            autoAlpha: 1,
            duration: 0.28,
            ease: "power2.out",
          },
          0,
        )
        .fromTo(
          panels,
          { rotation: 0, x: "112%", y: 0 },
          {
            duration: 0.58,
            ease: "back.out(1.25)",
            force3D: true,
            stagger: 0.08,
            x: "0%",
            y: 0,
          },
          0,
        )
        .fromTo(
          navItems,
          { autoAlpha: 0, x: -18 },
          {
            autoAlpha: 1,
            duration: 0.42,
            ease: "power3.out",
            force3D: true,
            stagger: 0.035,
            x: 0,
          },
          0.14,
        )
        .to(
          topBar,
          {
            duration: 0.28,
            ease: "back.out(1.4)",
            rotation: 45,
            transformOrigin: "50% 50%",
            y: 4,
          },
          0.06,
        )
        .to(
          middleBar,
          {
            autoAlpha: 0,
            duration: 0.18,
            ease: "power2.out",
            scaleX: 0.25,
            transformOrigin: "50% 50%",
          },
          0.06,
        )
        .to(
          bottomBar,
          {
            duration: 0.28,
            ease: "back.out(1.4)",
            rotation: -45,
            transformOrigin: "50% 50%",
            y: -4,
          },
          0.06,
        )
        .addPause();

      enterEndTimeRef.current = timeline.duration();

      timeline
        .to(
          [topBar, middleBar, bottomBar],
          {
            autoAlpha: 1,
            duration: 0.18,
            rotation: 0,
            scaleX: 1,
            y: 0,
          },
          ">",
        )
        .to(
          panels,
          {
            duration: 0.82,
            ease: "power3.in",
            force3D: true,
            rotation: () => gsap.utils.random(-16, 16),
            stagger: {
              each: 0.025,
              from: "end",
            },
            y: "112vh",
          },
          "<",
        )
        .to(
          backdrop,
          {
            autoAlpha: 0,
            duration: 0.28,
            ease: "power2.in",
          },
          "<0.12",
        )
        .set(nav, { pointerEvents: "none", visibility: "hidden" });

      timelineRef.current = timeline;

      return () => {
        timelineRef.current = null;
      };
    },
    { scope: rootRef },
  );

  const syncReducedMenuState = contextSafe((nextOpen: boolean) => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const nav = root.querySelector<HTMLElement>("[data-explore-menu-nav]");
    const backdrop = root.querySelector<HTMLElement>("[data-explore-menu-backdrop]");
    const panels = gsap.utils.toArray<HTMLElement>("[data-explore-menu-panel]", root);
    const navItems = gsap.utils.toArray<HTMLElement>("[data-explore-menu-item]", root);
    const topBar = root.querySelector<HTMLElement>("[data-explore-menu-bar='top']");
    const middleBar = root.querySelector<HTMLElement>("[data-explore-menu-bar='middle']");
    const bottomBar = root.querySelector<HTMLElement>("[data-explore-menu-bar='bottom']");

    gsap.set(nav, {
      pointerEvents: nextOpen ? "auto" : "none",
      visibility: nextOpen ? "visible" : "hidden",
    });
    gsap.set(backdrop, { autoAlpha: nextOpen ? 1 : 0 });
    gsap.set(panels, { rotation: 0, x: 0, y: 0 });
    gsap.set(navItems, { autoAlpha: 1, x: 0 });
    gsap.set(topBar, { rotation: nextOpen ? 45 : 0, y: nextOpen ? 4 : 0 });
    gsap.set(middleBar, { autoAlpha: nextOpen ? 0 : 1, scaleX: nextOpen ? 0.25 : 1 });
    gsap.set(bottomBar, { rotation: nextOpen ? -45 : 0, y: nextOpen ? -4 : 0 });
  });

  const setMenuOpen = contextSafe((nextOpen: boolean) => {
    setIsOpen(nextOpen);

    if (shouldReduceMotion()) {
      syncReducedMenuState(nextOpen);
      return;
    }

    const timeline = timelineRef.current;

    if (!timeline) {
      return;
    }

    if (nextOpen) {
      if (timeline.time() >= enterEndTimeRef.current) {
        timeline.timeScale(1).restart();
        return;
      }

      timeline.timeScale(1).play();
      return;
    }

    if (timeline.time() < enterEndTimeRef.current) {
      timeline.timeScale(1.8).reverse();
      return;
    }

    timeline.timeScale(1).play();
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setMenuOpen]);

  return (
    <div ref={rootRef}>
      <button
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        className={`relative z-50 inline-flex size-10 cursor-pointer items-center justify-center rounded-lg bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 [@media_(min-width:2200px)]:size-12 ${
          isOpen ? "text-neutral-950" : "text-neutral-100"
        }`}
        onClick={() => setMenuOpen(!isOpen)}
        type="button"
      >
        <span
          className="relative block h-5 w-5 [@media_(min-width:2200px)]:scale-110"
          aria-hidden="true"
        >
          <span
            className="absolute left-[3px] top-[5px] h-0.5 w-3.5 rounded-full bg-current"
            data-explore-menu-bar="top"
          />
          <span
            className="absolute left-[3px] top-[9px] h-0.5 w-3.5 rounded-full bg-current"
            data-explore-menu-bar="middle"
          />
          <span
            className="absolute left-[3px] top-[13px] h-0.5 w-3.5 rounded-full bg-current"
            data-explore-menu-bar="bottom"
          />
        </span>
      </button>

      <div
        aria-hidden={!isOpen}
        className="invisible fixed inset-0 z-40 flex flex-col items-end gap-2 p-4 [@media_(min-width:2200px)]:gap-3 [@media_(min-width:2200px)]:p-6"
        data-explore-menu-nav
      >
        <button
          aria-label="Close menu"
          className="absolute inset-0 bg-neutral-950/35 opacity-0 will-change-[opacity]"
          data-explore-menu-backdrop
          onClick={() => setMenuOpen(false)}
          type="button"
        />

        <nav
          aria-label="Explore menu"
          className="relative z-10 flex min-h-[420px] w-[min(700px,calc(100vw_-_2rem))] flex-1 transform-gpu flex-col rounded-xl border-2 border-neutral-950 bg-zinc-300 px-7 pt-16 pb-7 text-neutral-950 shadow-2xl will-change-transform [@media_(min-width:2200px)]:min-h-[520px] [@media_(min-width:2200px)]:w-[min(860px,calc(100vw_-_3rem))] [@media_(min-width:2200px)]:px-9 [@media_(min-width:2200px)]:pt-20 [@media_(min-width:2200px)]:pb-9"
          data-explore-menu-panel
        >
          <ul className="flex flex-1 list-none flex-col justify-center">
            {menuLinks.map((link) => (
              <li
                className="overflow-hidden will-change-[transform,opacity]"
                data-explore-menu-item
                key={link.href}
              >
                <a
                  className="block py-4 text-[clamp(1.7rem,4vw,2.15rem)] leading-[1.05] font-semibold tracking-normal text-neutral-950 transition-colors hover:text-emerald-400 [@media_(min-width:2200px)]:py-5 [@media_(min-width:2200px)]:text-[2.55rem]"
                  data-app-link
                  href={link.href}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <span aria-hidden="true" className="block h-4 shrink-0 [@media_(min-width:2200px)]:h-6" />
        </nav>

        <section
          aria-label="Learning Mode highlight"
          className="relative z-10 flex min-h-36 w-[min(700px,calc(100vw_-_2rem))] transform-gpu flex-col justify-center rounded-xl border-2 border-emerald-700 bg-gradient-to-br from-emerald-500 via-emerald-300 to-sky-300 p-7 text-neutral-950 shadow-2xl will-change-transform [@media_(min-width:2200px)]:min-h-44 [@media_(min-width:2200px)]:w-[min(860px,calc(100vw_-_3rem))] [@media_(min-width:2200px)]:p-9"
          data-explore-menu-panel
        >
          <p className="font-mono text-xs font-semibold tracking-[0.12em] text-neutral-700 uppercase [@media_(min-width:2200px)]:text-sm">
            What's new
          </p>
          <div className="mt-4 flex items-center gap-4 [@media_(min-width:2200px)]:mt-5 [@media_(min-width:2200px)]:gap-5">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-neutral-950/10 text-neutral-950 [@media_(min-width:2200px)]:size-14">
              <SparklesIcon
                aria-hidden="true"
                className="size-6 [@media_(min-width:2200px)]:size-7"
              />
            </span>
            <div>
              <h2 className="text-xl leading-tight font-semibold tracking-normal [@media_(min-width:2200px)]:text-2xl">
                Learning Mode
              </h2>
              <p className="mt-1 text-sm leading-6 text-neutral-700 [@media_(min-width:2200px)]:text-base [@media_(min-width:2200px)]:leading-7">
                Start from the basic ML workflow and continue to model evaluation.
              </p>
            </div>
          </div>
          <a
            className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-neutral-950 px-4 py-2 font-mono text-xs font-semibold text-neutral-50 transition-colors hover:bg-neutral-800 [@media_(min-width:2200px)]:mt-6 [@media_(min-width:2200px)]:px-5 [@media_(min-width:2200px)]:py-2.5 [@media_(min-width:2200px)]:text-sm"
            data-app-link
            href="/learn"
          >
            Start path
            <ArrowRightIcon
              aria-hidden="true"
              className="size-4 [@media_(min-width:2200px)]:size-5"
            />
          </a>
        </section>

        <div
          className="relative z-10 flex h-28 w-[min(700px,calc(100vw_-_2rem))] transform-gpu items-center rounded-xl border-2 border-neutral-700 bg-neutral-950 px-7 text-neutral-400 shadow-2xl will-change-transform [@media_(min-width:2200px)]:h-36 [@media_(min-width:2200px)]:w-[min(860px,calc(100vw_-_3rem))] [@media_(min-width:2200px)]:px-9"
          data-explore-menu-panel
        >
          <ul className="flex list-none flex-wrap gap-4 font-mono text-xs font-semibold [@media_(min-width:2200px)]:gap-5 [@media_(min-width:2200px)]:text-sm">
            <li>
              <a className="transition-colors hover:text-white" data-app-link href="/404">
                Contact
              </a>
            </li>
            <li>
              <a className="transition-colors hover:text-white" data-app-link href="/404">
                Support
              </a>
            </li>
            <li>
              <a className="transition-colors hover:text-white" data-app-link href="/404">
                Changelog
              </a>
            </li>
          </ul>
          <HomeIcon
            aria-hidden="true"
            className="ml-auto size-10 text-emerald-300 [@media_(min-width:2200px)]:size-12"
          />
        </div>
      </div>
    </div>
  );
}

function ModeCard({ mode }: { mode: Mode }) {
  const Icon = mode.icon;

  return (
    <a
      className="group relative isolate grid gap-5 overflow-hidden rounded-3xl bg-transparent p-5 shadow-[0_18px_54px_oklch(0%_0_0_/_0.24)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_68px_oklch(0%_0_0_/_0.32)] focus-visible:outline-none sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6 [@media_(min-width:2200px)]:gap-6 [@media_(min-width:2200px)]:p-7"
      data-app-link
      href={mode.href}
    >
      <GlassSurface
        aria-hidden="true"
        backgroundOpacity={0.1}
        borderRadius={24}
        brightness={24}
        height="100%"
        opacity={0.55}
        saturation={1.6}
        style={{
          inset: 0,
          pointerEvents: "none",
          position: "absolute",
          zIndex: -1,
        }}
        width="100%"
      />

      <span
        className={`inline-flex items-center justify-center ${iconToneClassName[mode.statusTone]}`}
      >
        <Icon aria-hidden="true" className="size-6 [@media_(min-width:2200px)]:size-7" />
      </span>

      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-xl font-semibold tracking-normal text-neutral-50 [@media_(min-width:2200px)]:text-2xl">
            {mode.title}
          </span>
        </span>
      </span>

      <span className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-100 transition-colors group-hover:text-emerald-400 [@media_(min-width:2200px)]:text-base">
        {mode.actionLabel}
        <ArrowRightIcon
          aria-hidden="true"
          className="size-[18px] shrink-0 [@media_(min-width:2200px)]:size-5"
        />
      </span>
    </a>
  );
}
