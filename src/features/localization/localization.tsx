import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const localizationStorageKey = "smile-language";

export type Locale = "id" | "en";

const defaultLocale: Locale = "id";

const idMessages = {
  "language.current": "Bahasa aktif",
  "language.option.en": "English",
  "language.option.id": "Indonesia",
  "language.trigger": "Bahasa",
  "language.triggerAria": "Pilih bahasa",
  "language.use.en": "Gunakan English",
  "language.use.id": "Gunakan Indonesia",
  "externalLink.cancel": "Batal",
  "externalLink.description": "Kamu akan meninggalkan Smile untuk membuka tautan eksternal:",
  "externalLink.open": "Buka tautan",
  "externalLink.title": "Buka tautan eksternal",
  "externalLink.urlLabel": "URL tautan eksternal",
  "learning.back.home": "Kembali ke Beranda Belajar",
  "learning.choice.multiple": "Pilih {count} jawaban",
  "learning.choice.single": "Satu jawaban",
  "learning.dataset.preview": "Pratinjau dataset",
  "learning.exercise": "Latihan",
  "learning.exercise.edit": "Edit",
  "learning.exercise.numbered": "Latihan {number}",
  "learning.home.activeLessons": "Lesson aktif",
  "learning.home.available": "Tersedia",
  "learning.home.completed": "Selesai",
  "learning.home.comingSoon": "Segera hadir",
  "learning.home.locked": "Terkunci",
  "learning.home.module": "Modul",
  "learning.home.notAvailable": "Belum tersedia",
  "learning.home.progress": "Progres",
  "learning.home.progressAria": "Progres belajar {percent}%",
  "learning.home.reset": "Reset progres",
  "learning.home.resetCancel": "Batal",
  "learning.home.resetDescription":
    "Tindakan ini tidak bisa dibatalkan. Semua progres belajarmu akan dihapus.",
  "learning.home.resetTitle": "Reset progres belajar?",
  "learning.home.review": "Review",
  "learning.home.start": "Mulai",
  "learning.trackHub.comingSoon": "Segera hadir",
  "learning.trackHub.continue": "Lanjutkan",
  "learning.trackHub.startPath": "Mulai jalur",
  "learning.trackHub.title": "Pilih jalur belajar",
  "learning.feedback.correct": "Benar",
  "learning.feedback.incorrect": "Salah",
  "learning.hint": "Petunjuk",
  "learning.hint.hide": "Sembunyikan petunjuk",
  "learning.hint.show": "Tampilkan petunjuk",
  "learning.hint.showMore": "Tampilkan petunjuk lain",
  "learning.move.down": "Pindahkan {label} ke bawah",
  "learning.move.up": "Pindahkan {label} ke atas",
  "learning.role.aria": "Role untuk {column}",
  "learning.role.ignore": "Abaikan / belum dipakai",
  "learning.role.metadata": "Metadata",
  "learning.role.safeFeature": "Fitur",
  "learning.role.target": "Target",
  "learning.result.correct": "Benar",
  "learning.result.incorrect": "Belum tepat",
  "learning.result.partial": "Sebagian benar",
  "learning.sortBy": "Urutkan berdasarkan {label}",
  "learning.submit": "Kirim jawaban",
  "learning.submitted": "Terkirim",
  "learning.validating": "Memvalidasi...",
  "navigation.back.learningPaths": "Kembali ke Jalur Belajar",
  "navigation.back.track": "Kembali ke jalur",
  "navigation.continue": "Lanjut",
  "navigation.prev": "Sebelumnya",
  "lesson.openError.body": "Dataset untuk lesson ini belum tersedia.",
  "lesson.openError.title": "Lesson tidak bisa dibuka",
  "menu.algorithmLab": "Lab Algoritma",
  "menu.changelog": "Catatan perubahan",
  "menu.close": "Tutup menu",
  "menu.contact": "Kontak",
  "menu.explore": "Eksplorasi",
  "menu.home": "Beranda",
  "menu.learningMode": "Mode Belajar",
  "menu.learningModeHighlight": "Sorotan Mode Belajar",
  "menu.mlPlayground": "ML Playground",
  "menu.navLabel": "Menu belajar",
  "menu.open": "Buka menu",
  "menu.startPath": "Mulai jalur",
  "menu.support": "Bantuan",
  "menu.whatsNew": "Yang baru",
  "menu.whatsNewDescription": "Mulai dari alur dasar ML, lalu lanjut ke evaluasi model.",
} as const;

type TranslationKey = keyof typeof idMessages;

