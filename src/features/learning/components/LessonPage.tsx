import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { autoUpdate, flip, offset, shift, size, useFloating } from "@floating-ui/react-dom";
import { unzip } from "fflate";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  InformationCircleIcon,
  LinkIcon,
  PencilSquareIcon,
  XMarkIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import {
  Download04Icon,
  FileSpreadsheetIcon,
  FileZipIcon,
  Link03Icon,
  BulbIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { detectLanguage } from "@speed-highlight/core/detect";
import { highlightText, type ShjLanguage } from "@speed-highlight/core";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { AnimatePresence, motion } from "motion/react";
import {
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { getDatasetView } from "../datasets/registry";
import { lessonMdxContentByLocaleAndId } from "../content/lesson-mdx-content";
import { localizeDatasetView, localizeLesson } from "../content/localized-learning-content";
import {
  evaluateGuidedDownloadExercise,
  evaluateOpenDatasetSourceExercise,
  evaluateMultipleChoice,
  evaluateOrderedSteps,
} from "../evaluation/evaluate-lesson-exercises";
import {
  evaluateFeatureTargetRoles,
  getExpectedColumnRoles,
} from "../evaluation/evaluate-feature-target";
import type {
  ColumnRole,
  DatasetColumn,
  DatasetRow,
  DatasetSourceAnswer,
  DatasetSourcePageValidationResult,
  EvaluationResult,
  GuidedDownloadExercise,
  Lesson,
  LessonAnswer,
  LessonExercise,
  MultipleChoiceExercise,
  OpenDatasetSourceExercise,
  OrderedStepsExercise,
  TableColumnRoleExercise,
} from "../types";
import { LearningGridCanvas, LearningSheetExtensions } from "./LearningGridCanvas";
import { LearningHeader } from "./LearningHeader";
import { CopyButton } from "@/components/ui/copy-button";
import { LinkPreview } from "@/components/ui/link-preview";
import { LiquidButton, LiquidLink } from "@/components/ui/liquid-button";
import { useLocalization, type Locale } from "@/features/localization/localization";
import { shouldReduceMotion } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

const liquidButtonBaseClassName =
  "inline-flex items-center justify-center gap-3 rounded-none px-5 py-3 text-base font-semibold text-neutral-950 backdrop-blur-xl hover:text-neutral-50 [--liquid-button-background-color:var(--color-neutral-200)]";
const emeraldLiquidButtonClassName = `${liquidButtonBaseClassName} [--liquid-button-color:var(--color-emerald-500)]`;
const amberLiquidButtonClassName = `${liquidButtonBaseClassName} [--liquid-button-color:var(--color-amber-500)]`;
const neutralLiquidButtonClassName = `${liquidButtonBaseClassName} [--liquid-button-color:var(--color-neutral-500)]`;
const lessonFullCellGridClassName = "col-span-full [@media_(min-width:1024px)]:col-span-12";
const lessonSplitResultGridClassName = "col-span-full [@media_(min-width:1024px)]:col-span-8";
const lessonSplitAsideGridClassName = "col-span-full [@media_(min-width:1024px)]:col-span-4";
const lessonInlineLinkClassName =
  "[&_a]:font-semibold [&_a]:text-sky-700 [&_a]:underline [&_a]:underline-offset-2";
const lessonMarkdownContentClassName =
  "grid gap-4 text-base leading-6 text-muted-foreground [&>*:first-child]:mt-0 [&_a]:font-semibold [&_a]:text-sky-700 [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-2 [&_blockquote]:border-sky-400 [&_blockquote]:pl-4 [&_blockquote]:font-medium [&_blockquote]:text-foreground [&_blockquote_p]:m-0 [&_code:not(.lesson-code-block-code)]:bg-neutral-100 [&_code:not(.lesson-code-block-code)]:px-1.5 [&_code:not(.lesson-code-block-code)]:py-0.5 [&_code:not(.lesson-code-block-code)]:text-sm [&_code:not(.lesson-code-block-code)]:font-semibold [&_code:not(.lesson-code-block-code)]:text-foreground [&_h2]:mt-3 [&_h2]:text-xl [&_h2]:leading-tight [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-2 [&_h3]:text-lg [&_h3]:leading-tight [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:pl-1 [&_ol]:grid [&_ol]:list-decimal [&_ol]:gap-2 [&_ol]:pl-6 [&_p]:m-0 [&_strong]:font-semibold [&_strong]:text-foreground [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-neutral-300 [&_td]:p-2 [&_td]:align-top [&_th]:border [&_th]:border-neutral-300 [&_th]:bg-neutral-100 [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-2 [&_ul]:pl-6";
const supportedCodeLanguages: ShjLanguage[] = [
  "asm",
  "bash",
  "bf",
  "c",
  "css",
  "csv",
  "diff",
  "docker",
  "git",
  "go",
  "html",
  "http",
  "ini",
  "java",
  "js",
  "jsdoc",
  "json",
  "leanpub-md",
  "log",
  "lua",
  "make",
  "md",
  "pl",
  "plain",
  "py",
  "regex",
  "rs",
  "sql",
  "todo",
  "toml",
  "ts",
  "uri",
  "xml",
  "yaml",
];
const supportedCodeLanguageSet = new Set<string>(supportedCodeLanguages);
const codeLanguageAliases: Record<string, ShjLanguage> = {
  dockerfile: "docker",
  javascript: "js",
  jsx: "js",
  makefile: "make",
  markdown: "md",
  perl: "pl",
  plaintext: "plain",
  python: "py",
  rust: "rs",
  shell: "bash",
  sh: "bash",
  text: "plain",
  tsx: "ts",
  typescript: "ts",
  yml: "yaml",
  zsh: "bash",
};
const codeLanguageLabels: Partial<Record<ShjLanguage, string>> = {
  js: "JavaScript",
  json: "JSON",
  md: "Markdown",
  py: "Python",
  rs: "Rust",
  sql: "SQL",
  ts: "TypeScript",
  xml: "XML",
  yaml: "YAML",
};

function isHttpHref(value: string) {
  return /^https?:\/\//i.test(value);
}

function LessonContentAnchor({ children, className, href, ...props }: ComponentProps<"a">) {
  if (href && isHttpHref(href)) {
    return (
      <LinkPreview className={className} url={href}>
        {children}
      </LinkPreview>
    );
  }

  return (
    <a className={className} href={href} {...props}>
      {children}
    </a>
  );
}

function escapeCodeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getTextFromReactNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getTextFromReactNode).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getTextFromReactNode(node.props.children);
  }

  return "";
}

function getCodeLanguageFromReactNode(node: ReactNode): string | undefined {
  if (Array.isArray(node)) {
    return node.map(getCodeLanguageFromReactNode).find(Boolean);
  }

  if (!isValidElement<{ children?: ReactNode; className?: string }>(node)) {
    return undefined;
  }

  const className = node.props.className ?? "";
  const languageMatch = /(?:language|shj-lang)-([\w-]+)/.exec(className);

  return languageMatch?.[1] ?? getCodeLanguageFromReactNode(node.props.children);
}

function normalizeCodeLanguage(language: string | undefined, code: string): ShjLanguage {
  const normalizedLanguage = language?.trim().toLowerCase();

  if (!normalizedLanguage) {
    return detectLanguage(code);
  }

  const aliasedLanguage = codeLanguageAliases[normalizedLanguage];

  if (aliasedLanguage) {
    return aliasedLanguage;
  }

  return supportedCodeLanguageSet.has(normalizedLanguage)
    ? (normalizedLanguage as ShjLanguage)
    : detectLanguage(code);
}

function getCodeLanguageLabel(language: ShjLanguage) {
  return codeLanguageLabels[language] ?? language.toUpperCase();
}

function LessonCodeBlock({ code, language }: { code: string; language?: string }) {
  const { locale } = useLocalization();
  const codeLanguage = useMemo(() => normalizeCodeLanguage(language, code), [code, language]);
  const [highlightedCode, setHighlightedCode] = useState(() => escapeCodeHtml(code));
  const codeCopyAriaLabel = locale === "en" ? "Copy code" : "Salin kode";
  const codeCopiedAriaLabel = locale === "en" ? "Code copied" : "Kode disalin";
  const codeCopyLabel = locale === "en" ? "Copy" : "Salin";
  const codeCopiedLabel = locale === "en" ? "Copied!" : "Disalin!";

  useEffect(() => {
    let isActive = true;

    setHighlightedCode(escapeCodeHtml(code));
    void highlightText(code, codeLanguage, false)
      .then((nextHighlightedCode) => {
        if (isActive) {
          setHighlightedCode(nextHighlightedCode);
        }
      })
      .catch(() => {
        if (isActive) {
          setHighlightedCode(escapeCodeHtml(code));
        }
      });

    return () => {
      isActive = false;
    };
  }, [code, codeLanguage]);

  return (
    <figure className="lesson-code-block overflow-hidden border border-neutral-300 bg-white">
      <figcaption className="flex min-h-10 items-start justify-between gap-3 px-4 pt-4 pb-0">
        <span className="text-xs font-semibold tracking-normal text-neutral-950">
          {getCodeLanguageLabel(codeLanguage)}
        </span>
        <CopyButton
          className="h-9 px-3 text-sm"
          copiedAriaLabel={codeCopiedAriaLabel}
          copiedLabel={codeCopiedLabel}
          copyAriaLabel={codeCopyAriaLabel}
          copyLabel={codeCopyLabel}
          value={code}
        />
      </figcaption>
      <pre className="m-0 overflow-x-auto bg-white p-4 text-sm leading-6">
        <code
          className={`lesson-code-block-code shj-lang-${codeLanguage} block bg-transparent p-0 font-mono font-normal text-neutral-900`}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </pre>
    </figure>
  );
}

function LessonMdxPre({ children }: ComponentProps<"pre">) {
  const code = getTextFromReactNode(children).replace(/\n$/, "");
  const language = getCodeLanguageFromReactNode(children);

  return <LessonCodeBlock code={code} language={language} />;
}

const lessonMdxComponents = {
  a: LessonContentAnchor,
  pre: LessonMdxPre,
} satisfies Record<string, ComponentType<Record<string, unknown>>>;

type LessonPageProps = {
  backHref?: string;
  backLabel?: string;
  initialAnswer?: LessonAnswer;
  initialSubmittedAnswersByExerciseId?: Record<string, LessonAnswer>;
  isCompleted?: boolean;
  lesson: Lesson;
  nextLessonHref?: string;
  onAnswerChange?: (input: { answer: LessonAnswer; lessonId: string }) => void;
  onExerciseSubmitResult?: (input: {
    answer: LessonAnswer;
    exerciseId: string;
    lessonId: string;
    result: EvaluationResult;
  }) => void;
  onSubmitResult: (result: EvaluationResult, answer: LessonAnswer) => void;
  previousLessonHref?: string;
};

type GuidedDownloadArchiveState = {
  error?: string;
  fileName?: string;
  isReading: boolean;
  tabularFilePath?: string;
};

const roleOptions: ColumnRole[] = ["target", "safe-feature", "metadata"];
type RoleDropdownHighlightRect = {
  height: number;
  y: number;
};

function getRoleOptionLabel(value: ColumnRole, t: ReturnType<typeof useLocalization>["t"]) {
  const labels: Record<ColumnRole, string> = {
    ignore: t("learning.role.safeFeature"),
    metadata: t("learning.role.metadata"),
    "safe-feature": t("learning.role.safeFeature"),
    target: t("learning.role.target"),
  };

  return labels[value] ?? labels["safe-feature"];
}

function createCombinedExerciseResult(
  results: EvaluationResult[],
  locale: Locale,
): EvaluationResult {
  if (results.length === 1) {
    return results[0];
  }

  const score = Math.round(
    results.reduce((totalScore, result) => totalScore + result.score, 0) / results.length,
  );
  const missedColumnIds = [...new Set(results.flatMap((result) => result.missedColumnIds))];
  const extraColumnIds = [...new Set(results.flatMap((result) => result.extraColumnIds))];
  const suggestedHints = [...new Set(results.flatMap((result) => result.suggestedHints ?? []))];
  const correctCount = results.filter((result) => result.status === "correct").length;

  if (correctCount === results.length) {
    return {
      extraColumnIds,
      missedColumnIds,
      message:
        locale === "en"
          ? "All exercises in this lesson are correct."
          : "Semua latihan di lesson ini sudah benar.",
      nextStep:
        locale === "en"
          ? "This lesson is complete. Continue to the next unlocked lesson."
          : "Lesson ini selesai. Lanjutkan ke lesson berikutnya yang sudah terbuka.",
      score,
      status: "correct",
      suggestedHints: [],
      title: locale === "en" ? "Correct" : "Benar",
    };
  }

  if (correctCount > 0 || results.some((result) => result.status === "partial")) {
    return {
      extraColumnIds,
      missedColumnIds,
      message:
        locale === "en"
          ? `${correctCount}/${results.length} exercises are correct. Check the remaining exercises before continuing.`
          : `${correctCount}/${results.length} latihan sudah benar. Periksa latihan yang tersisa sebelum lanjut.`,
      nextStep:
        locale === "en"
          ? "Use the feedback and hints, fix the unfinished answers, then submit again."
          : "Gunakan feedback dan petunjuk, perbaiki jawaban yang belum selesai, lalu kirim ulang.",
      score,
      status: "partial",
      suggestedHints,
      title: locale === "en" ? "Partially correct" : "Sebagian benar",
    };
  }

  return {
    extraColumnIds,
    missedColumnIds,
    message:
      locale === "en"
        ? "The exercise answer does not match the main concept checked in this lesson yet."
        : "Jawaban latihan belum sesuai dengan konsep utama yang dicek di lesson ini.",
    nextStep:
      locale === "en"
        ? "Use the hints, review the material, then try again."
        : "Gunakan petunjuk, baca ulang materi, lalu coba lagi.",
    score,
    status: "incorrect",
    suggestedHints,
    title: locale === "en" ? "Not quite" : "Belum tepat",
  };
}

function createRestoredCorrectResult(locale: Locale): EvaluationResult {
  return {
    extraColumnIds: [],
    message: "",
    missedColumnIds: [],
    nextStep: "",
    score: 100,
    status: "correct",
    suggestedHints: [],
    title: locale === "en" ? "Correct" : "Benar",
  };
}

function isDatasetSourcePageValidationResult(
  value: unknown,
): value is DatasetSourcePageValidationResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Partial<DatasetSourcePageValidationResult>;

  return (
    typeof result.sourceId === "string" &&
    typeof result.url === "string" &&
    typeof result.status === "string" &&
    Array.isArray(result.signals) &&
    Array.isArray(result.issues)
  );
}

