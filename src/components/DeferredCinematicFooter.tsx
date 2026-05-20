import { lazy, Suspense, useEffect, useRef, useState } from "react";

const CinematicFooter = lazy(() =>
  import("@/components/ui/motion-footer").then((module) => ({ default: module.CinematicFooter })),
);

export function DeferredCinematicFooter() {
  const placeholderRef = useRef<HTMLDivElement>(null);
  const [shouldLoadFooter, setShouldLoadFooter] = useState(false);

  useEffect(() => {
    if (shouldLoadFooter) {
      return;
    }

    const placeholder = placeholderRef.current;

    if (!placeholder || typeof IntersectionObserver === "undefined") {
      setShouldLoadFooter(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadFooter(true);
          observer.disconnect();
        }
      },
      { rootMargin: "1600px 0px" },
    );

    observer.observe(placeholder);

    return () => observer.disconnect();
  }, [shouldLoadFooter]);

  if (shouldLoadFooter) {
    return (
      <Suspense
        fallback={
          <div
            className="relative h-[100svh] w-full bg-background"
            data-navigation-menu-hide-zone
          />
        }
      >
        <CinematicFooter />
      </Suspense>
    );
  }

  return (
    <div
      className="relative h-[100svh] w-full bg-background"
      data-navigation-menu-hide-zone
      ref={placeholderRef}
    />
  );
}
