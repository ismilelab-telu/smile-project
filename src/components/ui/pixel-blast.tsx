import { Effect, EffectComposer, EffectPass, RenderPass } from "postprocessing";
import { useEffect, useRef, type CSSProperties } from "react";
import * as THREE from "three";

const MAX_CLICKS = 10;

const SHAPE_MAP = {
  circle: 1,
  diamond: 3,
  square: 0,
  triangle: 2,
} as const;

const VERTEX_SRC = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

const FRAGMENT_SRC = `
precision highp float;

uniform vec3  uColor;
uniform vec2  uResolution;
uniform float uTime;
uniform float uPixelSize;
uniform float uScale;
uniform float uDensity;
uniform float uPixelJitter;
uniform int   uEnableRipples;
uniform float uRippleSpeed;
uniform float uRippleThickness;
uniform float uRippleIntensity;
uniform float uEdgeFade;

uniform int   uShapeType;
const int SHAPE_SQUARE   = 0;
const int SHAPE_CIRCLE   = 1;
const int SHAPE_TRIANGLE = 2;
const int SHAPE_DIAMOND  = 3;

uniform vec2  uClickPos  [${MAX_CLICKS}];
uniform float uClickTimes[${MAX_CLICKS}];

out vec4 fragColor;

float Bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2. + a.y * a.y * .75);
}
#define Bayer4(a) (Bayer2(.5*(a))*0.25 + Bayer2(a))
#define Bayer8(a) (Bayer4(.5*(a))*0.25 + Bayer2(a))

#define FBM_OCTAVES     5
#define FBM_LACUNARITY  1.25
#define FBM_GAIN        1.0

float hash11(float n){ return fract(sin(n)*43758.5453); }

float vnoise(vec3 p){
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  float n000 = hash11(dot(ip + vec3(0.0,0.0,0.0), vec3(1.0,57.0,113.0)));
  float n100 = hash11(dot(ip + vec3(1.0,0.0,0.0), vec3(1.0,57.0,113.0)));
  float n010 = hash11(dot(ip + vec3(0.0,1.0,0.0), vec3(1.0,57.0,113.0)));
  float n110 = hash11(dot(ip + vec3(1.0,1.0,0.0), vec3(1.0,57.0,113.0)));
  float n001 = hash11(dot(ip + vec3(0.0,0.0,1.0), vec3(1.0,57.0,113.0)));
  float n101 = hash11(dot(ip + vec3(1.0,0.0,1.0), vec3(1.0,57.0,113.0)));
  float n011 = hash11(dot(ip + vec3(0.0,1.0,1.0), vec3(1.0,57.0,113.0)));
  float n111 = hash11(dot(ip + vec3(1.0,1.0,1.0), vec3(1.0,57.0,113.0)));
  vec3 w = fp*fp*fp*(fp*(fp*6.0-15.0)+10.0);
  float x00 = mix(n000, n100, w.x);
  float x10 = mix(n010, n110, w.x);
  float x01 = mix(n001, n101, w.x);
  float x11 = mix(n011, n111, w.x);
  float y0  = mix(x00, x10, w.y);
  float y1  = mix(x01, x11, w.y);
  return mix(y0, y1, w.z) * 2.0 - 1.0;
}

float fbm2(vec2 uv, float t){
  vec3 p = vec3(uv * uScale, t);
  float amp = 1.0;
  float freq = 1.0;
  float sum = 1.0;
  for (int i = 0; i < FBM_OCTAVES; ++i){
    sum  += amp * vnoise(p * freq);
    freq *= FBM_LACUNARITY;
    amp  *= FBM_GAIN;
  }
  return sum * 0.5 + 0.5;
}

float maskCircle(vec2 p, float cov){
  float r = sqrt(cov) * .25;
  float d = length(p - 0.5) - r;
  float aa = 0.5 * fwidth(d);
  return cov * (1.0 - smoothstep(-aa, aa, d * 2.0));
}

float maskTriangle(vec2 p, vec2 id, float cov){
  bool flip = mod(id.x + id.y, 2.0) > 0.5;
  if (flip) p.x = 1.0 - p.x;
  float r = sqrt(cov);
  float d  = p.y - r*(1.0 - p.x);
  float aa = fwidth(d);
  return cov * clamp(0.5 - d/aa, 0.0, 1.0);
}

float maskDiamond(vec2 p, float cov){
  float r = sqrt(cov) * 0.564;
  return step(abs(p.x - 0.49) + abs(p.y - 0.49), r);
}

void main(){
  float pixelSize = uPixelSize;
  vec2 fragCoord = gl_FragCoord.xy - uResolution * .5;
  float aspectRatio = uResolution.x / uResolution.y;

  vec2 pixelId = floor(fragCoord / pixelSize);
  vec2 pixelUV = fract(fragCoord / pixelSize);

  float cellPixelSize = 8.0 * pixelSize;
  vec2 cellId = floor(fragCoord / cellPixelSize);
  vec2 cellCoord = cellId * cellPixelSize;
  vec2 uv = cellCoord / uResolution * vec2(aspectRatio, 1.0);

  float base = fbm2(uv, uTime * 0.05);
  base = base * 0.5 - 0.65;

  float feed = base + (uDensity - 0.5) * 0.3;

  float speed     = uRippleSpeed;
  float thickness = uRippleThickness;
  const float dampT     = 1.0;
  const float dampR     = 10.0;

  if (uEnableRipples == 1) {
    for (int i = 0; i < ${MAX_CLICKS}; ++i){
      vec2 pos = uClickPos[i];
      if (pos.x < 0.0) continue;
      float cellPixelSize = 8.0 * pixelSize;
      vec2 cuv = (((pos - uResolution * .5 - cellPixelSize * .5) / (uResolution))) * vec2(aspectRatio, 1.0);
      float t = max(uTime - uClickTimes[i], 0.0);
      float r = distance(uv, cuv);
      float waveR = speed * t;
      float ring  = exp(-pow((r - waveR) / thickness, 2.0));
      float atten = exp(-dampT * t) * exp(-dampR * r);
      feed = max(feed, ring * atten * uRippleIntensity);
    }
  }

  float bayer = Bayer8(fragCoord / uPixelSize) - 0.5;
  float bw = step(0.5, feed + bayer);

  float h = fract(sin(dot(floor(fragCoord / uPixelSize), vec2(127.1, 311.7))) * 43758.5453);
  float jitterScale = 1.0 + (h - 0.5) * uPixelJitter;
  float coverage = bw * jitterScale;
  float M;
  if      (uShapeType == SHAPE_CIRCLE)   M = maskCircle (pixelUV, coverage);
  else if (uShapeType == SHAPE_TRIANGLE) M = maskTriangle(pixelUV, pixelId, coverage);
  else if (uShapeType == SHAPE_DIAMOND)  M = maskDiamond(pixelUV, coverage);
  else                                   M = coverage;

  if (uEdgeFade > 0.0) {
    vec2 norm = gl_FragCoord.xy / uResolution;
    float edge = min(min(norm.x, norm.y), min(1.0 - norm.x, 1.0 - norm.y));
    float fade = smoothstep(0.0, uEdgeFade, edge);
    M *= fade;
  }

  vec3 color = uColor;
  vec3 srgbColor = mix(
    color * 12.92,
    1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, color)
  );

  fragColor = vec4(srgbColor, M);
}
`;