async function validateDatasetSourcePages({
  answersBySourceId,
  exercise,
  locale,
}: {
  answersBySourceId: Record<string, DatasetSourceAnswer>;
  exercise: OpenDatasetSourceExercise;
  locale: Locale;
}) {
  const sources = exercise.sourceInputs
    .map((sourceInput) => {
      const answer = answersBySourceId[sourceInput.id];

      return {
        id: sourceInput.id,
        label: sourceInput.label,
        notes: answer?.notes ?? "",
        url: answer?.url ?? "",
      };
    })
    .filter((source) => source.url.trim() !== "");

  if (sources.length === 0) {
    return [];
  }

  const response = await fetch("/api/learning/dataset-source-validation", {
    body: JSON.stringify({ locale, sources }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Dataset source validation failed.");
  }

  const body = (await response.json()) as { results?: unknown };

  return Array.isArray(body.results)
    ? body.results.filter(isDatasetSourcePageValidationResult)
    : [];
}

function haveSameOrderedValues(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function haveSameValueSet(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  const rightValues = new Set(right);

  return left.every((value) => rightValues.has(value));
}

function haveSameDatasetSourceAnswers(
  sourceInputs: OpenDatasetSourceExercise["sourceInputs"],
  left: Record<string, DatasetSourceAnswer>,
  right: Record<string, DatasetSourceAnswer>,
) {
  return sourceInputs.every((sourceInput) => {
    const leftAnswer = left[sourceInput.id] ?? { notes: "", url: "" };
    const rightAnswer = right[sourceInput.id] ?? { notes: "", url: "" };

    return leftAnswer.url === rightAnswer.url && leftAnswer.notes === rightAnswer.notes;
  });
}

function haveSameColumnRoleAssignments(
  left: Record<string, ColumnRole>,
  right: Record<string, ColumnRole>,
) {
  const assignmentKeys = new Set([...Object.keys(left), ...Object.keys(right)]);

  return [...assignmentKeys].every(
    (columnId) => (left[columnId] ?? "safe-feature") === (right[columnId] ?? "safe-feature"),
  );
}

function haveSameEvaluationResult(left: EvaluationResult | undefined, right: EvaluationResult) {
  return (
    left !== undefined &&
    left.status === right.status &&
    left.score === right.score &&
    left.title === right.title &&
    left.message === right.message &&
    left.nextStep === right.nextStep &&
    haveSameValueSet(left.missedColumnIds, right.missedColumnIds) &&
    haveSameValueSet(left.extraColumnIds, right.extraColumnIds) &&
    haveSameOrderedValues(left.suggestedHints ?? [], right.suggestedHints ?? [])
  );
}

function getDatasetSourceAnswersWithValidationEvidence({
  answersBySourceId,
  sourceInputs,
  validationResults,
}: {
  answersBySourceId: Record<string, DatasetSourceAnswer>;
  sourceInputs: OpenDatasetSourceExercise["sourceInputs"];
  validationResults: DatasetSourcePageValidationResult[];
}) {
  const validationResultBySourceId = new Map(
    validationResults.map((validationResult) => [validationResult.sourceId, validationResult]),
  );
  let hasChanges = false;
  const nextAnswersBySourceId = { ...answersBySourceId };

  for (const sourceInput of sourceInputs) {
    const validationResult = validationResultBySourceId.get(sourceInput.id);
    const evidenceExcerpt = validationResult?.evidenceExcerpt?.trim();
    const currentAnswer = nextAnswersBySourceId[sourceInput.id] ?? { notes: "", url: "" };

    if (
      evidenceExcerpt &&
      validationResult.status !== "invalid" &&
      validationResult.status !== "unreachable" &&
      currentAnswer.notes.trim() === ""
    ) {
      nextAnswersBySourceId[sourceInput.id] = {
        ...currentAnswer,
        notes: evidenceExcerpt,
      };
      hasChanges = true;
    }
  }

  return hasChanges ? nextAnswersBySourceId : answersBySourceId;
}

type MarkdownBlock =
  | { blocks: MarkdownBlock[]; type: "blockquote" }
  | { code: string; language?: string; type: "code" }
  | { level: 2 | 3; text: string; type: "heading" }
  | { headers: string[]; rows: string[][]; type: "table" }
  | { items: string[]; type: "ordered-list" | "unordered-list" }
  | { text: string; type: "paragraph" };

const unorderedMarkdownListItemPattern = /^\s*[-*+]\s+(.+)$/;
const orderedMarkdownListItemPattern = /^\s*\d+[.)]\s+(.+)$/;
const markdownTableSeparatorPattern = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;

function parseMarkdownTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isMarkdownTableStart(lines: string[], index: number) {
  const headerLine = lines[index];
  const separatorLine = lines[index + 1];

  return Boolean(
    headerLine?.includes("|") && separatorLine && markdownTableSeparatorPattern.test(separatorLine),
  );
}

function isMarkdownBlockStart(lines: string[], index: number) {
  const line = lines[index] ?? "";
  const trimmedLine = line.trim();

  return (
    trimmedLine === "" ||
    trimmedLine.startsWith("```") ||
    /^#{1,6}\s+/.test(trimmedLine) ||
    trimmedLine.startsWith(">") ||
    unorderedMarkdownListItemPattern.test(line) ||
    orderedMarkdownListItemPattern.test(line) ||
    isMarkdownTableStart(lines, index)
  );
}

function parseMarkdownBlocks(value: string): MarkdownBlock[] {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmedLine = line.trim();

    if (trimmedLine === "") {
      index += 1;
      continue;
    }

    if (trimmedLine.startsWith("```")) {
      const codeLines: string[] = [];
      const language = trimmedLine.slice(3).trim().split(/\s+/)[0] || undefined;
      index += 1;

      while (index < lines.length && !(lines[index] ?? "").trim().startsWith("```")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push({ code: codeLines.join("\n"), language, type: "code" });
      continue;
    }

    if (isMarkdownTableStart(lines, index)) {
      const headers = parseMarkdownTableRow(lines[index] ?? "");
      const rows: string[][] = [];
      index += 2;

      while (index < lines.length && (lines[index] ?? "").includes("|")) {
        rows.push(parseMarkdownTableRow(lines[index] ?? ""));
        index += 1;
      }

      blocks.push({ headers, rows, type: "table" });
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(trimmedLine);

    if (headingMatch?.[1] && headingMatch[2]) {
      blocks.push({
        level: headingMatch[1].length <= 2 ? 2 : 3,
        text: headingMatch[2].trim(),
        type: "heading",
      });
      index += 1;
      continue;
    }

    if (trimmedLine.startsWith(">")) {
      const quoteLines: string[] = [];

      while (index < lines.length) {
        const quoteMatch = /^\s*>\s?(.*)$/.exec(lines[index] ?? "");

        if (!quoteMatch) {
          break;
        }

        quoteLines.push(quoteMatch[1] ?? "");
        index += 1;
      }

      blocks.push({ blocks: parseMarkdownBlocks(quoteLines.join("\n")), type: "blockquote" });
      continue;
    }

    const unorderedListMatch = unorderedMarkdownListItemPattern.exec(line);

    if (unorderedListMatch?.[1]) {
      const items: string[] = [];

      while (index < lines.length) {
        const itemMatch = unorderedMarkdownListItemPattern.exec(lines[index] ?? "");

        if (!itemMatch?.[1]) {
          break;
        }

        items.push(itemMatch[1].trim());
        index += 1;
      }

      blocks.push({ items, type: "unordered-list" });
      continue;
    }

    const orderedListMatch = orderedMarkdownListItemPattern.exec(line);

    if (orderedListMatch?.[1]) {
      const items: string[] = [];

      while (index < lines.length) {
        const itemMatch = orderedMarkdownListItemPattern.exec(lines[index] ?? "");

        if (!itemMatch?.[1]) {
          break;
        }

        items.push(itemMatch[1].trim());
        index += 1;
      }

      blocks.push({ items, type: "ordered-list" });
      continue;
    }

    const paragraphLines: string[] = [];

    while (index < lines.length && !isMarkdownBlockStart(lines, index)) {
      paragraphLines.push((lines[index] ?? "").trim());
      index += 1;
    }

    blocks.push({ text: paragraphLines.join(" "), type: "paragraph" });
  }

  return blocks.filter((block) => block.type !== "paragraph" || block.text.trim() !== "");
}

function hasInlineBoundaryBefore(value: string, index: number) {
  return index === 0 || /[\s([{"'“‘]/.test(value[index - 1] ?? "");
}

function hasInlineBoundaryAfter(value: string, index: number) {
  return index >= value.length || /[\s.,!?;:)\]}"'”’]/.test(value[index] ?? "");
}

function findBoundedDelimiter(value: string, delimiter: string, startIndex: number) {
  let searchIndex = startIndex + delimiter.length;

  while (searchIndex < value.length) {
    const endIndex = value.indexOf(delimiter, searchIndex);

    if (endIndex === -1) {
      return -1;
    }

    if (
      endIndex > startIndex + delimiter.length &&
      hasInlineBoundaryAfter(value, endIndex + delimiter.length)
    ) {
      return endIndex;
    }

    searchIndex = endIndex + delimiter.length;
  }

  return -1;
}

function getSafeMarkdownHref(value: string) {
  const trimmedValue = value.trim();

  return /^(https?:|mailto:)/i.test(trimmedValue) ? trimmedValue : undefined;
}

function renderInlineMarkdown(value: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let buffer = "";
  let nodeIndex = 0;
  let index = 0;

  const flushBuffer = () => {
    if (buffer) {
      nodes.push(buffer);
      buffer = "";
    }
  };

  const pushNode = (node: ReactNode) => {
    flushBuffer();
    nodes.push(node);
    nodeIndex += 1;
  };

  while (index < value.length) {
    if (value[index] === "`") {
      const endIndex = value.indexOf("`", index + 1);

      if (endIndex > index + 1) {
        pushNode(
          <code key={`${keyPrefix}-code-${nodeIndex}`}>{value.slice(index + 1, endIndex)}</code>,
        );
        index = endIndex + 1;
        continue;
      }
    }

    if (value.startsWith("**", index)) {
      const endIndex = value.indexOf("**", index + 2);

      if (endIndex > index + 2) {
        pushNode(
          <strong key={`${keyPrefix}-strong-${nodeIndex}`}>
            {renderInlineMarkdown(
              value.slice(index + 2, endIndex),
              `${keyPrefix}-strong-${nodeIndex}`,
            )}
          </strong>,
        );
        index = endIndex + 2;
        continue;
      }
    }

    if (value.startsWith("__", index) && hasInlineBoundaryBefore(value, index)) {
      const endIndex = findBoundedDelimiter(value, "__", index);

      if (endIndex > index + 2) {
        pushNode(
          <strong key={`${keyPrefix}-strong-${nodeIndex}`}>
            {renderInlineMarkdown(
              value.slice(index + 2, endIndex),
              `${keyPrefix}-strong-${nodeIndex}`,
            )}
          </strong>,
        );
        index = endIndex + 2;
        continue;
      }
    }

    if (value[index] === "[") {
      const labelEndIndex = value.indexOf("]", index + 1);

      if (labelEndIndex > index + 1 && value[labelEndIndex + 1] === "(") {
        const hrefEndIndex = value.indexOf(")", labelEndIndex + 2);
        const safeHref =
          hrefEndIndex > labelEndIndex + 2
            ? getSafeMarkdownHref(value.slice(labelEndIndex + 2, hrefEndIndex))
            : undefined;

        if (safeHref) {
          pushNode(
            <LessonContentAnchor
              href={safeHref}
              key={`${keyPrefix}-link-${nodeIndex}`}
              rel="noreferrer"
              target="_blank"
            >
              {renderInlineMarkdown(
                value.slice(index + 1, labelEndIndex),
                `${keyPrefix}-link-${nodeIndex}`,
              )}
            </LessonContentAnchor>,
          );
          index = hrefEndIndex + 1;
          continue;
        }
      }
    }

    if (value[index] === "*") {
      const endIndex = value.indexOf("*", index + 1);

      if (endIndex > index + 1) {
        pushNode(
          <em key={`${keyPrefix}-em-${nodeIndex}`}>
            {renderInlineMarkdown(value.slice(index + 1, endIndex), `${keyPrefix}-em-${nodeIndex}`)}
          </em>,
        );
        index = endIndex + 1;
        continue;
      }
    }

    if (value[index] === "_" && hasInlineBoundaryBefore(value, index)) {
      const endIndex = findBoundedDelimiter(value, "_", index);

      if (endIndex > index + 1) {
        pushNode(
          <em key={`${keyPrefix}-em-${nodeIndex}`}>
            {renderInlineMarkdown(value.slice(index + 1, endIndex), `${keyPrefix}-em-${nodeIndex}`)}
          </em>,
        );
        index = endIndex + 1;
        continue;
      }
    }

    buffer += value[index] ?? "";
    index += 1;
  }

  flushBuffer();

  return nodes;
}

function renderMarkdownBlock(block: MarkdownBlock, index: number): ReactNode {
  if (block.type === "heading") {
    return block.level === 2 ? (
      <h2 key={index}>{renderInlineMarkdown(block.text, `heading-${index}`)}</h2>
    ) : (
      <h3 key={index}>{renderInlineMarkdown(block.text, `heading-${index}`)}</h3>
    );
  }

  if (block.type === "paragraph") {
    return <p key={index}>{renderInlineMarkdown(block.text, `paragraph-${index}`)}</p>;
  }

  if (block.type === "unordered-list") {
    return (
      <ul key={index}>
        {block.items.map((item, itemIndex) => (
          <li key={itemIndex}>{renderInlineMarkdown(item, `ul-${index}-${itemIndex}`)}</li>
        ))}
      </ul>
    );
  }

  if (block.type === "ordered-list") {
    return (
      <ol key={index}>
        {block.items.map((item, itemIndex) => (
          <li key={itemIndex}>{renderInlineMarkdown(item, `ol-${index}-${itemIndex}`)}</li>
        ))}
      </ol>
    );
  }

  if (block.type === "blockquote") {
    return <blockquote key={index}>{block.blocks.map(renderMarkdownBlock)}</blockquote>;
  }

  if (block.type === "code") {
    return <LessonCodeBlock code={block.code} key={index} language={block.language} />;
  }

  return (
    <div className="overflow-x-auto" key={index}>
      <table>
        <thead>
          <tr>
            {block.headers.map((header, headerIndex) => (
              <th key={headerIndex}>
                {renderInlineMarkdown(header, `table-${index}-header-${headerIndex}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>
                  {renderInlineMarkdown(cell, `table-${index}-row-${rowIndex}-${cellIndex}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function hasMarkdownSyntax(value: string) {
  return /(^|\n)\s*(#{1,6}\s+|[-*+]\s+|\d+[.)]\s+|>|```)|[`*_]|\[[^\]]+\]\((https?:|mailto:)/i.test(
    value,
  );
}

function MarkdownContent({ className = "", value }: { className?: string; value: string }) {
  const blocks = parseMarkdownBlocks(value);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={`${lessonMarkdownContentClassName} ${className}`}>
      {blocks.map(renderMarkdownBlock)}
    </div>
  );
}

function createLessonAnswerSnapshot({
  assignments,
  datasetSourceAnswersByExerciseId,
  exercises,
  guidedDownloadCodeByExerciseId,
  guidedDownloadExtractedFilePathsByExerciseId,
  orderedStepIdsByExerciseId,
  selectedOptionIdsByExerciseId,
}: {
  assignments: Record<string, ColumnRole>;
  datasetSourceAnswersByExerciseId: Record<string, Record<string, DatasetSourceAnswer>>;
  exercises: LessonExercise[];
  guidedDownloadCodeByExerciseId: Record<string, string>;
  guidedDownloadExtractedFilePathsByExerciseId: Record<string, string>;
  orderedStepIdsByExerciseId: Record<string, string[]>;
  selectedOptionIdsByExerciseId: Record<string, string[]>;
}): LessonAnswer {
  const answer: LessonAnswer = {
    columnRoleAssignmentsByExerciseId: {},
    datasetSourceAnswersByExerciseId: {},
    guidedDownloadCodeByExerciseId: {},
    guidedDownloadExtractedFilePathsByExerciseId: {},
    orderedStepIdsByExerciseId: {},
    selectedOptionIdsByExerciseId: {},
  };

  for (const exercise of exercises) {
    if (exercise.type === "multiple-choice") {
      answer.selectedOptionIdsByExerciseId[exercise.id] = [
        ...(selectedOptionIdsByExerciseId[exercise.id] ?? []),
      ];
    }

    if (exercise.type === "ordered-steps") {
      answer.orderedStepIdsByExerciseId[exercise.id] = [
        ...(orderedStepIdsByExerciseId[exercise.id] ?? []),
      ];
    }

    if (exercise.type === "table-column-role-assignment") {
      answer.columnRoleAssignmentsByExerciseId[exercise.id] = { ...assignments };
    }

    if (exercise.type === "open-dataset-source") {
      answer.datasetSourceAnswersByExerciseId[exercise.id] = {
        ...datasetSourceAnswersByExerciseId[exercise.id],
      };
    }

    if (exercise.type === "guided-download") {
      answer.guidedDownloadCodeByExerciseId[exercise.id] =
        guidedDownloadCodeByExerciseId[exercise.id] ?? "";
      answer.guidedDownloadExtractedFilePathsByExerciseId[exercise.id] =
        guidedDownloadExtractedFilePathsByExerciseId[exercise.id] ?? "";
    }
  }

  return answer;
}

function getDatasetSourceAnswersFromAnswer(
  exercise: OpenDatasetSourceExercise,
  answer: LessonAnswer | undefined,
) {
  const savedAnswers = answer?.datasetSourceAnswersByExerciseId?.[exercise.id] ?? {};

  return exercise.sourceInputs.reduce<Record<string, DatasetSourceAnswer>>(
    (answersBySourceId, sourceInput) => {
      answersBySourceId[sourceInput.id] = savedAnswers[sourceInput.id]
        ? { ...savedAnswers[sourceInput.id] }
        : {
            notes: "",
            url: "",
          };

      return answersBySourceId;
    },
    {},
  );
}

function getGuidedDownloadSourceAnswer(
  exercise: GuidedDownloadExercise,
  submittedAnswersByExerciseId: Record<string, LessonAnswer>,
) {
  const reference = exercise.sourceAnswerReference;
  const sourceAnswer =
    submittedAnswersByExerciseId[reference.exerciseId]?.datasetSourceAnswersByExerciseId?.[
      reference.exerciseId
    ]?.[reference.sourceInputId];

  if (!sourceAnswer || sourceAnswer.url.trim() === "") {
    return undefined;
  }

  return sourceAnswer;
}

function unzipArchiveEntries(file: File) {
  return file.arrayBuffer().then(
    (arrayBuffer) =>
      new Promise<Record<string, Uint8Array>>((resolve, reject) => {
        unzip(new Uint8Array(arrayBuffer), (error, entries) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(entries);
        });
      }),
  );
}

function getFirstCsvPathFromZipEntries(entries: Record<string, Uint8Array>) {
  return (
    Object.keys(entries)
      .filter((entryName) => !entryName.endsWith("/") && /\.csv$/i.test(entryName))
      .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }))[0] ??
    null
  );
}

function getGuidedDownloadExpectedCode(
  exercise: GuidedDownloadExercise,
  extractedFilePath: string | undefined,
) {
  const normalizedPath = extractedFilePath?.trim();

  return normalizedPath
    ? `import pandas as pd\n\ndf = pd.read_csv("${normalizedPath}")\ndf.head()`
    : exercise.codePlaceholder;
}

function evaluateExerciseAnswerSnapshot(
  exercise: LessonExercise,
  answer: LessonAnswer,
  locale: Locale,
  guidedDownloadSourceAnswer?: DatasetSourceAnswer,
  guidedDownloadExtractedFilePath?: string,
) {
  if (exercise.type === "multiple-choice") {
    return evaluateMultipleChoice(
      exercise,
      answer.selectedOptionIdsByExerciseId?.[exercise.id] ?? [],
      locale,
    );
  }

  if (exercise.type === "ordered-steps") {
    return evaluateOrderedSteps(
      exercise,
      answer.orderedStepIdsByExerciseId?.[exercise.id] ?? [],
      locale,
    );
  }

  if (exercise.type === "open-dataset-source") {
    return evaluateOpenDatasetSourceExercise(
      exercise,
      answer.datasetSourceAnswersByExerciseId?.[exercise.id] ?? {},
      locale,
    );
  }

  if (exercise.type === "guided-download") {
    const submittedCode = answer.guidedDownloadCodeByExerciseId?.[exercise.id] ?? "";

    return evaluateGuidedDownloadExercise(
      exercise,
      submittedCode,
      getGuidedDownloadExpectedCode(exercise, guidedDownloadExtractedFilePath),
      guidedDownloadSourceAnswer !== undefined,
      (guidedDownloadExtractedFilePath ?? "").trim() !== "",
      locale,
    );
  }

  return evaluateFeatureTargetRoles(
    answer.columnRoleAssignmentsByExerciseId?.[exercise.id] ?? {},
    locale,
  );
}

function doesSubmittedAnswerMatchCurrentSnapshot(
  exercise: LessonExercise,
  currentAnswer: LessonAnswer,
  submittedAnswer: LessonAnswer | undefined,
) {
  if (!submittedAnswer) {
    return false;
  }

  if (exercise.type === "multiple-choice") {
    return haveSameValueSet(
      currentAnswer.selectedOptionIdsByExerciseId?.[exercise.id] ?? [],
      submittedAnswer.selectedOptionIdsByExerciseId?.[exercise.id] ?? [],
    );
  }

  if (exercise.type === "ordered-steps") {
    return haveSameOrderedValues(
      currentAnswer.orderedStepIdsByExerciseId?.[exercise.id] ?? [],
      submittedAnswer.orderedStepIdsByExerciseId?.[exercise.id] ?? [],
    );
  }

  if (exercise.type === "open-dataset-source") {
    return haveSameDatasetSourceAnswers(
      exercise.sourceInputs,
      currentAnswer.datasetSourceAnswersByExerciseId?.[exercise.id] ?? {},
      submittedAnswer.datasetSourceAnswersByExerciseId?.[exercise.id] ?? {},
    );
  }

  if (exercise.type === "guided-download") {
    return (
      (currentAnswer.guidedDownloadCodeByExerciseId?.[exercise.id] ?? "") ===
        (submittedAnswer.guidedDownloadCodeByExerciseId?.[exercise.id] ?? "") &&
      (currentAnswer.guidedDownloadExtractedFilePathsByExerciseId?.[exercise.id] ?? "") ===
        (submittedAnswer.guidedDownloadExtractedFilePathsByExerciseId?.[exercise.id] ?? "")
    );
  }

  return haveSameColumnRoleAssignments(
    currentAnswer.columnRoleAssignmentsByExerciseId?.[exercise.id] ?? {},
    submittedAnswer.columnRoleAssignmentsByExerciseId?.[exercise.id] ?? {},
  );
}

function getExerciseResultFromSubmittedAnswer({
  exercise,
  guidedDownloadExtractedFilePath,
  guidedDownloadSourceAnswer,
  isCompletedForCurrentExerciseSet,
  locale,
  submittedAnswer,
}: {
  exercise: LessonExercise;
  guidedDownloadExtractedFilePath?: string;
  guidedDownloadSourceAnswer?: DatasetSourceAnswer;
  isCompletedForCurrentExerciseSet: boolean;
  locale: Locale;
  submittedAnswer: LessonAnswer | undefined;
}) {
  if (submittedAnswer) {
    return evaluateExerciseAnswerSnapshot(
      exercise,
      submittedAnswer,
      locale,
      guidedDownloadSourceAnswer,
      guidedDownloadExtractedFilePath,
    );
  }

  return isCompletedForCurrentExerciseSet ? createRestoredCorrectResult(locale) : undefined;
}

function getExerciseHints(exercise: LessonExercise | undefined, result: EvaluationResult | null) {
  if (!exercise) {
    return [];
  }

  return result?.suggestedHints && result.suggestedHints.length > 0
    ? result.suggestedHints
    : exercise.hints;
}

function LessonLeftGutter({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`learning-sheet-cell learning-sheet-gutter-cell learning-extend-left hidden [@media_(min-width:1024px)]:block ${className}`}
    />
  );
}

function LessonRightGutter({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`learning-sheet-cell learning-sheet-gutter-cell learning-extend-right hidden [@media_(min-width:1024px)]:block ${className}`}
    />
  );
}

function LessonSheetPatternPlane() {
  return <span aria-hidden="true" className="learning-sheet-pattern-plane" />;
}

function LessonFullRow({
  children,
  leftClassName = "",
  rightClassName = "",
}: {
  children: ReactNode;
  leftClassName?: string;
  rightClassName?: string;
}) {
  return (
    <>
      <LessonLeftGutter className={leftClassName} />
      {children}
      <LessonRightGutter className={rightClassName} />
    </>
  );
}

export function LessonPage({
  backHref = "/learn",
  backLabel = "Kembali ke Beranda Belajar",
  initialAnswer,
  initialSubmittedAnswersByExerciseId = {},
  isCompleted = false,
  lesson,
  nextLessonHref,
  onAnswerChange,
  onExerciseSubmitResult,
  onSubmitResult,
  previousLessonHref,
}: LessonPageProps) {
  const { locale, t } = useLocalization();
  const localizedLesson = useMemo(() => localizeLesson(lesson, locale), [lesson, locale]);
  const exerciseEntries = useMemo(
    () => localizedLesson.exercises ?? [localizedLesson.exercise],
    [localizedLesson],
  );
  const tableColumnRoleExercise = useMemo(
    () =>
      exerciseEntries.find(
        (exercise): exercise is TableColumnRoleExercise =>
          exercise.type === "table-column-role-assignment",
      ),
    [exerciseEntries],
  );
  const expectedRoles = useMemo(() => getExpectedColumnRoles(), []);
  const baseInitialAssignments = useMemo(
    () =>
      Object.keys(expectedRoles).reduce<Record<string, ColumnRole>>((assignments, columnId) => {
        assignments[columnId] = "safe-feature";
        return assignments;
      }, {}),
    [expectedRoles],
  );
  const initialAssignments = useMemo(() => {
    const savedAssignments = tableColumnRoleExercise
      ? initialAnswer?.columnRoleAssignmentsByExerciseId?.[tableColumnRoleExercise.id]
      : undefined;

    const normalizedSavedAssignments = Object.fromEntries(
      Object.entries(savedAssignments ?? {}).map(([columnId, role]) => [
        columnId,
        role === "ignore" ? "safe-feature" : role,
      ]),
    ) as Record<string, ColumnRole>;

    return {
      ...baseInitialAssignments,
      ...normalizedSavedAssignments,
    };
  }, [baseInitialAssignments, initialAnswer, tableColumnRoleExercise]);
  const initialOrderedStepIds = useMemo(
    () =>
      exerciseEntries.reduce<Record<string, string[]>>((stepIds, exercise) => {
        if (exercise.type === "ordered-steps") {
          stepIds[exercise.id] =
            initialAnswer?.orderedStepIdsByExerciseId?.[exercise.id] ??
            exercise.steps.map((step) => step.id);
        }

        return stepIds;
      }, {}),
    [exerciseEntries, initialAnswer],
  );
  const initialSelectedOptionIdsByExerciseId = useMemo(
    () =>
      exerciseEntries.reduce<Record<string, string[]>>((selectedOptionIds, exercise) => {
        if (exercise.type === "multiple-choice") {
          selectedOptionIds[exercise.id] = [
            ...(initialAnswer?.selectedOptionIdsByExerciseId?.[exercise.id] ?? []),
          ];
        }

        return selectedOptionIds;
      }, {}),
    [exerciseEntries, initialAnswer],
  );
  const initialDatasetSourceAnswersByExerciseId = useMemo(
    () =>
      exerciseEntries.reduce<Record<string, Record<string, DatasetSourceAnswer>>>(
        (sourceAnswers, exercise) => {
          if (exercise.type === "open-dataset-source") {
            sourceAnswers[exercise.id] = getDatasetSourceAnswersFromAnswer(exercise, initialAnswer);
          }

          return sourceAnswers;
        },
        {},
      ),
    [exerciseEntries, initialAnswer],
  );
  const initialGuidedDownloadCodeByExerciseId = useMemo(
    () =>
      exerciseEntries.reduce<Record<string, string>>((codeByExerciseId, exercise) => {
        if (exercise.type === "guided-download") {
          codeByExerciseId[exercise.id] =
            initialAnswer?.guidedDownloadCodeByExerciseId?.[exercise.id] ?? "";
        }

        return codeByExerciseId;
      }, {}),
    [exerciseEntries, initialAnswer],
  );
  const initialGuidedDownloadExtractedFilePathsByExerciseId = useMemo(
    () =>
      exerciseEntries.reduce<Record<string, string>>((filePathsByExerciseId, exercise) => {
        if (exercise.type === "guided-download") {
          filePathsByExerciseId[exercise.id] =
            initialAnswer?.guidedDownloadExtractedFilePathsByExerciseId?.[exercise.id] ?? "";
        }

        return filePathsByExerciseId;
      }, {}),
    [exerciseEntries, initialAnswer],
  );
  const initialSubmittedAnswerSnapshotsByExerciseId = useMemo(
    () =>
      exerciseEntries.reduce<Record<string, LessonAnswer>>((submittedAnswers, exercise) => {
        const submittedAnswer = initialSubmittedAnswersByExerciseId[exercise.id];

        if (submittedAnswer) {
          submittedAnswers[exercise.id] = submittedAnswer;
        }

        return submittedAnswers;
      }, {}),
    [exerciseEntries, initialSubmittedAnswersByExerciseId],
  );
  const isCompletedForCurrentExerciseSet =
    isCompleted &&
    (exerciseEntries.length <= 1 ||
      exerciseEntries.every(
        (exercise) => initialSubmittedAnswerSnapshotsByExerciseId[exercise.id] !== undefined,
      ));
  const initialExerciseResultsById = useMemo(
    () =>
      exerciseEntries.reduce<Record<string, EvaluationResult>>((results, exercise) => {
        const submittedAnswer = initialSubmittedAnswerSnapshotsByExerciseId[exercise.id];
        const guidedDownloadSourceAnswer =
          exercise.type === "guided-download"
            ? getGuidedDownloadSourceAnswer(exercise, initialSubmittedAnswersByExerciseId)
            : undefined;
        const guidedDownloadExtractedFilePath =
          exercise.type === "guided-download"
            ? (submittedAnswer?.guidedDownloadExtractedFilePathsByExerciseId?.[exercise.id] ?? "")
            : undefined;
        const nextResult = getExerciseResultFromSubmittedAnswer({
          exercise,
          guidedDownloadExtractedFilePath,
          guidedDownloadSourceAnswer,
          isCompletedForCurrentExerciseSet,
          locale,
          submittedAnswer,
        });

        if (nextResult) {
          results[exercise.id] = nextResult;
        }

        return results;
      }, {}),
    [
      exerciseEntries,
      initialSubmittedAnswerSnapshotsByExerciseId,
      initialSubmittedAnswersByExerciseId,
      isCompletedForCurrentExerciseSet,
      locale,
    ],
  );
  const mountedLessonIdRef = useRef(lesson.id);
  const [assignments, setAssignments] = useState<Record<string, ColumnRole>>(initialAssignments);
  const [orderedStepIdsByExerciseId, setOrderedStepIdsByExerciseId] =
    useState<Record<string, string[]>>(initialOrderedStepIds);
  const [exerciseResultsById, setExerciseResultsById] = useState<Record<string, EvaluationResult>>(
    initialExerciseResultsById,
  );
  const [submittedAnswerSnapshotsByExerciseId, setSubmittedAnswerSnapshotsByExerciseId] = useState<
    Record<string, LessonAnswer>
  >(initialSubmittedAnswerSnapshotsByExerciseId);
  const [selectedOptionIdsByExerciseId, setSelectedOptionIdsByExerciseId] = useState<
    Record<string, string[]>
  >(initialSelectedOptionIdsByExerciseId);
  const [datasetSourceAnswersByExerciseId, setDatasetSourceAnswersByExerciseId] = useState<
    Record<string, Record<string, DatasetSourceAnswer>>
  >(initialDatasetSourceAnswersByExerciseId);
  const [guidedDownloadCodeByExerciseId, setGuidedDownloadCodeByExerciseId] = useState<
    Record<string, string>
  >(initialGuidedDownloadCodeByExerciseId);
  const [
    guidedDownloadExtractedFilePathsByExerciseId,
    setGuidedDownloadExtractedFilePathsByExerciseId,
  ] = useState<Record<string, string>>(initialGuidedDownloadExtractedFilePathsByExerciseId);
  const [guidedDownloadArchivesByExerciseId, setGuidedDownloadArchivesByExerciseId] = useState<
    Record<string, GuidedDownloadArchiveState>
  >({});
  const [
    datasetSourceValidationResultsByExerciseId,
    setDatasetSourceValidationResultsByExerciseId,
  ] = useState<Record<string, DatasetSourcePageValidationResult[]>>({});
  const [validatingDatasetSourceExerciseId, setValidatingDatasetSourceExerciseId] = useState<
    string | null
  >(null);
  const [editingExerciseIds, setEditingExerciseIds] = useState<Set<string>>(() => new Set());
  const [editingAnswerSnapshotsByExerciseId, setEditingAnswerSnapshotsByExerciseId] = useState<
    Record<string, LessonAnswer>
  >({});
  const [visibleHintCountByExerciseId, setVisibleHintCountByExerciseId] = useState<
    Record<string, number>
  >({});
  const exerciseScrollTargetsByExerciseIdRef = useRef<Record<string, HTMLDivElement | null>>({});
  const hintFooterScrollTargetRef = useRef<HTMLDivElement | null>(null);
  const [pendingSubmitScrollExerciseId, setPendingSubmitScrollExerciseId] = useState<string | null>(
    null,
  );
  const answerSnapshot = useMemo(
    () =>
      createLessonAnswerSnapshot({
        assignments,
        datasetSourceAnswersByExerciseId,
        exercises: exerciseEntries,
        guidedDownloadCodeByExerciseId,
        guidedDownloadExtractedFilePathsByExerciseId,
        orderedStepIdsByExerciseId,
        selectedOptionIdsByExerciseId,
      }),
    [
      assignments,
      datasetSourceAnswersByExerciseId,
      exerciseEntries,
      guidedDownloadCodeByExerciseId,
      guidedDownloadExtractedFilePathsByExerciseId,
      orderedStepIdsByExerciseId,
      selectedOptionIdsByExerciseId,
    ],
  );
  const datasetView =
    tableColumnRoleExercise && localizedLesson.datasetId && localizedLesson.viewId
      ? localizeDatasetView(
          getDatasetView(localizedLesson.datasetId, localizedLesson.viewId),
          locale,
        )
      : undefined;
  const LessonMdxContent = lessonMdxContentByLocaleAndId[locale][lesson.id];
  const isMultiExerciseLesson = exerciseEntries.length > 1;
  const hasAnswerForExercise = (exercise: LessonExercise) => {
    if (exercise.type === "multiple-choice") {
      return (selectedOptionIdsByExerciseId[exercise.id]?.length ?? 0) > 0;
    }

    if (exercise.type === "table-column-role-assignment") {
      return Object.values(assignments).some((role) => role !== "ignore");
    }

    if (exercise.type === "open-dataset-source") {
      return Object.values(datasetSourceAnswersByExerciseId[exercise.id] ?? {}).some(
        (answer) => answer.url.trim() !== "" || answer.notes.trim() !== "",
      );
    }

    if (exercise.type === "guided-download") {
      return (guidedDownloadCodeByExerciseId[exercise.id] ?? "").trim() !== "";
    }

    const currentStepIds = orderedStepIdsByExerciseId[exercise.id] ?? [];
    const initialStepIds = initialOrderedStepIds[exercise.id] ?? [];

    return currentStepIds.some((stepId, index) => stepId !== initialStepIds[index]);
  };
  const isCurrentAnswerSubmittedForExercise = (
    exercise: LessonExercise,
    submittedAnswer: LessonAnswer | undefined,
  ) => doesSubmittedAnswerMatchCurrentSnapshot(exercise, answerSnapshot, submittedAnswer);
  const hasAnyAnswer = exerciseEntries.some(hasAnswerForExercise);
  const hasEditingExercise = editingExerciseIds.size > 0;
  const areAllExerciseResultsCorrect =
    exerciseEntries.length > 0 &&
    exerciseEntries.every((exercise) => {
      const exerciseResult = exerciseResultsById[exercise.id];

      return (
        exerciseResult?.status === "correct" &&
        (isCompletedForCurrentExerciseSet ||
          isCurrentAnswerSubmittedForExercise(
            exercise,
            submittedAnswerSnapshotsByExerciseId[exercise.id],
          ))
      );
    });
  const lessonResult =
    exerciseEntries.length === 1
      ? (exerciseResultsById[exerciseEntries[0]?.id ?? ""] ?? null)
      : areAllExerciseResultsCorrect
        ? createCombinedExerciseResult(
            exerciseEntries.map(
              (exercise) => exerciseResultsById[exercise.id] ?? createRestoredCorrectResult(locale),
            ),
            locale,
          )
        : null;
  const isLessonFinished =
    !hasEditingExercise && (isCompletedForCurrentExerciseSet || lessonResult?.status === "correct");
  const hasNotQuiteResult = exerciseEntries.some((exercise) => {
    const exerciseResult = exerciseResultsById[exercise.id];

    return exerciseResult !== undefined && exerciseResult.status !== "correct";
  });
  const lastExercise = exerciseEntries.at(-1);
  const lastExerciseResult = lastExercise ? exerciseResultsById[lastExercise.id] : undefined;
  const shouldSplitFooterForHint =
    lastExerciseResult !== undefined && lastExerciseResult.status !== "correct";
  const isReviewMode = isLessonFinished;
  const isSubmitDisabled = !hasAnyAnswer;
  const rightEdgeCompensationClassName = hasNotQuiteResult ? "-mr-px" : "";
  const finishedActionHref = nextLessonHref ?? backHref;
  const finishedActionLabel = nextLessonHref
    ? t("navigation.continue")
    : t("navigation.back.track");

  useEffect(() => {
    if (mountedLessonIdRef.current === lesson.id) {
      return;
    }

    mountedLessonIdRef.current = lesson.id;
    setAssignments(initialAssignments);
    setDatasetSourceAnswersByExerciseId(initialDatasetSourceAnswersByExerciseId);
    setGuidedDownloadCodeByExerciseId(initialGuidedDownloadCodeByExerciseId);
    setGuidedDownloadExtractedFilePathsByExerciseId(
      initialGuidedDownloadExtractedFilePathsByExerciseId,
    );
    setGuidedDownloadArchivesByExerciseId({});
    setOrderedStepIdsByExerciseId(initialOrderedStepIds);
    setExerciseResultsById(initialExerciseResultsById);
    setSubmittedAnswerSnapshotsByExerciseId(initialSubmittedAnswerSnapshotsByExerciseId);
    setSelectedOptionIdsByExerciseId(initialSelectedOptionIdsByExerciseId);
    setDatasetSourceValidationResultsByExerciseId({});
    setEditingExerciseIds(new Set());
    setEditingAnswerSnapshotsByExerciseId({});
    setValidatingDatasetSourceExerciseId(null);
    setVisibleHintCountByExerciseId({});
    exerciseScrollTargetsByExerciseIdRef.current = {};
    setPendingSubmitScrollExerciseId(null);
  }, [
    initialAssignments,
    initialDatasetSourceAnswersByExerciseId,
    initialExerciseResultsById,
    initialGuidedDownloadCodeByExerciseId,
    initialGuidedDownloadExtractedFilePathsByExerciseId,
    initialOrderedStepIds,
    initialSelectedOptionIdsByExerciseId,
    initialSubmittedAnswerSnapshotsByExerciseId,
    lesson.id,
  ]);

  useEffect(() => {
    setExerciseResultsById((currentResults) => {
      let hasChanges = false;
      const nextResults = { ...currentResults };

      for (const exercise of exerciseEntries) {
        if (!currentResults[exercise.id]) {
          continue;
        }

        const guidedDownloadSourceAnswer =
          exercise.type === "guided-download"
            ? getGuidedDownloadSourceAnswer(exercise, initialSubmittedAnswersByExerciseId)
            : undefined;
        const submittedAnswer = submittedAnswerSnapshotsByExerciseId[exercise.id];
        const guidedDownloadExtractedFilePath =
          exercise.type === "guided-download"
            ? (submittedAnswer?.guidedDownloadExtractedFilePathsByExerciseId?.[exercise.id] ?? "")
            : undefined;
        const nextResult = getExerciseResultFromSubmittedAnswer({
          exercise,
          guidedDownloadExtractedFilePath,
          guidedDownloadSourceAnswer,
          isCompletedForCurrentExerciseSet,
          locale,
          submittedAnswer,
        });

        if (!nextResult) {
          continue;
        }

        nextResults[exercise.id] = nextResult;
        hasChanges ||= !haveSameEvaluationResult(currentResults[exercise.id], nextResult);
      }

      return hasChanges ? nextResults : currentResults;
    });
  }, [
    exerciseEntries,
    initialSubmittedAnswersByExerciseId,
    isCompletedForCurrentExerciseSet,
    locale,
    submittedAnswerSnapshotsByExerciseId,
  ]);

  useEffect(() => {
    if (isCompletedForCurrentExerciseSet && !hasEditingExercise) {
      return;
    }

    onAnswerChange?.({
      answer: answerSnapshot,
      lessonId: lesson.id,
    });
  }, [
    answerSnapshot,
    hasEditingExercise,
    isCompletedForCurrentExerciseSet,
    lesson.id,
    onAnswerChange,
  ]);

  useEffect(() => {
    if (!pendingSubmitScrollExerciseId) {
      return;
    }

    const result = exerciseResultsById[pendingSubmitScrollExerciseId];

    if (!result) {
      return;
    }

    const target = exerciseScrollTargetsByExerciseIdRef.current[pendingSubmitScrollExerciseId];

    target?.scrollIntoView?.({
      behavior: shouldReduceMotion() ? "auto" : "smooth",
      block: "start",
    });
    setPendingSubmitScrollExerciseId(null);
  }, [exerciseResultsById, pendingSubmitScrollExerciseId]);

  if (tableColumnRoleExercise && !datasetView) {
    return (
      <LearningGridCanvas>
        <LearningHeader backHref={backHref} backLabel={backLabel} />
        <section className="learning-sheet route-content-transition-target mx-auto mt-20 grid max-w-xl text-center">
          <LearningSheetExtensions />

          <div className="learning-sheet-cell p-6">
            <h1 className="text-2xl font-semibold text-foreground">
              {t("lesson.openError.title")}
            </h1>
          </div>
          <div className="learning-sheet-cell p-6 text-base leading-7 text-muted-foreground">
            {t("lesson.openError.body")}
          </div>
          <div className="learning-sheet-cell p-6">
            <LiquidLink className={`${emeraldLiquidButtonClassName}`} data-app-link href={backHref}>
              {backLabel}
            </LiquidLink>
          </div>
        </section>
      </LearningGridCanvas>
    );
  }

  const updateAssignment = (columnId: string, role: ColumnRole) => {
    setAssignments((current) => ({
      ...current,
      [columnId]: role,
    }));
  };

  const toggleOption = (exerciseId: string, optionId: string) => {
    const exercise = exerciseEntries.find((entry) => entry.id === exerciseId);

    setSelectedOptionIdsByExerciseId((current) => {
      const currentExerciseOptionIds = current[exerciseId] ?? [];
      const isSingleOptionExercise =
        exercise?.type === "multiple-choice" && exercise.correctOptionIds.length === 1;
      const optionLimit =
        exercise?.type === "multiple-choice" ? exercise.correctOptionIds.length : 0;
      const nextExerciseOptionIds = isSingleOptionExercise
        ? [optionId]
        : currentExerciseOptionIds.includes(optionId)
          ? currentExerciseOptionIds.filter((selectedOptionId) => selectedOptionId !== optionId)
          : [...currentExerciseOptionIds, optionId].slice(-optionLimit);

      return {
        ...current,
        [exerciseId]: nextExerciseOptionIds,
      };
    });
  };

  const moveStep = (exerciseId: string, index: number, direction: -1 | 1) => {
    setOrderedStepIdsByExerciseId((current) => {
      const currentStepIds = current[exerciseId] ?? [];
      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= currentStepIds.length) {
        return current;
      }

      const next = [...currentStepIds];
      const [stepId] = next.splice(index, 1);
      next.splice(nextIndex, 0, stepId);

      return {
        ...current,
        [exerciseId]: next,
      };
    });
  };

  const updateDatasetSourceAnswer = (
    exerciseId: string,
    sourceInputId: string,
    field: keyof DatasetSourceAnswer,
    value: string,
  ) => {
    setDatasetSourceAnswersByExerciseId((current) => {
      const currentExerciseAnswers = current[exerciseId] ?? {};
      const currentSourceAnswer = currentExerciseAnswers[sourceInputId] ?? {
        notes: "",
        url: "",
      };

      return {
        ...current,
        [exerciseId]: {
          ...currentExerciseAnswers,
          [sourceInputId]: {
            ...currentSourceAnswer,
            [field]: value,
          },
        },
      };
    });
    setDatasetSourceValidationResultsByExerciseId((current) => {
      if (!current[exerciseId]) {
        return current;
      }

      const next = { ...current };
      delete next[exerciseId];

      return next;
    });
  };

  const updateGuidedDownloadCode = (exerciseId: string, value: string) => {
    setGuidedDownloadCodeByExerciseId((current) => ({
      ...current,
      [exerciseId]: value,
    }));
  };

  const uploadGuidedDownloadArchive = async (exerciseId: string, file: File) => {
    setGuidedDownloadArchivesByExerciseId((current) => ({
      ...current,
      [exerciseId]: {
        fileName: file.name,
        isReading: true,
      },
    }));

    try {
      const entries = await unzipArchiveEntries(file);
      const csvPath = getFirstCsvPathFromZipEntries(entries);

      if (!csvPath) {
        setGuidedDownloadExtractedFilePathsByExerciseId((current) => ({
          ...current,
          [exerciseId]: "",
        }));
        setGuidedDownloadArchivesByExerciseId((current) => ({
          ...current,
          [exerciseId]: {
            error:
              locale === "en"
                ? "The ZIP was readable, but no CSV file was found inside it."
                : "ZIP berhasil dibaca, tapi file CSV tidak ditemukan di dalamnya.",
            fileName: file.name,
            isReading: false,
          },
        }));
        return;
      }

      const extractedPath = `data/${csvPath}`;

      setGuidedDownloadExtractedFilePathsByExerciseId((current) => ({
        ...current,
        [exerciseId]: extractedPath,
      }));
      setGuidedDownloadArchivesByExerciseId((current) => ({
        ...current,
        [exerciseId]: {
          fileName: file.name,
          isReading: false,
          tabularFilePath: extractedPath,
        },
      }));
    } catch {
      setGuidedDownloadExtractedFilePathsByExerciseId((current) => ({
        ...current,
        [exerciseId]: "",
      }));
      setGuidedDownloadArchivesByExerciseId((current) => ({
        ...current,
        [exerciseId]: {
          error:
            locale === "en"
              ? "The selected file could not be read as a ZIP archive."
              : "File yang dipilih tidak bisa dibaca sebagai arsip ZIP.",
          fileName: file.name,
          isReading: false,
        },
      }));
    }
  };

  const startEditingExercise = (exerciseId: string) => {
    setEditingExerciseIds((current) => {
      const next = new Set(current);
      next.add(exerciseId);

      return next;
    });
    setEditingAnswerSnapshotsByExerciseId((current) =>
      current[exerciseId]
        ? current
        : {
            ...current,
            [exerciseId]: answerSnapshot,
          },
    );
    setExerciseResultsById((current) => {
      if (!current[exerciseId]) {
        return current;
      }

      const next = { ...current };
      delete next[exerciseId];

      return next;
    });
    setDatasetSourceValidationResultsByExerciseId((current) => {
      if (!current[exerciseId]) {
        return current;
      }

      const next = { ...current };
      delete next[exerciseId];

      return next;
    });
  };

  const cancelEditingExercise = (exercise: LessonExercise) => {
    const editingAnswerSnapshot =
      editingAnswerSnapshotsByExerciseId[exercise.id] ??
      submittedAnswerSnapshotsByExerciseId[exercise.id];

    setEditingExerciseIds((current) => {
      if (!current.has(exercise.id)) {
        return current;
      }

      const next = new Set(current);
      next.delete(exercise.id);

      return next;
    });
    setEditingAnswerSnapshotsByExerciseId((current) => {
      if (!current[exercise.id]) {
        return current;
      }

      const next = { ...current };
      delete next[exercise.id];

      return next;
    });
    setValidatingDatasetSourceExerciseId((current) => (current === exercise.id ? null : current));
    setDatasetSourceValidationResultsByExerciseId((current) => {
      if (!current[exercise.id]) {
        return current;
      }

      const next = { ...current };
      delete next[exercise.id];

      return next;
    });

    if (exercise.type !== "open-dataset-source") {
      return;
    }

    const nextDatasetSourceAnswersByExerciseId = {
      ...datasetSourceAnswersByExerciseId,
      [exercise.id]: getDatasetSourceAnswersFromAnswer(exercise, editingAnswerSnapshot),
    };
    const nextAnswerSnapshot = createLessonAnswerSnapshot({
      assignments,
      datasetSourceAnswersByExerciseId: nextDatasetSourceAnswersByExerciseId,
      exercises: exerciseEntries,
      guidedDownloadCodeByExerciseId,
      guidedDownloadExtractedFilePathsByExerciseId,
      orderedStepIdsByExerciseId,
      selectedOptionIdsByExerciseId,
    });
    const restoredExerciseResult = editingAnswerSnapshot
      ? evaluateExerciseAnswerSnapshot(exercise, editingAnswerSnapshot, locale)
      : createRestoredCorrectResult(locale);

    setDatasetSourceAnswersByExerciseId(nextDatasetSourceAnswersByExerciseId);
    setExerciseResultsById((current) => ({
      ...current,
      [exercise.id]: restoredExerciseResult,
    }));
    onAnswerChange?.({
      answer: nextAnswerSnapshot,
      lessonId: lesson.id,
    });
  };

  const evaluateExercise = async (
    exercise: LessonExercise,
  ): Promise<{
    evaluation: EvaluationResult;
    sourceValidationResults?: DatasetSourcePageValidationResult[];
  }> => {
    if (exercise.type === "multiple-choice") {
      return {
        evaluation: evaluateMultipleChoice(
          exercise,
          selectedOptionIdsByExerciseId[exercise.id] ?? [],
          locale,
        ),
      };
    }

    if (exercise.type === "ordered-steps") {
      return {
        evaluation: evaluateOrderedSteps(
          exercise,
          orderedStepIdsByExerciseId[exercise.id] ?? [],
          locale,
        ),
      };
    }

    if (exercise.type === "guided-download") {
      const sourceAnswer = getGuidedDownloadSourceAnswer(
        exercise,
        initialSubmittedAnswersByExerciseId,
      );
      const extractedFilePath = guidedDownloadExtractedFilePathsByExerciseId[exercise.id] ?? "";

      return {
        evaluation: evaluateGuidedDownloadExercise(
          exercise,
          guidedDownloadCodeByExerciseId[exercise.id] ?? "",
          getGuidedDownloadExpectedCode(exercise, extractedFilePath),
          sourceAnswer !== undefined,
          extractedFilePath.trim() !== "",
          locale,
        ),
      };
    }

    if (exercise.type === "open-dataset-source") {
      const localEvaluation = evaluateOpenDatasetSourceExercise(
        exercise,
        datasetSourceAnswersByExerciseId[exercise.id] ?? {},
        locale,
      );

      if (localEvaluation.status !== "correct") {
        return { evaluation: localEvaluation };
      }

      setValidatingDatasetSourceExerciseId(exercise.id);

      try {
        const validationResults = await validateDatasetSourcePages({
          answersBySourceId: datasetSourceAnswersByExerciseId[exercise.id] ?? {},
          exercise,
          locale,
        });

        if (validationResults.some((result) => result.status === "invalid")) {
          return {
            evaluation: {
              extraColumnIds: [],
              message:
                locale === "en"
                  ? "One or more links are not allowed for automatic validation."
                  : "Ada link yang tidak diizinkan untuk validasi otomatis.",
              missedColumnIds: [],
              nextStep:
                locale === "en"
                  ? "Use public HTTP or HTTPS dataset pages, then submit again."
                  : "Gunakan halaman dataset publik berbasis HTTP atau HTTPS, lalu kirim ulang.",
              score: 70,
              status: "partial",
              suggestedHints: [
                locale === "en"
                  ? "Automatic validation blocks private, local, or unsafe addresses even when their text looks like a URL."
                  : "Validasi otomatis memblokir alamat privat, lokal, atau tidak aman walaupun teksnya terlihat seperti URL.",
                locale === "en"
                  ? "Use a public dataset page that can be opened without your local machine or private network."
                  : "Gunakan halaman dataset publik yang bisa dibuka tanpa mesin lokal atau jaringan privatmu.",
                ...exercise.hints,
              ],
              title: locale === "en" ? "Partially correct" : "Sebagian benar",
            },
            sourceValidationResults: validationResults,
          };
        }

        return {
          evaluation: localEvaluation,
          sourceValidationResults: validationResults,
        };
      } catch {
        return {
          evaluation: localEvaluation,
          sourceValidationResults: [],
        };
      }
    }

    return {
      evaluation: evaluateFeatureTargetRoles(assignments, locale),
    };
  };

  const isLessonCorrectWithResults = (
    resultsById: Record<string, EvaluationResult>,
    submittedAnswersByExerciseId: Record<string, LessonAnswer>,
    currentAnswer: LessonAnswer = answerSnapshot,
  ) =>
    exerciseEntries.every((exercise) => {
      const exerciseResult = resultsById[exercise.id];

      return (
        exerciseResult?.status === "correct" &&
        doesSubmittedAnswerMatchCurrentSnapshot(
          exercise,
          currentAnswer,
          submittedAnswersByExerciseId[exercise.id],
        )
      );
    });

  const submitExercise = async (exercise: LessonExercise) => {
    const { evaluation, sourceValidationResults } = await evaluateExercise(exercise);
    let nextDatasetSourceAnswersByExerciseId = datasetSourceAnswersByExerciseId;
    let nextAnswerSnapshot = answerSnapshot;

    if (exercise.type === "open-dataset-source" && sourceValidationResults) {
      const currentExerciseAnswers = datasetSourceAnswersByExerciseId[exercise.id] ?? {};
      const nextExerciseAnswers = getDatasetSourceAnswersWithValidationEvidence({
        answersBySourceId: currentExerciseAnswers,
        sourceInputs: exercise.sourceInputs,
        validationResults: sourceValidationResults,
      });

      if (nextExerciseAnswers !== currentExerciseAnswers) {
        nextDatasetSourceAnswersByExerciseId = {
          ...datasetSourceAnswersByExerciseId,
          [exercise.id]: nextExerciseAnswers,
        };
        nextAnswerSnapshot = createLessonAnswerSnapshot({
          assignments,
          datasetSourceAnswersByExerciseId: nextDatasetSourceAnswersByExerciseId,
          exercises: exerciseEntries,
          guidedDownloadCodeByExerciseId,
          guidedDownloadExtractedFilePathsByExerciseId,
          orderedStepIdsByExerciseId,
          selectedOptionIdsByExerciseId,
        });
      }
    }

    const nextExerciseResultsById = {
      ...exerciseResultsById,
      [exercise.id]: evaluation,
    };
    const nextSubmittedAnswerSnapshotsByExerciseId = {
      ...submittedAnswerSnapshotsByExerciseId,
      [exercise.id]: nextAnswerSnapshot,
    };

    if (exercise.type === "open-dataset-source") {
      setValidatingDatasetSourceExerciseId(null);
      setDatasetSourceAnswersByExerciseId(nextDatasetSourceAnswersByExerciseId);
      setDatasetSourceValidationResultsByExerciseId((current) => ({
        ...current,
        [exercise.id]: sourceValidationResults ?? [],
      }));
    }
    setExerciseResultsById(nextExerciseResultsById);
    setSubmittedAnswerSnapshotsByExerciseId(nextSubmittedAnswerSnapshotsByExerciseId);
    setPendingSubmitScrollExerciseId(exercise.id);
    if (evaluation.status === "correct") {
      setEditingExerciseIds((current) => {
        if (!current.has(exercise.id)) {
          return current;
        }

        const next = new Set(current);
        next.delete(exercise.id);

        return next;
      });
      setEditingAnswerSnapshotsByExerciseId((current) => {
        if (!current[exercise.id]) {
          return current;
        }

        const next = { ...current };
        delete next[exercise.id];

        return next;
      });
    }
    onExerciseSubmitResult?.({
      answer: nextAnswerSnapshot,
      exerciseId: exercise.id,
      lessonId: lesson.id,
      result: evaluation,
    });

    const nextLessonResult =
      exerciseEntries.length === 1
        ? evaluation
        : isLessonCorrectWithResults(
              nextExerciseResultsById,
              nextSubmittedAnswerSnapshotsByExerciseId,
              nextAnswerSnapshot,
            )
          ? createCombinedExerciseResult(
              exerciseEntries.map(
                (exerciseEntry) =>
                  nextExerciseResultsById[exerciseEntry.id] ?? createRestoredCorrectResult(locale),
              ),
              locale,
            )
          : null;

    if (nextLessonResult) {
      onSubmitResult(nextLessonResult, nextAnswerSnapshot);
    }
  };

  const toggleHints = (exerciseId: string, hintCount: number) => {
    setVisibleHintCountByExerciseId((current) => {
      const currentHintCount = current[exerciseId] ?? 0;

      return {
        ...current,
        [exerciseId]: currentHintCount >= hintCount ? 0 : Math.min(currentHintCount + 1, hintCount),
      };
    });
  };

  return (
    <LearningGridCanvas>
      <LearningHeader backHref={backHref} backLabel={backLabel} />

      <section className="learning-sheet route-content-transition-target mx-auto grid w-[min(1440px,calc(100%_-_48px))] grid-cols-1 [@media_(min-width:1024px)]:grid-cols-[2rem_repeat(12,minmax(0,1fr))_2rem]">
        <LearningSheetExtensions />
        <LessonSheetPatternPlane />

        <LessonFullRow>
          <div
            className={`learning-sheet-cell learning-extend-left learning-extend-right ${lessonFullCellGridClassName} ${rightEdgeCompensationClassName} px-6 py-5`}
          >
            <div className="flex flex-wrap items-center gap-3 text-base text-muted-foreground">
              <span>{localizedLesson.numberLabel}</span>
            </div>
          </div>
        </LessonFullRow>
        <LessonFullRow>
          <div
            className={`learning-sheet-cell learning-extend-left learning-extend-right ${lessonFullCellGridClassName} ${rightEdgeCompensationClassName} p-6`}
          >
            <h1 className="max-w-none text-5xl leading-tight font-semibold tracking-normal text-foreground">
              {localizedLesson.title}
            </h1>
          </div>
        </LessonFullRow>

        <LessonFullRow>
          <section
            className={`learning-sheet-cell learning-extend-left learning-extend-right ${lessonFullCellGridClassName} ${rightEdgeCompensationClassName} p-6`}
          >
            <div className={lessonMarkdownContentClassName}>
              {LessonMdxContent ? (
                <LessonMdxContent components={lessonMdxComponents} />
              ) : (
                localizedLesson.summary.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
              )}
            </div>
          </section>
        </LessonFullRow>
        <LessonFullRow>
          <div
            aria-hidden="true"
            className={`learning-sheet-cell learning-sheet-break-stripes learning-extend-left learning-extend-right ${lessonFullCellGridClassName} ${rightEdgeCompensationClassName} h-8`}
          />
        </LessonFullRow>

        {exerciseEntries.map((exercise, exerciseIndex) => {
          const exerciseLabel =
            exerciseEntries.length === 1
              ? t("learning.exercise")
              : t("learning.exercise.numbered", { number: exerciseIndex + 1 });
          const exerciseResult = exerciseResultsById[exercise.id] ?? null;
          const isExerciseCorrect = exerciseResult?.status === "correct";
          const isExerciseEditing = editingExerciseIds.has(exercise.id);
          const canEditExerciseSubmission =
            exercise.type === "open-dataset-source" && isExerciseCorrect && !isExerciseEditing;
          const isExerciseReadOnly = isReviewMode || (isExerciseCorrect && !isExerciseEditing);
          const isExerciseSubmitting = validatingDatasetSourceExerciseId === exercise.id;
          const guidedDownloadSourceAnswer =
            exercise.type === "guided-download"
              ? getGuidedDownloadSourceAnswer(exercise, initialSubmittedAnswersByExerciseId)
              : undefined;

          return (
            <Fragment key={exercise.id}>
              {isMultiExerciseLesson && exerciseIndex > 0 ? (
                <LessonFullRow>
                  <div
                    aria-hidden="true"
                    className={`learning-sheet-cell learning-sheet-break-stripes learning-extend-left learning-extend-right ${lessonFullCellGridClassName} ${rightEdgeCompensationClassName} h-8`}
                  />
                </LessonFullRow>
              ) : null}
              <ExerciseSection
                assignments={assignments}
                datasetView={datasetView}
                edgeCompensationClassName={rightEdgeCompensationClassName}
                exercise={exercise}
                exerciseLabel={exerciseLabel}
                guidedDownloadArchive={guidedDownloadArchivesByExerciseId[exercise.id]}
                guidedDownloadCode={guidedDownloadCodeByExerciseId[exercise.id] ?? ""}
                guidedDownloadExtractedFilePath={
                  guidedDownloadExtractedFilePathsByExerciseId[exercise.id] ?? ""
                }
                guidedDownloadSourceAnswer={guidedDownloadSourceAnswer}
                onMoveStep={(index, direction) => moveStep(exercise.id, index, direction)}
                onToggleOption={(optionId) => toggleOption(exercise.id, optionId)}
                onUpdateAssignment={updateAssignment}
                onUpdateDatasetSourceAnswer={(sourceInputId, field, value) =>
                  updateDatasetSourceAnswer(exercise.id, sourceInputId, field, value)
                }
                onUpdateGuidedDownloadCode={(value) => updateGuidedDownloadCode(exercise.id, value)}
                onUploadGuidedDownloadArchive={(file) =>
                  uploadGuidedDownloadArchive(exercise.id, file)
                }
                orderedStepIds={orderedStepIdsByExerciseId[exercise.id] ?? []}
                result={exerciseResult}
                scrollTargetRef={(node) => {
                  exerciseScrollTargetsByExerciseIdRef.current[exercise.id] = node;
                }}
                isReviewMode={isExerciseReadOnly}
                submittedColumnRoleAssignments={
                  submittedAnswerSnapshotsByExerciseId[exercise.id]
                    ?.columnRoleAssignmentsByExerciseId?.[exercise.id] ?? {}
                }
                submittedDatasetSourceAnswers={
                  submittedAnswerSnapshotsByExerciseId[exercise.id]
                    ?.datasetSourceAnswersByExerciseId?.[exercise.id] ?? {}
                }
                sourceValidationResults={
                  datasetSourceValidationResultsByExerciseId[exercise.id] ?? []
                }
                submittedGuidedDownloadCode={
                  submittedAnswerSnapshotsByExerciseId[exercise.id]
                    ?.guidedDownloadCodeByExerciseId?.[exercise.id] ?? ""
                }
                submittedGuidedDownloadExtractedFilePath={
                  submittedAnswerSnapshotsByExerciseId[exercise.id]
                    ?.guidedDownloadExtractedFilePathsByExerciseId?.[exercise.id] ?? ""
                }
                submittedSelectedOptionIds={
                  submittedAnswerSnapshotsByExerciseId[exercise.id]
                    ?.selectedOptionIdsByExerciseId?.[exercise.id] ?? []
                }
                datasetSourceAnswers={datasetSourceAnswersByExerciseId[exercise.id] ?? {}}
                selectedOptionIds={selectedOptionIdsByExerciseId[exercise.id] ?? []}
              />
              {isMultiExerciseLesson ? (
                <ExerciseSubmitAction
                  disabled={
                    !hasAnswerForExercise(exercise) ||
                    (isExerciseCorrect && !isExerciseEditing) ||
                    isExerciseSubmitting
                  }
                  edgeCompensationClassName={rightEdgeCompensationClassName}
                  finishedHref={
                    isLessonFinished && exerciseIndex === exerciseEntries.length - 1
                      ? finishedActionHref
                      : undefined
                  }
                  finishedLabel={
                    isLessonFinished && exerciseIndex === exerciseEntries.length - 1
                      ? finishedActionLabel
                      : undefined
                  }
                  isEditable={canEditExerciseSubmission}
                  isEditing={isExerciseEditing}
                  isSubmitting={isExerciseSubmitting}
                  onCancelEdit={() => cancelEditingExercise(exercise)}
                  onEdit={() => startEditingExercise(exercise.id)}
                  onSubmit={() => submitExercise(exercise)}
                  previousLessonHref={
                    exerciseIndex === exerciseEntries.length - 1 ? previousLessonHref : undefined
                  }
                  submitted={isExerciseCorrect}
                />
              ) : null}
              {isMultiExerciseLesson && exerciseResult && exerciseResult.status !== "correct" ? (
                <>
                  <LessonResult result={exerciseResult} />
                  <LessonHintPanel
                    hints={getExerciseHints(exercise, exerciseResult)}
                    onToggleHints={() =>
                      toggleHints(exercise.id, getExerciseHints(exercise, exerciseResult).length)
                    }
                    scrollPinTargetRef={hintFooterScrollTargetRef}
                    visibleHintCount={visibleHintCountByExerciseId[exercise.id] ?? 0}
                  />
                </>
              ) : null}
            </Fragment>
          );
        })}

        {!isMultiExerciseLesson ? (
          <LessonFullRow>
            <div
              className={`learning-sheet-cell learning-extend-left learning-extend-right ${lessonFullCellGridClassName} ${rightEdgeCompensationClassName} flex items-center gap-4 p-6`}
            >
              {previousLessonHref ? (
                <LiquidLink
                  className={`${emeraldLiquidButtonClassName} min-h-12`}
                  data-app-link
                  href={previousLessonHref}
                >
                  <ArrowLeftIcon aria-hidden="true" className="size-5" />
                  {t("navigation.prev")}
                </LiquidLink>
              ) : null}
              {isLessonFinished ? (
                <LiquidLink
                  className={`${emeraldLiquidButtonClassName} ml-auto min-h-12`}
                  data-app-link
                  href={finishedActionHref}
                >
                  {finishedActionLabel}
                  <ArrowRightIcon aria-hidden="true" className="size-5" />
                </LiquidLink>
              ) : (
                <LiquidButton
                  className={`${emeraldLiquidButtonClassName} ml-auto min-h-12 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-neutral-950 ${isSubmitDisabled ? "" : "cursor-pointer"}`}
                  disabled={isSubmitDisabled}
                  onClick={() => {
                    const firstExercise = exerciseEntries[0];

                    if (firstExercise) {
                      submitExercise(firstExercise);
                    }
                  }}
                  type="button"
                >
                  {t("learning.submit")}
                </LiquidButton>
              )}
            </div>
          </LessonFullRow>
        ) : null}

        {!isMultiExerciseLesson && lessonResult && lessonResult.status !== "correct" ? (
          <>
            <LessonResult result={lessonResult} />
            {hasNotQuiteResult ? (
              <LessonHintPanel
                hints={getExerciseHints(exerciseEntries[0], lessonResult)}
                onToggleHints={() =>
                  exerciseEntries[0]
                    ? toggleHints(
                        exerciseEntries[0].id,
                        getExerciseHints(exerciseEntries[0], lessonResult).length,
                      )
                    : undefined
                }
                scrollPinTargetRef={hintFooterScrollTargetRef}
                visibleHintCount={
                  exerciseEntries[0]
                    ? (visibleHintCountByExerciseId[exerciseEntries[0].id] ?? 0)
                    : 0
                }
              />
            ) : null}
          </>
        ) : null}

        {shouldSplitFooterForHint ? (
          <>
            <LessonLeftGutter />
            <div
              aria-hidden="true"
              className={`learning-sheet-cell learning-extend-left learning-sheet-footer-cell ${lessonSplitResultGridClassName}`}
            />
            <div
              aria-hidden="true"
              className={`learning-sheet-cell learning-extend-right learning-sheet-footer-cell ${lessonSplitAsideGridClassName} -mr-px`}
              ref={hintFooterScrollTargetRef}
            />
            <LessonRightGutter />
          </>
        ) : (
          <LessonFullRow>
            <div
              aria-hidden="true"
              className={`learning-sheet-cell learning-extend-left learning-extend-right learning-sheet-footer-cell ${lessonFullCellGridClassName}`}
              ref={hintFooterScrollTargetRef}
            />
          </LessonFullRow>
        )}
      </section>
    </LearningGridCanvas>
  );
}

function ExerciseSubmitAction({
  disabled,
  edgeCompensationClassName,
  finishedHref,
  finishedLabel,
  isEditable = false,
  isEditing = false,
  isSubmitting = false,
  onCancelEdit,
  onEdit,
  onSubmit,
  previousLessonHref,
  submitted,
}: {
  disabled: boolean;
  edgeCompensationClassName: string;
  finishedHref?: string;
  finishedLabel?: string;
  isEditable?: boolean;
  isEditing?: boolean;
  isSubmitting?: boolean;
  onCancelEdit?: () => void;
  onEdit?: () => void;
  onSubmit: () => void;
  previousLessonHref?: string;
  submitted: boolean;
}) {
  const { t } = useLocalization();
  const finishedAction =
    finishedHref && finishedLabel ? { href: finishedHref, label: finishedLabel } : null;
  const hasSecondaryAction = isEditable || isEditing;

  return (
    <LessonFullRow>
      <div
        className={`learning-sheet-cell learning-extend-left learning-extend-right ${lessonFullCellGridClassName} ${edgeCompensationClassName} flex items-center gap-4 p-6`}
      >
        {previousLessonHref ? (
          <LiquidLink
            className={`${emeraldLiquidButtonClassName} min-h-12`}
            data-app-link
            href={previousLessonHref}
          >
            <ArrowLeftIcon aria-hidden="true" className="size-5" />
            {t("navigation.prev")}
          </LiquidLink>
        ) : null}
        {isEditable ? (
          <LiquidButton
            className={`${amberLiquidButtonClassName} ml-auto min-h-12 cursor-pointer`}
            onClick={onEdit}
            type="button"
          >
            <PencilSquareIcon aria-hidden="true" className="size-5" />
            {t("learning.exercise.edit")}
          </LiquidButton>
        ) : null}
        {isEditing ? (
          <LiquidButton
            className={`${neutralLiquidButtonClassName} ml-auto min-h-12 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-neutral-950`}
            disabled={isSubmitting}
            onClick={onCancelEdit}
            type="button"
          >
            <XCircleIcon aria-hidden="true" className="size-5" />
            {t("learning.exercise.cancelEdit")}
          </LiquidButton>
        ) : null}
        {finishedAction ? (
          <LiquidLink
            className={`${emeraldLiquidButtonClassName} ${hasSecondaryAction ? "" : "ml-auto"} min-h-12`}
            data-app-link
            href={finishedAction.href}
          >
            {finishedAction.label}
            <ArrowRightIcon aria-hidden="true" className="size-5" />
          </LiquidLink>
        ) : (
          <LiquidButton
            className={`${emeraldLiquidButtonClassName} ${hasSecondaryAction ? "" : "ml-auto"} min-h-12 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-neutral-950 ${disabled ? "" : "cursor-pointer"}`}
            disabled={disabled}
            onClick={onSubmit}
            type="button"
          >
            {isSubmitting
              ? t("learning.validating")
              : submitted
                ? t("learning.submitted")
                : t("learning.submit")}
          </LiquidButton>
        )}
      </div>
    </LessonFullRow>
  );
}

function ExerciseSection({
  assignments,
  datasetView,
  datasetSourceAnswers,
  edgeCompensationClassName,
  exercise,
  exerciseLabel,
  guidedDownloadArchive,
  guidedDownloadCode,
  guidedDownloadExtractedFilePath,
  guidedDownloadSourceAnswer,
  onMoveStep,
  onToggleOption,
  onUpdateAssignment,
  onUpdateDatasetSourceAnswer,
  onUpdateGuidedDownloadCode,
  onUploadGuidedDownloadArchive,
  orderedStepIds,
  result,
  scrollTargetRef,
  isReviewMode,
  sourceValidationResults,
  submittedColumnRoleAssignments,
  submittedDatasetSourceAnswers,
  submittedGuidedDownloadCode,
  submittedGuidedDownloadExtractedFilePath,
  submittedSelectedOptionIds,
  selectedOptionIds,
}: {
  assignments: Record<string, ColumnRole>;
  datasetView: ReturnType<typeof getDatasetView>;
  datasetSourceAnswers: Record<string, DatasetSourceAnswer>;
  edgeCompensationClassName: string;
  exercise: LessonExercise;
  exerciseLabel: string;
  guidedDownloadArchive: GuidedDownloadArchiveState | undefined;
  guidedDownloadCode: string;
  guidedDownloadExtractedFilePath: string;
  guidedDownloadSourceAnswer: DatasetSourceAnswer | undefined;
  onMoveStep: (index: number, direction: -1 | 1) => void;
  onToggleOption: (optionId: string) => void;
  onUpdateAssignment: (columnId: string, role: ColumnRole) => void;
  onUpdateDatasetSourceAnswer: (
    sourceInputId: string,
    field: keyof DatasetSourceAnswer,
    value: string,
  ) => void;
  onUpdateGuidedDownloadCode: (value: string) => void;
  onUploadGuidedDownloadArchive: (file: File) => void;
  orderedStepIds: string[];
  result: EvaluationResult | null;
  scrollTargetRef: (node: HTMLDivElement | null) => void;
  isReviewMode: boolean;
  sourceValidationResults: DatasetSourcePageValidationResult[];
  submittedColumnRoleAssignments: Record<string, ColumnRole>;
  submittedDatasetSourceAnswers: Record<string, DatasetSourceAnswer>;
  submittedGuidedDownloadCode: string;
  submittedGuidedDownloadExtractedFilePath: string;
  submittedSelectedOptionIds: string[];
  selectedOptionIds: string[];
}) {
  const { t } = useLocalization();
  const choiceModeLabel =
    exercise.type === "multiple-choice"
      ? exercise.correctOptionIds.length === 1
        ? t("learning.choice.single")
        : t("learning.choice.multiple", { count: exercise.correctOptionIds.length })
      : null;

  return (
    <>
      <LessonFullRow>
        <div
          className={`learning-sheet-cell learning-extend-left learning-extend-right ${lessonFullCellGridClassName} ${edgeCompensationClassName} p-6`}
          ref={scrollTargetRef}
        >
          <p className="text-base font-medium text-sky-600">{exerciseLabel}</p>
          <h2 className="mt-3 text-xl font-semibold text-foreground">
            {exercise.type === "open-dataset-source" || exercise.type === "guided-download"
              ? exercise.introTitle
              : exercise.prompt}
          </h2>
          {exercise.type === "open-dataset-source" || exercise.type === "guided-download" ? (
            <div className="mt-5 grid gap-5 text-base leading-7 text-muted-foreground">
              {exercise.introParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ) : null}
          {choiceModeLabel ? (
            <p className="mt-3 text-sm font-medium text-muted-foreground">{choiceModeLabel}</p>
          ) : null}
        </div>
      </LessonFullRow>

      {exercise.type === "table-column-role-assignment" && datasetView ? (
        <DatasetPreview
          edgeCompensationClassName={edgeCompensationClassName}
          exercise={exercise}
          datasetView={datasetView}
        />
      ) : null}

      {exercise.type === "multiple-choice" ? (
        <MultipleChoiceExerciseView
          edgeCompensationClassName={edgeCompensationClassName}
          exercise={exercise}
          isReviewMode={isReviewMode}
          result={result}
          submittedSelectedOptionIds={submittedSelectedOptionIds}
          selectedOptionIds={selectedOptionIds}
          onToggleOption={onToggleOption}
        />
      ) : null}

      {exercise.type === "ordered-steps" ? (
        <OrderedStepsExerciseView
          edgeCompensationClassName={edgeCompensationClassName}
          exercise={exercise}
          isReviewMode={isReviewMode}
          orderedStepIds={orderedStepIds}
          onMoveStep={onMoveStep}
        />
      ) : null}

      {exercise.type === "open-dataset-source" ? (
        <OpenDatasetSourceExerciseView
          answers={datasetSourceAnswers}
          edgeCompensationClassName={edgeCompensationClassName}
          exercise={exercise}
          isReviewMode={isReviewMode}
          onUpdateAnswer={onUpdateDatasetSourceAnswer}
          sourceValidationResults={sourceValidationResults}
          submittedAnswers={submittedDatasetSourceAnswers}
        />
      ) : null}

      {exercise.type === "guided-download" ? (
        <GuidedDownloadExerciseView
          archive={guidedDownloadArchive}
          code={guidedDownloadCode}
          edgeCompensationClassName={edgeCompensationClassName}
          exercise={exercise}
          extractedFilePath={guidedDownloadExtractedFilePath}
          isReviewMode={isReviewMode}
          onUpdateCode={onUpdateGuidedDownloadCode}
          onUploadArchive={onUploadGuidedDownloadArchive}
          sourceAnswer={guidedDownloadSourceAnswer}
          submittedCode={submittedGuidedDownloadCode}
          submittedExtractedFilePath={submittedGuidedDownloadExtractedFilePath}
        />
      ) : null}

      {exercise.type === "table-column-role-assignment" && datasetView ? (
        <ColumnRoleExerciseView
          assignments={assignments}
          columns={datasetView.columns}
          edgeCompensationClassName={edgeCompensationClassName}
          exercise={exercise}
          isReviewMode={isReviewMode}
          onUpdateAssignment={onUpdateAssignment}
          result={result}
          submittedAssignments={submittedColumnRoleAssignments}
        />
      ) : null}
    </>
  );
}

function GuidedDownloadExerciseView({
  archive,
  code,
  edgeCompensationClassName,
  exercise,
  extractedFilePath,
  isReviewMode,
  onUpdateCode,
  onUploadArchive,
  sourceAnswer,
  submittedCode,
  submittedExtractedFilePath,
}: {
  archive: GuidedDownloadArchiveState | undefined;
  code: string;
  edgeCompensationClassName: string;
  exercise: GuidedDownloadExercise;
  extractedFilePath: string;
  isReviewMode: boolean;
  onUpdateCode: (value: string) => void;
  onUploadArchive: (file: File) => void;
  sourceAnswer: DatasetSourceAnswer | undefined;
  submittedCode: string;
  submittedExtractedFilePath: string;
}) {
  const { locale } = useLocalization();
  const sourceUrl = sourceAnswer?.url.trim() ?? "";
  const hasSourceUrl = sourceUrl !== "";
  const displayedExtractedFilePath =
    isReviewMode && submittedExtractedFilePath.trim() !== ""
      ? submittedExtractedFilePath
      : extractedFilePath;
  const hasExtractedFilePath = displayedExtractedFilePath.trim() !== "";
  const expectedCode = getGuidedDownloadExpectedCode(exercise, displayedExtractedFilePath);
  const displayedCode = isReviewMode && submittedCode.trim() !== "" ? submittedCode : code;
  const openLinkLabel = locale === "en" ? "Open Kaggle link" : "Buka link Kaggle";
  const copyLinkLabel = locale === "en" ? "Copy link" : "Salin link";
  const copiedLinkLabel = locale === "en" ? "Link copied" : "Link disalin";
  const uploadedFileLabel = locale === "en" ? "Uploaded ZIP" : "ZIP terupload";
  const extractedFileLabel = locale === "en" ? "CSV path" : "Path CSV";

  return (
    <>
      <LessonFullRow>
        <div
          className={`learning-sheet-cell learning-extend-left learning-extend-right ${lessonFullCellGridClassName} ${edgeCompensationClassName} p-6`}
        >
          <p className="text-base font-medium text-sky-600">{exercise.taskTitle}</p>
          <h3 className="mt-3 text-xl font-semibold text-foreground">{exercise.prompt}</h3>
          <p
            className={`mt-4 max-w-4xl text-base leading-7 text-muted-foreground ${lessonInlineLinkClassName}`}
          >
            {renderInlineMarkdown(exercise.taskDescription, `${exercise.id}-task-description`)}
          </p>
          <ol
            className={`mt-4 grid max-w-4xl list-decimal gap-2 pl-5 text-base leading-7 text-muted-foreground ${lessonInlineLinkClassName}`}
          >
            {exercise.taskSteps.map((step, stepIndex) => (
              <li key={step}>
                {renderInlineMarkdown(step, `${exercise.id}-task-step-${stepIndex}`)}
              </li>
            ))}
          </ol>
        </div>
      </LessonFullRow>

      <LessonFullRow>
        <div
          className={`learning-sheet-cell learning-extend-left learning-extend-right ${lessonFullCellGridClassName} ${edgeCompensationClassName} grid gap-5 p-6`}
        >
          <section className="learning-grid-panel-fill p-5">
            <div className="flex gap-3">
              <HugeiconsIcon
                aria-hidden="true"
                className="mt-1 size-5 shrink-0 text-sky-600"
                icon={Link03Icon}
                size={20}
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-lg font-semibold text-foreground">
                  {exercise.sourceLinkLabel}
                </h4>
                {hasSourceUrl ? (
                  <p className="mt-2 break-all text-base leading-7 text-muted-foreground">
                    {sourceUrl}
                  </p>
                ) : (
                  <p className="mt-2 text-base leading-7 text-muted-foreground">
                    {exercise.missingSourceMessage}
                  </p>
                )}
              </div>
            </div>
            {hasSourceUrl ? (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <LinkPreview
                  className={`${emeraldLiquidButtonClassName} min-h-12 no-underline`}
                  url={sourceUrl}
                >
                  <HugeiconsIcon
                    aria-hidden="true"
                    className="size-5"
                    icon={Download04Icon}
                    size={20}
                  />
                  {openLinkLabel}
                </LinkPreview>
                <CopyButton
                  className="h-12 bg-neutral-950 px-5 text-base text-neutral-50"
                  copiedAriaLabel={copiedLinkLabel}
                  copiedLabel={copiedLinkLabel}
                  copyAriaLabel={copyLinkLabel}
                  copyLabel={copyLinkLabel}
                  value={sourceUrl}
                />
              </div>
            ) : null}
          </section>

          <section className="learning-grid-panel-fill p-5">
            <div className="flex gap-3">
              <HugeiconsIcon
                aria-hidden="true"
                className="mt-1 size-5 shrink-0 text-sky-600"
                icon={FileZipIcon}
                size={20}
              />
              <div className="min-w-0 flex-1">
                <label className="grid gap-3">
                  <span className="text-lg font-semibold text-foreground">
                    {exercise.uploadLabel}
                  </span>
                  <span className="text-base leading-7 text-muted-foreground">
                    {exercise.uploadDescription}
                  </span>
                  <input
                    accept=".zip,application/zip,application/x-zip-compressed"
                    aria-label={exercise.uploadLabel}
                    className="learning-grid-control min-h-12 w-full border border-neutral-300 bg-white px-4 py-3 text-base text-foreground file:mr-4 file:cursor-pointer file:border-0 file:bg-neutral-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-neutral-50 focus:border-sky-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:bg-neutral-100"
                    disabled={!hasSourceUrl || isReviewMode || archive?.isReading === true}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];

                      if (file) {
                        void onUploadArchive(file);
                      }
                    }}
                    type="file"
                  />
                </label>
                {archive?.fileName ? (
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    <span className="font-semibold text-foreground">{uploadedFileLabel}: </span>
                    {archive.fileName}
                  </p>
                ) : null}
                {archive?.isReading ? (
                  <p className="mt-3 text-sm font-medium text-sky-700">
                    {locale === "en" ? "Reading ZIP..." : "Membaca ZIP..."}
                  </p>
                ) : null}
                {archive?.error ? (
                  <p className="mt-3 text-sm font-medium text-rose-700">{archive.error}</p>
                ) : null}
                {hasExtractedFilePath ? (
                  <p className="mt-3 break-all text-sm leading-6 text-emerald-700">
                    <span className="font-semibold text-emerald-800">{extractedFileLabel}: </span>
                    {displayedExtractedFilePath}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="learning-grid-panel-fill p-5">
            <div className="flex gap-3">
              <HugeiconsIcon
                aria-hidden="true"
                className="mt-1 size-5 shrink-0 text-emerald-600"
                icon={FileSpreadsheetIcon}
                size={20}
              />
              <div className="min-w-0 flex-1">
                <label className="grid gap-3">
                  <span className="text-lg font-semibold text-foreground">
                    {exercise.codeLabel}
                  </span>
                  <textarea
                    aria-label={exercise.codeLabel}
                    className="learning-grid-control min-h-32 w-full resize-y border border-neutral-300 bg-neutral-950 px-4 py-3 font-mono text-sm leading-6 text-neutral-50 outline-none transition-colors placeholder:text-neutral-400 focus:border-sky-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:bg-neutral-900 disabled:text-neutral-400"
                    disabled={(!hasSourceUrl || !hasExtractedFilePath) && !isReviewMode}
                    onChange={(event) => onUpdateCode(event.currentTarget.value)}
                    placeholder={expectedCode}
                    readOnly={isReviewMode}
                    spellCheck={false}
                    value={displayedCode}
                  />
                </label>
              </div>
            </div>
          </section>
        </div>
      </LessonFullRow>
    </>
  );
}

function OpenDatasetSourceExerciseView({
  answers,
  edgeCompensationClassName,
  exercise,
  isReviewMode,
  onUpdateAnswer,
  sourceValidationResults,
  submittedAnswers,
}: {
  answers: Record<string, DatasetSourceAnswer>;
  edgeCompensationClassName: string;
  exercise: OpenDatasetSourceExercise;
  isReviewMode: boolean;
  onUpdateAnswer: (sourceInputId: string, field: keyof DatasetSourceAnswer, value: string) => void;
  sourceValidationResults: DatasetSourcePageValidationResult[];
  submittedAnswers: Record<string, DatasetSourceAnswer>;
}) {
  const { locale } = useLocalization();
  const displayedAnswers =
    isReviewMode && Object.keys(submittedAnswers).length > 0 ? submittedAnswers : answers;
  const validationResultBySourceId = new Map(
    sourceValidationResults.map((validationResult) => [
      validationResult.sourceId,
      validationResult,
    ]),
  );

  return (
    <>
      <LessonFullRow>
        <div
          className={`learning-sheet-cell learning-extend-left learning-extend-right ${lessonFullCellGridClassName} ${edgeCompensationClassName} p-6`}
        >
          <p className="text-base font-medium text-sky-600">{exercise.taskTitle}</p>
          <h3 className="mt-3 text-xl font-semibold text-foreground">{exercise.prompt}</h3>
          <p
            className={`mt-4 max-w-4xl text-base leading-7 text-muted-foreground ${lessonInlineLinkClassName}`}
          >
            {renderInlineMarkdown(exercise.taskDescription, `${exercise.id}-task-description`)}
          </p>
          {exercise.taskSteps?.length ? (
            <ol
              className={`mt-4 grid max-w-4xl list-decimal gap-2 pl-5 text-base leading-7 text-muted-foreground ${lessonInlineLinkClassName}`}
            >
              {exercise.taskSteps.map((step, stepIndex) => (
                <li key={step}>
                  {renderInlineMarkdown(step, `${exercise.id}-task-step-${stepIndex}`)}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </LessonFullRow>
      <LessonFullRow>
        <div
          className={`learning-sheet-cell learning-extend-left learning-extend-right ${lessonFullCellGridClassName} ${edgeCompensationClassName} grid gap-5 p-6`}
        >
          {exercise.sourceInputs.map((sourceInput) => {
            const sourceAnswer = displayedAnswers[sourceInput.id] ?? { notes: "", url: "" };
            const validationResult = validationResultBySourceId.get(sourceInput.id);
            const hasNotes = sourceAnswer.notes.trim() !== "";
            const sourceDescription = sourceInput.description.trim();

            return (
              <section className="learning-grid-panel-fill p-5" key={sourceInput.id}>
                <div className="flex gap-3">
                  <LinkIcon aria-hidden="true" className="mt-1 size-5 shrink-0 text-sky-600" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-lg font-semibold text-foreground">{sourceInput.label}</h4>
                    {sourceDescription ? (
                      <p className="mt-2 text-base leading-7 text-muted-foreground">
                        {sourceDescription}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {exercise.urlLabel}
                    </span>
                    <input
                      aria-label={`${sourceInput.label}: ${exercise.urlLabel}`}
                      className="learning-grid-control min-h-12 w-full border border-neutral-300 bg-white px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-sky-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 read-only:cursor-default"
                      onChange={(event) =>
                        onUpdateAnswer(sourceInput.id, "url", event.currentTarget.value)
                      }
                      placeholder={sourceInput.urlPlaceholder}
                      readOnly={isReviewMode}
                      type="url"
                      value={sourceAnswer.url}
                    />
                  </label>
                  {isReviewMode && hasNotes ? (
                    <div className="grid gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {exercise.notesLabel}
                      </span>
                      <MarkdownContent
                        className="learning-grid-control min-h-32 border border-neutral-300 bg-white px-4 py-3"
                        value={sourceAnswer.notes}
                      />
                    </div>
                  ) : (
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {exercise.notesLabel}
                      </span>
                      <textarea
                        aria-label={`${sourceInput.label}: ${exercise.notesLabel}`}
                        className="learning-grid-control min-h-32 w-full resize-y border border-neutral-300 bg-white px-4 py-3 text-base leading-7 text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-sky-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:bg-neutral-100 disabled:text-muted-foreground"
                        disabled={isReviewMode}
                        onChange={(event) =>
                          onUpdateAnswer(sourceInput.id, "notes", event.currentTarget.value)
                        }
                        placeholder={sourceInput.notesPlaceholder}
                        value={sourceAnswer.notes}
                      />
                    </label>
                  )}
                  {!isReviewMode && hasNotes && hasMarkdownSyntax(sourceAnswer.notes) ? (
                    <MarkdownContent
                      className="learning-grid-control border border-neutral-200 bg-white/70 px-4 py-3 text-sm leading-6"
                      value={sourceAnswer.notes}
                    />
                  ) : null}
                </div>
                {validationResult ? (
                  <DatasetSourceValidationSummary locale={locale} result={validationResult} />
                ) : null}
              </section>
            );
          })}
        </div>
      </LessonFullRow>
    </>
  );
}

function DatasetSourceValidationSummary({
  locale,
  result,
}: {
  locale: Locale;
  result: DatasetSourcePageValidationResult;
}) {
  const isPositive = result.status === "valid";
  const isNegative = result.status === "invalid" || result.status === "unreachable";
  const title =
    locale === "en"
      ? isNegative
        ? "Page not readable"
        : "Page readable"
      : isNegative
        ? "Halaman tidak terbaca"
        : "Halaman terbaca";
  const statusClassName = isPositive
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : isNegative
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-sky-200 bg-sky-50 text-sky-800";

  return (
    <div className={`mt-5 border p-4 ${statusClassName}`}>
      <div className="flex items-start gap-3">
        {isPositive ? (
          <CheckCircleIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        ) : isNegative ? (
          <XCircleIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        ) : (
          <InformationCircleIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <h5 className="font-semibold">{title}</h5>
          {result.issues.length > 0 ? (
            <p className="mt-2 text-sm opacity-85">{result.issues.join(" ")}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatDatasetCellValue(value: DatasetRow["values"][string]) {
  return value === null ? "" : String(value);
}

function compareDatasetCellValues(
  valueA: DatasetRow["values"][string],
  valueB: DatasetRow["values"][string],
  columnType: DatasetColumn["type"],
) {
  if (valueA === valueB) {
    return 0;
  }

  if (valueA === null) {
    return -1;
  }

  if (valueB === null) {
    return 1;
  }

  if (columnType === "numeric") {
    return Number(valueA) - Number(valueB);
  }

  if (columnType === "boolean") {
    return Number(valueA) - Number(valueB);
  }

  return String(valueA).localeCompare(String(valueB), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function DatasetPreview({
  datasetView,
  edgeCompensationClassName,
  exercise,
}: {
  datasetView: NonNullable<ReturnType<typeof getDatasetView>>;
  edgeCompensationClassName: string;
  exercise: TableColumnRoleExercise;
}) {
  const { t } = useLocalization();
  const [sorting, setSorting] = useState<SortingState>([]);
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);
  const previousRowRectsRef = useRef<Map<string, DOMRectReadOnly>>(new Map());
  const tableColumns = useMemo<ColumnDef<DatasetRow>[]>(
    () =>
      datasetView.columns.map((datasetColumn) => ({
        accessorFn: (row) => row.values[datasetColumn.id],
        cell: ({ getValue }) => formatDatasetCellValue(getValue<DatasetRow["values"][string]>()),
        header: () => (
          <span className="flex min-w-0 flex-col gap-1.5">
            <span>{datasetColumn.label}</span>
            {datasetColumn.unit ? (
              <span className="text-sm font-normal text-muted-foreground">
                {datasetColumn.unit}
              </span>
            ) : null}
          </span>
        ),
        id: datasetColumn.id,
        meta: {
          label: datasetColumn.label,
        },
        sortingFn: (rowA, rowB, columnId) =>
          compareDatasetCellValues(
            rowA.getValue<DatasetRow["values"][string]>(columnId),
            rowB.getValue<DatasetRow["values"][string]>(columnId),
            datasetColumn.type,
          ),
      })),
    [datasetView.columns],
  );
  const table = useReactTable({
    columns: tableColumns,
    data: datasetView.rows,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    sortDescFirst: false,
    state: {
      sorting,
    },
  });
  const sortedRows = table.getRowModel().rows;
  const sortedRowOrderKey = sortedRows.map((row) => row.id).join("|");

  useGSAP(
    () => {
      const tableBody = tableBodyRef.current;

      if (!tableBody) {
        return;
      }

      const rows = gsap.utils.toArray<HTMLElement>("[data-dataset-row-id]", tableBody);
      const nextRowRects = new Map<string, DOMRectReadOnly>();
      const animatedRows: HTMLElement[] = [];

      rows.forEach((rowElement) => {
        const rowId = rowElement.dataset.datasetRowId;

        if (!rowId) {
          return;
        }

        const nextRect = rowElement.getBoundingClientRect();
        const previousRect = previousRowRectsRef.current.get(rowId);
        nextRowRects.set(rowId, nextRect);

        if (!previousRect) {
          return;
        }

        const offsetY = previousRect.top - nextRect.top;

        if (Math.abs(offsetY) < 0.5) {
          return;
        }

        gsap.set(rowElement, { y: offsetY });
        animatedRows.push(rowElement);
      });

      previousRowRectsRef.current = nextRowRects;

      if (animatedRows.length === 0 || shouldReduceMotion()) {
        gsap.set(animatedRows, { clearProps: "transform" });
        return;
      }

      gsap.to(animatedRows, {
        clearProps: "transform",
        duration: 0.48,
        ease: "power3.out",
        overwrite: true,
        stagger: {
          each: 0.012,
          from: "start",
        },
        y: 0,
      });
    },
    { dependencies: [sortedRowOrderKey], revertOnUpdate: true, scope: tableBodyRef },
  );

  return (
    <>
      <LessonFullRow>
        <section
          className={`learning-sheet-cell learning-extend-left learning-extend-right ${lessonFullCellGridClassName} ${edgeCompensationClassName} flex flex-col gap-3 p-6`}
        >
          <h2 className="text-xl font-semibold text-foreground" id="dataset-preview">
            {t("learning.dataset.preview")}
          </h2>
          <p className="text-base leading-7 text-muted-foreground">{exercise.datasetContext}</p>
        </section>
      </LessonFullRow>
      <LessonFullRow>
        <div
          className={`learning-sheet-cell learning-extend-left learning-extend-right ${lessonFullCellGridClassName} ${edgeCompensationClassName}`}
        >
          <div className="overflow-x-auto overflow-y-clip">
            <table className="min-w-full border-separate border-spacing-0 text-left text-base">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr className="learning-sheet-cell-fill-strong" key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const sorted = header.column.getIsSorted();
                      const columnMeta = header.column.columnDef.meta as
                        | { label?: string }
                        | undefined;
                      const sortLabel = columnMeta?.label ?? String(header.column.columnDef.id);

                      return (
                        <th
                          aria-sort={
                            sorted === "asc"
                              ? "ascending"
                              : sorted === "desc"
                                ? "descending"
                                : "none"
                          }
                          className="border-b learning-grid-border p-0 font-semibold text-foreground"
                          key={header.id}
                          scope="col"
                        >
                          <button
                            aria-label={t("learning.sortBy", { label: sortLabel })}
                            className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-emerald-400"
                            onClick={header.column.getToggleSortingHandler()}
                            type="button"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                            <span
                              aria-hidden="true"
                              className="ml-auto inline-flex size-5 shrink-0 items-center justify-center text-muted-foreground"
                            >
                              {sorted === "asc" ? (
                                <ArrowUpIcon className="size-5 text-emerald-500" />
                              ) : sorted === "desc" ? (
                                <ArrowDownIcon className="size-5 text-emerald-500" />
                              ) : (
                                <ChevronDownIcon className="size-5 opacity-45" />
                              )}
                            </span>
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody ref={tableBodyRef}>
                {sortedRows.map((row, rowIndex) => (
                  <tr
                    className={
                      rowIndex % 2 === 0
                        ? "bg-transparent will-change-transform"
                        : "learning-sheet-cell-fill will-change-transform"
                    }
                    data-dataset-row-id={row.id}
                    key={row.id}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        className={`${rowIndex === sortedRows.length - 1 ? "" : "border-b"} learning-grid-border px-5 py-4 text-muted-foreground`}
                        key={cell.id}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </LessonFullRow>
    </>
  );
}

function RoleDropdown({
  columnLabel,
  disabled = false,
  onChange,
  value,
}: {
  columnLabel: string;
  disabled?: boolean;
  onChange: (role: ColumnRole) => void;
  value: ColumnRole;
}) {
  const { t } = useLocalization();
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef(new Map<ColumnRole, HTMLDivElement>());
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [activeOptionValue, setActiveOptionValue] = useState<ColumnRole | null>(null);
  const [highlightRect, setHighlightRect] = useState<RoleDropdownHighlightRect | null>(null);
  const selectedLabel = getRoleOptionLabel(value, t);
  const highlightedOptionValue = activeOptionValue ?? value;
  const reduceDropdownMotion = shouldReduceMotion();
  const { floatingStyles, refs, update } = useFloating({
    middleware: [
      offset(10),
      flip({ padding: 16 }),
      shift({ padding: 16 }),
      size({
        apply({ availableHeight, elements, rects }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.max(96, availableHeight)}px`,
            width: `${rects.reference.width}px`,
          });
        },
        padding: 16,
      }),
    ],
    open: isOpen,
    placement: "bottom-start",
    strategy: "fixed",
    transform: false,
    whileElementsMounted: autoUpdate,
  });

  const closeDropdown = useCallback(() => {
    setActiveOptionValue(null);
    setIsOpen(false);
  }, []);

  const openDropdown = () => {
    if (disabled) {
      return;
    }

    setIsOpen(true);
  };

  const toggleDropdown = () => {
    if (disabled) {
      return;
    }

    if (isOpen) {
      closeDropdown();
      return;
    }

    openDropdown();
  };

  const selectRole = (nextValue: ColumnRole) => {
    onChange(nextValue);
    closeDropdown();
  };

  const syncHighlightToOption = useCallback((nextValue: ColumnRole) => {
    const optionElement = optionRefs.current.get(nextValue);

    if (!optionElement) {
      return false;
    }

    const topInset = optionElement.clientTop;

    setHighlightRect({
      height: optionElement.offsetHeight - topInset,
      y: optionElement.offsetTop + topInset,
    });

    return true;
  }, []);

  const activateOption = (nextValue: ColumnRole) => {
    if (syncHighlightToOption(nextValue)) {
      setActiveOptionValue(nextValue);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setActiveOptionValue(null);
      setHighlightRect(null);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      void update();
      syncHighlightToOption(highlightedOptionValue);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [highlightedOptionValue, isOpen, syncHighlightToOption, update]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (rootRef.current?.contains(target) || refs.floating.current?.contains(target)) {
        return;
      }

      closeDropdown();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDropdown();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDropdown, isOpen]);

  return (
    <div className="relative inline-block w-full" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t("learning.role.aria", { column: columnLabel })}
        className={`learning-grid-control flex min-h-12 w-full items-center justify-between gap-3 border border-neutral-300 bg-neutral-100/90 px-6 py-3 text-left text-base font-medium text-foreground backdrop-blur-xl supports-[backdrop-filter]:bg-neutral-100/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-70 ${disabled ? "" : "cursor-pointer"}`}
        disabled={disabled}
        onClick={toggleDropdown}
        ref={refs.setReference}
        type="button"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDownIcon
          aria-hidden="true"
          className={`block size-4 shrink-0 text-current transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen ? (
            <motion.div
              animate={{ opacity: 1, scaleY: 1, y: 0 }}
              aria-label={t("learning.role.aria", { column: columnLabel })}
              className="relative z-[100] origin-top overflow-y-auto border border-neutral-300 bg-neutral-100 text-neutral-700"
              exit={{ opacity: 0, scaleY: reduceDropdownMotion ? 1 : 0.98, y: -4 }}
              id={menuId}
              initial={{ opacity: 0, scaleY: reduceDropdownMotion ? 1 : 0.98, y: -4 }}
              onPointerLeave={() => {
                setActiveOptionValue(null);
                syncHighlightToOption(value);
              }}
              ref={refs.setFloating}
              role="listbox"
              style={floatingStyles}
              transition={
                reduceDropdownMotion
                  ? { duration: 0.08 }
                  : { duration: 0.14, ease: [0.22, 1, 0.36, 1] }
              }
            >
              {highlightRect ? (
                <motion.span
                  aria-hidden="true"
                  animate={{
                    height: highlightRect.height,
                    y: highlightRect.y,
                  }}
                  className="pointer-events-none absolute top-0 right-0 left-0 z-10 transform-gpu bg-cyan-500 will-change-transform"
                  initial={false}
                  transition={
                    reduceDropdownMotion
                      ? { duration: 0 }
                      : {
                          height: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
                          y: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
                        }
                  }
                />
              ) : null}
              {roleOptions.map((optionValue, optionIndex) => {
                const isHighlighted = highlightedOptionValue === optionValue;
                const optionLabel = getRoleOptionLabel(optionValue, t);

                return (
                  <div
                    className={`relative ${optionIndex === 0 ? "" : "border-t border-neutral-200"}`}
                    key={optionValue}
                    onPointerEnter={() => activateOption(optionValue)}
                    ref={(node) => {
                      if (node) {
                        optionRefs.current.set(optionValue, node);
                      } else {
                        optionRefs.current.delete(optionValue);
                      }
                    }}
                  >
                    <button
                      aria-selected={value === optionValue}
                      className={`relative z-20 block w-full cursor-pointer overflow-hidden bg-transparent px-5 py-3 text-left text-base font-medium transition-colors duration-150 focus-visible:outline-none ${
                        isHighlighted ? "text-neutral-50" : "text-neutral-700"
                      }`}
                      onClick={() => selectRole(optionValue)}
                      onFocus={() => activateOption(optionValue)}
                      role="option"
                      type="button"
                    >
                      <span className="relative z-20">{optionLabel}</span>
                    </button>
                  </div>
                );
              })}
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

function ColumnRoleExerciseView({
  assignments,
  columns,
  edgeCompensationClassName,
  exercise,
  isReviewMode,
  onUpdateAssignment,
  result,
  submittedAssignments,
}: {
  assignments: Record<string, ColumnRole>;
  columns: NonNullable<ReturnType<typeof getDatasetView>>["columns"];
  edgeCompensationClassName: string;
  exercise: TableColumnRoleExercise;
  isReviewMode: boolean;
  onUpdateAssignment: (columnId: string, role: ColumnRole) => void;
  result: EvaluationResult | null;
  submittedAssignments: Record<string, ColumnRole>;
}) {
  const { t } = useLocalization();
  const expectedRoles = getExpectedColumnRoles();
  const evaluatedAssignments =
    Object.keys(submittedAssignments).length > 0 ? submittedAssignments : assignments;
  const shouldShowColumnFeedback = result !== null;

  return (
    <>
      <LessonFullRow>
        <div
          className={`learning-sheet-cell learning-extend-left learning-extend-right ${lessonFullCellGridClassName} ${edgeCompensationClassName} px-6 py-5 text-base leading-7 text-muted-foreground`}
        >
          {exercise.instruction}
        </div>
      </LessonFullRow>
      <LessonFullRow>
        <div
          className={`learning-sheet-cell learning-extend-left learning-extend-right ${lessonFullCellGridClassName} ${edgeCompensationClassName} grid gap-4 p-6`}
        >
          {columns.map((column) => {
            const expectedRole = expectedRoles[column.id];
            const evaluatedRole = evaluatedAssignments[column.id] ?? "safe-feature";
            const shouldShowFeedback = shouldShowColumnFeedback && expectedRole !== undefined;
            const isPositiveFeedback = evaluatedRole === expectedRole;

            return (
              <div className="grid" key={column.id}>
                {shouldShowFeedback ? (
                  <div className="flex min-h-16 items-center gap-3 border border-b-0 learning-grid-border px-5 py-4">
                    {isPositiveFeedback ? (
                      <CheckCircleIcon
                        aria-hidden="true"
                        className="size-6 shrink-0 text-emerald-500"
                      />
                    ) : (
                      <XCircleIcon aria-hidden="true" className="size-6 shrink-0 text-rose-500" />
                    )}
                    <h3 className="text-xl font-semibold text-foreground">
                      {isPositiveFeedback
                        ? t("learning.feedback.correct")
                        : t("learning.feedback.incorrect")}
                    </h3>
                  </div>
                ) : null}
                <div className="grid gap-4 border learning-grid-border p-5 sm:grid-cols-[minmax(0,1fr)_288px] sm:items-center">
                  <span>
                    <span className="block text-base font-semibold text-foreground">
                      {column.label}
                    </span>
                    <span className="mt-1.5 block text-base text-muted-foreground">
                      {column.id}
                    </span>
                  </span>
                  <RoleDropdown
                    columnLabel={column.label}
                    disabled={isReviewMode}
                    onChange={(role) => onUpdateAssignment(column.id, role)}
                    value={assignments[column.id] ?? "safe-feature"}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </LessonFullRow>
    </>
  );
}

function MultipleChoiceExerciseView({
  edgeCompensationClassName,
  exercise,
  isReviewMode,
  onToggleOption,
  result,
  submittedSelectedOptionIds,
  selectedOptionIds,
}: {
  edgeCompensationClassName: string;
  exercise: MultipleChoiceExercise;
  isReviewMode: boolean;
  onToggleOption: (optionId: string) => void;
  result: EvaluationResult | null;
  submittedSelectedOptionIds: string[];
  selectedOptionIds: string[];
}) {
  const { t } = useLocalization();
  const shouldShowCorrectIndicator = result?.status === "correct";
  const shouldShowSubmittedOptionFeedback = result !== null && result.status !== "correct";
  const isSingleOptionExercise = exercise.correctOptionIds.length === 1;
  const reduceOptionFeedbackMotion = shouldReduceMotion();

  return (
    <LessonFullRow>
      <div
        className={`learning-sheet-cell learning-extend-left learning-extend-right ${lessonFullCellGridClassName} ${edgeCompensationClassName} grid gap-4 p-6`}
      >
        {exercise.options.map((option) => {
          const isCorrectOption = exercise.correctOptionIds.includes(option.id);
          const isSelectedOption = selectedOptionIds.includes(option.id);
          const isSubmittedOption = submittedSelectedOptionIds.includes(option.id);
          const shouldShowCorrectForOption = shouldShowCorrectIndicator && isCorrectOption;
          const shouldShowSubmittedFeedbackForOption =
            shouldShowSubmittedOptionFeedback && isSubmittedOption;
          const shouldShowOptionFeedback =
            shouldShowCorrectForOption || shouldShowSubmittedFeedbackForOption;
          const isPositiveFeedback = isCorrectOption;
          const optionFeedbackClassName = shouldShowOptionFeedback
            ? isPositiveFeedback
              ? "learning-option-feedback-correct"
              : "learning-option-feedback-incorrect"
            : "";

          return (
            <div className="relative grid" key={option.id}>
              <label
                className={`flex min-h-16 items-center gap-4 border learning-grid-border py-4 pr-16 pl-5 transition-[background,border-color] duration-200 ${optionFeedbackClassName} ${
                  isReviewMode ? "cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <input
                  checked={isSelectedOption}
                  className="peer sr-only"
                  disabled={isReviewMode}
                  name={exercise.id}
                  onChange={() => onToggleOption(option.id)}
                  type={isSingleOptionExercise ? "radio" : "checkbox"}
                />
                <span className="flex size-5 shrink-0 items-center justify-center border border-neutral-300 bg-white text-transparent transition-colors peer-checked:border-emerald-500 peer-checked:bg-emerald-500 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-500">
                  <CheckIcon aria-hidden="true" className="size-4 stroke-[3.25]" />
                </span>
                <span className="min-w-0 text-base leading-7 text-foreground">{option.label}</span>
              </label>
              <AnimatePresence initial={false}>
                {shouldShowOptionFeedback ? (
                  <motion.span
                    animate={{
                      filter: "blur(0px)",
                      opacity: 1,
                      scale: 1,
                      y: "-50%",
                    }}
                    aria-label={
                      isPositiveFeedback
                        ? t("learning.feedback.correct")
                        : t("learning.feedback.incorrect")
                    }
                    className="pointer-events-none absolute top-1/2 right-5 inline-flex size-8 items-center justify-center"
                    exit={{
                      filter: reduceOptionFeedbackMotion ? "blur(0px)" : "blur(6px)",
                      opacity: 0,
                      scale: reduceOptionFeedbackMotion ? 1 : 0.96,
                      y: reduceOptionFeedbackMotion ? "-50%" : "calc(-50% - 4px)",
                    }}
                    initial={{
                      filter: reduceOptionFeedbackMotion ? "blur(0px)" : "blur(8px)",
                      opacity: 0,
                      scale: reduceOptionFeedbackMotion ? 1 : 0.96,
                      y: reduceOptionFeedbackMotion ? "-50%" : "calc(-50% + 4px)",
                    }}
                    transition={
                      reduceOptionFeedbackMotion
                        ? { duration: 0.08 }
                        : {
                            duration: 0.18,
                            ease: [0.22, 1, 0.36, 1],
                          }
                    }
                    role="img"
                  >
                    {isPositiveFeedback ? (
                      <CheckIcon
                        aria-hidden="true"
                        className="size-8 shrink-0 stroke-[3] text-emerald-500"
                      />
                    ) : (
                      <XMarkIcon
                        aria-hidden="true"
                        className="size-8 shrink-0 stroke-[3] text-rose-500"
                      />
                    )}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </LessonFullRow>
  );
}

function OrderedStepsExerciseView({
  edgeCompensationClassName,
  exercise,
  isReviewMode,
  onMoveStep,
  orderedStepIds,
}: {
  edgeCompensationClassName: string;
  exercise: OrderedStepsExercise;
  isReviewMode: boolean;
  onMoveStep: (index: number, direction: -1 | 1) => void;
  orderedStepIds: string[];
}) {
  const { t } = useLocalization();
  const stepById = new Map(exercise.steps.map((step) => [step.id, step]));

  return (
    <LessonFullRow>
      <ol
        className={`learning-sheet-cell learning-extend-left learning-extend-right ${lessonFullCellGridClassName} ${edgeCompensationClassName} grid gap-4 p-6`}
      >
        {orderedStepIds.map((stepId, index) => {
          const step = stepById.get(stepId);

          if (!step) {
            return null;
          }

          return (
            <li
              className="grid gap-4 border learning-grid-border p-5 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-center"
              key={step.id}
            >
              <span className="learning-grid-panel-fill flex size-12 items-center justify-center text-base font-semibold text-foreground">
                {index + 1}
              </span>
              <span className="text-base font-medium text-foreground">{step.label}</span>
              <span className="flex gap-3">
                <button
                  aria-label={t("learning.move.up", { label: step.label })}
                  className="learning-grid-panel-fill inline-flex size-12 cursor-pointer items-center justify-center text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={isReviewMode || index === 0}
                  onClick={() => onMoveStep(index, -1)}
                  type="button"
                >
                  <ArrowUpIcon aria-hidden="true" className="size-5" />
                </button>
                <button
                  aria-label={t("learning.move.down", { label: step.label })}
                  className="learning-grid-panel-fill inline-flex size-12 cursor-pointer items-center justify-center text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={isReviewMode || index === orderedStepIds.length - 1}
                  onClick={() => onMoveStep(index, 1)}
                  type="button"
                >
                  <ArrowDownIcon aria-hidden="true" className="size-5" />
                </button>
              </span>
            </li>
          );
        })}
      </ol>
    </LessonFullRow>
  );
}

function LessonResult({ result }: { result: EvaluationResult }) {
  const { t } = useLocalization();
  const resultCellClassName =
    result.status === "correct"
      ? `learning-extend-left learning-extend-right ${lessonFullCellGridClassName}`
      : `learning-extend-left ${lessonSplitResultGridClassName}`;
  const shouldShowResultBody = result.status !== "correct";

  return (
    <>
      <LessonLeftGutter />
      <div
        aria-live="polite"
        className={`learning-sheet-cell ${resultCellClassName} flex gap-4 p-6`}
      >
        {result.status === "correct" ? (
          <CheckCircleIcon aria-hidden="true" className="size-7 shrink-0 text-emerald-500" />
        ) : result.status === "incorrect" ? (
          <XCircleIcon aria-hidden="true" className="size-7 shrink-0 text-rose-500" />
        ) : (
          <InformationCircleIcon aria-hidden="true" className="size-7 shrink-0 text-sky-600" />
        )}
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {result.status === "correct"
              ? t("learning.result.correct")
              : result.status === "partial"
                ? t("learning.result.partial")
                : t("learning.result.incorrect")}
          </h2>
          {shouldShowResultBody ? (
            <>
              <p className="mt-3 text-base leading-6 text-muted-foreground">{result.message}</p>
              <p className="mt-2 text-base leading-6 text-muted-foreground">{result.nextStep}</p>
            </>
          ) : null}
        </div>
      </div>
      {result.status === "correct" ? <LessonRightGutter /> : null}
    </>
  );
}

function LessonHintPanel({
  hints,
  onToggleHints,
  scrollPinTargetRef,
  visibleHintCount,
}: {
  hints: string[];
  onToggleHints: () => void;
  scrollPinTargetRef: RefObject<HTMLElement | null>;
  visibleHintCount: number;
}) {
  const { t } = useLocalization();
  const areHintsVisible = visibleHintCount > 0;
  const areAllHintsVisible = visibleHintCount >= hints.length;
  const reduceHintMotion = shouldReduceMotion();
  const hintListContentRef = useRef<HTMLOListElement | null>(null);
  const shouldPinHintScrollRef = useRef(false);
  const [hintListHeight, setHintListHeight] = useState(0);
  const visibleHints = hints.slice(0, visibleHintCount);
  const buttonLabel = areHintsVisible
    ? areAllHintsVisible
      ? t("learning.hint.hide")
      : t("learning.hint.showMore")
    : t("learning.hint.show");
  const pinHintScrollToBottom = useCallback(() => {
    if (!shouldPinHintScrollRef.current) {
      return;
    }

    scrollPinTargetRef.current?.scrollIntoView?.({
      behavior: "auto",
      block: "end",
      inline: "nearest",
    });
  }, [scrollPinTargetRef]);
  const finishPinnedHintScroll = useCallback(() => {
    pinHintScrollToBottom();
    shouldPinHintScrollRef.current = false;
  }, [pinHintScrollToBottom]);
  const schedulePinnedHintScroll = useCallback(() => {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      pinHintScrollToBottom();
      return;
    }

    window.requestAnimationFrame(pinHintScrollToBottom);
  }, [pinHintScrollToBottom]);
  const togglePinnedHints = () => {
    shouldPinHintScrollRef.current = true;
    onToggleHints();
    schedulePinnedHintScroll();
  };

  useEffect(() => {
    if (!shouldPinHintScrollRef.current) {
      return;
    }

    schedulePinnedHintScroll();
  }, [schedulePinnedHintScroll, visibleHintCount]);

  useLayoutEffect(() => {
    if (!areHintsVisible) {
      setHintListHeight(0);
      return;
    }

    const hintListContent = hintListContentRef.current;

    if (!hintListContent) {
      return;
    }

    const updateHintListHeight = () => {
      setHintListHeight(hintListContent.scrollHeight);
    };

    updateHintListHeight();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(updateHintListHeight);
    resizeObserver.observe(hintListContent);

    return () => {
      resizeObserver.disconnect();
    };
  }, [areHintsVisible, hints, visibleHintCount]);

  return (
    <>
      <aside
        className={`learning-sheet-cell learning-extend-left learning-extend-right ${lessonSplitAsideGridClassName} -mr-px p-6`}
      >
        <h2 className="flex items-center gap-3 text-xl font-semibold text-foreground">
          <HugeiconsIcon aria-hidden="true" className="size-6 text-amber-500" icon={BulbIcon} />
          {t("learning.hint")}
        </h2>
        <AnimatePresence initial={false}>
          {areHintsVisible ? (
            <motion.div
              animate={{
                filter: "blur(0px)",
                height: hintListHeight,
                marginTop: 24,
                opacity: 1,
                y: 0,
              }}
              className="grid overflow-hidden text-base leading-7 text-muted-foreground"
              exit={{
                filter: reduceHintMotion ? "blur(0px)" : "blur(6px)",
                height: 0,
                marginTop: 0,
                opacity: 0,
                y: reduceHintMotion ? 0 : -8,
              }}
              initial={{
                filter: reduceHintMotion ? "blur(0px)" : "blur(8px)",
                height: 0,
                marginTop: 0,
                opacity: 0,
                y: reduceHintMotion ? 0 : 8,
              }}
              transition={
                reduceHintMotion
                  ? { duration: 0.08 }
                  : {
                      duration: 0.24,
                      ease: [0.22, 1, 0.36, 1],
                    }
              }
              onAnimationComplete={finishPinnedHintScroll}
              onUpdate={pinHintScrollToBottom}
            >
              <ol
                className="grid gap-4 text-base leading-7 text-muted-foreground"
                ref={hintListContentRef}
              >
                <AnimatePresence initial={false}>
                  {visibleHints.map((hint, index) => (
                    <motion.li
                      animate={{
                        filter: "blur(0px)",
                        opacity: 1,
                        scale: 1,
                        y: 0,
                      }}
                      className="learning-grid-panel-fill p-5"
                      exit={{
                        filter: reduceHintMotion ? "blur(0px)" : "blur(6px)",
                        opacity: 0,
                        scale: reduceHintMotion ? 1 : 0.98,
                        y: reduceHintMotion ? 0 : -6,
                      }}
                      initial={{
                        filter: reduceHintMotion ? "blur(0px)" : "blur(8px)",
                        opacity: 0,
                        scale: reduceHintMotion ? 1 : 0.98,
                        y: reduceHintMotion ? 0 : 6,
                      }}
                      key={hint}
                      transition={
                        reduceHintMotion
                          ? { duration: 0.08 }
                          : {
                              duration: 0.2,
                              ease: [0.22, 1, 0.36, 1],
                            }
                      }
                    >
                      {index + 1}. {hint}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ol>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className="mt-5">
          <LiquidButton
            className={`${amberLiquidButtonClassName} w-full cursor-pointer`}
            onClick={togglePinnedHints}
            type="button"
          >
            {buttonLabel}
          </LiquidButton>
        </div>
      </aside>
      <LessonRightGutter />
    </>
  );
}
