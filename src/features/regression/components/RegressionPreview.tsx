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
      gsap.from(".plot-point", {
        autoAlpha: 0,
        y: 10,
        scale: 0.85,
        stagger: 0.04,
        duration: 0.5,
        ease: "back.out(1.6)",
      });

      gsap.from(".trend-line", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 0.8,
        ease: "power3.out",
      });
    },
    { scope: containerRef },
  );

  return (
    <div className="plot-panel" ref={containerRef} aria-label="Regression plot preview">
      <div className="plot-surface">
        <div className="axis axis-x" />
        <div className="axis axis-y" />
        <div className="trend-line" />
        {predictions.map((point) => (
          <span
            className="plot-point"
            key={`${point.x}-${point.y}`}
            style={{
              left: `${10 + point.x * 8}%`,
              bottom: `${14 + point.y * 6}%`,
            }}
            title={`x ${point.x}, y ${point.y}, prediction ${point.predictedY.toFixed(2)}`}
          />
        ))}
      </div>

      <dl className="model-stats">
        <div>
          <dt>Slope</dt>
          <dd>{model.slope.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Intercept</dt>
          <dd>{model.intercept.toFixed(2)}</dd>
        </div>
      </dl>
    </div>
  );
}
