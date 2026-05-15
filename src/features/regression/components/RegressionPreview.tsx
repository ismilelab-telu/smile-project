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
      <div className="relative aspect-[1.2] w-full overflow-hidden rounded-2xl border border-[rgba(23,32,25,0.12)] bg-[length:44px_44px] shadow-[0_22px_56px_rgba(34,40,37,0.12)] [background:linear-gradient(rgba(23,32,25,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(23,32,25,0.06)_1px,transparent_1px),rgba(255,255,255,0.72)]">
        <div className="absolute right-[8%] bottom-[12%] left-[8%] h-px bg-[rgba(23,32,25,0.4)]" />
        <div className="absolute top-[8%] bottom-[12%] left-[8%] w-px bg-[rgba(23,32,25,0.4)]" />
        <div
          className="absolute right-[10%] bottom-[24%] left-[10%] h-[3px] rotate-[-30deg] rounded-full bg-[#e26750] shadow-[0_8px_20px_rgba(226,103,80,0.26)]"
          data-trend-line
        />
        {predictions.map((point) => (
          <span
            className="absolute h-3.5 w-3.5 -translate-x-1/2 translate-y-1/2 rounded-full border-[3px] border-[#f7f4ed] bg-[#2b746c] shadow-[0_8px_18px_rgba(43,116,108,0.28)]"
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

      <dl className="m-0 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[rgba(23,32,25,0.1)] bg-white/65 px-4 py-3.5">
          <dt className="mt-0 mb-1 text-[0.78rem] font-bold text-[#647169] uppercase">Slope</dt>
          <dd className="m-0 text-[1.55rem] font-extrabold text-[#172019]">
            {model.slope.toFixed(2)}
          </dd>
        </div>
        <div className="rounded-2xl border border-[rgba(23,32,25,0.1)] bg-white/65 px-4 py-3.5">
          <dt className="mt-0 mb-1 text-[0.78rem] font-bold text-[#647169] uppercase">Intercept</dt>
          <dd className="m-0 text-[1.55rem] font-extrabold text-[#172019]">
            {model.intercept.toFixed(2)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
