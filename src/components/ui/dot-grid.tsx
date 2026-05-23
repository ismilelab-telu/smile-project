"use client";

import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from "react";
import gsap from "gsap";
import { InertiaPlugin } from "gsap/InertiaPlugin";

import { shouldReduceMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

import "./dot-grid.css";

gsap.registerPlugin(InertiaPlugin);

type Dot = {
  _inertiaApplied: boolean;
  cx: number;
  cy: number;
  xOffset: number;
  yOffset: number;
};

type PointerState = {
  hasMoved: boolean;
  lastTime: number;
  lastX: number;
  lastY: number;
  speed: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

type DotGridProps = {
  activeColor?: string;
  baseColor?: string;
  className?: string;
  dotSize?: number;
  gap?: number;
  maxSpeed?: number;
  proximity?: number;
  resistance?: number;
  returnDuration?: number;
  shockRadius?: number;
  shockStrength?: number;
  speedTrigger?: number;
  style?: CSSProperties;
};

type RgbColor = {
  b: number;
  g: number;
  r: number;
};

function throttle<TArgs extends unknown[]>(func: (...args: TArgs) => void, limit: number) {
  let lastCall = 0;

  return (...args: TArgs) => {
    const now = performance.now();

    if (now - lastCall < limit) {
      return;
    }

    lastCall = now;
    func(...args);
  };
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function linearToSrgb(value: number) {
  if (value <= 0.0031308) {
    return value * 12.92;
  }

  return 1.055 * value ** (1 / 2.4) - 0.055;
}

function oklchToRgb(lightness: number, chroma: number, hue: number): RgbColor {
  const hueRadians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(hueRadians);
  const b = chroma * Math.sin(hueRadians);

  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = lightness - 0.0894841775 * a - 1.291485548 * b;

  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;

  return {
    b: Math.round(
      clamp01(linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)) * 255,
    ),
    g: Math.round(
      clamp01(linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)) * 255,
    ),
    r: Math.round(
      clamp01(linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)) * 255,
    ),
  };
}

function colorToRgb(color: string): RgbColor {
  const hexMatch = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);

  if (hexMatch) {
    return {
      b: parseInt(hexMatch[3], 16),
      g: parseInt(hexMatch[2], 16),
      r: parseInt(hexMatch[1], 16),
    };
  }

  const oklchMatch = color.match(
    /^oklch\(\s*([.\d]+)%?\s+([.\d]+)\s+([.\d]+)(?:deg)?(?:\s*\/\s*[.\d]+%?)?\s*\)$/i,
  );

  if (oklchMatch) {
    const lightness = color.includes(`${oklchMatch[1]}%`)
      ? parseFloat(oklchMatch[1]) / 100
      : parseFloat(oklchMatch[1]);

    return oklchToRgb(lightness, parseFloat(oklchMatch[2]), parseFloat(oklchMatch[3]));
  }

  return { b: 0, g: 0, r: 0 };
}

function rgbToCss({ b, g, r }: RgbColor) {
  return `rgb(${r},${g},${b})`;
}

