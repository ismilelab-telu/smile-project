import {
  Cancel01Icon,
  CheckIcon,
  ChevronUpIcon,
  LanguageSkillIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "@/features/auth/auth-context";
import { CognitoAuthError } from "@/features/auth/cognito-auth";
import { localeOptions, useLocalization, type Locale } from "@/features/localization/localization";

type AuthMode = "login" | "register";

type AuthPageProps = {
  closeHref?: string;
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
const authPortalBackdropVisible = { filter: "blur(0px)", opacity: 1 };
const authPortalBackdropHidden = { filter: "blur(4px)", opacity: 0 };
const authPortalPanelHidden = {
  filter: "blur(4px)",
  opacity: 0,
  transform: "perspective(500px) rotateX(-20deg) scale(0.8)",
};
const authPortalPanelVisible = {
  filter: "blur(0px)",
  opacity: 1,
  transform: "perspective(500px) rotateX(0deg) scale(1)",
};
const authPortalBackdropTransition = { duration: 0.2, ease: "easeInOut" };
const authPortalPanelTransition = { damping: 25, stiffness: 150, type: "spring" };
const authSharedLayoutTransition = { damping: 32, mass: 0.9, stiffness: 260, type: "spring" };
const authRegisterFieldRevealTransition = { duration: 0.24, ease: "easeOut" };

export function AuthPage({ closeHref = "/learn", mode }: AuthPageProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const { locale } = useLocalization();
  const safeCloseHref = isAuthHref(closeHref) ? "/learn" : closeHref;

  const navigateToCloseHref = useCallback(() => {
    window.history.pushState(null, "", safeCloseHref);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, [safeCloseHref]);

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
  }, [mode]);

  const isRegister = mode === "register";

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain px-4 md:px-8"
      data-auth-portal
    >
      <motion.button
        animate={isClosing ? authPortalBackdropHidden : authPortalBackdropVisible}
        aria-label={locale === "en" ? "Close authentication" : "Tutup autentikasi"}
        className="fixed inset-0 cursor-default bg-neutral-950/55"
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
          className="relative grid min-h-[min(720px,calc(100vh_-_2.5rem))] w-full max-w-5xl transform-gpu overflow-hidden border-2 border-neutral-950 bg-white text-foreground shadow-2xl outline-none md:min-h-[min(760px,calc(100vh_-_4rem))]"
          data-auth-mode={mode}
          initial={authPortalPanelHidden}
          onAnimationComplete={handlePanelAnimationComplete}
          ref={rootRef}
          role="dialog"
          tabIndex={-1}
          transition={authPortalPanelTransition}
        >
          <button
            aria-label={locale === "en" ? "Close" : "Tutup"}
            className="absolute top-5 right-5 z-30 inline-flex size-10 cursor-pointer items-center justify-center bg-white/90 text-neutral-950 transition-colors hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            onClick={closePortal}
            type="button"
          >
            <HugeiconsIcon
              aria-hidden="true"
              className="size-5"
              icon={Cancel01Icon}
              strokeWidth={2}
            />
          </button>
          <AuthLanguageSwitcher isRegister={isRegister} />
          <AuthMatrixRain />
          <LayoutGroup id="auth-form-layout">
            <section
              className="relative z-10 grid min-h-[min(720px,calc(100vh_-_2.5rem))] lg:grid-cols-2 md:min-h-[min(760px,calc(100vh_-_4rem))]"
              data-auth-layout="split"
            >
              <AuthFormPanel
                className={isRegister ? "lg:col-start-1" : "lg:col-start-2"}
                mode={mode}
              />
            </section>
          </LayoutGroup>
          <span className="sr-only" id="auth-dialog-title">
            {authCopy[locale][mode].title}
          </span>
        </motion.main>
      </div>
    </div>,
    portalTarget,
  );
}

