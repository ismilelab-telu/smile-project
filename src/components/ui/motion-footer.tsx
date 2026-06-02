"use client";

import { type CSSProperties, type ElementType, type HTMLAttributes } from "react";
import {
  CodeBracketIcon,
  HomeIcon,
  InformationCircleIcon,
  LifebuoyIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

import ShapeGrid from "@/components/ShapeGrid";
import { CurvedLoop } from "@/components/ui/curved-loop";
import { shouldReduceMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

const footerAuroraClassName =
  "bg-[radial-gradient(circle_at_50%_50%,oklch(1_0_0_/_0.78)_0%,oklch(0.985_0_0_/_0.46)_42%,transparent_70%)]";

const footerFogClassName =
  "bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_48%,oklch(0.985_0_0_/_72%)_100%),linear-gradient(to_bottom,oklch(0.985_0_0_/_88%)_0%,transparent_11%,transparent_76%,oklch(0.985_0_0_/_92%)_100%)]";

const giantTextClassName =
  "bg-[linear-gradient(180deg,color-mix(in_oklch,var(--foreground)_12%,transparent)_0%,transparent_62%)] bg-clip-text text-[clamp(8rem,min(24vw,34svh),24rem)] leading-[0.75] font-black tracking-normal text-transparent [-webkit-text-stroke:1px_color-mix(in_oklch,var(--foreground)_7%,transparent)]";

const textGlowClassName =
  "bg-[linear-gradient(180deg,var(--foreground)_0%,color-mix(in_oklch,var(--foreground)_46%,transparent)_100%)] bg-clip-text [-webkit-text-fill-color:transparent] drop-shadow-[0_0_20px_color-mix(in_oklch,var(--foreground)_14%,transparent)]";

const footerTextButtonClassName =
  "inline-flex cursor-pointer items-center justify-center gap-2.5 bg-transparent p-0 text-foreground underline-offset-[0.45em] transition-colors duration-300 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950";

const footerHeadingText = "ML should be fun!";
const footerCurvedLoopText = "Predicting the future isn't magic, it's artificial intelligence.";

type FooterThemeStyle = CSSProperties & Record<`--${string}`, string>;

const footerThemeStyle: FooterThemeStyle = {
  "--background": "oklch(0.985 0 0)",
  "--foreground": "oklch(0.145 0 0)",
  "--muted-foreground": "oklch(0.42 0 0)",
  "--surface": "oklch(1 0 0)",
};

type FooterTextButtonProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  href?: string;
  type?: "button" | "submit" | "reset";
};

const FooterTextButton = ({
  as: Component = "button",
  "aria-hidden": ariaHidden,
  children,
  className,
  style,
  ...props
}: FooterTextButtonProps) => {
  return (
    <Component
      aria-hidden={ariaHidden}
      className={cn(footerTextButtonClassName, className)}
      style={{
        appearance: "none",
        background: "transparent",
        border: 0,
        outline: "none",
        ...style,
      }}
      {...props}
    >
      {children}
    </Component>
  );
};

export function CinematicFooter() {
  const scrollToTop = () => {
    window.scrollTo({
      behavior: shouldReduceMotion() ? "auto" : "smooth",
      top: 0,
    });
  };

  return (
    <>
      <div
        data-navigation-menu-hide-zone
        className="relative h-svh w-full [clip-path:polygon(0%_0,100%_0%,100%_100%,0_100%)] mask-[linear-gradient(to_bottom,transparent_0%,black_14%,black_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_14%,black_100%)]"
      >
        <footer
          className="fixed bottom-0 left-0 flex h-svh w-full flex-col justify-between overflow-hidden bg-background font-sans text-foreground antialiased"
          style={footerThemeStyle}
        >
          <div aria-hidden="true" className="absolute inset-0 z-0 bg-background">
            <ShapeGrid
              borderColor="oklch(0.72 0 0 / 0.42)"
              className="opacity-100"
              disableHover
              direction="down"
              hoverFillColor="oklch(0.28 0 0 / 0.36)"
              hoverTrailAmount={0}
              persistenceKey="footer-shape-grid"
              shape="square"
              speed={0.5}
              squareSize={40}
            />
          </div>
          <div
            className={cn(
              "pointer-events-none absolute top-1/2 left-1/2 z-0 h-[62vh] w-[82vw] -translate-x-1/2 -translate-y-1/2 rounded-[50%] blur-[82px]",
              footerAuroraClassName,
            )}
          />
          <div className={cn("pointer-events-none absolute inset-0 z-0", footerFogClassName)} />

          <div className="pointer-events-none absolute inset-x-0 -top-6 z-10 opacity-55">
            <CurvedLoop
              className="fill-neutral-500"
              curveAmount={160}
              direction="left"
              interactive={false}
              marqueeText={footerCurvedLoopText}
              speed={2}
            />
          </div>

          <div
            className={cn(
              "pointer-events-none absolute bottom-[-4vh] left-1/2 z-0 -translate-x-1/2 select-none whitespace-nowrap",
              giantTextClassName,
            )}
          >
            SMILE
          </div>

          <div className="relative z-10 mx-auto mt-20 flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 min-[2400px]:max-w-7xl">
            <div className="mb-9">
              <h2
                className={cn(
                  "justify-center text-center text-[clamp(2.7rem,min(9vw,11svh),6.2rem)] leading-[0.95] font-black tracking-normal whitespace-nowrap min-[2400px]:text-[7.1rem]",
                  textGlowClassName,
                )}
              >
                {footerHeadingText}
              </h2>
            </div>

            <div className="flex w-full flex-col items-center gap-5 min-[2400px]:gap-8">
              <div className="flex w-full flex-wrap justify-center gap-x-14 gap-y-5 md:gap-x-20 min-[2400px]:gap-x-32">
                <FooterTextButton
                  as="a"
                  className="text-sm font-bold md:text-base min-[2400px]:text-2xl"
                  data-app-link
                  href="/follow-us"
                >
                  <UsersIcon
                    aria-hidden="true"
                    className="size-5 shrink-0 min-[2400px]:size-7"
                    strokeWidth={2.5}
                  />
                  Follow us
                </FooterTextButton>

                <FooterTextButton
                  as="a"
                  className="text-sm font-bold md:text-base min-[2400px]:text-2xl"
                  data-app-link
                  href="/contributing"
                >
                  <CodeBracketIcon
                    aria-hidden="true"
                    className="size-5 shrink-0 min-[2400px]:size-7"
                    strokeWidth={2.5}
                  />
                  Contributing
                </FooterTextButton>
              </div>

              <div className="mt-2 flex w-full flex-wrap justify-center gap-x-10 gap-y-4 md:gap-x-14 min-[2400px]:mt-3 min-[2400px]:gap-x-24 min-[2400px]:gap-y-6">
                <FooterTextButton
                  as="button"
                  className="text-xs font-semibold md:text-sm min-[2400px]:text-xl"
                  onClick={scrollToTop}
                  type="button"
                >
                  <HomeIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 min-[2400px]:size-6"
                    strokeWidth={2.5}
                  />
                  Home
                </FooterTextButton>
                <FooterTextButton
                  as="a"
                  className="text-xs font-semibold md:text-sm min-[2400px]:text-xl"
                  data-app-link
                  href="/support"
                >
                  <LifebuoyIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 min-[2400px]:size-6"
                    strokeWidth={2.5}
                  />
                  Support
                </FooterTextButton>
                <FooterTextButton
                  as="a"
                  className="text-xs font-semibold md:text-sm min-[2400px]:text-xl"
                  data-app-link
                  href="/about"
                >
                  <InformationCircleIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 min-[2400px]:size-6"
                    strokeWidth={2.5}
                  />
                  About us
                </FooterTextButton>
              </div>
            </div>
          </div>

          <div className="relative z-20 flex w-full flex-col items-center justify-between gap-5 px-6 pb-6 md:flex-row md:px-12">
            <div className="order-2 text-[10px] font-semibold text-muted-foreground uppercase md:order-1 md:text-xs">
              © 2026 Smile Project. All rights reserved.
            </div>
          </div>
        </footer>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-[-5svh] z-20 h-[16svh] bg-linear-to-b from-background via-background/95 to-transparent"
        />
      </div>
    </>
  );
}
