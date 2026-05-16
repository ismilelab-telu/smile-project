"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
} from "react";
import { IconArrowRight, IconChevronUp, IconTopologyStar3 } from "@tabler/icons-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import ShapeGrid from "@/components/ShapeGrid";
import { BlurText } from "@/components/ui/blur-text";
import { GlassSurface } from "@/components/ui/glass-surface";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const footerAuroraClassName =
  "bg-[radial-gradient(circle_at_50%_50%,color-mix(in_oklch,var(--foreground)_18%,transparent)_0%,color-mix(in_oklch,var(--muted-foreground)_14%,transparent)_42%,transparent_70%)]";

const footerFogClassName =
  "bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_48%,oklch(0.985_0_0_/_72%)_100%),linear-gradient(to_bottom,oklch(0.985_0_0_/_88%)_0%,transparent_18%,transparent_76%,oklch(0.985_0_0_/_92%)_100%)]";

const giantTextClassName =
  "bg-[linear-gradient(180deg,color-mix(in_oklch,var(--foreground)_12%,transparent)_0%,transparent_62%)] bg-clip-text text-[clamp(8rem,24vw,24rem)] leading-[0.75] font-black tracking-normal text-transparent [-webkit-text-stroke:1px_color-mix(in_oklch,var(--foreground)_7%,transparent)]";

const textGlowClassName =
  "bg-[linear-gradient(180deg,var(--foreground)_0%,color-mix(in_oklch,var(--foreground)_46%,transparent)_100%)] bg-clip-text [-webkit-text-fill-color:transparent] drop-shadow-[0_0_20px_color-mix(in_oklch,var(--foreground)_14%,transparent)]";

const glassPillClassName =
  "relative isolate overflow-hidden bg-transparent transition-colors duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-foreground";

type FooterThemeStyle = CSSProperties & Record<`--${string}`, string>;

const footerThemeStyle: FooterThemeStyle = {
  "--background": "oklch(0.985 0 0)",
  "--foreground": "oklch(0.145 0 0)",
  "--muted-foreground": "oklch(0.42 0 0)",
  "--surface": "oklch(1 0 0)",
};

type FooterGlassButtonProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  href?: string;
  type?: "button" | "submit" | "reset";
};

const FooterGlassButton = ({
  as: Component = "button",
  children,
  className,
  style,
  ...props
}: FooterGlassButtonProps) => {
  return (
    <Component
      className={cn("cursor-pointer", className)}
      style={{ appearance: "none", border: 0, outline: "none", ...style }}
      {...props}
    >
      <GlassSurface
        aria-hidden="true"
        borderRadius={999}
        height="100%"
        style={{ inset: 0, opacity: 0.58, pointerEvents: "none", position: "absolute", zIndex: 0 }}
        width="100%"
      />
      <span className="pointer-events-none relative z-10 inline-flex items-center justify-center gap-3">
        {children}
      </span>
    </Component>
  );
};

