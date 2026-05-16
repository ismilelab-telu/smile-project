import { useRef } from "react";
import { IconArrowRight } from "@tabler/icons-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { DottedSurface } from "@/components/ui/dotted-surface";
import { CinematicFooter } from "@/components/ui/motion-footer";

gsap.registerPlugin(useGSAP);

export function LandingPage() {
  const landingRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const targets = "[data-landing-reveal]";

      if (typeof window.matchMedia !== "function") {
        gsap.set(targets, { autoAlpha: 1, clearProps: "all" });
        return;
      }

      const motionPreferences = gsap.matchMedia();

      motionPreferences.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(targets, { autoAlpha: 1, clearProps: "all" });
      });

      motionPreferences.add("(prefers-reduced-motion: no-preference)", () => {
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
        className="relative z-10 min-h-screen overflow-x-hidden bg-[#f7f7f7] text-[#111111]"
        ref={landingRef}
      >
        <DottedSurface />

        <section
          className="relative z-10 mx-auto flex min-h-[100svh] w-[min(1180px,calc(100%_-_32px))] flex-col items-center justify-center pt-28 pb-28 text-center"
          aria-labelledby="landing-title"
        >
          <h1
            className="m-0 max-w-full whitespace-nowrap text-[clamp(2.8rem,10vw,8.6rem)] leading-[0.9] tracking-normal text-[#111111]"
            data-landing-reveal
            id="landing-title"
          >
            Smile Project
          </h1>
          <p
            className="mt-6 mb-0 max-w-2xl text-[clamp(1rem,2vw,1.3rem)] leading-[1.65] text-[#525252]"
            data-landing-reveal
          >
            Explore ML models through visual feedback, fully-animated, and built to make learning ML
            feel fun.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3" data-landing-reveal>
            <a
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#111111] px-5 font-semibold text-white shadow-[0_16px_34px_rgba(0,0,0,0.18)] transition-colors hover:bg-black"
              data-app-link
              href="/model-picker"
            >
              Open model picker
              <IconArrowRight aria-hidden="true" size={18} />
            </a>
          </div>
        </section>
      </main>

      <CinematicFooter />
    </>
  );
}
