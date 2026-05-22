"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { useTheme } from "next-themes";

import { shouldUseLightweightVisuals } from "@/lib/motion";
import { cn } from "@/lib/utils";

type DottedSurfaceProps = Omit<ComponentProps<"div">, "ref">;

const globalWaveStartTime = typeof performance === "undefined" ? 0 : performance.now();

function canUseWebGL() {
  try {
    const canvas = document.createElement("canvas");

    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function DottedSurface({ className, children, ...props }: DottedSurfaceProps) {
  const { resolvedTheme, theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const useStaticSurface = shouldUseLightweightVisuals();

  useEffect(() => {
    const container = containerRef.current;

    if (!container || useStaticSurface || !canUseWebGL()) {
      return;
    }

    let cleanup: (() => void) | undefined;
    let isDisposed = false;

    void (async () => {
      const [
        { PerspectiveCamera },
        { Float32BufferAttribute },
        { BufferGeometry },
        { PointsMaterial },
        { Points },
        { WebGLRenderer },
        { Fog },
        { Scene },
      ] = await Promise.all([
        import("three/src/cameras/PerspectiveCamera.js"),
        import("three/src/core/BufferAttribute.js"),
        import("three/src/core/BufferGeometry.js"),
        import("three/src/materials/PointsMaterial.js"),
        import("three/src/objects/Points.js"),
        import("three/src/renderers/WebGLRenderer.js"),
        import("three/src/scenes/Fog.js"),
        import("three/src/scenes/Scene.js"),
      ]);

      if (isDisposed) {
        return;
      }

      const isDarkTheme = resolvedTheme === "dark" || theme === "dark";
      const separation = 150;
      const amountX = 40;
      const amountY = 60;
      const scene = new Scene();

      scene.fog = new Fog(isDarkTheme ? 0x111111 : 0xffffff, 2000, 10000);

      const camera = new PerspectiveCamera(60, 1, 1, 10000);
      camera.position.set(0, 355, 1220);

      const renderer = new WebGLRenderer({
        alpha: true,
        antialias: true,
      });

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(scene.fog.color, 0);
      renderer.domElement.style.display = "block";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.inset = "0";
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.width = "100%";

      container.appendChild(renderer.domElement);

      const positions: number[] = [];
      const colors: number[] = [];

      for (let ix = 0; ix < amountX; ix++) {
        for (let iy = 0; iy < amountY; iy++) {
          positions.push(
            ix * separation - (amountX * separation) / 2,
            0,
            iy * separation - (amountY * separation) / 2,
          );

          if (isDarkTheme) {
            colors.push(0.78, 0.78, 0.78);
          } else {
            colors.push(0, 0, 0);
          }
        }
      }

      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
      geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));

      const material = new PointsMaterial({
        opacity: isDarkTheme ? 0.78 : 0.92,
        size: 8,
        sizeAttenuation: true,
        transparent: true,
        vertexColors: true,
      });

      const points = new Points(geometry, material);
      scene.add(points);

      const updateSize = () => {
        const { height, width } = container.getBoundingClientRect();
        const nextWidth = Math.max(1, Math.floor(width));
        const nextHeight = Math.max(1, Math.floor(height));

        camera.aspect = nextWidth / nextHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(nextWidth, nextHeight, false);
      };

      let isPageVisible = document.visibilityState === "visible";
      let isSurfaceVisible = true;
      let animationId = 0;

      const renderWaveFrame = () => {
        const positionAttribute = geometry.attributes.position;
        const animatedPositions = positionAttribute.array as Float32Array;
        const elapsedSeconds =
          typeof performance === "undefined" ? 0 : (performance.now() - globalWaveStartTime) / 1000;
        const wavePhase = elapsedSeconds * 6;
        let index = 0;

        for (let ix = 0; ix < amountX; ix++) {
          for (let iy = 0; iy < amountY; iy++) {
            animatedPositions[index * 3 + 1] =
              Math.sin((ix + wavePhase) * 0.3) * 50 + Math.sin((iy + wavePhase) * 0.5) * 50;
            index++;
          }
        }

        positionAttribute.needsUpdate = true;
        renderer.render(scene, camera);
      };

      const resizeObserver = new ResizeObserver(() => {
        updateSize();
        renderWaveFrame();
      });

      const animate = () => {
        animationId = 0;

        if (!isPageVisible || !isSurfaceVisible) {
          return;
        }

        renderWaveFrame();
        animationId = window.requestAnimationFrame(animate);
      };

      const startAnimation = () => {
        if (animationId === 0 && isPageVisible && isSurfaceVisible) {
          animationId = window.requestAnimationFrame(animate);
        }
      };

      const stopAnimation = () => {
        if (animationId !== 0) {
          window.cancelAnimationFrame(animationId);
          animationId = 0;
        }
      };

      const handleDocumentVisibility = () => {
        isPageVisible = document.visibilityState === "visible";

        if (isPageVisible) {
          startAnimation();
        } else {
          stopAnimation();
        }
      };

      const visibilityObserver =
        typeof IntersectionObserver === "function"
          ? new IntersectionObserver(
              ([entry]) => {
                isSurfaceVisible = entry?.isIntersecting ?? true;

                if (isSurfaceVisible) {
                  startAnimation();
                } else {
                  stopAnimation();
                }
              },
              { rootMargin: "25% 0px" },
            )
          : null;

      resizeObserver.observe(container);
      visibilityObserver?.observe(container);
      document.addEventListener("visibilitychange", handleDocumentVisibility);
      updateSize();
      renderWaveFrame();
      startAnimation();

      cleanup = () => {
        stopAnimation();
        resizeObserver.disconnect();
        visibilityObserver?.disconnect();
        document.removeEventListener("visibilitychange", handleDocumentVisibility);
        scene.remove(points);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      isDisposed = true;
      cleanup?.();
    };
  }, [resolvedTheme, theme, useStaticSurface]);

  return (
    <div
      aria-hidden="true"
      ref={containerRef}
      className={cn("pointer-events-none absolute inset-0 z-0 overflow-hidden", className)}
      {...props}
    >
      {useStaticSurface ? (
        <span className="absolute inset-0 bg-[radial-gradient(circle,color-mix(in_oklch,var(--foreground)_20%,transparent)_1px,transparent_1.5px)] opacity-70 [background-size:48px_48px]" />
      ) : null}
      {children}
    </div>
  );
}
