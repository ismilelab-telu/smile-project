import { Cancel01Icon, CheckIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { animate } from "motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { useLocalization, type Locale } from "@/features/localization/localization";

type AuthMode = "login" | "register";

type AuthPageProps = {
  mode: AuthMode;
};

type AuthField = {
  autoComplete: string;
  helper?: string;
  id: string;
  label: string;
  placeholder: string;
  type: "email" | "password" | "text";
};

type PasswordRule = "case" | "length" | "number";

type RainDrop = {
  charList: string;
  frameDelay: number;
  lastFrameTime: number;
  trailChars: Array<{ char: string; x: number; y: number }>;
  x: number;
  y: number;
};

type AuthModeCopy = {
  description: string;
  submit: string;
  switchAction: string;
  switchHref: string;
  switchLabel: string;
  title: string;
};

const authCopy = {
  en: {
    brand: "Smile Project",
    login: {
      description: "Enter your credentials below to sign in to your account",
      submit: "Sign In",
      switchAction: "Create one",
      switchHref: "/register",
      switchLabel: "Don't have an account?",
      title: "Sign in to your account",
    },
    register: {
      description: "Fill in the form below to create your account",
      submit: "Create Account",
      switchAction: "Sign in",
      switchHref: "/login",
      switchLabel: "Already have an account?",
      title: "Create your account",
    },
  },
  id: {
    brand: "Smile Project",
    login: {
      description: "",
      submit: "Masuk",
      switchAction: "Daftar",
      switchHref: "/register",
      switchLabel: "Belum punya akun?",
      title: "Masuk ke akunmu",
    },
    register: {
      description: "",
      submit: "Buat Akun",
      switchAction: "Masuk",
      switchHref: "/login",
      switchLabel: "Sudah punya akun?",
      title: "Buat akun baru",
    },
  },
} satisfies Record<
  Locale,
  {
    brand: string;
    login: AuthModeCopy;
    register: AuthModeCopy;
  }
>;

const brailleGlyphs =
  "⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⠠⠡⠢⠣⠤⠥⠦⠧⠨⠩⠪⠫⠬⠭⠮⠯⠰⠱⠲⠳⠴⠵⠶⠷⠸⠹⠺⠻⠼⠽⠾⠿⡀⡁⡂⡃⡄⡅⡆⡇⡈⡉⡊⡋⡌⡍⡎⡏⡐⡑⡒⡓⡔⡕⡖⡗⡘⡙⡚⡛⡜⡝⡞⡟⡠⡡⡢⡣⡤⡥⡦⡧⡨⡩⡪⡫⡬⡭⡮⡯⡰⡱⡲⡳⡴⡵⡶⡷⡸⡹⡺⡻⡼⡽⡾⡿⢀⢁⢂⢃⢄⢅⢆⢇⢈⢉⢊⢋⢌⢍⢎⢏⢐⢑⢒⢓⢔⢕⢖⢗⢘⢙⢚⢛⢜⢝⢞⢟⢠⢡⢢⢣⢤⢥⢦⢧⢨⢩⢪⢫⢬⢭⢮⢯⢰⢱⢲⢳⢴⢵⢶⢷⢸⢹⢺⢻⢼⢽⢾⢿⣀⣁⣂⣃⣄⣅⣆⣇⣈⣉⣊⣋⣌⣍⣎⣏⣐⣑⣒⣓⣔⣕⣖⣗⣘⣙⣚⣛⣜⣝⣞⣟⣠⣡⣢⣣⣤⣥⣦⣧⣨⣩⣪⣫⣬⣭⣮⣯⣰⣱⣲⣳⣴⣵⣶⣷⣸⣹⣺⣻⣼⣽⣾⣿";

const trailColors = [
  "rgba(24,24,27,0.62)",
  "rgba(24,24,27,0.44)",
  "rgba(24,24,27,0.28)",
  "rgba(24,24,27,0.16)",
  "rgba(24,24,27,0.08)",
];
const passwordRules: Array<{ id: PasswordRule; label: Record<Locale, string> }> = [
  { id: "length", label: { en: "8 characters long", id: "Minimal 8 karakter" } },
  { id: "case", label: { en: "Uppercase and lowercase", id: "Huruf besar dan kecil" } },
  { id: "number", label: { en: "Number", id: "Angka" } },
];

let previousAuthPanelRect: DOMRect | null = null;

export function AuthPage({ mode }: AuthPageProps) {
  const rootRef = useRef<HTMLElement>(null);
  const previousModeRef = useRef(mode);
  const { locale } = useLocalization();

  const rememberPanelRect = useCallback(() => {
    previousAuthPanelRect =
      rootRef.current?.querySelector<HTMLElement>("[data-auth-panel]")?.getBoundingClientRect() ??
      null;
  }, []);

  useLayoutEffect(() => {
    const previousMode = previousModeRef.current;

    if (previousMode === mode) {
      return;
    }

    previousModeRef.current = mode;

    const incomingPanel = rootRef.current?.querySelector<HTMLElement>("[data-auth-panel]");
    const previousRect = previousAuthPanelRect;

    if (!incomingPanel || !previousRect || shouldReduceMotion()) {
      previousAuthPanelRect = null;
      return;
    }

    const incomingRect = incomingPanel.getBoundingClientRect();
    const deltaX = previousRect.left - incomingRect.left;
    const deltaY = previousRect.top - incomingRect.top;

    previousAuthPanelRect = null;

    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
      return;
    }

    incomingPanel.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
    incomingPanel.style.willChange = "transform";
    incomingPanel.getBoundingClientRect();

    const controls = animate(
      incomingPanel,
      {
        transform: [`translate3d(${deltaX}px, ${deltaY}px, 0)`, "translate3d(0, 0, 0)"],
      },
      {
        damping: 30,
        mass: 1,
        stiffness: 220,
        type: "spring",
      },
    );

    void controls.finished.finally(() => {
      incomingPanel.style.transform = "";
      incomingPanel.style.willChange = "";
    });
  }, [mode]);

  const isRegister = mode === "register";

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-white text-foreground"
      data-auth-mode={mode}
      ref={rootRef}
    >
      <AuthMatrixRain />
      <section className="relative z-10 grid min-h-screen lg:grid-cols-2" data-auth-layout="split">
        {isRegister ? (
          <>
            <AuthFormPanel mode="register" onSwitchStart={rememberPanelRect} />
            <div className="hidden min-h-screen lg:block" />
          </>
        ) : (
          <>
            <div className="hidden min-h-screen lg:block" />
            <AuthFormPanel mode="login" onSwitchStart={rememberPanelRect} />
          </>
        )}
      </section>
      <span className="sr-only">{authCopy[locale][mode].title}</span>
    </main>
  );
}

