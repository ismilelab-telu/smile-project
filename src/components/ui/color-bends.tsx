import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import * as THREE from "three";

import { shouldUseLightweightVisuals } from "@/lib/motion";

import "./color-bends.css";

const MAX_COLORS = 8;

const frag = `
#define MAX_COLORS ${MAX_COLORS}
uniform vec2 uCanvas;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uRot;
uniform int uColorCount;
uniform vec3 uColors[MAX_COLORS];
uniform int uTransparent;
uniform float uScale;
uniform float uFrequency;
uniform float uWarpStrength;
uniform vec2 uPointer;
uniform float uMouseInfluence;
uniform float uParallax;
uniform float uNoise;
uniform int uIterations;
uniform float uIntensity;
uniform float uBandWidth;
varying vec2 vUv;

void main() {
  float t = uTime * uSpeed;
  vec2 p = vUv * 2.0 - 1.0;
  p += uPointer * uParallax * 0.1;
  vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);
  vec2 q = vec2(rp.x * (uCanvas.x / uCanvas.y), rp.y);
  q /= max(uScale, 0.0001);
  q /= 0.5 + 0.2 * dot(q, q);
  q += 0.2 * cos(t) - 7.56;
  vec2 toward = (uPointer - rp);
  q += toward * uMouseInfluence * 0.2;

  for (int j = 0; j < 5; j++) {
    if (j >= uIterations - 1) break;
    vec2 rr = sin(1.5 * (q.yx * uFrequency) + 2.0 * cos(q * uFrequency));
    q += (rr - q) * 0.15;
  }

  vec3 col = vec3(0.0);
  float a = 1.0;

  if (uColorCount > 0) {
    vec2 s = q;
    vec3 sumCol = vec3(0.0);
    float cover = 0.0;
    for (int i = 0; i < MAX_COLORS; ++i) {
      if (i >= uColorCount) break;
      s -= 0.01;
      vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
      float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(i)) / 4.0);
      float kBelow = clamp(uWarpStrength, 0.0, 1.0);
      float kMix = pow(kBelow, 0.3);
      float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
      vec2 disp = (r - s) * kBelow;
      vec2 warped = s + disp * gain;
      float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(i)) / 4.0);
      float m = mix(m0, m1, kMix);
      float w = 1.0 - exp(-uBandWidth / exp(uBandWidth * m));
      sumCol += uColors[i] * w;
      cover = max(cover, w);
    }
    col = clamp(sumCol, 0.0, 1.0);
    a = uTransparent > 0 ? cover : 1.0;
  } else {
    vec2 s = q;
    for (int k = 0; k < 3; ++k) {
      s -= 0.01;
      vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
      float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(k)) / 4.0);
      float kBelow = clamp(uWarpStrength, 0.0, 1.0);
      float kMix = pow(kBelow, 0.3);
      float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
      vec2 disp = (r - s) * kBelow;
      vec2 warped = s + disp * gain;
      float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(k)) / 4.0);
      float m = mix(m0, m1, kMix);
      col[k] = 1.0 - exp(-uBandWidth / exp(uBandWidth * m));
    }
    a = uTransparent > 0 ? max(max(col.r, col.g), col.b) : 1.0;
  }

  col *= uIntensity;

  if (uNoise > 0.0001) {
    float n = fract(sin(dot(gl_FragCoord.xy + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453123);
    col += (n - 0.5) * uNoise;
    col = clamp(col, 0.0, 1.0);
  }

  vec3 rgb = (uTransparent > 0) ? col * a : col;
  gl_FragColor = vec4(rgb, a);
}
`;

const vert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

type ColorBendsProps = {
  autoRotate?: number;
  bandWidth?: number;
  className?: string;
  colors?: string[];
  frequency?: number;
  intensity?: number;
  iterations?: number;
  mouseInfluence?: number;
  noise?: number;
  parallax?: number;
  rotation?: number;
  scale?: number;
  speed?: number;
  style?: CSSProperties;
  transparent?: boolean;
  warpStrength?: number;
};

