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

      if (
        !storySection ||
        !storyStage ||
        typeof window.matchMedia !== "function" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      const characterElements = Array.from(
        storyStage.querySelectorAll<HTMLElement>("[data-teaching-story-char]"),
      );
      const zoomLetter = storyStage.querySelector<HTMLElement>("[data-teaching-story-zoom-letter]");
      const otherCharacters = characterElements.filter((character) => character !== zoomLetter);

      if (!zoomLetter || characterElements.length === 0) {
        return;
      }

      gsap.set(storyStage, { backgroundColor: "#fafafa" });
      gsap.set(characterElements, {
        opacity: 0,
        scaleX: 0.7,
        scaleY: 2.3,
        transformOrigin: "50% 0%",
        visibility: "visible",
        willChange: "opacity, transform",
        yPercent: 120,
      });
      gsap.set(zoomLetter, {
        transformOrigin: "50% 50%",
      });

      const getZoomLetterX = () => {
        const rect = zoomLetter.getBoundingClientRect();

        return window.innerWidth / 2 - (rect.left + rect.width / 2);
      };

      const getZoomLetterY = () => {
        const rect = zoomLetter.getBoundingClientRect();

        return window.innerHeight / 2 - (rect.top + rect.height / 2);
      };

      const getZoomLetterScale = () => {
        const rect = zoomLetter.getBoundingClientRect();
        const letterSize = Math.max(rect.width, rect.height, 1);
        const viewportSize = Math.max(window.innerWidth, window.innerHeight);

        return (viewportSize / letterSize) * 7;
      };
      const revealDuration = 0.18;
      const revealStagger = 0.006;
      const zoomStart = 0.5;

      const teachingTimeline = gsap.timeline({
        scrollTrigger: {
          end: "bottom bottom",
          invalidateOnRefresh: true,
          onLeaveBack: () => {
            gsap.set(storyStage, { backgroundColor: "#fafafa" });
          },
          scrub: true,
          start: "top bottom",
          trigger: storySection,
        },
      });

      teachingTimeline
        .to(
          characterElements,
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
          zoomLetter,
          {
            opacity: 1,
            scale: 1,
            x: 0,
            y: 0,
          },
          {
            duration: 0.42,
            ease: "power2.inOut",
            immediateRender: false,
            scale: getZoomLetterScale,
            x: getZoomLetterX,
            y: getZoomLetterY,
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
        .to(
          zoomLetter,
          {
            duration: 0.08,
            ease: "none",
            opacity: 0,
          },
          zoomStart + 0.45,
        );
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
            <h2
              aria-label={playgroundTeachingCopy.replace("\n", " ")}
              className="my-5 mx-auto w-full max-w-screen-2xl pb-[0.5em] text-center"
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
                            const isZoomLetter =
                              lineIndex === playgroundTeachingLines.length - 1 &&
                              lineCharacterIndex === line.lastIndexOf("g");

                            return (
                              <span
                                className="inline-block will-change-[transform,opacity]"
                                data-teaching-story-char
                                data-teaching-story-zoom-letter={isZoomLetter ? true : undefined}
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
