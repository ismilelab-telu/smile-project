"use client";

import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from "react";

type CurvedLoopProps = {
  className?: string;
  curveAmount?: number;
  direction?: "left" | "right";
  interactive?: boolean;
  marqueeText?: string;
  speed?: number;
};

const wrapOffset = (offset: number, spacing: number) => {
  if (!spacing) {
    return offset;
  }

  let nextOffset = offset;
  if (nextOffset <= -spacing) {
    nextOffset += spacing;
  }
  if (nextOffset > 0) {
    nextOffset -= spacing;
  }
  return nextOffset;
};

const getSvgTextLength = (element: SVGTextElement, text: string) => {
  if (typeof element.getComputedTextLength === "function") {
    return element.getComputedTextLength();
  }

  return Math.max(text.length * 32, 1);
};

export function CurvedLoop({
  className,
  curveAmount = 400,
  direction = "left",
  interactive = true,
  marqueeText = "",
  speed = 2,
}: CurvedLoopProps) {
  const text = useMemo(() => {
    const hasTrailing = /\s|\u00A0$/.test(marqueeText);
    return `${hasTrailing ? marqueeText.replace(/\s+$/, "") : marqueeText}\u00A0`;
  }, [marqueeText]);

  const measureRef = useRef<SVGTextElement | null>(null);
  const textPathRef = useRef<SVGTextPathElement | null>(null);
  const dragRef = useRef(false);
  const lastXRef = useRef(0);
  const dirRef = useRef(direction);
  const velRef = useRef(0);
  const offsetRef = useRef(0);

  const [spacing, setSpacing] = useState(0);
  const [initialOffset, setInitialOffset] = useState(0);

  const uid = useId().replace(/:/g, "-");
  const pathId = `curve-${uid}`;
  const pathD = `M-100,40 Q500,${40 + curveAmount} 1540,40`;
  const ready = spacing > 0;

  const totalText = useMemo(() => {
    if (!spacing) {
      return text;
    }

    return Array(Math.ceil(1800 / spacing) + 2)
      .fill(text)
      .join("");
  }, [spacing, text]);

  useEffect(() => {
    dirRef.current = direction;
  }, [direction]);

  useEffect(() => {
    const measureText = () => {
      if (measureRef.current) {
        setSpacing(getSvgTextLength(measureRef.current, text));
      }
    };

    measureText();
    window.addEventListener("resize", measureText);

    if ("fonts" in document) {
      void document.fonts.ready.then(measureText);
    }

    return () => window.removeEventListener("resize", measureText);
  }, [text, className]);

  useEffect(() => {
    if (!spacing || !textPathRef.current) {
      return;
    }

    const offset = -spacing;
    offsetRef.current = offset;
    textPathRef.current.setAttribute("startOffset", `${offset}px`);
    setInitialOffset(offset);
  }, [spacing]);

  useEffect(() => {
    if (!spacing || !ready) {
      return;
    }

    let frame = 0;
    const step = () => {
      if (!dragRef.current && textPathRef.current) {
        const delta = dirRef.current === "right" ? speed : -speed;
        const newOffset = wrapOffset(offsetRef.current + delta, spacing);
        offsetRef.current = newOffset;
        textPathRef.current.setAttribute("startOffset", `${newOffset}px`);
      }

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [spacing, speed, ready]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive) {
      return;
    }

    dragRef.current = true;
    lastXRef.current = event.clientX;
    velRef.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive || !dragRef.current || !textPathRef.current) {
      return;
    }

    const dx = event.clientX - lastXRef.current;
    lastXRef.current = event.clientX;
    velRef.current = dx;

    const newOffset = wrapOffset(offsetRef.current + dx, spacing);
    offsetRef.current = newOffset;
    textPathRef.current.setAttribute("startOffset", `${newOffset}px`);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragRef.current = false;
    dirRef.current = velRef.current > 0 ? "right" : "left";
  };

  const cursorStyle = interactive ? (dragRef.current ? "grabbing" : "grab") : "auto";

  return (
    <div
      aria-label={marqueeText}
      className="flex w-full items-center justify-center overflow-visible"
      role="img"
      style={{ cursor: cursorStyle, visibility: ready ? "visible" : "hidden" }}
      onPointerDown={onPointerDown}
      onPointerLeave={endDrag}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
    >
      <svg
        aria-hidden="true"
        className="block aspect-[100/12] w-full select-none overflow-visible text-[clamp(1.75rem,5.5vw,5.75rem)] leading-none font-black tracking-normal"
        viewBox="0 0 1440 120"
      >
        <text
          ref={measureRef}
          style={{ opacity: 0, pointerEvents: "none", visibility: "hidden" }}
          xmlSpace="preserve"
        >
          {text}
        </text>
        <defs>
          <path id={pathId} d={pathD} fill="none" stroke="transparent" />
        </defs>
        {ready ? (
          <text className={`fill-foreground ${className ?? ""}`} xmlSpace="preserve">
            <textPath ref={textPathRef} href={`#${pathId}`} startOffset={`${initialOffset}px`}>
              {totalText}
            </textPath>
          </text>
        ) : null}
      </svg>
    </div>
  );
}
