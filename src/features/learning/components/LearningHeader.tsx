import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  CheckIcon,
  ChevronUpIcon,
  Home01Icon,
  LanguageSkillIcon,
  Logout03Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { AnimatePresence, motion } from "motion/react";

import { useAuth } from "@/features/auth/auth-context";
import { localeOptions, useLocalization } from "@/features/localization/localization";
import { shouldReduceMotion } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

type LearningHeaderProps = {
  backHref: string;
  backLabel: string;
};

const menuLinks = [
  { href: "/", labelKey: "menu.home" },
  { href: "/explore", labelKey: "menu.explore" },
  { href: "/learn", labelKey: "menu.learningMode" },
  { href: "/playground", labelKey: "menu.mlPlayground" },
  { href: "/algorithm-lab", labelKey: "menu.algorithmLab" },
] as const;

export function LearningHeader({ backHref, backLabel }: LearningHeaderProps) {
  return (
    <header className="learning-header sticky top-0 z-30 flex items-center justify-between border-b learning-grid-border bg-background px-6 py-5">
      <a
        aria-label={backLabel}
        className="inline-flex size-10 items-center justify-center rounded-none bg-transparent text-neutral-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        data-app-link
        href={backHref}
      >
        <HugeiconsIcon
          aria-hidden="true"
          className="size-5"
          icon={ArrowLeft02Icon}
          strokeWidth={2}
        />
      </a>
      <LearningMenu />
    </header>
  );
}

