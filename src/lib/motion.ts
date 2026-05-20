type NavigatorConnectionHints = {
  saveData?: boolean;
};

type NavigatorPerformanceHints = Navigator & {
  connection?: NavigatorConnectionHints;
  deviceMemory?: number;
};

const motionPreferenceKey = "smile-motion";

function getStoredMotionPreference() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(motionPreferenceKey);
  } catch {
    return null;
  }
}

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function isLowPowerDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const performanceHints = navigator as NavigatorPerformanceHints;
  const cores = navigator.hardwareConcurrency;
  const memory = performanceHints.deviceMemory;
  const saveData = performanceHints.connection?.saveData === true;
  const hasVeryFewCores = typeof cores === "number" && cores > 0 && cores <= 2;
  const hasLowMemory = typeof memory === "number" && memory > 0 && memory <= 4;
  const hasLimitedCores = typeof cores === "number" && cores > 0 && cores <= 4;

  return saveData || hasVeryFewCores || (hasLowMemory && hasLimitedCores);
}

export function shouldReduceMotion() {
  const storedPreference = getStoredMotionPreference();

  if (storedPreference === "full") {
    return false;
  }

  if (storedPreference === "reduced") {
    return true;
  }

  return prefersReducedMotion() || isLowPowerDevice();
}

export function shouldUseLightweightVisuals() {
  return shouldReduceMotion();
}