const colorFallbacks = {
  "--color-cyan-400": "oklch(78.9% 0.154 211.53)",
  "--color-emerald-500": "oklch(69.6% 0.17 162.48)",
  "--color-purple-500": "oklch(62.7% 0.265 303.9)",
  "--color-rose-400": "oklch(71.2% 0.194 13.428)",
  "--color-rose-600": "oklch(58.6% 0.253 17.585)",
  "--color-sky-400": "oklch(74.6% 0.16 232.661)",
  "--color-violet-400": "oklch(70.2% 0.183 293.541)",
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function linearToSrgb(value: number) {
  const clamped = clamp01(value);

  return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

function oklchToVector(color: string) {
  const match = color.match(/oklch\(\s*([\d.]+)(%)?\s+([\d.]+)\s+([\d.]+)(?:deg)?/i);

  if (!match) {
    return null;
  }

  const rawLightness = Number(match[1]);
  const lightness = match[2] || rawLightness > 1 ? rawLightness / 100 : rawLightness;
  const chroma = Number(match[3]);
  const hue = (Number(match[4]) * Math.PI) / 180;
  const a = Math.cos(hue) * chroma;
  const b = Math.sin(hue) * chroma;
  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = lightness - 0.0894841775 * a - 1.291485548 * b;
  const l = lPrime * lPrime * lPrime;
  const m = mPrime * mPrime * mPrime;
  const s = sPrime * sPrime * sPrime;

  return new THREE.Vector3(
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  );
}

function resolveCssVariable(color: string) {
  const match = color.trim().match(/^var\((--[\w-]+)(?:,\s*(.+))?\)$/);

  if (!match) {
    return color;
  }

  const variableName = match[1];
  const fallback = match[2]?.trim();
  const computed =
    typeof window === "undefined"
      ? ""
      : window.getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();

  return (
    computed || colorFallbacks[variableName as keyof typeof colorFallbacks] || fallback || color
  );
}

function colorToVector(color: string) {
  const resolved = resolveCssVariable(color).trim();
  const oklch = oklchToVector(resolved);

  if (oklch) {
    return oklch;
  }

  const rgbMatch = resolved.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);

  if (rgbMatch) {
    return new THREE.Vector3(
      clamp01(Number(rgbMatch[1]) / 255),
      clamp01(Number(rgbMatch[2]) / 255),
      clamp01(Number(rgbMatch[3]) / 255),
    );
  }

  const hex = resolved.replace("#", "").trim();

  if (/^[\da-f]{3}$|^[\da-f]{6}$/i.test(hex)) {
    const expanded =
      hex.length === 3
        ? hex
            .split("")
            .map((character) => character + character)
            .join("")
        : hex;

    return new THREE.Vector3(
      Number.parseInt(expanded.slice(0, 2), 16) / 255,
      Number.parseInt(expanded.slice(2, 4), 16) / 255,
      Number.parseInt(expanded.slice(4, 6), 16) / 255,
    );
  }

  return new THREE.Vector3(0, 0, 0);
}

function canUseWebGL() {
  return typeof window !== "undefined" && "WebGLRenderingContext" in window;
}

export default function ColorBends({
  className = "",
  style,
  rotation = 90,
  speed = 0.2,
  colors = [],
  transparent = true,
  autoRotate = 0,
  scale = 1,
  frequency = 1,
  warpStrength = 1,
  mouseInfluence = 1,
  parallax = 0.5,
  noise = 0.15,
  iterations = 1,
  intensity = 1.5,
  bandWidth = 6,
}: ColorBendsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rafRef = useRef<number | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const rotationRef = useRef(rotation);
  const autoRotateRef = useRef(autoRotate);
  const pointerTargetRef = useRef(new THREE.Vector2(0, 0));
  const pointerCurrentRef = useRef(new THREE.Vector2(0, 0));
  const pointerSmoothRef = useRef(8);
  const useLightweightVisuals = shouldUseLightweightVisuals();

  useEffect(() => {
    const container = containerRef.current;

    if (!container || useLightweightVisuals || !canUseWebGL()) {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const uColorsArray = Array.from({ length: MAX_COLORS }, () => new THREE.Vector3(0, 0, 0));
    const material = new THREE.ShaderMaterial({
      fragmentShader: frag,
      premultipliedAlpha: true,
      transparent: true,
      uniforms: {
        uBandWidth: { value: bandWidth },
        uCanvas: { value: new THREE.Vector2(1, 1) },
        uColorCount: { value: 0 },
        uColors: { value: uColorsArray },
        uFrequency: { value: frequency },
        uIntensity: { value: intensity },
        uIterations: { value: iterations },
        uMouseInfluence: { value: mouseInfluence },
        uNoise: { value: noise },
        uParallax: { value: parallax },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uRot: { value: new THREE.Vector2(1, 0) },
        uScale: { value: scale },
        uSpeed: { value: speed },
        uTime: { value: 0 },
        uTransparent: { value: transparent ? 1 : 0 },
        uWarpStrength: { value: warpStrength },
      },
      vertexShader: vert,
    });
    materialRef.current = material;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
    rendererRef.current = renderer;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(new THREE.Color(0, 0, 0), transparent ? 0 : 1);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    const clock = new THREE.Clock();

    const handleResize = () => {
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;
      renderer.setSize(width, height, false);
      material.uniforms.uCanvas.value.set(width, height);
    };

    handleResize();

    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
      resizeObserverRef.current = resizeObserver;
    } else {
      window.addEventListener("resize", handleResize);
    }

    const loop = () => {
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;
      material.uniforms.uTime.value = elapsed;

      const degrees = (rotationRef.current % 360) + autoRotateRef.current * elapsed;
      const radians = (degrees * Math.PI) / 180;
      material.uniforms.uRot.value.set(Math.cos(radians), Math.sin(radians));

      const current = pointerCurrentRef.current;
      const target = pointerTargetRef.current;
      current.lerp(target, Math.min(1, delta * pointerSmoothRef.current));
      material.uniforms.uPointer.value.copy(current);
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      } else {
        window.removeEventListener("resize", handleResize);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();

      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [
    bandWidth,
    frequency,
    intensity,
    iterations,
    mouseInfluence,
    noise,
    parallax,
    scale,
    speed,
    transparent,
    useLightweightVisuals,
    warpStrength,
  ]);

  useEffect(() => {
    const material = materialRef.current;
    const renderer = rendererRef.current;

    if (!material) {
      return;
    }

    rotationRef.current = rotation;
    autoRotateRef.current = autoRotate;
    material.uniforms.uSpeed.value = speed;
    material.uniforms.uScale.value = scale;
    material.uniforms.uFrequency.value = frequency;
    material.uniforms.uWarpStrength.value = warpStrength;
    material.uniforms.uMouseInfluence.value = mouseInfluence;
    material.uniforms.uParallax.value = parallax;
    material.uniforms.uNoise.value = noise;
    material.uniforms.uIterations.value = iterations;
    material.uniforms.uIntensity.value = intensity;
    material.uniforms.uBandWidth.value = bandWidth;

    const colorVectors = colors.filter(Boolean).slice(0, MAX_COLORS).map(colorToVector);

    for (let index = 0; index < MAX_COLORS; index += 1) {
      const vector = material.uniforms.uColors.value[index];

      if (index < colorVectors.length) {
        vector.copy(colorVectors[index]);
      } else {
        vector.set(0, 0, 0);
      }
    }

    material.uniforms.uColorCount.value = colorVectors.length;
    material.uniforms.uTransparent.value = transparent ? 1 : 0;
    renderer?.setClearColor(new THREE.Color(0, 0, 0), transparent ? 0 : 1);
  }, [
    autoRotate,
    bandWidth,
    colors,
    frequency,
    intensity,
    iterations,
    mouseInfluence,
    noise,
    parallax,
    rotation,
    scale,
    speed,
    transparent,
    warpStrength,
  ]);

  useEffect(() => {
    const material = materialRef.current;
    const container = containerRef.current;

    if (!material || !container) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
      const y = -(((event.clientY - rect.top) / (rect.height || 1)) * 2 - 1);
      pointerTargetRef.current.set(x, y);
    };

    container.addEventListener("pointermove", handlePointerMove);

    return () => {
      container.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`color-bends-container ${
        useLightweightVisuals ? "color-bends-container--static" : ""
      } ${className}`}
      style={style}
    />
  );
}