function AuthLanguageSwitcher({ isRegister }: { isRegister: boolean }) {
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
        isRegister ? "left-5 md:left-7" : "right-5 md:right-7"
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
              isRegister ? "left-0 origin-bottom-left" : "right-0 origin-bottom-right"
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

function AuthFormPanel({ className, mode }: { className: string; mode: AuthMode }) {
  const auth = useAuth();
  const { locale } = useLocalization();
  const copy = authCopy[locale][mode];
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [confirmationDestination, setConfirmationDestination] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isNameTouched, setNameTouched] = useState(false);
  const [isEmailTouched, setEmailTouched] = useState(false);
  const [isPasswordTouched, setPasswordTouched] = useState(false);
  const [isConfirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const usernameError = getUsernameValidationMessage(name, locale);
  const trimmedEmail = email.trim();
  const isEmailValid = isValidEmailAddress(trimmedEmail);
  const showNameValidation =
    isRegister && isNameTouched && name.trim().length > 0 && usernameError !== "";
  const showEmailValidation = isEmailTouched && trimmedEmail.length > 0 && !isEmailValid;
  const passwordRuleState = getPasswordRuleState(password);
  const passwordError = getPasswordValidationMessage(password, locale);
  const canShowConfirmPassword = isRegister && password.length > 0 && passwordError === "";
  const showPasswordError = isRegister && isPasswordTouched && passwordError !== "";
  const confirmPasswordError = getConfirmPasswordValidationMessage(
    password,
    confirmPassword,
    locale,
  );
  const showConfirmPasswordError =
    isRegister &&
    Boolean(confirmPasswordError) &&
    (confirmPassword.length > 0 || isConfirmPasswordTouched);
  const isConfirmingAccount = confirmationEmail.length > 0;

  useEffect(() => {
    setConfirmationCode("");
    setConfirmationDestination("");
    setConfirmationEmail("");
    setConfirmPassword("");
    setEmail("");
    setErrorMessage("");
    setName("");
    setPassword("");
    setNameTouched(false);
    setEmailTouched(false);
    setPasswordTouched(false);
    setConfirmPasswordTouched(false);
    setStatusMessage("");
  }, [mode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    setErrorMessage("");
    setStatusMessage("");

    if (!normalizedEmail) {
      setErrorMessage(locale === "en" ? "Email is required." : "Email wajib diisi.");
      return;
    }

    if (!isValidEmailAddress(normalizedEmail)) {
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

      if (passwordError || confirmPasswordError || !confirmPassword) {
        setErrorMessage(
          locale === "en"
            ? "Check the password and confirmation first."
            : "Cek sandi dan konfirmasinya dulu.",
        );
        return;
      }
    }

    if (isConfirmingAccount && !confirmationCode.trim()) {
      setErrorMessage(
        locale === "en" ? "Verification code is required." : "Kode verifikasi wajib diisi.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      if (isRegister && !isConfirmingAccount) {
        const signUpResult = await auth.signUp({
          email: normalizedEmail,
          name: name.trim(),
          password,
        });

        if (signUpResult.userConfirmed) {
          await auth.signIn({ email: normalizedEmail, password });
          redirectToLearning();
          return;
        }

        setConfirmationDestination(signUpResult.destination ?? "");
        setConfirmationEmail(normalizedEmail);
        setStatusMessage(getConfirmationSentMessage(locale, signUpResult.destination));
        return;
      }

      if (isConfirmingAccount) {
        await auth.confirmSignUp({
          code: confirmationCode.trim(),
          email: confirmationEmail,
        });
        await auth.signIn({ email: confirmationEmail, password });
        redirectToLearning();
        return;
      }

      await auth.signIn({ email: normalizedEmail, password });
      redirectToLearning();
    } catch (error) {
      if (error instanceof CognitoAuthError && error.code === "UserNotConfirmedException") {
        setConfirmationEmail(normalizedEmail);
        setStatusMessage(
          locale === "en"
            ? "This account still needs the verification code from email."
            : "Akun ini masih perlu kode verifikasi dari email.",
        );
        return;
      }

      setErrorMessage(getAuthErrorMessage(error, locale));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    const resendEmail = confirmationEmail || email.trim().toLowerCase();

    if (!resendEmail || isSubmitting) {
      return;
    }

    setErrorMessage("");
    setStatusMessage("");
    setIsSubmitting(true);

    try {
      await auth.resendConfirmationCode(resendEmail);
      setStatusMessage(getConfirmationSentMessage(locale, confirmationDestination));
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, locale));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldValue = (fieldId: string) => {
    if (fieldId === "auth-name") {
      return name;
    }

    if (fieldId === "auth-email") {
      return email;
    }

    if (fieldId === "auth-password") {
      return password;
    }

    if (fieldId === "auth-confirm-password") {
      return confirmPassword;
    }

    return "";
  };

  const getFieldChangeHandler = (fieldId: string) => {
    if (fieldId === "auth-name") {
      return setName;
    }

    if (fieldId === "auth-email") {
      return setEmail;
    }

    if (fieldId === "auth-password") {
      return setPassword;
    }

    if (fieldId === "auth-confirm-password") {
      return setConfirmPassword;
    }

    return undefined;
  };
  const currentFields = getAuthFields(locale, mode);
  const registerFields = getAuthFields(locale, "register");
  const nameField = findAuthField(registerFields, "auth-name");
  const emailField = findAuthField(currentFields, "auth-email");
  const passwordField = findAuthField(currentFields, "auth-password");
  const confirmPasswordField = findAuthField(registerFields, "auth-confirm-password");

  const renderAuthInput = (
    field: AuthField,
    {
      className = "",
      isDisabled = false,
      layoutId,
    }: { className?: string; isDisabled?: boolean; layoutId?: string } = {},
  ) => {
    const validationContent =
      isRegister && field.id === "auth-name" ? (
        <UsernameStatus isVisible={showNameValidation} locale={locale} message={usernameError} />
      ) : field.id === "auth-email" ? (
        <EmailStatus isVisible={showEmailValidation} locale={locale} />
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
            : field.id === "auth-email"
              ? "email-status"
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
          (field.id === "auth-email" && showEmailValidation && !isEmailValid) ||
          (field.id === "auth-password" && showPasswordError) ||
          (field.id === "auth-confirm-password" && showConfirmPasswordError)
        }
        layoutId={layoutId}
        onBlur={
          isRegister && field.id === "auth-name"
            ? () => setNameTouched(true)
            : field.id === "auth-email"
              ? () => setEmailTouched(true)
              : isRegister && field.id === "auth-password"
                ? () => setPasswordTouched(true)
                : isRegister && field.id === "auth-confirm-password"
                  ? () => setConfirmPasswordTouched(true)
                  : undefined
        }
        onChange={getFieldChangeHandler(field.id)}
        value={getFieldValue(field.id)}
      >
        {validationContent}
      </AuthInput>
    );
  };

  return (
    <motion.div
      className={`relative flex min-h-full flex-col bg-white p-7 text-foreground md:p-8 ${className}`}
      data-auth-panel={mode}
      data-page-surface="auth-panel"
      layout
      transition={authSharedLayoutTransition}
    >
      <div className="flex flex-1 items-center justify-center py-20">
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
              {copy.title}
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
            {renderAuthInput(emailField)}
            {renderAuthInput(passwordField, { className: "mt-6" })}
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
                  disabled={isSubmitting}
                  onClick={handleResendCode}
                  type="button"
                >
                  {locale === "en" ? "Resend code" : "Kirim ulang kode"}
                </button>
              </div>
            ) : null}

            {errorMessage ? (
              <p className="mt-6 text-sm leading-6 font-medium text-rose-700" role="alert">
                {errorMessage}
              </p>
            ) : null}
            {statusMessage ? (
              <p className="mt-6 text-sm leading-6 font-medium text-sky-700" aria-live="polite">
                {statusMessage}
              </p>
            ) : null}

            <motion.button
              className="mt-6 inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-none bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:bg-zinc-400"
              disabled={isSubmitting}
              layout="position"
              layoutId="auth-submit-button"
              transition={authSharedLayoutTransition}
              type="submit"
            >
              {getSubmitLabel({
                isConfirmingAccount,
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
            <a
              className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
              data-app-link
              href={copy.switchHref}
            >
              {copy.switchAction}
            </a>
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
  isDisabled = false,
  isInvalid = false,
  layoutId,
  onBlur,
  onChange,
  value,
}: {
  ariaDescribedBy?: string;
  children?: ReactNode;
  className?: string;
  field: AuthField;
  isDisabled?: boolean;
  isInvalid?: boolean;
  layoutId?: string;
  onBlur?: () => void;
  onChange?: (value: string) => void;
  value?: string;
}) {
  return (
    <motion.div
      className={className}
      layout="position"
      layoutId={layoutId ?? `auth-field-${field.id}`}
      transition={authSharedLayoutTransition}
    >
      <label className="mb-2.5 block text-[13px] font-semibold text-foreground" htmlFor={field.id}>
        {field.label}
      </label>
      <input
        aria-describedby={ariaDescribedBy}
        aria-invalid={isInvalid}
        autoComplete={field.autoComplete}
        className={`flex h-10 w-full rounded-none border bg-white/92 px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.02)] outline-none transition-colors placeholder:text-zinc-400 hover:border-zinc-500 focus:ring-2 ${
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
        type={field.type}
        value={value}
      />
      {children ??
        (field.helper ? (
          <p className="mt-1.5 text-xs leading-4 text-muted-foreground">{field.helper}</p>
        ) : null)}
    </motion.div>
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
  const shouldShowHint = !hasPassword && error.length > 0;

  return (
    <>
      {shouldShowHint ? (
        <p
          className="mt-1.5 overflow-hidden text-xs leading-4 text-rose-700 transition-[max-height,opacity,transform,color] duration-300 ease-out"
          id="password-requirements-hint"
        >
          {error}
        </p>
      ) : null}
      <ul
        aria-label={locale === "en" ? "Password requirements" : "Syarat sandi"}
        className={`space-y-1.5 overflow-hidden pl-0.5 transition-[max-height,opacity,transform,margin] duration-300 ease-out ${
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
        className={`inline-flex size-4 shrink-0 items-center justify-center rounded-none border transition-[background-color,border-color,color,transform] duration-300 ease-out ${
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
          className={`absolute right-0 left-0 top-1/2 h-px origin-left -translate-y-1/2 bg-current transition-transform duration-300 ease-out ${
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
      className={`mt-1.5 flex items-center gap-1.5 overflow-hidden text-xs leading-4 font-medium transition-[max-height,opacity,transform,color] duration-300 ease-out ${
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
  const statusMessage =
    message ||
    (isMatch
      ? locale === "en"
        ? "matches password"
        : "cocok dengan sandi"
      : locale === "en"
        ? "does not match password"
        : "tidak cocok dengan sandi");

  return (
    <p
      aria-live="polite"
      className={`mt-1.5 flex items-center gap-1.5 overflow-hidden text-xs leading-4 font-medium transition-[max-height,opacity,transform,color] duration-300 ease-out ${
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
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 bg-white">
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
      emailHelper: "",
      name: "Username",
      nameHelper: "",
      password: "Password",
      passwordHelper: "",
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
      autoComplete: "username",
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

function getSubmitLabel({
  isConfirmingAccount,
  isSubmitting,
  locale,
  submit,
}: {
  isConfirmingAccount: boolean;
  isSubmitting: boolean;
  locale: Locale;
  submit: string;
}) {
  if (isSubmitting) {
    return locale === "en" ? "Processing..." : "Memproses...";
  }

  if (isConfirmingAccount) {
    return locale === "en" ? "Verify Account" : "Verifikasi Akun";
  }

  return submit;
}

function getConfirmationSentMessage(locale: Locale, destination?: string) {
  if (locale === "en") {
    return destination
      ? `Verification code sent to ${destination}.`
      : "Verification code sent to your email.";
  }

  return destination
    ? `Kode verifikasi dikirim ke ${destination}.`
    : "Kode verifikasi dikirim ke email kamu.";
}

function getAuthErrorMessage(error: unknown, locale: Locale) {
  if (error instanceof CognitoAuthError) {
    const messages: Record<string, Record<Locale, string>> = {
      AuthNotConfigured: {
        en: "Auth is not configured yet. Deploy the backend and set the Cognito env values.",
        id: "Auth belum dikonfigurasi. Deploy backend dulu lalu isi env Cognito.",
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
        en: "Password must be at least 8 characters and include uppercase, lowercase, and number.",
        id: "Sandi minimal 8 karakter dan punya huruf besar, huruf kecil, serta angka.",
      },
      NotAuthorizedException: {
        en: "Email or password is not correct.",
        id: "Email atau sandi belum sesuai.",
      },
      UsernameExistsException: {
        en: "This email is already registered. Sign in instead.",
        id: "Email ini sudah terdaftar. Masuk saja.",
      },
      UserNotFoundException: {
        en: "No account was found for this email.",
        id: "Akun dengan email ini belum ditemukan.",
      },
    };

    return messages[error.code]?.[locale] ?? error.message;
  }

  return locale === "en" ? "Auth request failed." : "Permintaan auth gagal.";
}

function redirectToLearning() {
  window.history.pushState(null, "", "/learn");
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0 });
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
      : "Sandi minimal 8 karakter.";
  }

  if (!ruleState.case) {
    return locale === "en"
      ? "Password must include lowercase and uppercase letters."
      : "Sandi harus punya huruf kecil dan huruf besar.";
  }

  if (!ruleState.number) {
    return locale === "en" ? "Password must include a number." : "Sandi harus punya angka.";
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

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number) {
  return Math.floor(random(min, max));
}