function AuthFormPanel({ mode, onSwitchStart }: { mode: AuthMode; onSwitchStart: () => void }) {
  const { locale } = useLocalization();
  const copy = authCopy[locale][mode];
  const isRegister = mode === "register";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordTouched, setPasswordTouched] = useState(false);
  const [isConfirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const passwordRuleState = getPasswordRuleState(password);
  const passwordError = getPasswordValidationMessage(password, locale);
  const showPasswordError =
    isRegister && isPasswordTouched && password.length > 0 && passwordError !== "";
  const confirmPasswordError = getConfirmPasswordValidationMessage(
    password,
    confirmPassword,
    locale,
  );
  const showConfirmPasswordError =
    isRegister &&
    Boolean(confirmPasswordError) &&
    (confirmPassword.length > 0 || isConfirmPasswordTouched);

  return (
    <div
      className="relative flex min-h-screen flex-col bg-white p-7 text-foreground md:p-8"
      data-auth-panel={mode}
      data-page-surface="auth-panel"
    >
      <div className="absolute top-7 left-7 flex items-center justify-start md:top-8 md:left-8">
        {isRegister ? <AuthMark /> : null}
      </div>
      <div className="absolute top-7 right-7 flex items-center justify-end md:top-8 md:right-8">
        {isRegister ? null : <AuthMark alignRight />}
      </div>

      <div className="flex flex-1 items-center justify-center py-20">
        <div className="w-full max-w-sm text-foreground">
          <div className="space-y-1 text-left">
            <h1 className="text-[2rem] leading-tight font-semibold tracking-normal text-foreground">
              {copy.title}
            </h1>
            {copy.description ? (
              <p className="text-sm leading-6 text-muted-foreground">{copy.description}</p>
            ) : null}
          </div>

          <form
            className="mt-8 space-y-6"
            onSubmit={(event) => {
              event.preventDefault();

              if (!isRegister) {
                return;
              }

              setPasswordTouched(true);
              setConfirmPasswordTouched(true);
            }}
          >
            {getAuthFields(locale, mode).map((field) => {
              const validationContent =
                isRegister && field.id === "auth-password" ? (
                  <PasswordRequirements
                    error={showPasswordError ? passwordError : ""}
                    locale={locale}
                    password={password}
                    ruleState={passwordRuleState}
                  />
                ) : isRegister && field.id === "auth-confirm-password" ? (
                  <ConfirmPasswordStatus
                    isMatch={confirmPassword.length > 0 && password === confirmPassword}
                    isVisible={confirmPassword.length > 0 || showConfirmPasswordError}
                    locale={locale}
                    message={showConfirmPasswordError ? confirmPasswordError : ""}
                  />
                ) : undefined;

              return (
                <AuthInput
                  ariaDescribedBy={
                    isRegister && field.id === "auth-password"
                      ? "password-requirements"
                      : isRegister && field.id === "auth-confirm-password"
                        ? "confirm-password-status"
                        : undefined
                  }
                  isInvalid={
                    (field.id === "auth-password" && showPasswordError) ||
                    (field.id === "auth-confirm-password" && showConfirmPasswordError)
                  }
                  key={field.id}
                  field={field}
                  onBlur={
                    isRegister && field.id === "auth-password"
                      ? () => setPasswordTouched(true)
                      : isRegister && field.id === "auth-confirm-password"
                        ? () => setConfirmPasswordTouched(true)
                        : undefined
                  }
                  onChange={
                    isRegister && field.id === "auth-password"
                      ? setPassword
                      : isRegister && field.id === "auth-confirm-password"
                        ? setConfirmPassword
                        : undefined
                  }
                  value={
                    isRegister && field.id === "auth-password"
                      ? password
                      : isRegister && field.id === "auth-confirm-password"
                        ? confirmPassword
                        : undefined
                  }
                >
                  {validationContent}
                </AuthInput>
              );
            })}

            <button
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
              type="submit"
            >
              {copy.submit}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {copy.switchLabel}{" "}
            <a
              className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
              data-app-link
              href={copy.switchHref}
              onClick={onSwitchStart}
            >
              {copy.switchAction}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function AuthInput({
  ariaDescribedBy,
  children,
  field,
  isInvalid = false,
  onBlur,
  onChange,
  value,
}: {
  ariaDescribedBy?: string;
  children?: ReactNode;
  field: AuthField;
  isInvalid?: boolean;
  onBlur?: () => void;
  onChange?: (value: string) => void;
  value?: string;
}) {
  return (
    <div>
      <label className="mb-2.5 block text-[13px] font-semibold text-foreground" htmlFor={field.id}>
        {field.label}
      </label>
      <input
        aria-describedby={ariaDescribedBy}
        aria-invalid={isInvalid}
        autoComplete={field.autoComplete}
        className={`flex h-10 w-full rounded-md border bg-white/92 px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.02)] outline-none transition-colors placeholder:text-zinc-400 hover:border-zinc-500 focus:ring-2 ${
          isInvalid
            ? "border-rose-500 shadow-[0_0_0_2px_rgb(253_164_175_/_0.55),0_1px_2px_rgba(0,0,0,0.02)] focus:border-rose-500 focus:ring-rose-300/55"
            : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-500/45"
        }`}
        id={field.id}
        onBlur={onBlur}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        placeholder={field.placeholder}
        type={field.type}
        value={value}
      />
      {children ??
        (field.helper ? (
          <p className="mt-1.5 text-xs leading-4 text-muted-foreground">{field.helper}</p>
        ) : null)}
    </div>
  );
}

function PasswordRequirements({
  error,
  locale,
  password,
  ruleState,
}: {
  error: string;
  locale: Locale;
  password: string;
  ruleState: Record<PasswordRule, boolean>;
}) {
  const hasPassword = password.length > 0;
  const defaultMessage =
    locale === "en"
      ? "Must be at least 8 characters long, with uppercase, lowercase, and number."
      : "Minimal 8 karakter, dengan huruf besar, huruf kecil, dan angka.";

  return (
    <>
      <p
        className={`mt-1.5 overflow-hidden text-xs leading-4 transition-[max-height,opacity,transform,color] duration-200 ease-out ${
          hasPassword ? "max-h-0 -translate-y-1 opacity-0" : "max-h-8 translate-y-0 opacity-100"
        } ${error ? "text-rose-700" : "text-muted-foreground"}`}
        id="password-requirements-hint"
      >
        {error || defaultMessage}
      </p>
      <ul
        aria-label={locale === "en" ? "Password requirements" : "Syarat password"}
        className={`space-y-1.5 overflow-hidden pl-0.5 transition-[max-height,opacity,transform,margin] duration-200 ease-out ${
          hasPassword
            ? "mt-2 max-h-32 translate-y-0 overflow-visible opacity-100"
            : "mt-0 max-h-0 translate-y-1 opacity-0"
        }`}
        id="password-requirements"
      >
        {passwordRules.map((rule) => (
          <PasswordRequirementItem
            isValid={ruleState[rule.id]}
            key={rule.id}
            label={rule.label[locale]}
          />
        ))}
      </ul>
    </>
  );
}

function PasswordRequirementItem({ isValid, label }: { isValid: boolean; label: string }) {
  return (
    <li
      className={`flex items-center gap-2 text-xs leading-4 transition-colors ${
        isValid ? "text-emerald-700" : "text-muted-foreground"
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-[background-color,border-color,color,transform] duration-200 ease-out ${
          isValid
            ? "scale-105 border-emerald-700 bg-emerald-700 text-white"
            : "scale-100 border-zinc-400 bg-white text-transparent"
        }`}
      >
        <HugeiconsIcon className="size-3" icon={CheckIcon} strokeWidth={3} />
      </span>
      <span className={`relative inline-block transition-opacity ${isValid ? "opacity-80" : ""}`}>
        {label}
        <span
          aria-hidden="true"
          className={`absolute right-0 left-0 top-1/2 h-px origin-left -translate-y-1/2 bg-current transition-transform duration-200 ease-out ${
            isValid ? "scale-x-100" : "scale-x-0"
          }`}
        />
      </span>
    </li>
  );
}

function ConfirmPasswordStatus({
  isMatch,
  isVisible,
  locale,
  message,
}: {
  isMatch: boolean;
  isVisible: boolean;
  locale: Locale;
  message: string;
}) {
  const statusMessage =
    message ||
    (isMatch
      ? locale === "en"
        ? "matches password"
        : "cocok dengan password"
      : locale === "en"
        ? "does not match password"
        : "tidak cocok dengan password");

  return (
    <p
      aria-live="polite"
      className={`mt-1.5 flex items-center gap-1.5 overflow-hidden text-xs leading-4 font-medium transition-[max-height,opacity,transform,color] duration-200 ease-out ${
        isVisible ? "max-h-8 translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0"
      } ${isMatch ? "text-emerald-700" : "text-rose-700"}`}
      id="confirm-password-status"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-3.5 shrink-0 items-center justify-center"
      >
        <HugeiconsIcon
          className="size-3.5"
          icon={isMatch ? CheckIcon : Cancel01Icon}
          strokeWidth={2.4}
        />
      </span>
      <span>{statusMessage}</span>
    </p>
  );
}

function AuthMark({ alignRight = false }: { alignRight?: boolean }) {
  const { locale } = useLocalization();

  return (
    <a
      className={`inline-flex items-end text-sm font-semibold tracking-tight text-foreground ${
        alignRight ? "text-right" : ""
      }`}
      data-app-link
      href="/"
    >
      <span className="block translate-y-0.5 text-xl leading-none font-extrabold">
        {authCopy[locale].brand}
      </span>
    </a>
  );
}

function AuthMatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    let frameId = 0;
    let fadeInterval = 0;
    let stopAnimation = false;
    let canvasWidth = 0;
    let canvasHeight = 0;
    let raindrops: RainDrop[] = [];

    const getFont = () => {
      const monoFont = getComputedStyle(document.documentElement)
        .getPropertyValue("--font-mono")
        .trim();

      return `14px ${monoFont || "monospace"}`;
    };

    const createRaindrops = () => {
      const columnWidth = 12;
      const columnCount = Math.max(1, Math.floor(canvasWidth / columnWidth));
      const dropCount = Math.floor(columnCount * 2);

      raindrops = Array.from({ length: dropCount }, () => ({
        charList: brailleGlyphs,
        frameDelay: randomInt(50, 130),
        lastFrameTime: 0,
        trailChars: [],
        x: randomInt(0, columnCount) * columnWidth,
        y: random(0, canvasHeight),
      }));
    };

    const resize = () => {
      canvas.width = canvasWidth = canvas.parentElement?.clientWidth ?? window.innerWidth;
      canvas.height = canvasHeight = canvas.parentElement?.clientHeight ?? window.innerHeight;
      context.textAlign = "center";
      context.imageSmoothingEnabled = false;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      createRaindrops();
    };

    const clearTrail = (drop: RainDrop) => {
      context.save();
      context.font = getFont();
      context.shadowColor = "rgba(0,0,0,0)";
      context.shadowBlur = 0;

      for (let index = drop.trailChars.length - 1; index >= 0; index -= 1) {
        const trailChar = drop.trailChars[index];

        if (!trailChar) {
          continue;
        }

        context.fillStyle = "#ffffff";
        context.fillRect(trailChar.x - 15.4, trailChar.y - 25, 30.8, 26.6);
        context.fillStyle = trailColors[index] ?? trailColors[trailColors.length - 1];
        context.fillText(trailChar.char, trailChar.x, trailChar.y);
      }

      context.restore();
    };

    const drawDrop = (drop: RainDrop) => {
      const char = drop.charList[randomInt(0, drop.charList.length - 1)] ?? "0";

      drop.trailChars.unshift({ char, x: drop.x, y: drop.y });
      drop.trailChars.splice(trailColors.length);

      context.save();
      context.font = getFont();
      context.shadowColor = "rgba(9,9,11,0)";
      context.shadowBlur = 0;
      context.fillStyle = "rgba(9,9,11,0.88)";
      context.fillText(char, drop.x, drop.y);
      context.restore();

      drop.y += random(0, 10);
      drop.x += random(-0.75, 0.75);
      drop.y += 18;

      if (drop.y > canvasHeight) {
        const columnWidth = 12;
        const columnCount = Math.max(1, Math.floor(canvasWidth / columnWidth));

        drop.x = randomInt(0, columnCount) * columnWidth;
        drop.y = random(-100, 0);
        drop.frameDelay = randomInt(50, 130);
        drop.trailChars = [];
      }
    };

    const render = () => {
      if (stopAnimation) {
        return;
      }

      const now = Date.now();

      for (const drop of raindrops) {
        if (now - drop.lastFrameTime > drop.frameDelay) {
          clearTrail(drop);
        }
      }

      for (const drop of raindrops) {
        if (now - drop.lastFrameTime > drop.frameDelay) {
          drawDrop(drop);
          drop.lastFrameTime = now;
        }
      }

      frameId = window.requestAnimationFrame(render);
    };

    const resizeObserver = new ResizeObserver(resize);

    resize();
    resizeObserver.observe(canvas.parentElement ?? canvas);

    if (!shouldReduceMotion()) {
      fadeInterval = window.setInterval(() => {
        context.fillStyle = "rgba(255,255,255,0.03)";
        context.fillRect(0, 0, canvasWidth, canvasHeight);
      }, 20);
      render();
    }

    return () => {
      stopAnimation = true;
      window.cancelAnimationFrame(frameId);
      window.clearInterval(fadeInterval);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-white">
      <canvas className="absolute inset-0 h-full w-full" ref={canvasRef} />
    </div>
  );
}

function getAuthFields(locale: Locale, mode: AuthMode): AuthField[] {
  const labels = {
    en: {
      confirmPassword: "Confirm Password",
      confirmPasswordHelper: "Please confirm your password.",
      email: "Email",
      emailHelper: "Optional for display. Not used in the demo login process.",
      name: "Full Name",
      nameHelper: "This name is used as the username on the welcome page.",
      password: "Password",
      passwordHelper: "Must be at least 8 characters long, with uppercase, lowercase, and number.",
    },
    id: {
      confirmPassword: "Konfirmasi Password",
      confirmPasswordHelper: "Ulangi password yang sama.",
      email: "Email",
      emailHelper: "Opsional untuk tampilan. Tidak dipakai pada proses login demo ini.",
      name: "Nama Lengkap",
      nameHelper: "",
      password: "Password",
      passwordHelper: "",
    },
  } satisfies Record<Locale, Record<string, string>>;
  const copy = labels[locale];

  if (mode === "login") {
    return [
      {
        autoComplete: "email",
        id: "auth-email",
        label: copy.email,
        placeholder: "m@example.com",
        type: "email",
      },
      {
        autoComplete: "current-password",
        id: "auth-password",
        label: copy.password,
        placeholder: "",
        type: "password",
      },
    ];
  }

  return [
    {
      autoComplete: "name",
      helper: copy.nameHelper,
      id: "auth-name",
      label: copy.name,
      placeholder: "John Doe",
      type: "text",
    },
    {
      autoComplete: "email",
      helper: copy.emailHelper,
      id: "auth-email",
      label: copy.email,
      placeholder: "m@example.com",
      type: "email",
    },
    {
      autoComplete: "new-password",
      helper: copy.passwordHelper,
      id: "auth-password",
      label: copy.password,
      placeholder: "",
      type: "password",
    },
    {
      autoComplete: "new-password",
      helper: copy.confirmPasswordHelper,
      id: "auth-confirm-password",
      label: copy.confirmPassword,
      placeholder: "",
      type: "password",
    },
  ];
}

function shouldReduceMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function getPasswordRuleState(password: string): Record<PasswordRule, boolean> {
  return {
    case: /[a-z]/.test(password) && /[A-Z]/.test(password),
    length: password.length >= 8,
    number: /[0-9]/.test(password),
  };
}

function getPasswordValidationMessage(password: string, locale: Locale) {
  if (password.length === 0) {
    return "";
  }

  const ruleState = getPasswordRuleState(password);

  if (!ruleState.length) {
    return locale === "en"
      ? "Password must be at least 8 characters."
      : "Password minimal 8 karakter.";
  }

  if (!ruleState.case) {
    return locale === "en"
      ? "Password must include lowercase and uppercase letters."
      : "Password harus punya huruf kecil dan huruf besar.";
  }

  if (!ruleState.number) {
    return locale === "en" ? "Password must include a number." : "Password harus punya angka.";
  }

  return "";
}

function getConfirmPasswordValidationMessage(
  password: string,
  confirmPassword: string,
  locale: Locale,
) {
  if (confirmPassword.length === 0) {
    return "";
  }

  if (password === confirmPassword) {
    return "";
  }

  return locale === "en"
    ? "Password confirmation does not match."
    : "Konfirmasi password tidak cocok.";
}

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number) {
  return Math.floor(random(min, max));
}
