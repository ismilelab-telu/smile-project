import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import {
  fitSimpleLinearRegression,
  sampleRegressionPoints,
} from "../simple-linear/simpleLinearRegression";

gsap.registerPlugin(useGSAP);

export function RegressionPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const model = fitSimpleLinearRegression(sampleRegressionPoints);
  const predictions = sampleRegressionPoints.map((point) => ({
    ...point,
    predictedY: model.predict(point.x),
  }));

  useGSAP(
    () => {
      gsap.from("[data-plot-point]", {
        autoAlpha: 0,
        y: 10,
        scale: 0.85,
        stagger: 0.04,
        duration: 0.5,
        ease: "back.out(1.6)",
      });

      gsap.from("[data-trend-line]", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 0.8,
        ease: "power3.out",
      });
    },
    { scope: containerRef },
  );

  return (
    <div className="grid w-full gap-[18px]" ref={containerRef} aria-label="Regression plot preview">
      <div className="relative aspect-[1.2] w-full overflow-hidden rounded-xl border border-foreground/[0.14] bg-[length:44px_44px] shadow-[0_22px_56px_oklch(0%_0_0_/_12%)] [background:linear-gradient(color-mix(in_oklch,var(--foreground)_6%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklch,var(--foreground)_6%,transparent)_1px,transparent_1px),color-mix(in_oklch,var(--surface)_82%,transparent)]">
        <div className="absolute right-[8%] bottom-[12%] left-[8%] h-px bg-foreground/45" />
        <div className="absolute top-[8%] bottom-[12%] left-[8%] w-px bg-foreground/45" />
        <div
          className="absolute right-[10%] bottom-[24%] left-[10%] h-[3px] rotate-[-30deg] rounded-full bg-foreground shadow-[0_8px_20px_oklch(0%_0_0_/_22%)]"
          data-trend-line
        />
        {predictions.map((point) => (
          <span
            className="absolute h-3.5 w-3.5 -translate-x-1/2 translate-y-1/2 rounded-full border-[3px] border-background bg-plot-point shadow-[0_8px_18px_oklch(0%_0_0_/_24%)]"
            data-plot-point
            key={`${point.x}-${point.y}`}
            style={{
              left: `${10 + point.x * 8}%`,
              bottom: `${14 + point.y * 6}%`,
            }}
            title={`x ${point.x}, y ${point.y}, prediction ${point.predictedY.toFixed(2)}`}
          />
        ))}
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-surface/80 px-4 py-3.5">
          <dt className="mb-1 text-[0.78rem] font-bold text-plot-point uppercase">Slope</dt>
          <dd className="text-[1.55rem] font-extrabold text-foreground">
            {model.slope.toFixed(2)}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-surface/80 px-4 py-3.5">
          <dt className="mb-1 text-[0.78rem] font-bold text-plot-point uppercase">Intercept</dt>
          <dd className="text-[1.55rem] font-extrabold text-foreground">
            {model.intercept.toFixed(2)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
