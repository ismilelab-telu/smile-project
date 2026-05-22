import { motion } from "motion/react";
import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, MouseEventHandler } from "react";

import "./variable-proximity.css";

type Falloff = "linear" | "exponential" | "gaussian";

type ContainerRef = Readonly<{
  current: HTMLElement | null;
}>;

type VariableProximityProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  className?: string;
  containerRef?: ContainerRef;
  falloff?: Falloff;
  fromFontVariationSettings?: string;
  label: string;
  onClick?: MouseEventHandler<HTMLSpanElement>;
  radius?: number;
  style?: CSSProperties;
  toFontVariationSettings?: string;
};

function useAnimationFrame(callback: () => void) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let frameId = window.requestAnimationFrame(function loop() {
      callbackRef.current();
      frameId = window.requestAnimationFrame(loop);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);
}

function useMousePositionRef(containerRef?: ContainerRef) {
  const positionRef = useRef({ x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY });

  useEffect(() => {
    const updatePosition = (x: number, y: number) => {
      const container = containerRef?.current;

      if (!container) {
        positionRef.current = { x, y };
        return;
      }

      const rect = container.getBoundingClientRect();
      positionRef.current = { x: x - rect.left, y: y - rect.top };
    };

    const handleMouseMove = (event: MouseEvent) => {
      updatePosition(event.clientX, event.clientY);
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];

      if (!touch) {
        return;
      }

      updatePosition(touch.clientX, touch.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [containerRef]);

  return positionRef;
}

const VariableProximity = forwardRef<HTMLSpanElement, VariableProximityProps>(
  (
    {
      className = "",
      containerRef,
      falloff = "linear",
      fromFontVariationSettings = "'wght' 400, 'opsz' 9",
      label,
      onClick,
      radius = 50,
      style,
      toFontVariationSettings = "'wght' 800, 'opsz' 40",
      ...restProps
    },
    ref,
  ) => {
    const interpolatedSettingsRef = useRef<string[]>([]);
    const lastPositionRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
    const letterRefs = useRef<Array<HTMLSpanElement | null>>([]);
    const mousePositionRef = useMousePositionRef(containerRef);

    const parsedSettings = useMemo(() => {
      const parseSettings = (settings: string) =>
        new Map(
          settings
            .split(",")
            .map((setting) => setting.trim())
            .filter(Boolean)
            .map((setting) => {
              const [axis, value] = setting.split(/\s+/);
              return [axis.replace(/['"]/g, ""), Number.parseFloat(value)] as const;
            }),
        );

      const fromSettings = parseSettings(fromFontVariationSettings);
      const toSettings = parseSettings(toFontVariationSettings);

      return Array.from(fromSettings.entries()).map(([axis, fromValue]) => ({
        axis,
        fromValue,
        toValue: toSettings.get(axis) ?? fromValue,
      }));
    }, [fromFontVariationSettings, toFontVariationSettings]);

    const calculateFalloff = useCallback(
      (distance: number) => {
        const normalizedDistance = Math.min(Math.max(1 - distance / radius, 0), 1);

        switch (falloff) {
          case "exponential":
            return normalizedDistance ** 2;
          case "gaussian":
            return Math.exp(-((distance / (radius / 2)) ** 2) / 2);
          case "linear":
          default:
            return normalizedDistance;
        }
      },
      [falloff, radius],
    );

    useEffect(() => {
      const letterCount = label.replaceAll(" ", "").length;
      letterRefs.current = letterRefs.current.slice(0, letterCount);
      interpolatedSettingsRef.current = interpolatedSettingsRef.current.slice(0, letterCount);
    }, [label]);

    useAnimationFrame(
      useCallback(() => {
        const container = containerRef?.current;

        if (!container) {
          return;
        }

        const { x, y } = mousePositionRef.current;

        if (lastPositionRef.current.x === x && lastPositionRef.current.y === y) {
          return;
        }

        const containerRect = container.getBoundingClientRect();
        lastPositionRef.current = { x, y };

        letterRefs.current.forEach((letterRef, index) => {
          if (!letterRef) {
            return;
          }

          const rect = letterRef.getBoundingClientRect();
          const letterCenterX = rect.left + rect.width / 2 - containerRect.left;
          const letterCenterY = rect.top + rect.height / 2 - containerRect.top;
          const distance = Math.sqrt((x - letterCenterX) ** 2 + (y - letterCenterY) ** 2);

          if (distance >= radius) {
            letterRef.style.fontVariationSettings = fromFontVariationSettings;
            return;
          }

          const falloffValue = calculateFalloff(distance);
          const newSettings = parsedSettings
            .map(({ axis, fromValue, toValue }) => {
              const interpolatedValue = fromValue + (toValue - fromValue) * falloffValue;
              return `'${axis}' ${interpolatedValue}`;
            })
            .join(", ");

          interpolatedSettingsRef.current[index] = newSettings;
          letterRef.style.fontVariationSettings = newSettings;
        });
      }, [
        calculateFalloff,
        containerRef,
        fromFontVariationSettings,
        mousePositionRef,
        parsedSettings,
        radius,
      ]),
    );

    const words = label.split(" ");
    let letterIndex = 0;

    return (
      <span
        className={`${className} variable-proximity`.trim()}
        onClick={onClick}
        ref={ref}
        style={{ display: "inline", ...style }}
        {...restProps}
      >
        {words.map((word, wordIndex) => (
          <span
            key={`${word}-${wordIndex}`}
            style={{ display: "inline-block", whiteSpace: "nowrap" }}
          >
            {word.split("").map((letter) => {
              const currentLetterIndex = letterIndex;
              letterIndex += 1;

              return (
                <motion.span
                  aria-hidden="true"
                  key={`${letter}-${currentLetterIndex}`}
                  ref={(element) => {
                    letterRefs.current[currentLetterIndex] = element;
                  }}
                  style={{
                    display: "inline-block",
                    fontVariationSettings:
                      interpolatedSettingsRef.current[currentLetterIndex] ??
                      fromFontVariationSettings,
                  }}
                >
                  {letter}
                </motion.span>
              );
            })}
            {wordIndex < words.length - 1 ? (
              <span style={{ display: "inline-block" }}>&nbsp;</span>
            ) : null}
          </span>
        ))}
        <span className="variable-proximity-sr-only">{label}</span>
      </span>
    );
  },
);

VariableProximity.displayName = "VariableProximity";

export default VariableProximity;
