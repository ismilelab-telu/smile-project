import { useCallback, useRef, useState } from "react";
import { IconArrowRight } from "@tabler/icons-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { DottedSurface } from "@/components/ui/dotted-surface";
import { GlassSurface } from "@/components/ui/glass-surface";
import { CinematicFooter } from "@/components/ui/motion-footer";
import { OrchestratedEaseReverseMenu } from "@/components/ui/orchestrated-ease-reverse-menu";
import ScrollFloat from "@/components/ui/scroll-float";
import ScrollReveal from "@/components/ui/scroll-reveal";
import { SplitText } from "@/components/ui/split-text";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const playgroundIntroCopy = [
  "Meet Interactive ML Playground\u2014where complex algorithms turn into visual, hands-on play.",
  'We\u2019ve stripped away the heavy coding of Colab and opened up the "black box" of Teachable Machine to give you the perfect sweet spot for learning.',
  "Fully animated and relentlessly beginner-friendly.",
].join(" ");
const playgroundTeachingCopy = "We don't just teach\nyou Machine Learning.";
const playgroundTeachingLines = playgroundTeachingCopy.split("\n");
const playgroundFinalCopy = "We make you fall\nin love with it.";

export function LandingPage() {
  const landingRef = useRef<HTMLElement>(null);
  const playgroundSectionRef = useRef<HTMLElement>(null);
  const heroActionRef = useRef<HTMLDivElement>(null);
  const exploreZoneRef = useRef<HTMLDivElement>(null);
  const exploreButtonRef = useRef<HTMLAnchorElement>(null);
  const exploreLabelRef = useRef<HTMLSpanElement>(null);
  const [canStartDescriptionAnimation, setCanStartDescriptionAnimation] = useState(false);
  const [canRevealHeroAction, setCanRevealHeroAction] = useState(false);
  const [descriptionReplayKey, setDescriptionReplayKey] = useState(0);
  const startDescriptionAnimation = useCallback(() => {
    setCanRevealHeroAction(false);
    setDescriptionReplayKey((key) => key + 1);
    setCanStartDescriptionAnimation(true);
  }, []);
  const resetHeroIntro = useCallback(() => {
    setCanRevealHeroAction(false);
    setCanStartDescriptionAnimation(false);
  }, []);
  const revealHeroAction = useCallback(() => {
    setCanRevealHeroAction(true);
  }, []);

  useGSAP(
    () => {
      const fadeTarget = "[data-landing-scroll-fade]";
      const surfaceTarget = "[data-landing-scroll-surface]";
      const titleTarget = "[data-landing-scroll-title]";
      const actionTarget = "[data-hero-action]";
      const visibleTargets = `${titleTarget}, ${surfaceTarget}, ${actionTarget}`;

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
          );

        ScrollTrigger.create({
          onLeave: resetHeroIntro,
          start: "bottom 44%",
          trigger: landingRef.current,
        });

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
    { dependencies: [resetHeroIntro], scope: landingRef },
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
      const otherCharacters = characterElements.filter((character) => character !== morphDot);

      if (!morphDot || characterElements.length === 0) {
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

      const syncMorphSvgViewBox = () => {
        const rect = storyStage.getBoundingClientRect();

        dotMorphSvg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
      };

      const getDotCenterX = () => {
        const stageRect = storyStage.getBoundingClientRect();
        const dotRect = morphDot.getBoundingClientRect();

        return dotRect.left - stageRect.left + dotRect.width / 2;
      };

      const getDotCenterY = () => {
        const stageRect = storyStage.getBoundingClientRect();
        const dotRect = morphDot.getBoundingClientRect();

        return dotRect.top - stageRect.top + dotRect.height / 2;
      };

      const getDotRadius = () => {
        const rect = morphDot.getBoundingClientRect();

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
      const zoomStart = dotRevealStart + dotRevealDuration + 0.04;

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
        .fromTo(
          otherCharacters,
          {
            opacity: 1,
            yPercent: 0,
          },
          {
            duration: 0.18,
            ease: "power2.out",
            immediateRender: false,
            opacity: 0,
            yPercent: -18,
          },
          zoomStart,
        )
        .fromTo(
          morphDot,
          {
            opacity: 1,
          },
          {
            duration: 0.08,
            ease: "none",
            immediateRender: false,
            opacity: 0,
          },
          zoomStart,
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
            duration: 0.42,
            ease: "power2.inOut",
            immediateRender: false,
            onUpdate: updateMorphCircle,
            progress: 1,
          },
          zoomStart + 0.02,
        )
        .to(
          storyStage,
          {
            backgroundColor: "#09090b",
            duration: 0.2,
            ease: "none",
          },
          zoomStart + 0.3,
        )
        .set(dotMorphSvg, { autoAlpha: 1 }, zoomStart + 0.45);
    },
    { scope: playgroundSectionRef },
  );

  return (
    <>
      <OrchestratedEaseReverseMenu />

      <main
        className="relative z-10 min-h-screen overflow-x-hidden bg-background text-foreground"
        ref={landingRef}
      >
        <DottedSurface data-landing-scroll-surface />

        <section
          className="relative z-10 mx-auto flex min-h-[100svh] w-[min(1180px,calc(100%_-_32px))] flex-col items-center justify-center pt-28 pb-28 text-center"
          aria-labelledby="landing-title"
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
              replayOnEnter
              rootMargin="-100px"
              splitType="chars"
              style={{ overflow: "visible", whiteSpace: "nowrap" }}
              tag="h1"
              text="Smile Project"
              textAlign="center"
              threshold={0.1}
              to={{ opacity: 1, y: 0 }}
            />
            <SplitText
              animateTarget="lines"
              className="mt-6 max-w-2xl text-[clamp(1rem,2vw,1.3rem)] leading-[1.65] text-muted-foreground"
              delay={100}
              duration={0.6}
              ease="expo.out"
              from={{ opacity: 0, yPercent: 100 }}
              key={descriptionReplayKey}
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
        <div className="flex min-h-[100svh] items-center justify-center py-20 sm:py-24 lg:py-28">
          <ScrollReveal
            baseOpacity={0.14}
            baseRotation={2.5}
            blurStrength={8}
            containerClassName="mx-auto w-full max-w-screen-2xl"
            rotationEnd="bottom 72%"
            textClassName="text-pretty text-3xl leading-[1.22] font-semibold tracking-normal sm:text-4xl sm:leading-[1.16] lg:text-6xl lg:leading-[1.08]"
            wordAnimationEnd="bottom 76%"
          >
            {playgroundIntroCopy}
          </ScrollReveal>
        </div>

        <div
          className="-mx-6 h-[260svh] w-[calc(100%+3rem)] bg-zinc-50"
          data-teaching-story-section
        >
          <div
            className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden bg-zinc-50 px-6 py-20 sm:py-24 lg:py-28"
            data-teaching-story-stage
          >
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-0"
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
                className="inline-block text-4xl leading-[1.14] font-black tracking-normal sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl"
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
                                  className="inline-block h-[0.18em] w-[0.18em] align-[-0.02em] will-change-[transform,opacity]"
                                  data-teaching-story-char
                                  data-teaching-story-dot
                                  key={`${lineIndex}-${wordIndex}-dot-${characterIndex}`}
                                >
                                  <svg
                                    aria-hidden="true"
                                    className="block h-full w-full overflow-visible"
                                    viewBox="0 0 100 100"
                                  >
                                    <circle cx="50" cy="50" fill="currentColor" r="50" />
                                  </svg>
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
          className="-mx-6 flex min-h-[100svh] w-[calc(100%+3rem)] items-center justify-center bg-zinc-950 px-6 py-20 text-zinc-50 sm:py-24 lg:py-28"
          data-love-scroll-section
        >
          <ScrollFloat
            animationDuration={1}
            containerClassName="mx-auto w-full max-w-screen-2xl text-center"
            ease="back.inOut(2)"
            scrollEnd="bottom bottom-=40%"
            scrollStart="center bottom+=50%"
            stagger={0.03}
            textClassName="!text-4xl !leading-[1.08] !font-black tracking-normal sm:!text-5xl lg:!text-7xl xl:!text-8xl"
            trailingAnchor={
              <span aria-hidden="true" className="relative inline-flex h-[1em] w-0 align-baseline">
                <span
                  className="absolute top-1/2 left-4 size-[50px] -translate-y-1/2"
                  data-love-scroll-target
                />
              </span>
            }
          >
            {playgroundFinalCopy}
          </ScrollFloat>
        </div>
      </section>

      <CinematicFooter />
    </>
  );
}
