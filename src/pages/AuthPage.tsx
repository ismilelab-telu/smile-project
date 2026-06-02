import {
  ArrowLeft02Icon,
  Cancel01Icon,
  CheckIcon,
  ChevronUpIcon,
  EyeOffIcon,
  LanguageSkillIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { useAuth } from "@/features/auth/auth-context";
import { CognitoAuthError } from "@/features/auth/cognito-auth";
import { localeOptions, useLocalization, type Locale } from "@/features/localization/localization";

type AuthMode = "login" | "register";
type AuthLoginMethod = "email" | "username";

type AuthPageProps = {
  closeHref?: string;
  mode: AuthMode;
  onAuthenticated?: () => void;
  onClose?: () => void;
  onModeChange?: (mode: AuthMode) => void;
  successHref?: string;
  titleOverride?: string;
};

type AuthField = {
  autoComplete: string;
  helper?: string;
  id: string;
  label: string;
  placeholder: string;
  type: "email" | "password" | "text";
};

type AuthStatusMessage =
  | { destination?: string; kind: "confirmation-sent" }
  | { kind: "account-unconfirmed" }
  | { destination?: string; kind: "password-reset-sent" }
  | { kind: "password-reset-complete" };

type PasswordRule = "case" | "length" | "number" | "symbol";

function isAuthIdentifierField(fieldId: string) {
  return fieldId === "auth-email" || fieldId === "auth-username";
}

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
      description: "",
      submit: "Sign In",
      switchAction: "Create one",
      switchHref: "/register",
      switchLabel: "Don't have an account?",
      title: "Sign in to your account",
    },
    register: {
      description: "",
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

const authIllustrationImageUrl = new URL(
  "../../assets/43096caa-9b82-474a-a51d-99d4721a99ca.png",
  import.meta.url,
).href;
const passwordMinLength = 12;
const passwordSymbols = "^$*.[]{}()?\"!@#%&/\\,><':;|_~`=+-";
const passwordRules: Array<{ id: PasswordRule; label: Record<Locale, string> }> = [
  { id: "length", label: { en: "12 characters long", id: "Minimal 12 karakter" } },
  { id: "case", label: { en: "Uppercase and lowercase", id: "Huruf besar dan kecil" } },
  { id: "number", label: { en: "Number", id: "Angka" } },
  { id: "symbol", label: { en: "Symbol", id: "Simbol" } },
];
const OTP_CODE_LENGTH = 6;
const authPortalBackdropVisible = { filter: "blur(0px)", opacity: 1 };
const authPortalBackdropHidden = { filter: "blur(4px)", opacity: 0 };
const authPortalPanelHidden = {
  opacity: 0,
  transform: "perspective(500px) rotateX(-20deg) scale(0.8)",
};
const authPortalPanelVisible = {
  opacity: 1,
  transform: "perspective(500px) rotateX(0deg) scale(1)",
};
const authIllustrationHidden = { filter: "blur(0px)", opacity: 0, scale: 1 };
const authIllustrationVisible = { filter: "blur(0px)", opacity: 1, scale: 1 };
const authPortalBackdropTransition = { duration: 0.2, ease: "easeInOut" };
const authIllustrationTransition = { duration: 0.32, ease: "easeOut" };
const authPortalPanelTransition = { duration: 0.36, ease: "easeOut" };
const authSharedLayoutTransition = { duration: 0.36, ease: "easeOut" };
const authRegisterFieldRevealTransition = { duration: 0.36, ease: "easeOut" };

export function AuthPage({
  closeHref = "/learn",
  mode,
  onAuthenticated,
  onClose,
  onModeChange,
  successHref,
  titleOverride,
}: AuthPageProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const { locale } = useLocalization();
  const [isConfirmingAuthStep, setConfirmingAuthStep] = useState(false);
  const safeCloseHref = isAuthHref(closeHref) ? "/learn" : closeHref;
  const resolvedSuccessHref = successHref ?? safeCloseHref;
  const safeSuccessHref = isAuthHref(resolvedSuccessHref) ? "/learn" : resolvedSuccessHref;
  const dialogTitle = isConfirmingAuthStep
    ? getSecondaryAuthStepTitle(locale)
    : (titleOverride ?? authCopy[locale][mode].title);

  const navigateToCloseHref = useCallback(() => {
    window.history.pushState(null, "", safeCloseHref);
    window.dispatchEvent(new PopStateEvent("popstate"));
    onClose?.();
  }, [onClose, safeCloseHref]);

  const closePortal = useCallback(() => {
    if (isClosing) {
      return;
    }

    if (shouldReduceMotion()) {
      navigateToCloseHref();
      return;
    }

    setIsClosing(true);
  }, [isClosing, navigateToCloseHref]);

  const handlePanelAnimationComplete = useCallback(() => {
    if (isClosing) {
      navigateToCloseHref();
    }
  }, [isClosing, navigateToCloseHref]);

  useEffect(() => {
    setPortalTarget(document.body);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePortal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePortal]);

  useEffect(() => {
    rootRef.current?.focus();
  }, [isConfirmingAuthStep, mode]);

  const portalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = rootRef.current;
    if (!dialog) return;

    const handleFocusTrap = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const focusableSelector =
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const focusableElements = dialog.querySelectorAll<HTMLElement>(focusableSelector);
      if (focusableElements.length === 0) return;

      const firstFocusable = focusableElements[0]!;
      const lastFocusable = focusableElements[focusableElements.length - 1]!;

      if (event.shiftKey) {
        if (document.activeElement === firstFocusable || document.activeElement === dialog) {
          event.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    dialog.addEventListener("keydown", handleFocusTrap);
    return () => dialog.removeEventListener("keydown", handleFocusTrap);
  }, [isConfirmingAuthStep, mode]);

  useEffect(() => {
    const portalContainer = portalContainerRef.current;
    if (!portalContainer) return;

    const parentElement = portalContainer.parentElement;
    if (!parentElement) return;

    const siblings: Element[] = [];
    for (const child of parentElement.children) {
      if (child !== portalContainer && !child.hasAttribute("inert")) {
        child.setAttribute("inert", "");
        siblings.push(child);
      }
    }

    return () => {
      for (const sibling of siblings) {
        sibling.removeAttribute("inert");
      }
    };
  }, [portalTarget]);

  const isRegister = mode === "register";

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain px-4 md:px-8"
      data-auth-portal
      ref={portalContainerRef}
    >
      <motion.button
        animate={isClosing ? authPortalBackdropHidden : authPortalBackdropVisible}
        aria-label={locale === "en" ? "Close authentication" : "Tutup autentikasi"}
        className="fixed inset-0 cursor-default bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/65"
        initial={authPortalBackdropHidden}
        onClick={closePortal}
        transition={authPortalBackdropTransition}
        type="button"
      />
      <div
        className="relative z-10 flex min-h-full items-center justify-center py-5 md:py-8"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closePortal();
          }
        }}
      >
        <motion.main
          animate={isClosing ? authPortalPanelHidden : authPortalPanelVisible}
          aria-labelledby="auth-dialog-title"
          aria-modal="true"
          className={`relative grid w-full transform-gpu overflow-hidden border-2 border-neutral-950 bg-white text-foreground shadow-2xl outline-none ${
            isConfirmingAuthStep
              ? "h-[min(620px,calc(100vh_-_2.5rem))] max-w-[30rem] md:h-[min(640px,calc(100vh_-_4rem))]"
              : "h-[min(720px,calc(100vh_-_2.5rem))] max-w-5xl md:h-[min(760px,calc(100vh_-_4rem))]"
          }`}
          data-auth-mode={mode}
          data-auth-step={isConfirmingAuthStep ? "confirmation" : "credentials"}
          initial={authPortalPanelHidden}
          layout
          layoutDependency={isConfirmingAuthStep ? "confirmation" : "credentials"}
          onAnimationComplete={handlePanelAnimationComplete}
          ref={rootRef}
          role="dialog"
          tabIndex={-1}
          transition={authPortalPanelTransition}
        >
          <motion.button
            aria-label={locale === "en" ? "Close" : "Tutup"}
            className="absolute top-5 right-5 z-30 inline-flex size-10 cursor-pointer items-center justify-center bg-white/90 text-neutral-950 transition-colors hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            layout="position"
            onClick={closePortal}
            transition={authSharedLayoutTransition}
            type="button"
          >
            <HugeiconsIcon
              aria-hidden="true"
              className="size-5"
              icon={Cancel01Icon}
              strokeWidth={2}
            />
          </motion.button>
          <AuthLanguageSwitcher isCompact={isConfirmingAuthStep} isRegister={isRegister} />
          <AuthIllustration isRegister={isRegister} />
          <LayoutGroup id="auth-form-layout">
            <motion.section
              className={`relative z-10 grid ${
                isConfirmingAuthStep ? "h-full" : "h-full lg:grid-cols-2"
              }`}
              data-auth-layout="split"
              layout
              layoutDependency={isConfirmingAuthStep ? "confirmation" : "credentials"}
              transition={authSharedLayoutTransition}
            >
              <AuthFormPanel
                className={
                  isConfirmingAuthStep ? "" : isRegister ? "lg:col-start-1" : "lg:col-start-2"
                }
                mode={mode}
                onAuthenticated={onAuthenticated}
                onConfirmingChange={setConfirmingAuthStep}
                onModeChange={onModeChange}
                successHref={safeSuccessHref}
                titleOverride={titleOverride}
              />
            </motion.section>
          </LayoutGroup>
          <span className="sr-only" id="auth-dialog-title">
            {dialogTitle}
          </span>
        </motion.main>
      </div>
    </div>,
    portalTarget,
  );
}

