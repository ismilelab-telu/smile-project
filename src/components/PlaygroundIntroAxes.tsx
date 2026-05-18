import type { SVGProps } from "react";

export function PlaygroundIntroAxes(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 170 95" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      >
        <path data-playground-axis-x-line d="M-12 92 H166" />
        <path data-playground-axis-x-arrow d="M158 84 L166 92 L158 100" />
        <path data-playground-axis-y-line d="M-12 92 V-8" />
        <path data-playground-axis-y-arrow d="M-20 0 L-12 -8 L-4 0" />
      </g>
    </svg>
  );
}