function LearningMenu() {
  const { isAuthenticated, session, signOut } = useAuth();
  const { locale, setLocale, t } = useLocalization();
  const rootRef = useRef<HTMLDivElement>(null);
  const languageTriggerRef = useRef<HTMLButtonElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const enterEndTimeRef = useRef(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLanguageSelectorOpen, setIsLanguageSelectorOpen] = useState(false);
  const [languageSelectorWidth, setLanguageSelectorWidth] = useState<number | null>(null);

  const { contextSafe } = useGSAP(
    () => {
      const root = rootRef.current;

      if (!root) {
        return;
      }

      const nav = root.querySelector<HTMLElement>("[data-learning-menu-nav]");
      const backdrop = root.querySelector<HTMLElement>("[data-learning-menu-backdrop]");
      const panels = gsap.utils.toArray<HTMLElement>("[data-learning-menu-panel]", root);
      const navItems = gsap.utils.toArray<HTMLElement>("[data-learning-menu-item]", root);
      const topBar = root.querySelector<HTMLElement>("[data-learning-menu-bar='top']");
      const middleBar = root.querySelector<HTMLElement>("[data-learning-menu-bar='middle']");
      const bottomBar = root.querySelector<HTMLElement>("[data-learning-menu-bar='bottom']");

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

    const nav = root.querySelector<HTMLElement>("[data-learning-menu-nav]");
    const backdrop = root.querySelector<HTMLElement>("[data-learning-menu-backdrop]");
    const panels = gsap.utils.toArray<HTMLElement>("[data-learning-menu-panel]", root);
    const navItems = gsap.utils.toArray<HTMLElement>("[data-learning-menu-item]", root);
    const topBar = root.querySelector<HTMLElement>("[data-learning-menu-bar='top']");
    const middleBar = root.querySelector<HTMLElement>("[data-learning-menu-bar='middle']");
    const bottomBar = root.querySelector<HTMLElement>("[data-learning-menu-bar='bottom']");

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

    if (!nextOpen) {
      setIsLanguageSelectorOpen(false);
    }

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

  const handleSignOut = () => {
    signOut();
    setMenuOpen(false);
  };

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

  useEffect(() => {
    if (!isLanguageSelectorOpen) {
      return;
    }

    const updateLanguageSelectorWidth = () => {
      setLanguageSelectorWidth(languageTriggerRef.current?.offsetWidth ?? null);
    };

    updateLanguageSelectorWidth();
    window.addEventListener("resize", updateLanguageSelectorWidth);

    return () => {
      window.removeEventListener("resize", updateLanguageSelectorWidth);
    };
  }, [isLanguageSelectorOpen, locale]);

  return (
    <div ref={rootRef}>
      <button
        aria-expanded={isOpen}
        aria-label={isOpen ? t("menu.close") : t("menu.open")}
        className="relative z-50 inline-flex size-10 cursor-pointer items-center justify-center rounded-none bg-transparent text-neutral-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        onClick={() => setMenuOpen(!isOpen)}
        type="button"
      >
        <span className="relative block h-5 w-5" aria-hidden="true">
          <span
            className="absolute top-[5px] left-[3px] h-0.5 w-3.5 bg-current"
            data-learning-menu-bar="top"
          />
          <span
            className="absolute top-[9px] left-[3px] h-0.5 w-3.5 bg-current"
            data-learning-menu-bar="middle"
          />
          <span
            className="absolute top-[13px] left-[3px] h-0.5 w-3.5 bg-current"
            data-learning-menu-bar="bottom"
          />
        </span>
      </button>

      <div
        aria-hidden={!isOpen}
        className="invisible fixed inset-0 z-40 flex flex-col items-end gap-2 p-4"
        data-learning-menu-nav
      >
        <button
          aria-label={t("menu.close")}
          className="absolute inset-0 bg-white/45 opacity-0 backdrop-blur-md supports-[backdrop-filter]:bg-white/35 will-change-[opacity,backdrop-filter]"
          data-learning-menu-backdrop
          onClick={() => setMenuOpen(false)}
          type="button"
        />

        <section
          aria-label={locale === "en" ? "Profile summary" : "Ringkasan profil"}
          className="relative z-10 flex min-h-28 w-[min(700px,calc(100vw_-_2rem))] transform-gpu items-center gap-4 rounded-none border-2 border-neutral-950 bg-neutral-100 px-7 py-5 text-neutral-950 shadow-2xl will-change-transform"
          data-learning-menu-panel
        >
          {isAuthenticated && session ? (
            <>
              <div
                aria-hidden="true"
                className="flex size-14 shrink-0 items-center justify-center border border-neutral-300 bg-white font-mono text-sm font-semibold text-neutral-950"
              >
                {session.user.initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold tracking-normal">
                  {session.user.name}
                </p>
                <p className="truncate font-mono text-xs font-semibold text-neutral-500">
                  {session.user.email}
                </p>
              </div>
              <button
                className="ml-auto inline-flex size-11 cursor-pointer items-center justify-center border border-neutral-300 bg-white text-neutral-950 transition-colors hover:border-rose-500 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
                onClick={handleSignOut}
                title={locale === "en" ? "Sign out" : "Keluar"}
                type="button"
              >
                <HugeiconsIcon
                  aria-hidden="true"
                  className="size-5"
                  icon={Logout03Icon}
                  strokeWidth={2}
                />
              </button>
            </>
          ) : (
            <>
              <div
                aria-hidden="true"
                className="flex size-14 shrink-0 items-center justify-center border border-neutral-300 bg-white font-mono text-sm font-semibold text-neutral-950"
              >
                SM
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3 text-lg font-semibold tracking-normal">
                  <a
                    className="transition-colors hover:text-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                    data-app-link
                    href="/login"
                  >
                    {locale === "en" ? "Login" : "Masuk"}
                  </a>
                  <span aria-hidden="true" className="text-neutral-400">
                    /
                  </span>
                  <a
                    className="transition-colors hover:text-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                    data-app-link
                    href="/register"
                  >
                    {locale === "en" ? "Register" : "Daftar"}
                  </a>
                </div>
              </div>
            </>
          )}
        </section>

        <nav
          aria-label={t("menu.navLabel")}
          className="relative z-10 flex min-h-[420px] w-[min(700px,calc(100vw_-_2rem))] flex-1 transform-gpu flex-col rounded-none border-2 border-neutral-950 bg-neutral-100 px-7 pt-16 pb-7 text-neutral-950 shadow-2xl will-change-transform"
          data-learning-menu-panel
        >
          <ul className="flex flex-1 list-none flex-col justify-center">
            {menuLinks.map((link) => (
              <li
                className="overflow-hidden will-change-[transform,opacity]"
                data-learning-menu-item
                key={link.href}
              >
                <a
                  className="block py-4 text-[2.15rem] leading-[1.05] font-semibold tracking-normal text-neutral-950 transition-colors hover:text-emerald-400"
                  data-app-link
                  href={link.href}
                >
                  {t(link.labelKey)}
                </a>
              </li>
            ))}
          </ul>
          <div className="absolute bottom-7 left-7 z-20 flex flex-col items-start">
            <AnimatePresence>
              {isLanguageSelectorOpen ? (
                <motion.div
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="absolute bottom-full left-0 mb-3 grid origin-bottom-left overflow-hidden border border-neutral-300 bg-white shadow-lg"
                  exit={{ opacity: 0, scale: 0.98, y: 8 }}
                  initial={{ opacity: 0, scale: 0.98, y: 8 }}
                  style={languageSelectorWidth ? { width: languageSelectorWidth } : undefined}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  {localeOptions.map((option) => {
                    const isSelected = option.value === locale;
                    const label = t(option.labelKey);
                    const ariaLabel =
                      option.value === "id" ? t("language.use.id") : t("language.use.en");

                    return (
                      <button
                        aria-label={ariaLabel}
                        className={`flex min-h-12 cursor-pointer items-center gap-3 px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-emerald-400 ${
                          isSelected ? "bg-emerald-50 text-emerald-700" : "text-neutral-950"
                        }`}
                        key={option.value}
                        onClick={() => {
                          setLocale(option.value);
                          setIsLanguageSelectorOpen(false);
                        }}
                        type="button"
                      >
                        <span aria-hidden="true" className="text-xl leading-none">
                          {option.flag}
                        </span>
                        <span>{label}</span>
                        {isSelected ? (
                          <HugeiconsIcon
                            aria-hidden="true"
                            className="ml-auto size-5"
                            icon={CheckIcon}
                            strokeWidth={2}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </motion.div>
              ) : null}
            </AnimatePresence>
            <button
              aria-expanded={isLanguageSelectorOpen}
              aria-label={t("language.triggerAria")}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-none border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:border-emerald-500 hover:text-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
              onClick={() => setIsLanguageSelectorOpen((current) => !current)}
              ref={languageTriggerRef}
              type="button"
            >
              <HugeiconsIcon
                aria-hidden="true"
                className="size-5"
                icon={LanguageSkillIcon}
                strokeWidth={2}
              />
              <span>{t("language.trigger")}</span>
              <span className="font-normal text-neutral-500">
                {t(locale === "id" ? "language.option.id" : "language.option.en")}
              </span>
              <HugeiconsIcon
                aria-hidden="true"
                className={`size-4 transition-transform ${
                  isLanguageSelectorOpen ? "rotate-180" : ""
                }`}
                icon={ChevronUpIcon}
                strokeWidth={2}
              />
            </button>
          </div>
        </nav>

        <section
          aria-label={t("menu.learningModeHighlight")}
          className="relative z-10 flex min-h-36 w-[min(700px,calc(100vw_-_2rem))] transform-gpu flex-col justify-center rounded-none border-2 border-emerald-700 bg-gradient-to-br from-emerald-500 via-emerald-300 to-sky-300 p-7 text-neutral-950 shadow-2xl will-change-transform"
          data-learning-menu-panel
        >
          <p className="font-mono text-xs font-semibold tracking-[0.12em] text-neutral-700 uppercase">
            {t("menu.whatsNew")}
          </p>
          <div className="mt-4 flex items-center gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-none bg-neutral-950/10 text-neutral-950">
              <HugeiconsIcon
                aria-hidden="true"
                className="size-6"
                icon={SparklesIcon}
                strokeWidth={2}
              />
            </span>
            <div>
              <h2 className="text-xl leading-tight font-semibold tracking-normal">
                {t("menu.learningMode")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-neutral-700">
                {t("menu.whatsNewDescription")}
              </p>
            </div>
          </div>
          <a
            className="mt-5 inline-flex w-fit items-center gap-2 rounded-none bg-neutral-950 px-4 py-2 font-mono text-xs font-semibold text-emerald-100 transition-colors hover:bg-neutral-800"
            data-app-link
            href="/learn"
          >
            {t("menu.startPath")}
            <HugeiconsIcon
              aria-hidden="true"
              className="size-4"
              icon={ArrowRight02Icon}
              strokeWidth={2}
            />
          </a>
        </section>

        <div
          className="relative z-10 flex h-28 w-[min(700px,calc(100vw_-_2rem))] transform-gpu items-center rounded-none border-2 border-neutral-700 bg-neutral-950 px-7 text-neutral-400 shadow-2xl will-change-transform"
          data-learning-menu-panel
        >
          <ul className="flex list-none flex-wrap gap-4 font-mono text-xs font-semibold">
            <li>
              <a className="transition-colors hover:text-white" data-app-link href="/404">
                {t("menu.contact")}
              </a>
            </li>
            <li>
              <a className="transition-colors hover:text-white" data-app-link href="/404">
                {t("menu.support")}
              </a>
            </li>
            <li>
              <a className="transition-colors hover:text-white" data-app-link href="/404">
                {t("menu.changelog")}
              </a>
            </li>
          </ul>
          <HugeiconsIcon
            aria-hidden="true"
            className="ml-auto size-10 text-emerald-300"
            icon={Home01Icon}
            strokeWidth={1.8}
          />
        </div>
      </div>
    </div>
  );
}