type TouchPoint = {
  age: number;
  force: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

type TouchTexture = {
  addTouch: (norm: { x: number; y: number }) => void;
  radiusScale: number;
  texture: THREE.Texture;
  update: () => void;
};

type PixelBlastProps = {
  antialias?: boolean;
  autoPauseOffscreen?: boolean;
  className?: string;
  color?: string;
  edgeFade?: number;
  enableRipples?: boolean;
  liquid?: boolean;
  liquidRadius?: number;
  liquidStrength?: number;
  liquidWobbleSpeed?: number;
  noiseAmount?: number;
  patternDensity?: number;
  patternScale?: number;
  pixelSize?: number;
  pixelSizeJitter?: number;
  rippleIntensityScale?: number;
  rippleSpeed?: number;
  rippleThickness?: number;
  speed?: number;
  style?: CSSProperties;
  transparent?: boolean;
  variant?: keyof typeof SHAPE_MAP;
};

type OklchColor = {
  chroma: number;
  hue: number;
  lightness: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const srgbChannelToLinear = (channel: number) => {
  const value = clamp01(channel / 255);

  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const rgbToOklch = (red: number, green: number, blue: number): OklchColor => {
  const linearRed = srgbChannelToLinear(red);
  const linearGreen = srgbChannelToLinear(green);
  const linearBlue = srgbChannelToLinear(blue);
  const l = 0.4122214708 * linearRed + 0.5363325363 * linearGreen + 0.0514459929 * linearBlue;
  const m = 0.2119034982 * linearRed + 0.6806995451 * linearGreen + 0.1073969566 * linearBlue;
  const s = 0.0883024619 * linearRed + 0.2817188376 * linearGreen + 0.6299787005 * linearBlue;
  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);
  const lightness = 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot;
  const a = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot;
  const b = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot;
  const chroma = Math.hypot(a, b);
  const hue = chroma < 0.00005 ? 0 : (Math.atan2(b, a) * 180) / Math.PI;

  return {
    chroma,
    hue: hue < 0 ? hue + 360 : hue,
    lightness,
  };
};

const formatOklchFromSrgb = (red: number, green: number, blue: number, alpha = 1) => {
  const { chroma, hue, lightness } = rgbToOklch(red, green, blue);
  const normalizedChroma = chroma < 0.00005 ? 0 : chroma;
  const alphaValue = Math.min(1, Math.max(0, alpha));
  const alphaSuffix = alphaValue < 1 ? ` / ${Number(alphaValue.toFixed(4))}` : "";

  return `oklch(${(lightness * 100).toFixed(4)}% ${Number(normalizedChroma.toFixed(4))} ${Number(hue.toFixed(2))}${alphaSuffix})`;
};

const parseOklchColor = (color: string): OklchColor | null => {
  const match = color
    .trim()
    .match(
      /^oklch\(\s*([+-]?(?:\d+|\d*\.\d+))(%?)\s+([+-]?(?:\d+|\d*\.\d+))\s+([+-]?(?:\d+|\d*\.\d+))(?:deg)?(?:\s*\/\s*[+-]?(?:\d+|\d*\.\d+)%?)?\s*\)$/i,
    );

  if (!match) {
    return null;
  }

  const lightness = Number(match[1]) / (match[2] === "%" ? 100 : 1);

  return {
    chroma: Number(match[3]),
    hue: Number(match[4]),
    lightness,
  };
};

const oklchToLinearSrgb = ({ chroma, hue, lightness }: OklchColor) => {
  const hueRadians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(hueRadians);
  const b = chroma * Math.sin(hueRadians);
  const lRoot = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = lightness - 0.0894841775 * a - 1.291485548 * b;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;

  return {
    blue: clamp01(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    green: clamp01(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    red: clamp01(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
  };
};

const createThreeColorFromCss = (color: string) => {
  const oklchColor = parseOklchColor(color);

  if (!oklchColor) {
    return new THREE.Color(color);
  }

  const { blue, green, red } = oklchToLinearSrgb(oklchColor);

  return new THREE.Color(red, green, blue);
};

function canUseWebGL() {
  if (
    typeof window === "undefined" ||
    (typeof WebGLRenderingContext === "undefined" && typeof WebGL2RenderingContext === "undefined")
  ) {
    return false;
  }

  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function createTouchTexture(): TouchTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D context not available");
  }

  const texture = new THREE.Texture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const trail: TouchPoint[] = [];
  const maxAge = 64;
  const speed = 1 / maxAge;
  let last: { x: number; y: number } | null = null;
  let radius = 0.1 * size;

  const clear = () => {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const drawPoint = (point: TouchPoint) => {
    const pos = { x: point.x * size, y: (1 - point.y) * size };
    let intensity = 1;
    const easeOutSine = (t: number) => Math.sin((t * Math.PI) / 2);
    const easeOutQuad = (t: number) => -t * (t - 2);

    if (point.age < maxAge * 0.3) {
      intensity = easeOutSine(point.age / (maxAge * 0.3));
    } else {
      intensity = easeOutQuad(1 - (point.age - maxAge * 0.3) / (maxAge * 0.7)) || 0;
    }

    intensity *= point.force;

    const red = ((point.vx + 1) / 2) * 255;
    const green = ((point.vy + 1) / 2) * 255;
    const blue = intensity * 255;
    const offset = size * 5;

    ctx.shadowOffsetX = offset;
    ctx.shadowOffsetY = offset;
    ctx.shadowBlur = radius;
    ctx.shadowColor = formatOklchFromSrgb(red, green, blue, 0.22 * intensity);
    ctx.beginPath();
    ctx.fillStyle = "oklch(62.7955% 0.2577 29.23)";
    ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  clear();

  return {
    addTouch(norm) {
      let force = 0;
      let vx = 0;
      let vy = 0;

      if (last) {
        const dx = norm.x - last.x;
        const dy = norm.y - last.y;

        if (dx === 0 && dy === 0) {
          return;
        }

        const distanceSquared = dx * dx + dy * dy;
        const distance = Math.sqrt(distanceSquared);
        vx = dx / (distance || 1);
        vy = dy / (distance || 1);
        force = Math.min(distanceSquared * 10000, 1);
      }

      last = { x: norm.x, y: norm.y };
      trail.push({ age: 0, force, vx, vy, x: norm.x, y: norm.y });
    },
    get radiusScale() {
      return radius / (0.1 * size);
    },
    set radiusScale(value: number) {
      radius = 0.1 * size * value;
    },
    texture,
    update() {
      clear();

      for (let index = trail.length - 1; index >= 0; index--) {
        const point = trail[index];
        const force = point.force * speed * (1 - point.age / maxAge);
        point.x += point.vx * force;
        point.y += point.vy * force;
        point.age++;

        if (point.age > maxAge) {
          trail.splice(index, 1);
        }
      }

      for (const point of trail) {
        drawPoint(point);
      }

      texture.needsUpdate = true;
    },
  };
}

function createLiquidEffect(texture: THREE.Texture, opts: { freq: number; strength: number }) {
  const fragment = `
    uniform sampler2D uTexture;
    uniform float uStrength;
    uniform float uTime;
    uniform float uFreq;

    void mainUv(inout vec2 uv) {
      vec4 tex = texture2D(uTexture, uv);
      float vx = tex.r * 2.0 - 1.0;
      float vy = tex.g * 2.0 - 1.0;
      float intensity = tex.b;
      float wave = 0.5 + 0.5 * sin(uTime * uFreq + intensity * 6.2831853);
      float amt = uStrength * intensity * wave;

      uv += vec2(vx, vy) * amt;
    }
  `;

  return new Effect("LiquidEffect", fragment, {
    uniforms: new Map([
      ["uTexture", new THREE.Uniform(texture)],
      ["uStrength", new THREE.Uniform(opts.strength)],
      ["uTime", new THREE.Uniform(0)],
      ["uFreq", new THREE.Uniform(opts.freq)],
    ]),
  });
}

function createNoiseEffect(noiseAmount: number) {
  return new Effect(
    "NoiseEffect",
    `
      uniform float uTime;
      uniform float uAmount;

      float hash(vec2 p){
        return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453);
      }

      void mainUv(inout vec2 uv){}

      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor){
        float n = hash(floor(uv * vec2(1920.0,1080.0)) + floor(uTime * 60.0));
        float g = (n - 0.5) * uAmount;
        outputColor = inputColor + vec4(vec3(g), 0.0);
      }
    `,
    {
      uniforms: new Map([
        ["uTime", new THREE.Uniform(0)],
        ["uAmount", new THREE.Uniform(noiseAmount)],
      ]),
    },
  );
}

function randomFloat() {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const u32 = new Uint32Array(1);
    window.crypto.getRandomValues(u32);
    return u32[0] / 0xffffffff;
  }

  return Math.random();
}

export function PixelBlast({
  variant = "square",
  pixelSize = 3,
  color = "oklch(72.197% 0.0856 307.92)",
  className = "",
  style,
  antialias = true,
  patternScale = 2,
  patternDensity = 1,
  liquid = false,
  liquidStrength = 0.1,
  liquidRadius = 1,
  pixelSizeJitter = 0,
  enableRipples = true,
  rippleIntensityScale = 1,
  rippleThickness = 0.1,
  rippleSpeed = 0.3,
  liquidWobbleSpeed = 4.5,
  autoPauseOffscreen = true,
  speed = 0.5,
  transparent = true,
  edgeFade = 0.5,
  noiseAmount = 0,
}: PixelBlastProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const visibilityRef = useRef({ visible: true });

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !autoPauseOffscreen || typeof IntersectionObserver === "undefined") {
      visibilityRef.current.visible = true;
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      visibilityRef.current.visible = entry?.isIntersecting ?? true;
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [autoPauseOffscreen]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !canUseWebGL()) {
      return;
    }

    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias,
        canvas: document.createElement("canvas"),
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    renderer.domElement.style.display = "block";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.width = "100%";
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    if (transparent) {
      renderer.setClearAlpha(0);
    } else {
      renderer.setClearColor(createThreeColorFromCss("oklch(0% 0 0)"), 1);
    }

    const uniforms = {
      uClickPos: {
        value: Array.from({ length: MAX_CLICKS }, () => new THREE.Vector2(-1, -1)),
      },
      uClickTimes: { value: new Float32Array(MAX_CLICKS) },
      uColor: { value: createThreeColorFromCss(color) },
      uDensity: { value: patternDensity },
      uEdgeFade: { value: edgeFade },
      uEnableRipples: { value: enableRipples ? 1 : 0 },
      uPixelJitter: { value: pixelSizeJitter },
      uPixelSize: { value: pixelSize * renderer.getPixelRatio() },
      uResolution: { value: new THREE.Vector2(0, 0) },
      uRippleIntensity: { value: rippleIntensityScale },
      uRippleSpeed: { value: rippleSpeed },
      uRippleThickness: { value: rippleThickness },
      uScale: { value: patternScale },
      uShapeType: { value: SHAPE_MAP[variant] ?? 0 },
      uTime: { value: 0 },
    };

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const material = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      fragmentShader: FRAGMENT_SRC,
      glslVersion: THREE.GLSL3,
      transparent: true,
      uniforms,
      vertexShader: VERTEX_SRC,
    });
    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(quadGeometry, material);
    scene.add(quad);

    const clock = new THREE.Clock();
    const timeOffset = randomFloat() * 1000;
    let raf = 0;
    let clickIndex = 0;
    let composer: EffectComposer | undefined;
    let liquidTouch: TouchTexture | undefined;
    let liquidEffect: Effect | undefined;
    const timedEffects: Effect[] = [];

    if (liquid) {
      liquidTouch = createTouchTexture();
      liquidTouch.radiusScale = liquidRadius;
      composer = new EffectComposer(renderer);
      liquidEffect = createLiquidEffect(liquidTouch.texture, {
        freq: liquidWobbleSpeed,
        strength: liquidStrength,
      });

      const renderPass = new RenderPass(scene, camera);
      const effectPass = new EffectPass(camera, liquidEffect);
      effectPass.renderToScreen = true;
      composer.addPass(renderPass);
      composer.addPass(effectPass);
      timedEffects.push(liquidEffect);
    }

    if (noiseAmount > 0) {
      if (!composer) {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
      }

      const noiseEffect = createNoiseEffect(noiseAmount);
      const noisePass = new EffectPass(camera, noiseEffect);
      noisePass.renderToScreen = true;
      composer.addPass(noisePass);
      timedEffects.push(noiseEffect);
    }

    const setSize = () => {
      const width = Math.max(1, container.clientWidth || 1);
      const height = Math.max(1, container.clientHeight || 1);

      renderer.setSize(width, height, false);
      uniforms.uResolution.value.set(renderer.domElement.width, renderer.domElement.height);
      uniforms.uPixelSize.value = pixelSize * renderer.getPixelRatio();
      composer?.setSize(renderer.domElement.width, renderer.domElement.height);
    };

    const resizeObserver = new ResizeObserver(setSize);
    resizeObserver.observe(container);
    setSize();

    const mapToPixels = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const scaleX = renderer.domElement.width / rect.width;
      const scaleY = renderer.domElement.height / rect.height;
      const fx = (event.clientX - rect.left) * scaleX;
      const fy = (rect.height - (event.clientY - rect.top)) * scaleY;

      return {
        fx,
        fy,
        h: renderer.domElement.height,
        w: renderer.domElement.width,
      };
    };

    const handlePointerDown = (event: PointerEvent) => {
      const { fx, fy } = mapToPixels(event);
      uniforms.uClickPos.value[clickIndex].set(fx, fy);
      uniforms.uClickTimes.value[clickIndex] = uniforms.uTime.value;
      clickIndex = (clickIndex + 1) % MAX_CLICKS;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!liquidTouch) {
        return;
      }

      const { fx, fy, h, w } = mapToPixels(event);
      liquidTouch.addTouch({ x: fx / w, y: fy / h });
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown, { passive: true });
    renderer.domElement.addEventListener("pointermove", handlePointerMove, { passive: true });

    const animate = () => {
      if (autoPauseOffscreen && !visibilityRef.current.visible) {
        raf = window.requestAnimationFrame(animate);
        return;
      }

      uniforms.uTime.value = timeOffset + clock.getElapsedTime() * speed;

      for (const effect of timedEffects) {
        const uniform = effect.uniforms.get("uTime");
        if (uniform) {
          uniform.value = uniforms.uTime.value;
        }
      }

      if (composer) {
        liquidTouch?.update();
        composer.render();
      } else {
        renderer.render(scene, camera);
      }

      raf = window.requestAnimationFrame(animate);
    };

    raf = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      resizeObserver.disconnect();
      scene.remove(quad);
      quadGeometry.dispose();
      material.dispose();
      liquidTouch?.texture.dispose();
      composer?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [
    antialias,
    autoPauseOffscreen,
    color,
    edgeFade,
    enableRipples,
    liquid,
    liquidRadius,
    liquidStrength,
    liquidWobbleSpeed,
    noiseAmount,
    patternDensity,
    patternScale,
    pixelSize,
    pixelSizeJitter,
    rippleIntensityScale,
    rippleSpeed,
    rippleThickness,
    speed,
    transparent,
    variant,
  ]);

  return (
    <div
      aria-hidden="true"
      className={`h-full w-full overflow-hidden ${className}`}
      ref={containerRef}
      style={style}
    />
  );
}

export default PixelBlast;
