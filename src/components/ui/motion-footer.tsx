"use client";

import { useEffect, useRef, type ElementType, type HTMLAttributes } from "react";
import { IconArrowRight, IconChevronUp, IconTopologyStar3 } from "@tabler/icons-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const footerAuroraClassName =
  "bg-[radial-gradient(circle_at_50%_50%,color-mix(in_oklch,var(--foreground)_13%,transparent)_0%,color-mix(in_oklch,var(--muted-foreground)_12%,transparent)_42%,transparent_70%)]";

const footerGridClassName =
  "bg-[size:60px_60px] [background-image:linear-gradient(to_right,color-mix(in_oklch,var(--foreground)_5%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--foreground)_5%,transparent)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]";

const giantTextClassName =
  "bg-[linear-gradient(180deg,color-mix(in_oklch,var(--foreground)_12%,transparent)_0%,transparent_62%)] bg-clip-text text-[clamp(8rem,24vw,24rem)] leading-[0.75] font-black tracking-normal text-transparent [-webkit-text-stroke:1px_color-mix(in_oklch,var(--foreground)_7%,transparent)]";

const textGlowClassName =
  "bg-[linear-gradient(180deg,var(--foreground)_0%,color-mix(in_oklch,var(--foreground)_46%,transparent)_100%)] bg-clip-text [-webkit-text-fill-color:transparent] drop-shadow-[0_0_20px_color-mix(in_oklch,var(--foreground)_14%,transparent)]";

const glassPillClassName =
  "border border-[color:color-mix(in_oklch,var(--foreground)_12%,transparent)] bg-[linear-gradient(145deg,color-mix(in_oklch,var(--foreground)_5%,transparent)_0%,color-mix(in_oklch,var(--foreground)_1%,transparent)_100%)] shadow-[0_10px_30px_-10px_color-mix(in_oklch,var(--foreground)_14%,transparent),inset_0_1px_1px_color-mix(in_oklch,var(--background)_70%,transparent)] backdrop-blur-[16px] transition-[background,border-color,box-shadow,color] duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[color:color-mix(in_oklch,var(--foreground)_28%,transparent)] hover:bg-[linear-gradient(145deg,color-mix(in_oklch,var(--foreground)_10%,transparent)_0%,color-mix(in_oklch,var(--foreground)_3%,transparent)_100%)] hover:text-foreground hover:shadow-[0_20px_40px_-10px_color-mix(in_oklch,var(--foreground)_22%,transparent),inset_0_1px_1px_color-mix(in_oklch,var(--background)_70%,transparent)]";

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
      <div
        ref={wrapperRef}
        className="relative h-[100svh] w-full [clip-path:polygon(0%_0,100%_0%,100%_100%,0_100%)]"
      >
        <footer className="fixed bottom-0 left-0 flex h-[100svh] w-full flex-col justify-between overflow-hidden bg-background font-sans text-foreground antialiased">
          <div
            className={cn(
              "pointer-events-none absolute top-1/2 left-1/2 z-0 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 animate-[footer-breathe_8s_ease-in-out_infinite_alternate] rounded-[50%] blur-[80px]",
              footerAuroraClassName,
            )}
          />
          <div className={cn("pointer-events-none absolute inset-0 z-0", footerGridClassName)} />

          <div
            ref={giantTextRef}
            className={cn(
              "pointer-events-none absolute -bottom-[4vh] left-1/2 z-0 -translate-x-1/2 select-none whitespace-nowrap",
              giantTextClassName,
            )}
          >
            SMILE
          </div>

          <div className="absolute top-10 left-0 z-10 w-full -rotate-2 scale-110 overflow-hidden border-y border-border bg-background/70 py-3 shadow-2xl backdrop-blur-md">
            <div className="flex w-max animate-[footer-scroll-marquee_40s_linear_infinite] text-xs font-bold text-muted-foreground uppercase md:text-sm">
              <MarqueeItem />
              <MarqueeItem />
              <MarqueeItem />
            </div>
          </div>

          <div className="relative z-10 mx-auto mt-20 flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6">
            <h2
              ref={headingRef}
              className={cn(
                "mb-9 text-center text-[clamp(2.7rem,9vw,6.2rem)] leading-[0.95] font-black tracking-normal",
                textGlowClassName,
              )}
            >
              ML should be fun!
            </h2>

            <div ref={linksRef} className="flex w-full flex-col items-center gap-5">
              <div className="flex w-full flex-wrap justify-center gap-4">
                <MagneticButton
                  as="a"
                  className={cn(
                    "inline-flex items-center gap-3 rounded-full px-8 py-4 text-sm font-bold text-foreground md:px-10 md:py-5 md:text-base",
                    glassPillClassName,
                  )}
                  data-app-link
                  href="/model-picker"
                >
                  <IconTopologyStar3 aria-hidden="true" size={20} />
                  Explore models
                </MagneticButton>

                <MagneticButton
                  as="button"
                  className={cn(
                    "inline-flex items-center gap-3 rounded-full px-8 py-4 text-sm font-bold text-foreground md:px-10 md:py-5 md:text-base",
                    glassPillClassName,
                  )}
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
                  className={cn(
                    "rounded-full px-6 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground md:text-sm",
                    glassPillClassName,
                  )}
                  data-app-link
                  href="/"
                >
                  Home
                </MagneticButton>
                <MagneticButton
                  as="a"
                  className={cn(
                    "rounded-full px-6 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground md:text-sm",
                    glassPillClassName,
                  )}
                  href="#support"
                >
                  Support
                </MagneticButton>
                <MagneticButton
                  as="a"
                  className={cn(
                    "rounded-full px-6 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground md:text-sm",
                    glassPillClassName,
                  )}
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
              className={cn(
                "order-3 flex size-12 items-center justify-center rounded-full text-muted-foreground hover:text-foreground",
                glassPillClassName,
              )}
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
