"use client";

import { useEffect, useRef, type ElementType, type HTMLAttributes } from "react";
import { IconArrowRight, IconChevronUp, IconTopologyStar3 } from "@tabler/icons-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const STYLES = `
.cinematic-footer-wrapper {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  --pill-bg-1: color-mix(in oklch, var(--foreground) 5%, transparent);
  --pill-bg-2: color-mix(in oklch, var(--foreground) 1%, transparent);
  --pill-shadow: color-mix(in oklch, var(--foreground) 14%, transparent);
  --pill-highlight: color-mix(in oklch, var(--background) 70%, transparent);
  --pill-border: color-mix(in oklch, var(--foreground) 12%, transparent);
  --pill-bg-1-hover: color-mix(in oklch, var(--foreground) 10%, transparent);
  --pill-bg-2-hover: color-mix(in oklch, var(--foreground) 3%, transparent);
  --pill-border-hover: color-mix(in oklch, var(--foreground) 28%, transparent);
  --pill-shadow-hover: color-mix(in oklch, var(--foreground) 22%, transparent);
}

@keyframes footer-breathe {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.55; }
  100% { transform: translate(-50%, -50%) scale(1.08); opacity: 0.95; }
}

@keyframes footer-scroll-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.animate-footer-breathe {
  animation: footer-breathe 8s ease-in-out infinite alternate;
}

.animate-footer-scroll-marquee {
  animation: footer-scroll-marquee 40s linear infinite;
}