export default function DotGrid({
  dotSize = 16,
  gap = 32,
  baseColor = "oklch(49.1% 0.27 278.8)",
  activeColor = "oklch(49.1% 0.27 278.8)",
  proximity = 150,
  speedTrigger = 100,
  shockRadius = 250,
  shockStrength = 5,
  maxSpeed = 5000,
  resistance = 750,
  returnDuration = 1.5,
  className,
  style,
}: DotGridProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotsRef = useRef<Dot[]>([]);
  const pointerRef = useRef<PointerState>({
    hasMoved: false,
    lastTime: 0,
    lastX: 0,
    lastY: 0,
    speed: 0,
    vx: 0,
    vy: 0,
    x: Number.NEGATIVE_INFINITY,
    y: Number.NEGATIVE_INFINITY,
  });

  const baseRgb = useMemo(() => colorToRgb(baseColor), [baseColor]);
  const activeRgb = useMemo(() => colorToRgb(activeColor), [activeColor]);
  const baseFillStyle = useMemo(() => rgbToCss(baseRgb), [baseRgb]);

  const circlePath = useMemo(() => {
    if (typeof window === "undefined" || !window.Path2D) {
      return null;
    }

    const path = new window.Path2D();
    path.arc(0, 0, dotSize / 2, 0, Math.PI * 2);
    return path;
  }, [dotSize]);

  const buildGrid = useCallback(() => {
    const wrap = wrapperRef.current;
    const canvas = canvasRef.current;

    if (!wrap || !canvas) {
      return;
    }

    for (const dot of dotsRef.current) {
      gsap.killTweensOf(dot);
    }

    if (typeof window === "undefined" || !window.Path2D) {
      dotsRef.current = [];
      return;
    }

    const { height, width } = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cell = dotSize + gap;
    const cols = Math.floor((width + gap) / cell);
    const rows = Math.floor((height + gap) / cell);
    const gridW = cell * cols - gap;
    const gridH = cell * rows - gap;
    const startX = (width - gridW) / 2 + dotSize / 2;
    const startY = (height - gridH) / 2 + dotSize / 2;
    const dots: Dot[] = [];

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        dots.push({
          _inertiaApplied: false,
          cx: startX + x * cell,
          cy: startY + y * cell,
          xOffset: 0,
          yOffset: 0,
        });
      }
    }

    dotsRef.current = dots;
  }, [dotSize, gap]);

  useEffect(() => {
    buildGrid();

    let resizeObserver: ResizeObserver | null = null;

    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(buildGrid);

      if (wrapperRef.current) {
        resizeObserver.observe(wrapperRef.current);
      }
    } else {
      window.addEventListener("resize", buildGrid);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener("resize", buildGrid);
      }

      for (const dot of dotsRef.current) {
        gsap.killTweensOf(dot);
      }
    };
  }, [buildGrid]);

  useEffect(() => {
    if (!circlePath) {
      return;
    }

    let rafId = 0;
    const proxSq = proximity * proximity;

    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");

      if (!canvas || !ctx) {
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const { x: px, y: py } = pointerRef.current;

      for (const dot of dotsRef.current) {
        const ox = dot.cx + dot.xOffset;
        const oy = dot.cy + dot.yOffset;
        const dx = dot.cx - px;
        const dy = dot.cy - py;
        const dsq = dx * dx + dy * dy;
        let fillStyle = baseFillStyle;

        if (dsq <= proxSq) {
          const dist = Math.sqrt(dsq);
          const t = 1 - dist / proximity;
          const r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t);
          const g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t);
          const b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t);
          fillStyle = `rgb(${r},${g},${b})`;
        }

        ctx.save();
        ctx.translate(ox, oy);
        ctx.fillStyle = fillStyle;
        ctx.fill(circlePath);
        ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [activeRgb, baseColor, baseRgb, circlePath, proximity]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.Path2D) {
      return;
    }

    const reduceMotion = shouldReduceMotion();

    const onMove = (event: MouseEvent) => {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      const now = performance.now();
      const pointer = pointerRef.current;
      const rect = canvas.getBoundingClientRect();

      if (!pointer.hasMoved) {
        pointer.hasMoved = true;
        pointer.lastTime = now;
        pointer.lastX = event.clientX;
        pointer.lastY = event.clientY;
        pointer.x = event.clientX - rect.left;
        pointer.y = event.clientY - rect.top;
        return;
      }

      const dt = pointer.lastTime ? now - pointer.lastTime : 16;
      const dx = event.clientX - pointer.lastX;
      const dy = event.clientY - pointer.lastY;
      let vx = (dx / dt) * 1000;
      let vy = (dy / dt) * 1000;
      let speed = Math.hypot(vx, vy);

      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        vx *= scale;
        vy *= scale;
        speed = maxSpeed;
      }

      pointer.lastTime = now;
      pointer.lastX = event.clientX;
      pointer.lastY = event.clientY;
      pointer.vx = vx;
      pointer.vy = vy;
      pointer.speed = speed;
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;

      if (reduceMotion) {
        return;
      }

      for (const dot of dotsRef.current) {
        const dist = Math.hypot(dot.cx - pointer.x, dot.cy - pointer.y);

        if (speed <= speedTrigger || dist >= proximity || dot._inertiaApplied) {
          continue;
        }

        dot._inertiaApplied = true;
        gsap.killTweensOf(dot);

        const pushX = dot.cx - pointer.x + vx * 0.005;
        const pushY = dot.cy - pointer.y + vy * 0.005;

        gsap.to(dot, {
          inertia: { resistance, xOffset: pushX, yOffset: pushY },
          onComplete: () => {
            gsap.to(dot, {
              duration: returnDuration,
              ease: "elastic.out(1,0.75)",
              xOffset: 0,
              yOffset: 0,
            });
            dot._inertiaApplied = false;
          },
        });
      }
    };

    const onClick = (event: MouseEvent) => {
      const canvas = canvasRef.current;

      if (!canvas || reduceMotion) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const cx = event.clientX - rect.left;
      const cy = event.clientY - rect.top;

      for (const dot of dotsRef.current) {
        const dist = Math.hypot(dot.cx - cx, dot.cy - cy);

        if (dist >= shockRadius || dot._inertiaApplied) {
          continue;
        }

        dot._inertiaApplied = true;
        gsap.killTweensOf(dot);

        const falloff = Math.max(0, 1 - dist / shockRadius);
        const pushX = (dot.cx - cx) * shockStrength * falloff;
        const pushY = (dot.cy - cy) * shockStrength * falloff;

        gsap.to(dot, {
          inertia: { resistance, xOffset: pushX, yOffset: pushY },
          onComplete: () => {
            gsap.to(dot, {
              duration: returnDuration,
              ease: "elastic.out(1,0.75)",
              xOffset: 0,
              yOffset: 0,
            });
            dot._inertiaApplied = false;
          },
        });
      }
    };

    const throttledMove = throttle(onMove, 50);

    window.addEventListener("mousemove", throttledMove, { passive: true });
    window.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("mousemove", throttledMove);
      window.removeEventListener("click", onClick);
    };
  }, [maxSpeed, proximity, resistance, returnDuration, shockRadius, shockStrength, speedTrigger]);

  return (
    <section aria-hidden="true" className={cn("dot-grid", className)} style={style}>
      <div ref={wrapperRef} className="dot-grid__wrap">
        <canvas ref={canvasRef} className="dot-grid__canvas" />
      </div>
    </section>
  );
}