function AuthLanguageSwitcher({
  isCompact,
  isRegister,
}: {
  isCompact: boolean;
  isRegister: boolean;
}) {
  const { locale, setLocale, t } = useLocalization();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node | null)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <motion.div
      className={`absolute bottom-5 z-30 flex w-[215px] max-w-[calc(100%_-_2.5rem)] flex-col items-stretch md:bottom-7 ${
        isCompact
          ? "left-1/2 -translate-x-1/2"
          : isRegister
            ? "left-5 md:left-7"
            : "right-5 md:right-7"
      }`}
      layout="position"
      ref={rootRef}
      transition={authSharedLayoutTransition}
    >
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`absolute bottom-full mb-3 grid w-full overflow-hidden border border-neutral-300 bg-white shadow-lg ${
              isCompact
                ? "left-1/2 origin-bottom -translate-x-1/2"
                : isRegister
                  ? "left-0 origin-bottom-left"
                  : "right-0 origin-bottom-right"
            }`}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            {localeOptions.map((option) => {
              const isSelected = option.value === locale;
              const label = t(option.labelKey);
              const ariaLabel = option.value === "id" ? t("language.use.id") : t("language.use.en");

              return (
                <button
                  aria-label={ariaLabel}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-emerald-400 ${
                    isSelected ? "bg-emerald-50 text-emerald-700" : "text-neutral-950"
                  }`}
                  key={option.value}
                  onClick={() => {
                    setLocale(option.value);
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  <span aria-hidden="true" className="text-xl leading-none">
                    {option.flag}
                  </span>
                  <span>{label}</span>
                  {isSelected ? (
                    <HugeiconsIcon
                      aria-hidden="true"
                      className="ml-auto size-5"
                      icon={CheckIcon}
                      strokeWidth={2}
                    />
                  ) : null}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <button
        aria-expanded={isOpen}
        aria-label={t("language.triggerAria")}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-none border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:border-emerald-500 hover:text-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <HugeiconsIcon
          aria-hidden="true"
          className="size-5"
          icon={LanguageSkillIcon}
          strokeWidth={2}
        />
        <span>{t("language.trigger")}</span>
        <span className="font-normal text-neutral-500">
          {t(locale === "id" ? "language.option.id" : "language.option.en")}
        </span>
        <HugeiconsIcon
          aria-hidden="true"
          className={`ml-auto size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          icon={ChevronUpIcon}
          strokeWidth={2}
        />
      </button>
    </motion.div>
  );
}

function AuthFormPanel({
  className,
  mode,
  onAuthenticated,
  onConfirmingChange,
  onModeChange,
  successHref,
  titleOverride,
}: {
  className: string;
  mode: AuthMode;
  onAuthenticated?: () => void;
  onConfirmingChange?: (isConfirming: boolean) => void;
  onModeChange?: (mode: AuthMode) => void;
  successHref: string;
  titleOverride?: string;
}) {
  const auth = useAuth();
  const { locale } = useLocalization();
  const copy = authCopy[locale][mode];
  const title = titleOverride ?? copy.title;
  const isRegister = mode === "register";
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginMethod, setLoginMethod] = useState<AuthLoginMethod>("username");
  const [loginPassword, setLoginPassword] = useState("");
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [confirmationDestination, setConfirmationDestination] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [passwordResetEmail, setPasswordResetEmail] = useState("");
  const [passwordResetPassword, setPasswordResetPassword] = useState("");
  const [passwordResetConfirmPassword, setPasswordResetConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isNameTouched, setNameTouched] = useState(false);
  const [isEmailTouched, setEmailTouched] = useState(false);
  const [isPasswordTouched, setPasswordTouched] = useState(false);
  const [isConfirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [resendClock, setResendClock] = useState(() => Date.now());
  const [statusMessage, setStatusMessage] = useState<AuthStatusMessage | null>(null);
  const name = registerName;
  const email = isRegister ? registerEmail : loginIdentifier;
  const password = isRegister ? registerPassword : loginPassword;
  const confirmPassword = registerConfirmPassword;
  const activePassword = passwordResetEmail ? passwordResetPassword : password;
  const usernameError = getUsernameValidationMessage(name, locale);
  const trimmedEmail = email.trim();
  const isUsernameSignIn = !isRegister && loginMethod === "username";
  const isEmailFieldActive = isRegister || loginMethod === "email";
  const isEmailValid = isValidEmailAddress(trimmedEmail);
  const loginUsernameError = isUsernameSignIn ? getUsernameValidationMessage(email, locale) : "";
  const showNameValidation =
    isRegister && isNameTouched && name.trim().length > 0 && usernameError !== "";
  const showEmailValidation =
    isEmailFieldActive && isEmailTouched && trimmedEmail.length > 0 && !isEmailValid;
  const showLoginUsernameValidation =
    isUsernameSignIn && isEmailTouched && trimmedEmail.length > 0 && loginUsernameError !== "";
  const passwordRuleState = getPasswordRuleState(activePassword);
  const passwordError = getPasswordValidationMessage(activePassword, locale);
  const canShowConfirmPassword = isRegister && password.length > 0 && passwordError === "";
  const showPasswordError = isRegister && isPasswordTouched && passwordError !== "";
  const confirmPasswordError = getConfirmPasswordValidationMessage(
    password,
    confirmPassword,
    locale,
  );
  const passwordResetConfirmPasswordError = getConfirmPasswordValidationMessage(
    passwordResetPassword,
    passwordResetConfirmPassword,
    locale,
  );
  const showConfirmPasswordError =
    isRegister &&
    Boolean(confirmPasswordError) &&
    (confirmPassword.length > 0 || isConfirmPasswordTouched);
  const isConfirmingAccount = confirmationEmail.length > 0;
  const isResettingPassword = passwordResetEmail.length > 0;
  const isSecondaryAuthStep = isConfirmingAccount || isResettingPassword;
  const showPasswordResetError = isResettingPassword && isPasswordTouched && passwordError !== "";
  const showPasswordResetConfirmPasswordError =
    isResettingPassword &&
    Boolean(passwordResetConfirmPasswordError) &&
    (passwordResetConfirmPassword.length > 0 || isConfirmPasswordTouched);
  const visibleErrorMessage = errorMessage;
  const renderedStatusMessage = statusMessage ? getAuthStatusMessage(statusMessage, locale) : "";
  const confirmationTitle = getConfirmationStepTitle(locale);
  const resendCooldownSeconds = Math.max(0, Math.ceil((resendAvailableAt - resendClock) / 1000));
  const canResendCode = resendCooldownSeconds <= 0 && !isSubmitting;
  const credentialsPanelPaddingClass = getCredentialsPanelPaddingClass({
    hasFeedback: Boolean(visibleErrorMessage || renderedStatusMessage),
    hasPassword: password.length > 0,
    hasRevealedConfirmPassword: canShowConfirmPassword,
    isRegister,
  });

  useEffect(() => {
    setConfirmationCode("");
    setConfirmationDestination("");
    setConfirmationEmail("");
    setPasswordResetEmail("");
    setPasswordResetPassword("");
    setPasswordResetConfirmPassword("");
    setErrorMessage("");
    setPasswordVisible(false);
    setNameTouched(false);
    setEmailTouched(false);
    setPasswordTouched(false);
    setConfirmPasswordVisible(false);
    setConfirmPasswordTouched(false);
    setResendAvailableAt(0);
    setResendClock(Date.now());
    setStatusMessage(null);
  }, [mode]);

  useEffect(() => {
    onConfirmingChange?.(isSecondaryAuthStep);
  }, [isSecondaryAuthStep, onConfirmingChange]);

  useEffect(() => {
    if (resendAvailableAt <= Date.now()) {
      return;
    }

    const intervalId = window.setInterval(() => setResendClock(Date.now()), 250);

    return () => window.clearInterval(intervalId);
  }, [resendAvailableAt]);

  useEffect(() => {
    return () => onConfirmingChange?.(false);
  }, [onConfirmingChange]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedIdentifier = email.trim();
    const normalizedEmail = trimmedIdentifier.toLowerCase();
    const isSubmittingUsername = !isRegister && loginMethod === "username";

    setErrorMessage("");
    setStatusMessage(null);

    if (isResettingPassword) {
      setPasswordTouched(true);
      setConfirmPasswordTouched(true);

      if (confirmationCode.trim().length < OTP_CODE_LENGTH) {
        setErrorMessage(
          locale === "en" ? "Enter the 6-digit reset code." : "Masukkan 6 digit kode reset.",
        );
        return;
      }

      if (passwordError || !passwordResetConfirmPassword) {
        setErrorMessage(
          locale === "en"
            ? "Check the new password and confirmation first."
            : "Cek sandi baru dan konfirmasinya dulu.",
        );
        return;
      }

      if (passwordResetConfirmPasswordError) {
        setErrorMessage(passwordResetConfirmPasswordError);
        return;
      }

      setIsSubmitting(true);

      try {
        await auth.confirmPasswordReset({
          code: confirmationCode.trim(),
          email: passwordResetEmail,
          password: passwordResetPassword,
        });
        setConfirmationCode("");
        setPasswordResetPassword("");
        setPasswordResetConfirmPassword("");
        setLoginMethod("email");
        setLoginIdentifier(passwordResetEmail);
        setLoginPassword("");
        setPasswordResetEmail("");
        setStatusMessage({ kind: "password-reset-complete" });
      } catch (error) {
        setErrorMessage(getAuthErrorMessage(error, locale));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!trimmedIdentifier) {
      setErrorMessage(
        isSubmittingUsername
          ? locale === "en"
            ? "Username is required."
            : "Username wajib diisi."
          : locale === "en"
            ? "Email is required."
            : "Email wajib diisi.",
      );
      return;
    }

    if (isSubmittingUsername) {
      const usernameLoginError = getUsernameValidationMessage(trimmedIdentifier, locale);

      if (usernameLoginError) {
        setEmailTouched(true);
        setErrorMessage(usernameLoginError);
        return;
      }
    } else if (!isValidEmailAddress(normalizedEmail)) {
      setEmailTouched(true);
      setErrorMessage(
        locale === "en" ? "Enter a valid email address." : "Masukkan email yang valid.",
      );
      return;
    }

    if (!password) {
      setErrorMessage(locale === "en" ? "Password is required." : "Sandi wajib diisi.");
      return;
    }

    if (isRegister && !isConfirmingAccount) {
      setNameTouched(true);
      setPasswordTouched(true);
      setConfirmPasswordTouched(true);

      if (!name.trim()) {
        setErrorMessage(locale === "en" ? "Username is required." : "Username wajib diisi.");
        return;
      }

      if (usernameError) {
        setErrorMessage(usernameError);
        return;
      }

      if (passwordError || !confirmPassword) {
        setErrorMessage(
          locale === "en"
            ? "Check the password and confirmation first."
            : "Cek sandi dan konfirmasinya dulu.",
        );
        return;
      }

      if (confirmPasswordError) {
        setErrorMessage("");
        return;
      }
    }

    if (isConfirmingAccount && confirmationCode.trim().length < OTP_CODE_LENGTH) {
      setErrorMessage(
        locale === "en"
          ? "Enter the 6-digit verification code."
          : "Masukkan 6 digit kode verifikasi.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      if (isRegister && !isConfirmingAccount) {
        const signUpResult = await auth.signUp({
          email: normalizedEmail,
          name: name.trim(),
        });

        if (signUpResult.userConfirmed) {
          await auth.signIn({ identifier: normalizedEmail, method: "email", password });
          redirectAfterAuth(successHref, onAuthenticated);
          return;
        }

        setConfirmationDestination(signUpResult.destination ?? "");
        setConfirmationEmail(normalizedEmail);
        setResendAvailableAt(getResendCooldownUntil(signUpResult));
        setResendClock(Date.now());
        setStatusMessage({ destination: signUpResult.destination, kind: "confirmation-sent" });
        return;
      }

      if (isConfirmingAccount) {
        await auth.confirmSignUp({
          code: confirmationCode.trim(),
          email: confirmationEmail,
          password,
        });
        await auth.signIn({ identifier: confirmationEmail, method: "email", password });
        redirectAfterAuth(successHref, onAuthenticated);
        return;
      }

      await auth.signIn({
        identifier: isSubmittingUsername ? trimmedIdentifier : normalizedEmail,
        method: isSubmittingUsername ? "username" : "email",
        password,
      });
      redirectAfterAuth(successHref, onAuthenticated);
    } catch (error) {
      if (error instanceof CognitoAuthError && error.code === "UserNotConfirmedException") {
        if (isSubmittingUsername) {
          setErrorMessage(
            locale === "en"
              ? "This account still needs email verification. Use email instead to enter the code."
              : "Akun ini masih perlu verifikasi email. Pakai email saja untuk memasukkan kode.",
          );
          return;
        }

        setConfirmationEmail(normalizedEmail);
        setStatusMessage({ kind: "account-unconfirmed" });
        return;
      }

      setErrorMessage(getAuthErrorMessage(error, locale));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const resetEmail = loginIdentifier.trim().toLowerCase();

    setErrorMessage("");
    setStatusMessage(null);

    if (loginMethod !== "email" || !isValidEmailAddress(resetEmail)) {
      setLoginMethod("email");
      if (isValidEmailAddress(resetEmail)) {
        setLoginIdentifier(resetEmail);
      }
      setEmailTouched(true);
      setErrorMessage(
        locale === "en"
          ? "Enter your account email to reset the password."
          : "Masukkan email akun untuk reset sandi.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await auth.requestPasswordReset(resetEmail);
      setConfirmationCode("");
      setPasswordResetEmail(resetEmail);
      setPasswordResetPassword("");
      setPasswordResetConfirmPassword("");
      setResendAvailableAt(Date.now() + 30_000);
      setResendClock(Date.now());
      setStatusMessage({ destination: result.destination, kind: "password-reset-sent" });
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, locale));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    const resendEmail = passwordResetEmail || confirmationEmail || email.trim().toLowerCase();

    if (!resendEmail || !canResendCode) {
      return;
    }

    setConfirmationCode("");
    setErrorMessage("");
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      if (passwordResetEmail) {
        const result = await auth.requestPasswordReset(passwordResetEmail);
        setResendAvailableAt(Date.now() + 30_000);
        setStatusMessage({ destination: result.destination, kind: "password-reset-sent" });
      } else {
        const result = await auth.resendConfirmationCode(resendEmail);
        setResendAvailableAt(getResendCooldownUntil(result));
        setStatusMessage({ destination: confirmationDestination, kind: "confirmation-sent" });
      }
      setResendClock(Date.now());
    } catch (error) {
      if (error instanceof CognitoAuthError && error.retryAfterSeconds) {
        setResendAvailableAt(Date.now() + error.retryAfterSeconds * 1000);
        setResendClock(Date.now());
      }
      setErrorMessage(getAuthErrorMessage(error, locale));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToCredentials = () => {
    setConfirmationCode("");
    setConfirmationDestination("");
    setConfirmationEmail("");
    setPasswordResetEmail("");
    setPasswordResetPassword("");
    setPasswordResetConfirmPassword("");
    setErrorMessage("");
    setStatusMessage(null);
  };

  const getFieldValue = (fieldId: string) => {
    if (fieldId === "auth-name") {
      return registerName;
    }

    if (isAuthIdentifierField(fieldId)) {
      return isRegister ? registerEmail : loginIdentifier;
    }

    if (fieldId === "auth-password") {
      return isRegister ? registerPassword : loginPassword;
    }

    if (fieldId === "auth-confirm-password") {
      return registerConfirmPassword;
    }

    return "";
  };

  const getFieldChangeHandler = (fieldId: string) => {
    if (fieldId === "auth-name") {
      return setRegisterName;
    }

    if (isAuthIdentifierField(fieldId)) {
      return isRegister ? setRegisterEmail : setLoginIdentifier;
    }

    if (fieldId === "auth-password") {
      return isRegister ? setRegisterPassword : setLoginPassword;
    }

    if (fieldId === "auth-confirm-password") {
      return setRegisterConfirmPassword;
    }

    return undefined;
  };
  const currentFields = getAuthFields(locale, mode, loginMethod);
  const registerFields = getAuthFields(locale, "register");
  const nameField = findAuthField(registerFields, "auth-name");
  const emailField = findAuthField(
    currentFields,
    loginMethod === "username" && !isRegister ? "auth-username" : "auth-email",
  );
  const passwordField = findAuthField(currentFields, "auth-password");
  const confirmPasswordField = findAuthField(registerFields, "auth-confirm-password");
  const switchMode: AuthMode = isRegister ? "login" : "register";
  const switchClassName =
    "font-medium text-foreground underline underline-offset-4 transition-colors hover:text-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400";
  const handleModeSwitch = () => {
    onModeChange?.(switchMode);
  };
  const loginMethodToggleLabel =
    loginMethod === "username"
      ? locale === "en"
        ? "Use email instead"
        : "Pakai email saja"
      : locale === "en"
        ? "Use username instead"
        : "Pakai username";
  const loginMethodToggle = !isRegister ? (
    <button
      className="text-xs font-semibold text-foreground underline underline-offset-4 transition-colors hover:text-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
      onClick={() => {
        setLoginIdentifier("");
        setEmailTouched(false);
        setErrorMessage("");
        setStatusMessage(null);
        setLoginMethod((current) => (current === "username" ? "email" : "username"));
      }}
      type="button"
    >
      {loginMethodToggleLabel}
    </button>
  ) : undefined;

  const renderAuthInput = (
    field: AuthField,
    {
      className = "",
      isDisabled = false,
      labelAction,
      layoutId,
    }: {
      className?: string;
      isDisabled?: boolean;
      labelAction?: ReactNode;
      layoutId?: string;
    } = {},
  ) => {
    const isPasswordField = field.id === "auth-password";
    const isConfirmPasswordField = field.id === "auth-confirm-password";
    const isPasswordInputVisible = isPasswordField
      ? isPasswordVisible
      : isConfirmPasswordField
        ? isConfirmPasswordVisible
        : false;
    const passwordToggleLabel = isPasswordInputVisible
      ? locale === "en"
        ? "Hide password"
        : "Sembunyikan sandi"
      : locale === "en"
        ? "Show password"
        : "Tampilkan sandi";
    const validationContent =
      isRegister && field.id === "auth-name" ? (
        <UsernameStatus isVisible={showNameValidation} locale={locale} message={usernameError} />
      ) : isAuthIdentifierField(field.id) ? (
        isEmailFieldActive ? (
          <EmailStatus isVisible={showEmailValidation} locale={locale} />
        ) : (
          <UsernameStatus
            isVisible={showLoginUsernameValidation}
            locale={locale}
            message={loginUsernameError}
          />
        )
      ) : isRegister && field.id === "auth-password" ? (
        <PasswordRequirements
          error={showPasswordError ? passwordError : ""}
          locale={locale}
          password={password}
          ruleState={passwordRuleState}
        />
      ) : isRegister && field.id === "auth-confirm-password" ? (
        <ConfirmPasswordStatus
          isMatch={confirmPassword.length > 0 && password === confirmPassword}
          isVisible={showConfirmPasswordError}
          locale={locale}
          message={confirmPasswordError}
        />
      ) : undefined;

    return (
      <AuthInput
        ariaDescribedBy={
          isRegister && field.id === "auth-name"
            ? "username-status"
            : isAuthIdentifierField(field.id)
              ? isEmailFieldActive
                ? "email-status"
                : "username-status"
              : isRegister && field.id === "auth-password"
                ? "password-requirements"
                : isRegister && field.id === "auth-confirm-password"
                  ? "confirm-password-status"
                  : undefined
        }
        className={className}
        field={field}
        isDisabled={isDisabled}
        isInvalid={
          (field.id === "auth-name" && showNameValidation) ||
          (isAuthIdentifierField(field.id) && showEmailValidation && !isEmailValid) ||
          (isAuthIdentifierField(field.id) && showLoginUsernameValidation) ||
          (field.id === "auth-password" && showPasswordError) ||
          (field.id === "auth-confirm-password" && showConfirmPasswordError)
        }
        labelAction={labelAction}
        layoutId={layoutId}
        onBlur={
          isRegister && field.id === "auth-name"
            ? () => setNameTouched(true)
            : isAuthIdentifierField(field.id)
              ? () => setEmailTouched(true)
              : isRegister && field.id === "auth-password"
                ? () => setPasswordTouched(true)
                : isRegister && field.id === "auth-confirm-password"
                  ? () => setConfirmPasswordTouched(true)
                  : undefined
        }
        onChange={getFieldChangeHandler(field.id)}
        inputType={field.type === "password" && isPasswordInputVisible ? "text" : undefined}
        trailingControl={
          field.type === "password" && getFieldValue(field.id).length > 0 ? (
            <button
              aria-label={passwordToggleLabel}
              className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-none text-neutral-950 transition-colors hover:text-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:text-neutral-300"
              disabled={isDisabled}
              onClick={() => {
                if (isPasswordField) {
                  setPasswordVisible((current) => !current);
                  return;
                }

                setConfirmPasswordVisible((current) => !current);
              }}
              type="button"
            >
              <HugeiconsIcon
                aria-hidden="true"
                className="size-[18px]"
                icon={isPasswordInputVisible ? EyeOffIcon : ViewIcon}
                strokeWidth={2}
              />
            </button>
          ) : undefined
        }
        value={getFieldValue(field.id)}
      >
        {validationContent}
      </AuthInput>
    );
  };

  if (isResettingPassword) {
    const resetTitle = locale === "en" ? "Reset your password" : "Reset sandi kamu";

    return (
      <motion.div
        className={`relative flex h-full min-h-0 flex-col overflow-y-auto bg-white px-6 pt-20 pb-28 text-foreground md:px-8 ${className}`}
        data-auth-panel={mode}
        data-auth-step="password-reset"
        data-page-surface="auth-panel"
        layout="position"
        transition={authSharedLayoutTransition}
      >
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="w-full max-w-[23rem] text-foreground">
            <motion.div
              className="space-y-3 text-left"
              layout
              transition={authSharedLayoutTransition}
            >
              <motion.h1
                className="text-[2rem] leading-tight font-semibold tracking-normal text-foreground"
                layout="position"
                transition={authSharedLayoutTransition}
              >
                {resetTitle}
              </motion.h1>
              <p className="text-sm leading-6 text-muted-foreground">
                {locale === "en"
                  ? `Enter the 6-digit code sent to ${passwordResetEmail}, then choose a new password.`
                  : `Masukkan 6 digit kode yang dikirim ke ${passwordResetEmail}, lalu buat sandi baru.`}
              </p>
            </motion.div>

            <motion.form
              className="mt-8"
              layout
              onSubmit={handleSubmit}
              transition={authSharedLayoutTransition}
            >
              <OtpCodeInput
                isInvalid={Boolean(errorMessage)}
                locale={locale}
                onChange={setConfirmationCode}
                value={confirmationCode}
              />

              <AuthInput
                ariaDescribedBy="password-requirements"
                className="mt-6"
                field={{
                  autoComplete: "new-password",
                  id: "auth-reset-password",
                  label: locale === "en" ? "New Password" : "Sandi Baru",
                  placeholder: "",
                  type: "password",
                }}
                isInvalid={showPasswordResetError}
                onBlur={() => setPasswordTouched(true)}
                onChange={setPasswordResetPassword}
                value={passwordResetPassword}
              >
                <PasswordRequirements
                  error={showPasswordResetError ? passwordError : ""}
                  locale={locale}
                  password={passwordResetPassword}
                  ruleState={passwordRuleState}
                />
              </AuthInput>

              <AuthInput
                ariaDescribedBy="confirm-password-status"
                className="mt-6"
                field={{
                  autoComplete: "new-password",
                  id: "auth-reset-confirm-password",
                  label: locale === "en" ? "Confirm New Password" : "Konfirmasi Sandi Baru",
                  placeholder: "",
                  type: "password",
                }}
                isInvalid={showPasswordResetConfirmPasswordError}
                onBlur={() => setConfirmPasswordTouched(true)}
                onChange={setPasswordResetConfirmPassword}
                value={passwordResetConfirmPassword}
              >
                <ConfirmPasswordStatus
                  isMatch={
                    passwordResetConfirmPassword.length > 0 &&
                    passwordResetPassword === passwordResetConfirmPassword
                  }
                  isVisible={showPasswordResetConfirmPasswordError}
                  locale={locale}
                  message={passwordResetConfirmPasswordError}
                />
              </AuthInput>

              {errorMessage ? (
                <p className="mt-5 text-sm leading-6 font-medium text-rose-700" role="alert">
                  {errorMessage}
                </p>
              ) : null}
              {renderedStatusMessage ? (
                <p className="mt-5 text-sm leading-6 text-muted-foreground" aria-live="polite">
                  {renderedStatusMessage}
                </p>
              ) : null}

              <motion.button
                className="mt-6 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-none bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:bg-zinc-400"
                disabled={isSubmitting}
                layout="position"
                layoutId="auth-submit-button"
                transition={authSharedLayoutTransition}
                type="submit"
              >
                {getSubmitLabel({
                  isConfirmingAccount,
                  isResettingPassword,
                  isSubmitting,
                  locale,
                  submit: copy.submit,
                })}
              </motion.button>

              <div className="mt-5 flex flex-col items-center gap-3 text-sm sm:flex-row sm:justify-between">
                <button
                  className="inline-flex cursor-pointer items-center gap-2 font-semibold text-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                  disabled={isSubmitting}
                  onClick={handleBackToCredentials}
                  type="button"
                >
                  <HugeiconsIcon
                    aria-hidden="true"
                    className="size-4"
                    icon={ArrowLeft02Icon}
                    strokeWidth={2}
                  />
                  {locale === "en" ? "Back" : "Kembali"}
                </button>
                <button
                  className="cursor-pointer font-semibold text-foreground underline underline-offset-4 transition-colors hover:text-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:text-neutral-400"
                  disabled={!canResendCode}
                  onClick={handleResendCode}
                  type="button"
                >
                  {getResendCodeLabel(locale, resendCooldownSeconds)}
                </button>
              </div>
            </motion.form>
          </div>
        </div>
      </motion.div>
    );
  }

  if (isConfirmingAccount) {
    return (
      <motion.div
        className={`relative flex h-full min-h-0 flex-col overflow-y-auto bg-white px-6 pt-20 pb-28 text-foreground md:px-8 ${className}`}
        data-auth-panel={mode}
        data-auth-step="confirmation"
        data-page-surface="auth-panel"
        layout="position"
        transition={authSharedLayoutTransition}
      >
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="w-full max-w-[23rem] text-foreground">
            <motion.div
              className="space-y-3 text-left"
              layout
              transition={authSharedLayoutTransition}
            >
              <motion.h1
                className="text-[2rem] leading-tight font-semibold tracking-normal text-foreground"
                layout="position"
                transition={authSharedLayoutTransition}
              >
                {confirmationTitle}
              </motion.h1>
              <p className="text-sm leading-6 text-muted-foreground">
                {getConfirmationStepDescription(locale, confirmationEmail)}
              </p>
            </motion.div>

            <motion.form
              className="mt-8"
              layout
              onSubmit={handleSubmit}
              transition={authSharedLayoutTransition}
            >
              <OtpCodeInput
                isInvalid={Boolean(errorMessage)}
                locale={locale}
                onChange={setConfirmationCode}
                value={confirmationCode}
              />

              {errorMessage ? (
                <p className="mt-5 text-sm leading-6 font-medium text-rose-700" role="alert">
                  {errorMessage}
                </p>
              ) : null}
              {renderedStatusMessage ? (
                <p className="mt-5 text-sm leading-6 text-muted-foreground" aria-live="polite">
                  {renderedStatusMessage}
                </p>
              ) : null}

              <motion.button
                className="mt-6 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-none bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:bg-zinc-400"
                disabled={isSubmitting}
                layout="position"
                layoutId="auth-submit-button"
                transition={authSharedLayoutTransition}
                type="submit"
              >
                {getSubmitLabel({
                  isConfirmingAccount,
                  isResettingPassword,
                  isSubmitting,
                  locale,
                  submit: copy.submit,
                })}
              </motion.button>

              <div className="mt-5 flex flex-col items-center gap-3 text-sm sm:flex-row sm:justify-between">
                <button
                  className="inline-flex cursor-pointer items-center gap-2 font-semibold text-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                  disabled={isSubmitting}
                  onClick={handleBackToCredentials}
                  type="button"
                >
                  <HugeiconsIcon
                    aria-hidden="true"
                    className="size-4"
                    icon={ArrowLeft02Icon}
                    strokeWidth={2}
                  />
                  {locale === "en" ? "Back" : "Kembali"}
                </button>
                <button
                  className="cursor-pointer font-semibold text-foreground underline underline-offset-4 transition-colors hover:text-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:text-neutral-400"
                  disabled={!canResendCode}
                  onClick={handleResendCode}
                  type="button"
                >
                  {getResendCodeLabel(locale, resendCooldownSeconds)}
                </button>
              </div>
            </motion.form>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`relative flex h-full min-h-0 flex-col overflow-y-auto bg-white p-7 text-foreground md:p-8 ${className}`}
      data-auth-panel={mode}
      data-page-surface="auth-panel"
      layout="position"
      transition={authSharedLayoutTransition}
    >
      <div
        className={`flex min-h-0 flex-1 items-center justify-center ${credentialsPanelPaddingClass}`}
      >
        <div className="w-full max-w-sm text-foreground">
          <motion.div
            className="space-y-1 text-left"
            layout
            transition={authSharedLayoutTransition}
          >
            <motion.h1
              className="text-[2rem] leading-tight font-semibold tracking-normal text-foreground"
              layout="position"
              transition={authSharedLayoutTransition}
            >
              {title}
            </motion.h1>
            {copy.description ? (
              <p className="text-sm leading-6 text-muted-foreground">{copy.description}</p>
            ) : null}
          </motion.div>

          <motion.form
            className="mt-8"
            layout
            onSubmit={handleSubmit}
            transition={authSharedLayoutTransition}
          >
            <AuthRevealSlot isVisible={isRegister} spacing="after">
              {renderAuthInput(nameField, {
                isDisabled: !isRegister,
                layoutId: "auth-register-name-field",
              })}
            </AuthRevealSlot>
            {renderAuthInput(emailField, { labelAction: loginMethodToggle })}
            {renderAuthInput(passwordField, { className: "mt-6" })}
            {!isRegister ? (
              <button
                className="mt-3 cursor-pointer text-xs font-semibold text-foreground underline underline-offset-4 transition-colors hover:text-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:text-neutral-400"
                disabled={isSubmitting}
                onClick={handleForgotPassword}
                type="button"
              >
                {locale === "en" ? "Forgot password?" : "Lupa sandi?"}
              </button>
            ) : null}
            <AuthRevealSlot isVisible={canShowConfirmPassword} spacing="before">
              {renderAuthInput(confirmPasswordField, {
                isDisabled: !canShowConfirmPassword,
                layoutId: "auth-register-confirm-password-field",
              })}
            </AuthRevealSlot>

            {isConfirmingAccount ? (
              <div className="mt-6 space-y-3 border border-sky-200 bg-sky-50/70 p-4">
                <AuthInput
                  field={{
                    autoComplete: "one-time-code",
                    id: "auth-confirmation-code",
                    label: locale === "en" ? "Verification Code" : "Kode Verifikasi",
                    placeholder: "123456",
                    type: "text",
                  }}
                  onChange={setConfirmationCode}
                  value={confirmationCode}
                />
                <button
                  className="text-xs font-semibold text-sky-700 underline underline-offset-4 transition-colors hover:text-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                  disabled={!canResendCode}
                  onClick={handleResendCode}
                  type="button"
                >
                  {getResendCodeLabel(locale, resendCooldownSeconds)}
                </button>
              </div>
            ) : null}

            {visibleErrorMessage ? (
              <p className="mt-6 text-sm leading-6 font-medium text-rose-700" role="alert">
                {visibleErrorMessage}
              </p>
            ) : null}
            {renderedStatusMessage ? (
              <p className="mt-6 text-sm leading-6 font-medium text-sky-700" aria-live="polite">
                {renderedStatusMessage}
              </p>
            ) : null}

            <motion.button
              className={`inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-none bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:bg-zinc-400 ${
                visibleErrorMessage || renderedStatusMessage ? "mt-3" : "mt-6"
              }`}
              disabled={isSubmitting}
              layout="position"
              layoutId="auth-submit-button"
              transition={authSharedLayoutTransition}
              type="submit"
            >
              {getSubmitLabel({
                isConfirmingAccount,
                isResettingPassword,
                isSubmitting,
                locale,
                submit: copy.submit,
              })}
            </motion.button>
          </motion.form>

          <motion.p
            className="mt-4 min-h-5 text-center text-sm text-muted-foreground"
            layout="position"
            transition={authSharedLayoutTransition}
          >
            {copy.switchLabel}{" "}
            {onModeChange ? (
              <button className={switchClassName} onClick={handleModeSwitch} type="button">
                {copy.switchAction}
              </button>
            ) : (
              <a
                className={switchClassName}
                data-app-link
                href={copy.switchHref}
                onClick={handleModeSwitch}
              >
                {copy.switchAction}
              </a>
            )}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}

function AuthInput({
  ariaDescribedBy,
  children,
  className = "",
  field,
  inputType,
  isDisabled = false,
  isInvalid = false,
  labelAction,
  layoutId,
  onBlur,
  onChange,
  trailingControl,
  value,
}: {
  ariaDescribedBy?: string;
  children?: ReactNode;
  className?: string;
  field: AuthField;
  inputType?: AuthField["type"];
  isDisabled?: boolean;
  isInvalid?: boolean;
  labelAction?: ReactNode;
  layoutId?: string;
  onBlur?: () => void;
  onChange?: (value: string) => void;
  trailingControl?: ReactNode;
  value?: string;
}) {
  return (
    <motion.div
      className={className}
      layout="position"
      layoutId={layoutId ?? `auth-field-${field.id}`}
      transition={authSharedLayoutTransition}
    >
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <label className="block text-[13px] font-semibold text-foreground" htmlFor={field.id}>
          {field.label}
        </label>
        {labelAction ? <span className="shrink-0">{labelAction}</span> : null}
      </div>
      <div className="relative">
        <input
          aria-describedby={ariaDescribedBy}
          aria-invalid={isInvalid}
          autoComplete={field.autoComplete}
          className={`flex h-10 w-full rounded-none border bg-white/92 px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.02)] outline-none transition-colors placeholder:text-zinc-400 hover:border-zinc-500 focus:ring-2 ${
            trailingControl ? "pr-11" : ""
          } ${
            isInvalid
              ? "border-rose-500 shadow-[0_0_0_2px_rgb(253_164_175_/_0.55),0_1px_2px_rgba(0,0,0,0.02)] focus:border-rose-500 focus:ring-rose-300/55"
              : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-500/45"
          }`}
          disabled={isDisabled}
          id={field.id}
          name={field.id}
          onBlur={onBlur}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
          placeholder={field.placeholder}
          required={!isDisabled}
          type={inputType ?? field.type}
          value={value}
        />
        {trailingControl}
      </div>
      {children ??
        (field.helper ? (
          <p className="mt-1.5 text-xs leading-4 text-muted-foreground">{field.helper}</p>
        ) : null)}
    </motion.div>
  );
}

function OtpCodeInput({
  isInvalid,
  locale,
  onChange,
  value,
}: {
  isInvalid: boolean;
  locale: Locale;
  onChange: (value: string) => void;
  value: string;
}) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: OTP_CODE_LENGTH }, (_, index) => value[index] ?? "");
  const label = locale === "en" ? "Verification code" : "Kode verifikasi";

  const focusDigit = (index: number) => {
    inputRefs.current[Math.min(Math.max(index, 0), OTP_CODE_LENGTH - 1)]?.focus();
  };

  const applyDigits = (startIndex: number, rawValue: string) => {
    const incomingDigits = sanitizeOtpCode(rawValue);
    const nextDigits = [...digits];

    if (!incomingDigits) {
      nextDigits[startIndex] = "";
      onChange(nextDigits.join(""));
      return;
    }

    for (let offset = 0; offset < incomingDigits.length; offset += 1) {
      const targetIndex = startIndex + offset;
      if (targetIndex >= OTP_CODE_LENGTH) {
        break;
      }
      nextDigits[targetIndex] = incomingDigits[offset];
    }

    onChange(nextDigits.join(""));
    focusDigit(startIndex + incomingDigits.length);
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>, index: number) => {
    const pastedCode = sanitizeOtpCode(event.clipboardData.getData("text"));

    if (!pastedCode) {
      return;
    }

    event.preventDefault();
    applyDigits(index, pastedCode);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      focusDigit(index - 1);
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusDigit(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < OTP_CODE_LENGTH - 1) {
      event.preventDefault();
      focusDigit(index + 1);
    }
  };

  return (
    <fieldset>
      <legend className="mb-3 block text-[13px] font-semibold text-foreground">{label}</legend>
      <div className="grid grid-cols-6 gap-2.5" role="group" aria-label={label}>
        {digits.map((digit, index) => (
          <input
            aria-invalid={isInvalid}
            aria-label={
              locale === "en"
                ? `Verification code digit ${index + 1}`
                : `Digit kode verifikasi ${index + 1}`
            }
            autoComplete={index === 0 ? "one-time-code" : "off"}
            className={`aspect-square min-w-0 rounded-none border bg-white text-center text-xl font-semibold text-foreground outline-none transition-colors focus:ring-2 ${
              isInvalid
                ? "border-rose-500 focus:border-rose-500 focus:ring-rose-300/55"
                : "border-zinc-300 hover:border-zinc-500 focus:border-zinc-500 focus:ring-zinc-500/45"
            }`}
            inputMode="numeric"
            key={index}
            maxLength={1}
            onChange={(event) => applyDigits(index, event.target.value)}
            onFocus={(event) => event.target.select()}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onPaste={(event) => handlePaste(event, index)}
            pattern="[0-9]*"
            ref={(node) => {
              inputRefs.current[index] = node;
            }}
            type="text"
            value={digit}
          />
        ))}
      </div>
    </fieldset>
  );
}

function AuthRevealSlot({
  children,
  isVisible,
  spacing,
}: {
  children: ReactNode;
  isVisible: boolean;
  spacing: "after" | "before";
}) {
  return (
    <motion.div
      animate={{
        height: isVisible ? "auto" : 0,
        marginBottom: spacing === "after" && isVisible ? 20 : 0,
        marginTop: spacing === "before" && isVisible ? 20 : 0,
        opacity: isVisible ? 1 : 0,
      }}
      aria-hidden={!isVisible}
      className="-m-1 overflow-hidden p-1"
      initial={false}
      layout
      transition={authRegisterFieldRevealTransition}
    >
      <div className={isVisible ? "" : "pointer-events-none"}>{children}</div>
    </motion.div>
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
  const isPasswordComplete = Object.values(ruleState).every(Boolean);
  const shouldShowHint = !hasPassword && error.length > 0;
  const shouldShowRequirements = hasPassword && !isPasswordComplete;

  return (
    <>
      {shouldShowHint ? (
        <p
          className="mt-1.5 overflow-hidden text-xs leading-4 text-rose-700 transition-[max-height,opacity,transform,color] duration-[360ms] ease-out"
          id="password-requirements-hint"
        >
          {error}
        </p>
      ) : null}
      <ul
        aria-label={locale === "en" ? "Password requirements" : "Syarat sandi"}
        aria-hidden={!shouldShowRequirements}
        className={`space-y-1.5 overflow-hidden pl-0.5 transition-[max-height,opacity,transform,margin] duration-[360ms] ease-out ${
          shouldShowRequirements
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
        className={`inline-flex size-4 shrink-0 items-center justify-center rounded-none border transition-[background-color,border-color,color,transform] duration-[360ms] ease-out ${
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
          className={`absolute right-0 left-0 top-1/2 h-px origin-left -translate-y-1/2 bg-current transition-transform duration-[360ms] ease-out ${
            isValid ? "scale-x-100" : "scale-x-0"
          }`}
        />
      </span>
    </li>
  );
}

function UsernameStatus({
  isVisible,
  locale,
  message,
}: {
  isVisible: boolean;
  locale: Locale;
  message: string;
}) {
  return (
    <FieldErrorStatus
      id="username-status"
      isVisible={isVisible}
      message={message || (locale === "en" ? "Check your username." : "Cek username kamu.")}
    />
  );
}

function EmailStatus({ isVisible, locale }: { isVisible: boolean; locale: Locale }) {
  return (
    <FieldErrorStatus
      id="email-status"
      isVisible={isVisible}
      message={locale === "en" ? "Email format is not valid." : "Format email belum valid."}
    />
  );
}

function FieldErrorStatus({
  id,
  isVisible,
  message,
}: {
  id: string;
  isVisible: boolean;
  message: string;
}) {
  return (
    <p
      aria-live="polite"
      className={`mt-1.5 flex items-center gap-1.5 overflow-hidden text-xs leading-4 font-medium transition-[max-height,opacity,transform,color] duration-[360ms] ease-out ${
        isVisible ? "max-h-8 translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0"
      } text-rose-700`}
      id={id}
    >
      <span
        aria-hidden="true"
        className="inline-flex size-3.5 shrink-0 items-center justify-center"
      >
        <HugeiconsIcon className="size-3.5" icon={Cancel01Icon} strokeWidth={2.4} />
      </span>
      <span>{message}</span>
    </p>
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
  const statusMessage = message || getConfirmPasswordMismatchMessage(locale);
  const shouldShowStatus = isVisible && !isMatch;

  return (
    <p
      aria-live="polite"
      aria-hidden={!shouldShowStatus}
      className={`mt-1.5 flex items-center gap-1.5 overflow-hidden text-xs leading-4 font-medium transition-[max-height,opacity,transform,color] duration-[360ms] ease-out ${
        shouldShowStatus ? "max-h-8 translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0"
      } text-rose-700`}
      id="confirm-password-status"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-3.5 shrink-0 items-center justify-center"
      >
        <HugeiconsIcon className="size-3.5" icon={Cancel01Icon} strokeWidth={2.4} />
      </span>
      <span>{statusMessage}</span>
    </p>
  );
}

function AuthIllustration({ isRegister }: { isRegister: boolean }) {
  return (
    <motion.div
      animate={authIllustrationVisible}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 ${
        isRegister ? "origin-right" : "origin-left"
      }`}
      exit={authIllustrationHidden}
      initial={authIllustrationHidden}
      layout="position"
      transition={authIllustrationTransition}
    >
      <motion.img
        alt=""
        className={`block h-[min(720px,calc(100vh_-_2.5rem))] w-[min(64rem,calc(100vw_-_2rem))] max-w-none object-cover md:h-[min(760px,calc(100vh_-_4rem))] md:w-[min(64rem,calc(100vw_-_4rem))] ${
          isRegister ? "ml-auto object-right-top" : "object-left-top"
        }`}
        decoding="async"
        layout="position"
        loading="eager"
        src={authIllustrationImageUrl}
      />
    </motion.div>
  );
}

function getAuthFields(
  locale: Locale,
  mode: AuthMode,
  loginMethod: AuthLoginMethod = "email",
): AuthField[] {
  const labels = {
    en: {
      confirmPassword: "Confirm Password",
      confirmPasswordHelper: "Please confirm your password.",
      email: "Email",
      emailHelper: "",
      name: "Username",
      nameHelper: "",
      password: "Password",
      passwordHelper: "",
      username: "Username",
    },
    id: {
      confirmPassword: "Konfirmasi Sandi",
      confirmPasswordHelper: "Ulangi sandi yang sama.",
      email: "Email",
      emailHelper: "",
      name: "Username",
      nameHelper: "",
      password: "Sandi",
      passwordHelper: "",
      username: "Username",
    },
  } satisfies Record<Locale, Record<string, string>>;
  const copy = labels[locale];

  if (mode === "login") {
    const isUsernameLogin = loginMethod === "username";

    return [
      {
        autoComplete: isUsernameLogin ? "nickname" : "email",
        id: isUsernameLogin ? "auth-username" : "auth-email",
        label: isUsernameLogin ? copy.username : copy.email,
        placeholder: isUsernameLogin ? "john_doe" : "m@example.com",
        type: isUsernameLogin ? "text" : "email",
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
      autoComplete: "nickname",
      helper: copy.nameHelper,
      id: "auth-name",
      label: copy.name,
      placeholder: "john_doe",
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

function findAuthField(fields: AuthField[], fieldId: string) {
  const field = fields.find((candidate) => candidate.id === fieldId);

  if (!field) {
    throw new Error(`Missing auth field: ${fieldId}`);
  }

  return field;
}

function getCredentialsPanelPaddingClass({
  hasFeedback,
  hasPassword,
  hasRevealedConfirmPassword,
  isRegister,
}: {
  hasFeedback: boolean;
  hasPassword: boolean;
  hasRevealedConfirmPassword: boolean;
  isRegister: boolean;
}) {
  if (!isRegister) {
    return "py-20";
  }

  if (hasFeedback || hasRevealedConfirmPassword) {
    return "pt-5 pb-8 md:pt-6 md:pb-9";
  }

  if (hasPassword) {
    return "pt-8 pb-10 md:pt-9 md:pb-11";
  }

  return "pt-12 pb-14 md:pt-14 md:pb-16";
}

function getConfirmationStepTitle(locale: Locale) {
  return locale === "en" ? "Confirm your email" : "Konfirmasi email kamu";
}

function getSecondaryAuthStepTitle(locale: Locale) {
  return locale === "en" ? "Verify your account" : "Verifikasi akun kamu";
}

function getConfirmationStepDescription(locale: Locale, email: string) {
  const trimmedEmail = email.trim();

  if (locale === "en") {
    return trimmedEmail
      ? `Enter the 6-digit code sent to ${trimmedEmail}.`
      : "Enter the 6-digit code sent to your email.";
  }

  return trimmedEmail
    ? `Masukkan 6 digit kode yang dikirim ke ${trimmedEmail}.`
    : "Masukkan 6 digit kode yang dikirim ke email kamu.";
}

function getResendCodeLabel(locale: Locale, cooldownSeconds: number) {
  if (cooldownSeconds > 0) {
    return locale === "en"
      ? `Resend code (${cooldownSeconds}s)`
      : `Kirim ulang kode (${cooldownSeconds} detik)`;
  }

  return locale === "en" ? "Resend code" : "Kirim ulang kode";
}

function getResendCooldownUntil(result: { cooldownSeconds?: number; nextAllowedAt?: number }) {
  if (typeof result.nextAllowedAt === "number" && result.nextAllowedAt > 0) {
    return result.nextAllowedAt * 1000;
  }

  return Date.now() + Math.max(1, result.cooldownSeconds ?? 30) * 1000;
}

function getSubmitLabel({
  isConfirmingAccount,
  isResettingPassword,
  isSubmitting,
  locale,
  submit,
}: {
  isConfirmingAccount: boolean;
  isResettingPassword: boolean;
  isSubmitting: boolean;
  locale: Locale;
  submit: string;
}) {
  if (isSubmitting) {
    return locale === "en" ? "Processing..." : "Memproses...";
  }

  if (isConfirmingAccount) {
    return locale === "en" ? "Confirm email" : "Konfirmasi email";
  }

  if (isResettingPassword) {
    return locale === "en" ? "Reset password" : "Reset sandi";
  }

  return submit;
}

function getAuthStatusMessage(message: AuthStatusMessage, locale: Locale) {
  if (message.kind === "account-unconfirmed") {
    return locale === "en"
      ? "If it does not show up, check your spam or junk folder."
      : "Kalau belum muncul, cek folder spam atau junk juga.";
  }

  if (message.kind === "password-reset-complete") {
    return locale === "en"
      ? "Password reset complete. Sign in with the new password."
      : "Reset sandi selesai. Masuk dengan sandi baru.";
  }

  if (message.kind === "password-reset-sent") {
    return locale === "en"
      ? "If the account is eligible, the reset code is valid for a short time. Check your spam or junk folder if it does not show up."
      : "Jika akun memenuhi syarat, kode reset berlaku singkat. Cek folder spam atau junk kalau belum muncul.";
  }

  return getConfirmationSentMessage(locale);
}

function getConfirmationSentMessage(locale: Locale) {
  if (locale === "en") {
    return "If the request is eligible, the code is valid for 5 minutes. If it does not show up, check your spam or junk folder.";
  }

  return "Jika permintaan memenuhi syarat, kode berlaku 5 menit. Kalau belum muncul, cek folder spam atau junk juga.";
}

function sanitizeOtpCode(value: string) {
  return value.replace(/\D/g, "").slice(0, OTP_CODE_LENGTH);
}

function getAuthErrorMessage(error: unknown, locale: Locale) {
  if (error instanceof CognitoAuthError) {
    if (
      error.code === "UserLambdaValidationException" &&
      /username is already taken/i.test(error.message)
    ) {
      return locale === "en"
        ? "This username is already taken. Choose another one."
        : "Username ini sudah dipakai. Pilih username lain.";
    }

    const messages: Record<string, Record<Locale, string>> = {
      AuthNotConfigured: {
        en: "Auth is not configured yet. Deploy the backend and set the Cognito env values.",
        id: "Auth belum dikonfigurasi. Deploy backend dulu lalu isi env Cognito.",
      },
      AuthRateLimitExceededException: {
        en: "Too many auth requests. Please wait a moment, then try again.",
        id: "Terlalu banyak permintaan auth. Tunggu sebentar, lalu coba lagi.",
      },
      CodeMismatchException: {
        en: "The verification code is not correct.",
        id: "Kode verifikasi belum benar.",
      },
      ExpiredCodeException: {
        en: "The verification code has expired. Send a new code.",
        id: "Kode verifikasi sudah kedaluwarsa. Kirim ulang kode.",
      },
      InvalidPasswordException: {
        en: "Password must be at least 12 characters and include uppercase, lowercase, number, and symbol.",
        id: "Sandi minimal 12 karakter dan punya huruf besar, huruf kecil, angka, serta simbol.",
      },
      InvalidUsernameException: {
        en: "Check the username format first.",
        id: "Cek format username dulu.",
      },
      LimitExceededException: {
        en: "Too many auth requests. Please wait a moment, then try again.",
        id: "Terlalu banyak permintaan auth. Tunggu sebentar, lalu coba lagi.",
      },
      NotAuthorizedException: {
        en: "Username/email or password is not correct.",
        id: "Username/email atau sandi belum sesuai.",
      },
      PasswordResetRequiredException: {
        en: "This account needs a password reset before signing in.",
        id: "Akun ini perlu reset sandi sebelum bisa masuk.",
      },
      TooManyFailedAttemptsException: {
        en: "Too many failed verification attempts. Send a new code.",
        id: "Terlalu banyak percobaan kode yang gagal. Kirim kode baru.",
      },
      UsernameExistsException: {
        en: "If the request is eligible, check your email for the next step.",
        id: "Jika permintaan memenuhi syarat, cek email kamu untuk langkah berikutnya.",
      },
      UserNotFoundException: {
        en: "Username/email or password is not correct.",
        id: "Username/email atau sandi belum sesuai.",
      },
    };

    return messages[error.code]?.[locale] ?? error.message;
  }

  return locale === "en" ? "Auth request failed." : "Permintaan auth gagal.";
}

function redirectAfterAuth(href: string, onAuthenticated?: () => void) {
  window.history.pushState(null, "", href);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0 });
  onAuthenticated?.();
}

function isAuthHref(value: string) {
  return value === "/login" || value === "/register";
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
    length: password.length >= passwordMinLength,
    number: /[0-9]/.test(password),
    symbol: Array.from(password).some((character) => passwordSymbols.includes(character)),
  };
}

function getPasswordValidationMessage(password: string, locale: Locale) {
  if (password.length === 0) {
    return "";
  }

  const ruleState = getPasswordRuleState(password);

  if (!ruleState.length) {
    return locale === "en"
      ? "Password must be at least 12 characters."
      : "Sandi minimal 12 karakter.";
  }

  if (!ruleState.case) {
    return locale === "en"
      ? "Password must include lowercase and uppercase letters."
      : "Sandi harus punya huruf kecil dan huruf besar.";
  }

  if (!ruleState.number) {
    return locale === "en" ? "Password must include a number." : "Sandi harus punya angka.";
  }

  if (!ruleState.symbol) {
    return locale === "en" ? "Password must include a symbol." : "Sandi harus punya simbol.";
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

  return getConfirmPasswordMismatchMessage(locale);
}

function getConfirmPasswordMismatchMessage(locale: Locale) {
  return locale === "en"
    ? "Password confirmation does not match."
    : "Konfirmasi sandi tidak cocok.";
}

function getUsernameValidationMessage(value: string, locale: Locale) {
  const username = value.trim();

  if (username.length === 0) {
    return "";
  }

  if (username.length < 3) {
    return locale === "en"
      ? "Username must be at least 3 characters."
      : "Username minimal 3 karakter.";
  }

  if (!/^[A-Za-z0-9._-]+$/.test(username)) {
    return locale === "en"
      ? "Use only letters, numbers, dots, underscores, or hyphens."
      : "Gunakan hanya huruf, angka, titik, underscore, atau tanda hubung.";
  }

  if (/^[._-]|[._-]$/.test(username)) {
    return locale === "en"
      ? "Username cannot start or end with punctuation."
      : "Username tidak boleh diawali atau diakhiri tanda baca.";
  }

  return "";
}

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
