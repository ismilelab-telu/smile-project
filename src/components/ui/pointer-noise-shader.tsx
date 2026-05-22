import { useEffect, useRef, type ComponentProps } from "react";

import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

type PointerNoiseShaderProps = Omit<ComponentProps<"div">, "ref">;

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec2 uPointer;
uniform vec2 uResolution;

varying vec2 vUv;

float hash(vec2 value) {
  return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453123);
}

float sharpGrain(vec2 cellCoord) {
  vec2 cell = floor(cellCoord);
  float grain = hash(cell);
  return smoothstep(0.48, 0.82, grain);
}

void main() {
  vec2 uv = vUv;
  vec2 aspectDelta = uv - uPointer;
  aspectDelta.x *= uResolution.x / max(uResolution.y, 1.0);

  float pointerDistance = length(aspectDelta);
  float halo = smoothstep(0.82, 0.10, pointerDistance);
  float center = smoothstep(0.24, 0.0, pointerDistance);
  float edgeFade = smoothstep(0.90, 0.04, pointerDistance);

  vec2 pixelDelta = (uv - uPointer) * uResolution;
  vec2 radialDirection = normalize(pixelDelta + vec2(0.0001));
  float flowSpeed = 18.0;
  float flowStrength = halo * (0.35 + center * 0.65);
  vec2 grainCoord = uv * uResolution / 4.0 - radialDirection * uTime * flowSpeed * flowStrength;
  float pattern = sharpGrain(grainCoord);
  float livingNoise = pattern;

  float alpha = halo * (0.026 + livingNoise * 0.30) + center * 0.055;
  alpha *= edgeFade;
  alpha = clamp(alpha, 0.0, 0.38);

  vec3 dimWhite = vec3(0.38, 0.38, 0.36);
  vec3 activeWhite = vec3(1.0, 0.98, 0.92);
  vec3 color = mix(dimWhite, activeWhite, clamp(pattern + center * 0.16, 0.0, 1.0));

  gl_FragColor = vec4(color, alpha);
}
`;

function canUseWebGL() {
  if (typeof document === "undefined" || typeof WebGLRenderingContext === "undefined") {
    return false;
  }

  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function clamp(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

export function PointerNoiseShader({ className, ...props }: PointerNoiseShaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = prefersReducedMotion();

  useEffect(() => {
    const container = containerRef.current;

    if (!container || reduceMotion || !canUseWebGL()) {
      return;
    }

    let cleanup: (() => void) | undefined;
    let isDisposed = false;

    void (async () => {
      const [
        { AdditiveBlending },
        { OrthographicCamera },
        { PlaneGeometry },
        { ShaderMaterial },
        { Mesh },
        { Vector2 },
        { WebGLRenderer },
        { Scene },
      ] = await Promise.all([
        import("three/src/constants.js"),
        import("three/src/cameras/OrthographicCamera.js"),
        import("three/src/geometries/PlaneGeometry.js"),
        import("three/src/materials/ShaderMaterial.js"),
        import("three/src/objects/Mesh.js"),
        import("three/src/math/Vector2.js"),
        import("three/src/renderers/WebGLRenderer.js"),
        import("three/src/scenes/Scene.js"),
      ]);

      if (isDisposed) {
        return;
      }

      const scene = new Scene();
      const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const geometry = new PlaneGeometry(2, 2);
      const pointer = new Vector2(0.5, 0.52);
      const targetPointer = new Vector2(0.5, 0.52);
      const uniforms = {
        uPointer: { value: pointer },
        uResolution: { value: new Vector2(1, 1) },
        uTime: { value: 0 },
      };

      const material = new ShaderMaterial({
        blending: AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        fragmentShader,
        transparent: true,
        uniforms,
        vertexShader,
      });

      const mesh = new Mesh(geometry, material);
      scene.add(mesh);

      const renderer = new WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
        premultipliedAlpha: false,
      });

      renderer.setClearAlpha(0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.domElement.style.display = "block";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.inset = "0";
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.width = "100%";

      container.appendChild(renderer.domElement);

      const updatePointer = (clientX: number, clientY: number) => {
        const rect = container.getBoundingClientRect();

        if (rect.width <= 0 || rect.height <= 0) {
          return;
        }

        targetPointer.set(
          clamp((clientX - rect.left) / rect.width),
          clamp(1 - (clientY - rect.top) / rect.height),
        );
      };

      const handlePointerMove = (event: PointerEvent) => {
        updatePointer(event.clientX, event.clientY);
      };

      const handleTouchMove = (event: TouchEvent) => {
        const touch = event.touches[0];

        if (!touch) {
          return;
        }

        updatePointer(touch.clientX, touch.clientY);
      };

      const updateSize = () => {
        const { height, width } = container.getBoundingClientRect();
        const nextWidth = Math.max(1, Math.floor(width));
        const nextHeight = Math.max(1, Math.floor(height));

        uniforms.uResolution.value.set(nextWidth, nextHeight);
        renderer.setSize(nextWidth, nextHeight, false);
      };

      let animationId = 0;
      let isPageVisible = document.visibilityState === "visible";
      let isSurfaceVisible = true;
      const startTime = performance.now();

      const renderFrame = () => {
        const elapsedSeconds = (performance.now() - startTime) / 1000;

        pointer.lerp(targetPointer, 0.1);
        uniforms.uTime.value = elapsedSeconds;
        renderer.render(scene, camera);
      };

      const animate = () => {
        animationId = 0;

        if (!isPageVisible || !isSurfaceVisible) {
          return;
        }

        renderFrame();
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

      const resizeObserver =
        typeof ResizeObserver === "function"
          ? new ResizeObserver(() => {
              updateSize();
              renderFrame();
            })
          : null;

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

      const handleWindowResize = () => {
        updateSize();
        renderFrame();
      };

      resizeObserver?.observe(container);
      visibilityObserver?.observe(container);
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      window.addEventListener("resize", handleWindowResize);
      window.addEventListener("touchmove", handleTouchMove, { passive: true });
      document.addEventListener("visibilitychange", handleDocumentVisibility);

      updateSize();
      renderFrame();
      startAnimation();

      cleanup = () => {
        stopAnimation();
        resizeObserver?.disconnect();
        visibilityObserver?.disconnect();
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("resize", handleWindowResize);
        window.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("visibilitychange", handleDocumentVisibility);
        scene.remove(mesh);
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
  }, [reduceMotion]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 z-0 overflow-hidden",
        reduceMotion
          ? "bg-[radial-gradient(circle_at_50%_52%,oklch(94%_0_0_/_0.13),transparent_42%)]"
          : null,
        className,
      )}
      ref={containerRef}
      {...props}
    />
  );
}