export function CinematicFooter() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const giantTextRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const [isHeadingTextVisible, setIsHeadingTextVisible] = useState(false);
  const [headingTextReplayKey, setHeadingTextReplayKey] = useState(0);

  useEffect(() => {
    if (!wrapperRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsHeadingTextVisible(true);
      return;
    }

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        onEnter: () => {
          setHeadingTextReplayKey((key) => key + 1);
          setIsHeadingTextVisible(true);
        },
        onLeaveBack: () => setIsHeadingTextVisible(false),
        start: "top 70%",
        trigger: wrapperRef.current,
      });

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
        headingRef.current,
        { opacity: 0, y: 50 },
        {
          ease: "power3.out",
          opacity: 1,
          scrollTrigger: {
            end: "bottom bottom",
            scrub: 1,
            start: "top 45%",
            trigger: wrapperRef.current,
          },
          y: 0,
        },
      );

      gsap.set(linksRef.current, { clearProps: "opacity,transform,visibility" });
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
        className="relative h-[100svh] w-full [clip-path:polygon(0%_0,100%_0%,100%_100%,0_100%)] [mask-image:linear-gradient(to_bottom,transparent_0%,black_22%,black_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_22%,black_100%)]"
      >
        <footer
          className="fixed bottom-0 left-0 flex h-[100svh] w-full flex-col justify-between overflow-hidden bg-background font-sans text-foreground antialiased"
          style={footerThemeStyle}
        >
          <div aria-hidden="true" className="absolute inset-0 z-0 bg-background">
            <ShapeGrid
              borderColor="oklch(0.72 0 0 / 0.42)"
              className="opacity-100"
              direction="down"
              hoverFillColor="oklch(0.28 0 0 / 0.36)"
              hoverTrailAmount={0}
              shape="square"
              speed={0.5}
              squareSize={40}
            />
          </div>
          <div
            className={cn(
              "pointer-events-none absolute top-1/2 left-1/2 z-0 h-[62vh] w-[82vw] -translate-x-1/2 -translate-y-1/2 animate-[footer-breathe_8s_ease-in-out_infinite_alternate] rounded-[50%] blur-[82px]",
              footerAuroraClassName,
            )}
          />
          <div className={cn("pointer-events-none absolute inset-0 z-0", footerFogClassName)} />

          <div
            ref={giantTextRef}
            className={cn(
              "pointer-events-none absolute -bottom-[4vh] left-1/2 z-0 -translate-x-1/2 select-none whitespace-nowrap",
              giantTextClassName,
            )}
          >
            SMILE
          </div>

          <div className="relative z-10 mx-auto mt-20 flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6">
            <div ref={headingRef} className="mb-9">
              <BlurText
                animateBy="words"
                as="h2"
                className={cn(
                  "justify-center text-center text-[clamp(2.7rem,9vw,6.2rem)] leading-[0.95] font-black tracking-normal",
                )}
                delay={150}
                direction="top"
                replayKey={headingTextReplayKey}
                rootMargin="0px 0px -12% 0px"
                segmentClassName={textGlowClassName}
                startAnimation={isHeadingTextVisible}
                stepDuration={0.35}
                text="ML should be fun!"
                threshold={0.2}
              />
            </div>

            <div ref={linksRef} className="flex w-full flex-col items-center gap-5">
              <div className="flex w-full flex-wrap justify-center gap-4">
                <FooterGlassButton
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
                </FooterGlassButton>

                <FooterGlassButton
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
                </FooterGlassButton>
              </div>

              <div className="mt-1 flex w-full flex-wrap justify-center gap-3 md:gap-5">
                <FooterGlassButton
                  as="a"
                  className={cn(
                    "rounded-full px-6 py-3 text-xs font-semibold text-foreground md:text-sm",
                    glassPillClassName,
                  )}
                  data-app-link
                  href="/"
                >
                  Home
                </FooterGlassButton>
                <FooterGlassButton
                  as="a"
                  className={cn(
                    "rounded-full px-6 py-3 text-xs font-semibold text-foreground md:text-sm",
                    glassPillClassName,
                  )}
                  href="#support"
                >
                  Support
                </FooterGlassButton>
                <FooterGlassButton
                  as="a"
                  className={cn(
                    "rounded-full px-6 py-3 text-xs font-semibold text-foreground md:text-sm",
                    glassPillClassName,
                  )}
                  href="#about"
                >
                  About us
                </FooterGlassButton>
              </div>
            </div>
          </div>

          <div className="relative z-20 flex w-full flex-col items-center justify-between gap-5 px-6 pb-6 md:flex-row md:px-12">
            <div className="order-2 text-[10px] font-semibold text-muted-foreground uppercase md:order-1 md:text-xs">
              © 2026 Smile Project. All rights reserved.
            </div>

            <FooterGlassButton
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
            </FooterGlassButton>
          </div>
        </footer>
      </div>
    </>
  );
}
