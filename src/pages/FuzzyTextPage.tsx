import { ArrowLeftIcon } from "@heroicons/react/24/outline";

import { FuzzyText } from "@/components/ui/fuzzy-text";

const notFoundText = "404 not found.";

export function FuzzyTextPage() {
  return (
    <main className="relative flex min-h-screen overflow-hidden bg-zinc-50 text-black">
      <section className="relative z-10 mx-auto flex min-h-screen w-[min(1120px,calc(100%_-_32px))] flex-col items-center justify-center gap-5 px-4 py-24 text-center">
        <h1 className="sr-only">{notFoundText}</h1>
        <FuzzyText
          baseIntensity={0.14}
          className="max-w-full"
          clickEffect
          color="oklch(17.7638% 0 0)"
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
          color="oklch(17.7638% 0 0)"
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

        <a
          className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-foreground transition-opacity hover:opacity-70"
          data-app-link
          href="/"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-[18px] shrink-0" />
          Home
        </a>
      </section>
    </main>
  );
}
