import type { SVGProps } from "react";

export function PlaygroundIntroAxes(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 170 95" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      >
        <path data-playground-axis-x-line d="M-12 116 H166" />
        <path data-playground-axis-x-arrow d="M161 111 L166 116 L161 121" />
        <path data-playground-axis-y-line d="M-12 116 V-8" />
        <path data-playground-axis-y-arrow d="M-17 -3 L-12 -8 L-7 -3" />
      </g>
    </svg>
  );
}
