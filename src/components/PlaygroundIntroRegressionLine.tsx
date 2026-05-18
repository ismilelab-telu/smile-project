import type { SVGProps } from "react";

export function PlaygroundIntroRegressionLine(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 170 95" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M-4 104 C34 88 79 62 132 36"
        data-playground-regression-line
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