.footer-bg-grid {
  background-size: 60px 60px;
  background-image:
    linear-gradient(to right, color-mix(in oklch, var(--foreground) 5%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 5%, transparent) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
}

.footer-aurora {
  background: radial-gradient(
    circle at 50% 50%,
    color-mix(in oklch, var(--foreground) 13%, transparent) 0%,
    color-mix(in oklch, var(--muted-foreground) 12%, transparent) 42%,
    transparent 70%
  );
}

.footer-glass-pill {
  background: linear-gradient(145deg, var(--pill-bg-1) 0%, var(--pill-bg-2) 100%);
  border: 1px solid var(--pill-border);
  box-shadow:
    0 10px 30px -10px var(--pill-shadow),
    inset 0 1px 1px var(--pill-highlight);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition:
    background 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    color 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.footer-glass-pill:hover {
  background: linear-gradient(145deg, var(--pill-bg-1-hover) 0%, var(--pill-bg-2-hover) 100%);
  border-color: var(--pill-border-hover);
  box-shadow:
    0 20px 40px -10px var(--pill-shadow-hover),
    inset 0 1px 1px var(--pill-highlight);
  color: var(--foreground);
}

.footer-giant-bg-text {
  font-size: clamp(8rem, 24vw, 24rem);
  line-height: 0.75;
  font-weight: 900;
  letter-spacing: 0;
  color: transparent;
  -webkit-text-stroke: 1px color-mix(in oklch, var(--foreground) 7%, transparent);
  background: linear-gradient(180deg, color-mix(in oklch, var(--foreground) 12%, transparent) 0%, transparent 62%);
  -webkit-background-clip: text;
  background-clip: text;
}

.footer-text-glow {
  background: linear-gradient(180deg, var(--foreground) 0%, color-mix(in oklch, var(--foreground) 46%, transparent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 20px color-mix(in oklch, var(--foreground) 14%, transparent));
}
`;

type MagneticButtonProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  href?: string;
  type?: "button" | "submit" | "reset";
};

const MagneticButton = ({
  as: Component = "button",
  children,
  className,
  ...props
}: MagneticButtonProps) => {
  const localRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = localRef.current;

    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;

      gsap.to(element, {
        duration: 0.4,
        ease: "power2.out",
        rotationX: -y * 0.15,
        rotationY: x * 0.15,
        scale: 1.05,
        x: x * 0.32,
        y: y * 0.32,
      });
    };

    const handlePointerLeave = () => {
      gsap.to(element, {
        duration: 1.1,
        ease: "elastic.out(1, 0.3)",
        rotationX: 0,
        rotationY: 0,
        scale: 1,
        x: 0,
        y: 0,
      });
    };

    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerleave", handlePointerLeave);
      gsap.killTweensOf(element);
    };
  }, []);

  return (
    <Component
      ref={localRef}
      className={cn("cursor-pointer [transform-style:preserve-3d]", className)}
      {...props}
    >
      {children}
    </Component>
  );
};

const marqueeItems = ["Visual model playground", "Animated feedback", "Learning by inspection"];

function MarqueeItem() {
  return (
    <div className="flex items-center gap-10 px-6">
      {marqueeItems.map((item) => (
        <div className="flex items-center gap-10" key={item}>
          <span>{item}</span>
          <span aria-hidden="true" className="text-foreground/45">
            +
          </span>
        </div>
      ))}
    </div>
  );
}

export function CinematicFooter() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const giantTextRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wrapperRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        giantTextRef.current,
        { opacity: 0, scale: 0.86, y: "10vh" },
        {
          ease: "power1.out",
          opacity: 1,
          scale: 1,
          scrollTrigger: {
            end: "bottom bottom",
            scrub: 1,
            start: "top 80%",
            trigger: wrapperRef.current,
          },
          y: "0vh",
        },
      );

      gsap.fromTo(
        [headingRef.current, linksRef.current],
        { opacity: 0, y: 50 },
        {
          ease: "power3.out",
          opacity: 1,
          stagger: 0.15,
          scrollTrigger: {
            end: "bottom bottom",
            scrub: 1,
            start: "top 45%",
            trigger: wrapperRef.current,
          },
          y: 0,
        },
      );
    }, wrapperRef);

    return () => ctx.revert();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ behavior: "smooth", top: 0 });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div
        ref={wrapperRef}
        className="relative h-[100svh] w-full"
        style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
      >
        <footer className="cinematic-footer-wrapper fixed bottom-0 left-0 flex h-[100svh] w-full flex-col justify-between overflow-hidden bg-background text-foreground">
          <div className="footer-aurora pointer-events-none absolute top-1/2 left-1/2 z-0 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 animate-footer-breathe rounded-[50%] blur-[80px]" />
          <div className="footer-bg-grid pointer-events-none absolute inset-0 z-0" />

          <div
            ref={giantTextRef}
            className="footer-giant-bg-text pointer-events-none absolute -bottom-[4vh] left-1/2 z-0 -translate-x-1/2 select-none whitespace-nowrap"
          >
            SMILE
          </div>

          <div className="absolute top-10 left-0 z-10 w-full -rotate-2 scale-110 overflow-hidden border-y border-border bg-background/70 py-3 shadow-2xl backdrop-blur-md">
            <div className="flex w-max animate-footer-scroll-marquee text-xs font-bold text-muted-foreground uppercase md:text-sm">
              <MarqueeItem />
              <MarqueeItem />
              <MarqueeItem />
            </div>
          </div>

          <div className="relative z-10 mx-auto mt-20 flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6">
            <h2
              ref={headingRef}
              className="footer-text-glow mb-9 text-center text-[clamp(2.7rem,9vw,6.2rem)] leading-[0.95] font-black tracking-normal"
            >
              Keep exploring.
            </h2>

            <div ref={linksRef} className="flex w-full flex-col items-center gap-5">
              <div className="flex w-full flex-wrap justify-center gap-4">
                <MagneticButton
                  as="a"
                  className="footer-glass-pill inline-flex items-center gap-3 rounded-full px-8 py-4 text-sm font-bold text-foreground md:px-10 md:py-5 md:text-base"
                  data-app-link
                  href="/model-picker"
                >
                  <IconTopologyStar3 aria-hidden="true" size={20} />
                  Explore models
                </MagneticButton>

                <MagneticButton
                  as="button"
                  className="footer-glass-pill inline-flex items-center gap-3 rounded-full px-8 py-4 text-sm font-bold text-foreground md:px-10 md:py-5 md:text-base"
                  onClick={scrollToTop}
                  type="button"
                >
                  <IconChevronUp aria-hidden="true" size={20} />
                  Back to hero
                </MagneticButton>
              </div>

              <div className="mt-1 flex w-full flex-wrap justify-center gap-3 md:gap-5">
                <MagneticButton
                  as="a"
                  className="footer-glass-pill rounded-full px-6 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground md:text-sm"
                  data-app-link
                  href="/"
                >
                  Home
                </MagneticButton>
                <MagneticButton
                  as="a"
                  className="footer-glass-pill rounded-full px-6 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground md:text-sm"
                  href="#support"
                >
                  Support
                </MagneticButton>
                <MagneticButton
                  as="a"
                  className="footer-glass-pill rounded-full px-6 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground md:text-sm"
                  href="#about"
                >
                  About us
                </MagneticButton>
              </div>
            </div>
          </div>

          <div className="relative z-20 flex w-full flex-col items-center justify-between gap-5 px-6 pb-6 md:flex-row md:px-12">
            <div className="order-2 text-[10px] font-semibold text-muted-foreground uppercase md:order-1 md:text-xs">
              © 2026 Smile Project. All rights reserved.
            </div>

            <MagneticButton
              as="button"
              aria-label="Back to top"
              className="footer-glass-pill order-3 flex size-12 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
              onClick={scrollToTop}
              type="button"
            >
              <IconArrowRight aria-hidden="true" className="-rotate-90" size={20} />
            </MagneticButton>
          </div>
        </footer>
      </div>
    </>
  );
}
