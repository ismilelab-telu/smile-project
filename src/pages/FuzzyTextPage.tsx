import { ArrowLeftIcon } from "@heroicons/react/24/outline";

import { FuzzyText } from "@/components/ui/fuzzy-text";
import { LiquidLink } from "@/components/ui/liquid-button";

const notFoundText = "404 not found.";
const explorePlaceholderRoutes = new Set(["/playground", "/algorithm-lab"]);
const liquidButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-neutral-50 backdrop-blur-xl shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.16),0_12px_32px_oklch(0%_0_0_/_0.22)] [--liquid-button-background-color:oklch(100%_0_0_/_0.08)] [--liquid-button-color:var(--color-emerald-500)]";

type FuzzyTextPageProps = {
  path?: string;
};

export function FuzzyTextPage({ path = "/" }: FuzzyTextPageProps) {
  const backLink = explorePlaceholderRoutes.has(path)
    ? { href: "/explore", label: "Explore" }
    : { href: "/", label: "Home" };

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-background text-foreground">
      <section className="relative z-10 mx-auto flex min-h-screen w-[min(1120px,calc(100%_-_32px))] flex-col items-center justify-center gap-5 px-4 py-24 text-center">
        <h1 className="sr-only">{notFoundText}</h1>
        <FuzzyText
          baseIntensity={0.14}
          className="max-w-full"
          clickEffect
          color="oklch(96.5% 0 0)"
          direction="horizontal"
          fontSize="clamp(5rem, 18vw, 14rem)"
          fontWeight={900}
          fuzzRange={24}
          glitchDuration={160}
          glitchInterval={2600}
          glitchMode
          hoverIntensity={0.46}
          transitionDuration={10}
        >
          404
        </FuzzyText>
        <FuzzyText
          baseIntensity={0.16}
          className="max-w-full"
          clickEffect
          color="oklch(96.5% 0 0)"
          direction="horizontal"
          fontSize="clamp(2rem, 7vw, 5rem)"
          fontWeight={900}
          fuzzRange={22}
          glitchDuration={160}
          glitchInterval={2300}
          glitchMode
          hoverIntensity={0.5}
          transitionDuration={10}
        >
          not found.
        </FuzzyText>

        <LiquidLink className={`${liquidButtonClassName} mt-5`} data-app-link href={backLink.href}>
          <ArrowLeftIcon aria-hidden="true" className="size-[18px] shrink-0" />
          {backLink.label}
        </LiquidLink>
      </section>
    </main>
  );
}
