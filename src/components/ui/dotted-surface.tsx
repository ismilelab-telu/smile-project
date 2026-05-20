"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useRef, type ComponentProps } from "react";
import * as THREE from "three";

import { shouldUseLightweightVisuals } from "@/lib/motion";

type DottedSurfaceProps = Omit<ComponentProps<"div">, "ref">;

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

    const isDarkTheme = resolvedTheme === "dark" || theme === "dark";
    const separation = 150;
    const amountX = 40;
    const amountY = 60;
    const scene = new THREE.Scene();

    scene.fog = new THREE.Fog(isDarkTheme ? 0x111111 : 0xffffff, 2000, 10000);

    const camera = new THREE.PerspectiveCamera(60, 1, 1, 10000);
    camera.position.set(0, 355, 1220);

    const renderer = new THREE.WebGLRenderer({
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

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      opacity: isDarkTheme ? 0.78 : 0.92,
      size: 8,
      sizeAttenuation: true,
      transparent: true,
      vertexColors: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const updateSize = () => {
      const { height, width } = container.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.floor(width));
      const nextHeight = Math.max(1, Math.floor(height));

      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight, false);
    };

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
      renderer.render(scene, camera);
    });
    let isPageVisible = document.visibilityState === "visible";
    let isSurfaceVisible = true;
    let animationId = 0;
    let count = 0;

    const animate = () => {
      animationId = 0;

      if (!isPageVisible || !isSurfaceVisible) {
        return;
      }

      const positionAttribute = geometry.attributes.position;
      const animatedPositions = positionAttribute.array as Float32Array;
      let index = 0;

      for (let ix = 0; ix < amountX; ix++) {
        for (let iy = 0; iy < amountY; iy++) {
          animatedPositions[index * 3 + 1] =
            Math.sin((ix + count) * 0.3) * 50 + Math.sin((iy + count) * 0.5) * 50;
          index++;
        }
      }

      positionAttribute.needsUpdate = true;
      renderer.render(scene, camera);
      count += 0.1;
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
    renderer.render(scene, camera);
    startAnimation();

    return () => {
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