const enMessages: Record<TranslationKey, string> = {
  "language.current": "Current language",
  "language.option.en": "English",
  "language.option.id": "Indonesia",
  "language.trigger": "Language",
  "language.triggerAria": "Choose language",
  "language.use.en": "Use English",
  "language.use.id": "Use Indonesia",
  "externalLink.cancel": "Cancel",
  "externalLink.description": "You are leaving Smile to open an external link:",
  "externalLink.open": "Open link",
  "externalLink.title": "Open external link",
  "externalLink.urlLabel": "External link URL",
  "learning.back.home": "Back to Learning Home",
  "learning.choice.multiple": "Select {count} answers",
  "learning.choice.single": "Single answer",
  "learning.dataset.preview": "Dataset preview",
  "learning.exercise": "Exercise",
  "learning.exercise.edit": "Edit",
  "learning.exercise.numbered": "Exercise {number}",
  "learning.home.activeLessons": "Active lessons",
  "learning.home.available": "Available",
  "learning.home.completed": "Completed",
  "learning.home.comingSoon": "Coming soon",
  "learning.home.locked": "Locked",
  "learning.home.module": "Module",
  "learning.home.notAvailable": "Not available",
  "learning.home.progress": "Progress",
  "learning.home.progressAria": "Learning progress {percent}%",
  "learning.home.reset": "Reset progress",
  "learning.home.resetCancel": "Cancel",
  "learning.home.resetDescription":
    "This action cannot be undone. It will delete your learning progress.",
  "learning.home.resetTitle": "Reset learning progress?",
  "learning.home.review": "Review",
  "learning.home.start": "Start",
  "learning.trackHub.comingSoon": "Coming soon",
  "learning.trackHub.continue": "Continue",
  "learning.trackHub.startPath": "Start path",
  "learning.trackHub.title": "Choose a learning path",
  "learning.feedback.correct": "Correct",
  "learning.feedback.incorrect": "Incorrect",
  "learning.hint": "Hint",
  "learning.hint.hide": "Hide hints",
  "learning.hint.show": "Show hints",
  "learning.hint.showMore": "Show another hint",
  "learning.move.down": "Move {label} down",
  "learning.move.up": "Move {label} up",
  "learning.role.aria": "Role for {column}",
  "learning.role.ignore": "Ignore / not used yet",
  "learning.role.metadata": "Metadata",
  "learning.role.safeFeature": "Feature",
  "learning.role.target": "Target",
  "learning.result.correct": "Correct",
  "learning.result.incorrect": "Not quite",
  "learning.result.partial": "Partially correct",
  "learning.sortBy": "Sort by {label}",
  "learning.submit": "Submit answer",
  "learning.submitted": "Submitted",
  "learning.validating": "Validating...",
  "navigation.back.learningPaths": "Back to Learning Paths",
  "navigation.back.track": "Back to path",
  "navigation.continue": "Next",
  "navigation.prev": "Prev",
  "lesson.openError.body": "The dataset for this lesson is not available yet.",
  "lesson.openError.title": "Lesson cannot be opened",
  "menu.algorithmLab": "Algorithm Lab",
  "menu.changelog": "Changelog",
  "menu.close": "Close menu",
  "menu.contact": "Contact",
  "menu.explore": "Explore",
  "menu.home": "Home",
  "menu.learningMode": "Learning Mode",
  "menu.learningModeHighlight": "Learning Mode highlight",
  "menu.mlPlayground": "ML Playground",
  "menu.navLabel": "Learning menu",
  "menu.open": "Open menu",
  "menu.startPath": "Start path",
  "menu.support": "Support",
  "menu.whatsNew": "What's new",
  "menu.whatsNewDescription": "Start from the basic ML workflow and continue to model evaluation.",
};

const messages: Record<Locale, Record<TranslationKey, string>> = {
  en: enMessages,
  id: idMessages,
};

export const localeOptions: Array<{
  flag: string;
  labelKey: TranslationKey;
  value: Locale;
}> = [
  { flag: "🇮🇩", labelKey: "language.option.id", value: "id" },
  { flag: "🇬🇧", labelKey: "language.option.en", value: "en" },
];

type LocalizationContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
};

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

function isLocale(value: string | null): value is Locale {
  return value === "id" || value === "en";
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return defaultLocale;
  }

  const storedLocale = window.localStorage.getItem(localizationStorageKey);

  return isLocale(storedLocale) ? storedLocale : defaultLocale;
}

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(localizationStorageKey, locale);
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
  }, []);

  const t = useCallback(
    (key: TranslationKey, values?: Record<string, string | number>) => {
      const template = messages[locale][key] ?? messages[defaultLocale][key];

      if (!values) {
        return template;
      }

      return Object.entries(values).reduce(
        (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
        template,
      );
    },
    [locale],
  );

  const contextValue = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );

  return (
    <LocalizationContext.Provider value={contextValue}>{children}</LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const context = useContext(LocalizationContext);

  if (!context) {
    throw new Error("useLocalization must be used inside LocalizationProvider.");
  }

  return context;
}
