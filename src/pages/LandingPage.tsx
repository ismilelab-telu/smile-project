import { useRef } from "react";
import { IconArrowRight } from "@tabler/icons-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { DottedSurface } from "@/components/ui/dotted-surface";
import { CinematicFooter } from "@/components/ui/motion-footer";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function LandingPage() {
  const landingRef = useRef<HTMLElement>(null);
  const exploreZoneRef = useRef<HTMLDivElement>(null);
  const exploreButtonRef = useRef<HTMLAnchorElement>(null);
  const exploreLabelRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const targets = "[data-landing-reveal]";
      const contentTarget = "[data-landing-scroll-content]";
      const fadeTarget = "[data-landing-scroll-fade]";
      const surfaceTarget = "[data-landing-scroll-surface]";
      const visibleTargets = `${targets}, ${contentTarget}, ${surfaceTarget}`;

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
            defaults: {
              clearProps: "transform,opacity,visibility",
              ease: "power3.out",
            },
          })
          .from("[data-landing-reveal]", {
            autoAlpha: 0,
            duration: 0.72,
            stagger: 0.1,
            y: 26,
          });

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
          .to(
            contentTarget,
            {
              autoAlpha: 0,
              ease: "none",
              filter: "blur(6px)",
              scale: 0.975,
              y: -64,
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

  return (
    <>
      <main
        className="relative z-10 min-h-screen overflow-x-hidden bg-background text-foreground"
        ref={landingRef}
      >
        <DottedSurface data-landing-scroll-surface />

        <section
          className="relative z-10 mx-auto flex min-h-[100svh] w-[min(1180px,calc(100%_-_32px))] flex-col items-center justify-center pt-28 pb-28 text-center"
          data-landing-scroll-content
          aria-labelledby="landing-title"
        >
          <h1
            className="max-w-full whitespace-nowrap text-[clamp(2.8rem,10vw,8.6rem)] leading-[0.9] tracking-normal text-foreground font-semibold"
            data-landing-reveal
            id="landing-title"
          >
            Smile Project
          </h1>
          <p
            className="mt-6 max-w-2xl text-[clamp(1rem,2vw,1.3rem)] leading-[1.65] text-muted-foreground"
            data-landing-reveal
          >
            Explore ML models through visual feedback, fully-animated, and built to make learning ML
            feel fun.
          </p>
          <div
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
            data-landing-reveal
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
                className="relative inline-flex min-h-12 items-center justify-center overflow-hidden rounded-[99px] border-0 px-8 font-semibold text-background shadow-[0_16px_34px_rgb(0_0_0_/_18%)] outline-none will-change-transform focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                data-app-link
                data-hero-explore-button
                href="/model-picker"
                ref={exploreButtonRef}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 z-0 rounded-[99px] bg-[linear-gradient(114.41deg,var(--foreground)_20.74%,color-mix(in_oklch,var(--foreground)_58%,var(--background))_65.5%)]"
                />
                <span
                  className="pointer-events-none relative z-10 inline-flex items-center gap-2"
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

      <CinematicFooter />
    </>
  );
}
