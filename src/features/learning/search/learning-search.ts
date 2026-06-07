import MiniSearch, { type SearchResult } from "minisearch";

import type { Locale } from "@/features/localization/localization";
import { localizeLesson, localizeModule } from "../content/localized-learning-content";
import type { LearningModule, LearningTrack, Lesson, LessonExercise } from "../types";
import lessonMdxRawByPath from "virtual:learning-mdx-raw";

const maxSnippetLength = 220;
const minimumSearchTermLength = 2;

const lessonSlugAliases: Record<string, string> = {
  "0-6-formulating-machine-learning-problems": "0-6-formulating-ml-problems",
  "1-1-ml-tools-and-libraries": "1-1-ml-tools-libraries",
  "1-4-cleaning-and-transformation": "1-4-cleaning-transformation",
  "1-5-exploratory-and-explanatory-data-analysis": "1-5-exploratory-explanatory-analysis",
};

const lessonSearchAliasesByLessonId: Record<string, string[]> = {
  "lesson-0-1-what-is-machine-learning": ["ml", "machine learning", "pembelajaran mesin"],
  "lesson-1-5-exploratory-explanatory-analysis": [
    "eda",
    "exploratory data analysis",
    "exploratory analysis",
    "explanatory analysis",
    "analisis data eksploratif",
    "analisis eksploratif",
    "analisis eksplanatori",
  ],
};

type LearningSearchDocumentSection =
  | "alias"
  | "content"
  | "exercise"
  | "objective"
  | "summary"
  | "title";

export type LearningSearchAccessState = "coming-soon" | "locked" | "unlocked";

export type LearningSearchDocument = {
  accessState: LearningSearchAccessState;
  id: string;
  href: string;
  lessonId: string;
  lessonOrder: number;
  lessonTitle: string;
  moduleId: string;
  moduleOrder: number;
  moduleTitle: string;
  numberLabel: string;
  searchText: string;
  section: LearningSearchDocumentSection;
  sectionLabel: string;
  snippet: string;
};

export type LearningSearchResult = {
  accessState: LearningSearchAccessState;
  href: string;
  lessonId: string;
  lessonOrder: number;
  lessonTitle: string;
  moduleId: string;
  moduleOrder: number;
  moduleTitle: string;
  numberLabel: string;
  queryTerms: string[];
  score: number;
  section: LearningSearchDocumentSection;
  sectionLabel: string;
  snippet: string;
  terms: string[];
};

export type LearningSearchIndex = {
  documents: LearningSearchDocument[];
  search: (query: string, options?: { limit?: number }) => LearningSearchResult[];
};

type CreateLearningSearchDocumentsOptions = {
  lessonAccessById?: Partial<Record<string, LearningSearchAccessState>>;
  lessons: Lesson[];
  locale: Locale;
  modules: LearningModule[];
  track: LearningTrack;
};

type StoredLearningSearchResult = SearchResult &
  Pick<
    LearningSearchDocument,
    | "href"
    | "lessonId"
    | "lessonOrder"
    | "lessonTitle"
    | "moduleId"
    | "moduleOrder"
    | "moduleTitle"
    | "numberLabel"
    | "accessState"
    | "section"
    | "sectionLabel"
    | "snippet"
    | "searchText"
  >;

export function normalizeLearningSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function tokenizeLearningSearchText(value: string) {
  return normalizeLearningSearchText(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length >= minimumSearchTermLength);
}

function processLearningSearchTerm(term: string) {
  const normalizedTerm = normalizeLearningSearchText(term);

  return normalizedTerm.length >= minimumSearchTermLength ? normalizedTerm : false;
}

export function mdxToSearchText(source: string) {
  return source
    .replace(/```[\s\S]*?```/g, "\n")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[>*_~|]/g, " ")
    .split("\n")
    .map(normalizeWhitespace)
    .filter(Boolean)
    .join("\n");
}

function splitLongFragment(fragment: string, maxLength = maxSnippetLength) {
  if (fragment.length <= maxLength) {
    return [fragment];
  }

  const sentences = fragment.split(/(?<=[.!?])\s+/u);
  const fragments: string[] = [];
  let currentFragment = "";

  for (const sentence of sentences) {
    if (!sentence) {
      continue;
    }

    const nextFragment = normalizeWhitespace(`${currentFragment} ${sentence}`);

    if (nextFragment.length <= maxLength) {
      currentFragment = nextFragment;
      continue;
    }

    if (currentFragment) {
      fragments.push(currentFragment);
      currentFragment = "";
    }

    if (sentence.length <= maxLength) {
      currentFragment = sentence;
      continue;
    }

    const words = sentence.split(/\s+/);
    let wordChunk = "";

    for (const word of words) {
      const nextWordChunk = normalizeWhitespace(`${wordChunk} ${word}`);

      if (nextWordChunk.length <= maxLength) {
        wordChunk = nextWordChunk;
        continue;
      }

      if (wordChunk) {
        fragments.push(wordChunk);
      }

      wordChunk = word;
    }

    if (wordChunk) {
      currentFragment = wordChunk;
    }
  }

  if (currentFragment) {
    fragments.push(currentFragment);
  }

  return fragments;
}

function splitSentenceFragments(fragment: string) {
  const normalizedFragment = normalizeWhitespace(fragment);

  if (!normalizedFragment) {
    return [];
  }

  return normalizedFragment.split(/(?<=[.!?])\s+/u).filter(Boolean);
}

function createTextFragments(value: string) {
  return value
    .split(/\n+/)
    .flatMap((fragment) => splitSentenceFragments(fragment))
    .flatMap((fragment) => splitLongFragment(fragment))
    .filter((fragment) => fragment.length >= 16);
}

type MdxSearchFragment = {
  searchText: string;
  snippet: string;
};

function cleanMdxLine(line: string) {
  return normalizeWhitespace(
    line
      .replace(/`([^`]+)`/g, "$1")
      .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
      .replace(/<[^>]+>/g, " ")
      .replace(/[>*_~|]/g, " "),
  );
}

function createContextualMdxSnippet({
  currentHeading,
  currentLeadIn,
  text,
}: {
  currentHeading: string;
  currentLeadIn: string;
  text: string;
}) {
  if (text.length >= 72) {
    return text;
  }

  if (currentLeadIn) {
    return `${currentLeadIn} ${text}`;
  }

  if (currentHeading) {
    return `${currentHeading}: ${text}`;
  }

  return text;
}

export function mdxToSearchFragments(source: string): MdxSearchFragment[] {
  const sourceWithoutCodeBlocks = source.replace(/```[\s\S]*?```/g, "\n");
  const fragments: MdxSearchFragment[] = [];
  let currentHeading = "";
  let currentLeadIn = "";

  for (const rawLine of sourceWithoutCodeBlocks.split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);

    if (headingMatch?.[2]) {
      currentHeading = cleanMdxLine(headingMatch[2]);
      currentLeadIn = "";

      if (currentHeading) {
        fragments.push({ searchText: currentHeading, snippet: currentHeading });
      }

      continue;
    }

    const listItemMatch = /^(?:[-*]|\d+\.)\s+(.+)$/.exec(line);

    if (listItemMatch?.[1]) {
      const listItem = cleanMdxLine(listItemMatch[1]);

      if (!listItem) {
        continue;
      }

      fragments.push({
        searchText: `${currentHeading} ${currentLeadIn} ${listItem}`,
        snippet: createContextualMdxSnippet({
          currentHeading,
          currentLeadIn,
          text: listItem,
        }),
      });
      continue;
    }

    for (const sentence of splitSentenceFragments(cleanMdxLine(line))) {
      const contextualSnippet =
        sentence.length < 72 && currentHeading ? `${currentHeading}: ${sentence}` : sentence;

      fragments.push({
        searchText: `${currentHeading} ${sentence}`,
        snippet: contextualSnippet,
      });
    }

    if (line.endsWith(":")) {
      currentLeadIn = cleanMdxLine(line);
    } else {
      currentLeadIn = "";
    }
  }

  return fragments.flatMap((fragment) =>
    splitLongFragment(fragment.snippet).map((snippet) => ({
      searchText: normalizeWhitespace(fragment.searchText),
      snippet,
    })),
  );
}

function getLessonIdFromMdxPath(path: string) {
  const pathWithoutQuery = path.split("?")[0] ?? path;
  const fileName = pathWithoutQuery.split("/").pop() ?? "";
  const stem = fileName.replace(/\.mdx$/, "");
  const lessonSlug = lessonSlugAliases[stem] ?? stem;

  return `lesson-${lessonSlug}`;
}

function getRawMdxText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "default" in value &&
    typeof value.default === "string"
  ) {
    return value.default;
  }

  return "";
}

function createLessonMdxFragmentsById(modules: Record<string, unknown>, locale: Locale) {
  return Object.fromEntries(
    Object.entries(modules)
      .filter(([path]) => (locale === "en" ? path.includes("/en/") : !path.includes("/en/")))
      .map(([path, rawMdx]) => [path, getRawMdxText(rawMdx)] as const)
      .filter(([, rawMdx]) => rawMdx.length > 0)
      .map(([path, rawMdx]) => [getLessonIdFromMdxPath(path), mdxToSearchFragments(rawMdx)]),
  ) as Partial<Record<string, MdxSearchFragment[]>>;
}

const lessonMdxFragmentsByLocaleAndId: Record<
  Locale,
  Partial<Record<string, MdxSearchFragment[]>>
> = {
  en: createLessonMdxFragmentsById(lessonMdxRawByPath, "en"),
  id: createLessonMdxFragmentsById(lessonMdxRawByPath, "id"),
};

function collectExerciseTextFragments(exercise: LessonExercise) {
  const fragments = [exercise.prompt];

  if (exercise.type === "multiple-choice") {
    fragments.push(...exercise.options.map((option) => option.label));
  }

  if (exercise.type === "ordered-steps") {
    fragments.push(...exercise.steps.map((step) => step.label));
  }

  if (exercise.type === "open-dataset-source") {
    fragments.push(
      exercise.introTitle,
      ...exercise.introParagraphs,
      exercise.taskTitle,
      exercise.taskDescription,
      ...(exercise.taskSteps ?? []),
      exercise.urlLabel,
      exercise.notesLabel,
      ...exercise.sourceInputs.flatMap((sourceInput) => [
        sourceInput.label,
        sourceInput.description,
        sourceInput.urlPlaceholder,
        sourceInput.notesPlaceholder,
      ]),
    );
  }

  if (exercise.type === "guided-download") {
    fragments.push(
      exercise.introTitle,
      ...exercise.introParagraphs,
      exercise.taskTitle,
      exercise.taskDescription,
      ...exercise.taskSteps,
      exercise.sourceLinkLabel,
      exercise.uploadLabel,
      exercise.uploadDescription,
      exercise.codeLabel,
      exercise.codePlaceholder,
      exercise.missingSourceMessage,
    );
  }

  if (exercise.type === "table-column-role-assignment") {
    fragments.push(exercise.datasetContext, exercise.instruction);
  }

  return fragments.flatMap((fragment) => createTextFragments(fragment));
}

function createLearningSearchDocument(
  baseDocument: Omit<
    LearningSearchDocument,
    "id" | "searchText" | "section" | "sectionLabel" | "snippet"
  >,
  section: LearningSearchDocumentSection,
  sectionLabel: string,
  snippet: string,
  index: number,
  searchText = snippet,
): LearningSearchDocument {
  return {
    ...baseDocument,
    id: `${baseDocument.lessonId}:${section}:${index}`,
    searchText,
    section,
    sectionLabel,
    snippet,
  };
}

function getSectionLabel(section: LearningSearchDocumentSection, locale: Locale) {
  const labels = {
    en: {
      alias: "Keyword",
      content: "Lesson content",
      exercise: "Exercise",
      objective: "Objective",
      summary: "Summary",
      title: "Title",
    },
    id: {
      alias: "Keyword",
      content: "Materi lesson",
      exercise: "Latihan",
      objective: "Tujuan",
      summary: "Ringkasan",
      title: "Judul",
    },
  } satisfies Record<Locale, Record<LearningSearchDocumentSection, string>>;

  return labels[locale][section];
}

export function createLearningSearchDocuments({
  lessonAccessById = {},
  lessons,
  locale,
  modules,
  track,
}: CreateLearningSearchDocumentsOptions) {
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const moduleById = new Map(modules.map((module) => [module.id, module]));
  const documents: LearningSearchDocument[] = [];

  for (const [moduleOrder, moduleId] of track.moduleIds.entries()) {
    const module = moduleById.get(moduleId);

    if (!module) {
      continue;
    }

    const localizedModule = localizeModule(module, locale);

    for (const [lessonOrderInModule, lessonId] of module.lessonIds.entries()) {
      const lesson = lessonById.get(lessonId);

      if (!lesson) {
        continue;
      }

      const localizedLesson = localizeLesson(lesson, locale);
      const lessonOrder = moduleOrder * 100 + lessonOrderInModule;
      const baseDocument = {
        accessState: lessonAccessById[lesson.id] ?? "unlocked",
        href: `/learn/${track.id}/${lesson.id}`,
        lessonId: lesson.id,
        lessonOrder,
        lessonTitle: localizedLesson.title,
        moduleId: module.id,
        moduleOrder,
        moduleTitle: localizedModule.title,
        numberLabel: localizedLesson.numberLabel,
      };
      let sectionIndex = 0;

      documents.push(
        createLearningSearchDocument(
          baseDocument,
          "title",
          getSectionLabel("title", locale),
          localizedLesson.title,
          sectionIndex,
          `${localizedLesson.title} ${localizedModule.title} ${localizedLesson.numberLabel}`,
        ),
      );
      sectionIndex += 1;

      documents.push(
        createLearningSearchDocument(
          baseDocument,
          "objective",
          getSectionLabel("objective", locale),
          localizedLesson.objective,
          sectionIndex,
        ),
      );
      sectionIndex += 1;

      for (const summaryItem of localizedLesson.summary) {
        documents.push(
          createLearningSearchDocument(
            baseDocument,
            "summary",
            getSectionLabel("summary", locale),
            summaryItem,
            sectionIndex,
          ),
        );
        sectionIndex += 1;
      }

      const lessonExercises = localizedLesson.exercises ?? [localizedLesson.exercise];

      for (const exercise of lessonExercises) {
        for (const exerciseFragment of collectExerciseTextFragments(exercise)) {
          documents.push(
            createLearningSearchDocument(
              baseDocument,
              "exercise",
              getSectionLabel("exercise", locale),
              exerciseFragment,
              sectionIndex,
            ),
          );
          sectionIndex += 1;
        }
      }

      const lessonMdxFragments = lessonMdxFragmentsByLocaleAndId[locale][lesson.id];

      if (lessonMdxFragments) {
        for (const contentFragment of lessonMdxFragments) {
          documents.push(
            createLearningSearchDocument(
              baseDocument,
              "content",
              getSectionLabel("content", locale),
              contentFragment.snippet,
              sectionIndex,
              contentFragment.searchText,
            ),
          );
          sectionIndex += 1;
        }
      }

      const aliases = lessonSearchAliasesByLessonId[lesson.id];

      if (aliases) {
        const aliasSnippet = aliases.includes("eda")
          ? `${localizedLesson.title} (EDA)`
          : localizedLesson.title;

        documents.push(
          createLearningSearchDocument(
            baseDocument,
            "alias",
            getSectionLabel("alias", locale),
            aliasSnippet,
            sectionIndex,
            `${aliases.join(" ")} ${localizedLesson.title} ${localizedLesson.summary.join(" ")}`,
          ),
        );
      }
    }
  }

  return documents;
}

function compareLearningSearchResultOrder(
  firstResult: LearningSearchResult,
  secondResult: LearningSearchResult,
) {
  return (
    secondResult.score - firstResult.score ||
    firstResult.moduleOrder - secondResult.moduleOrder ||
    firstResult.lessonOrder - secondResult.lessonOrder
  );
}

function getAccessStateMultiplier(accessState: LearningSearchAccessState) {
  if (accessState === "unlocked") {
    return 1.5;
  }

  if (accessState === "locked") {
    return 0.75;
  }

  return 0.35;
}

function getQueryMatchMultiplier(result: LearningSearchResult, normalizedQuery: string) {
  const queryTerms = tokenizeLearningSearchText(normalizedQuery);

  if (queryTerms.length === 0) {
    return 1;
  }

  const searchableText = normalizeLearningSearchText(
    `${result.lessonTitle} ${result.moduleTitle} ${result.sectionLabel} ${result.snippet}`,
  );

  if (normalizedQuery.length > 0 && searchableText.includes(normalizedQuery)) {
    return 2.25;
  }

  if (queryTerms.length > 1 && queryTerms.every((term) => searchableText.includes(term))) {
    return 1.45;
  }

  return 1;
}

function adjustLearningSearchResultScore(
  result: LearningSearchResult,
  normalizedQuery: string,
): LearningSearchResult {
  return {
    ...result,
    score:
      result.score *
      getAccessStateMultiplier(result.accessState) *
      getQueryMatchMultiplier(result, normalizedQuery),
  };
}

function toLearningSearchResult(result: StoredLearningSearchResult): LearningSearchResult {
  return {
    accessState: result.accessState,
    href: result.href,
    lessonId: result.lessonId,
    lessonOrder: result.lessonOrder,
    lessonTitle: result.lessonTitle,
    moduleId: result.moduleId,
    moduleOrder: result.moduleOrder,
    moduleTitle: result.moduleTitle,
    numberLabel: result.numberLabel,
    queryTerms: result.queryTerms,
    score: result.score,
    section: result.section,
    sectionLabel: result.sectionLabel,
    snippet: result.snippet,
    terms: result.terms,
  };
}

export function createLearningSearchIndex(
  options: CreateLearningSearchDocumentsOptions,
): LearningSearchIndex {
  const documents = createLearningSearchDocuments(options);
  const miniSearch = new MiniSearch<LearningSearchDocument>({
    fields: ["lessonTitle", "moduleTitle", "numberLabel", "searchText", "sectionLabel", "snippet"],
    processTerm: processLearningSearchTerm,
    searchOptions: {
      boost: {
        lessonTitle: 5,
        moduleTitle: 2,
        numberLabel: 2,
        searchText: 2.5,
        sectionLabel: 0.5,
        snippet: 1.5,
      },
      boostDocument: (_documentId, _term, storedFields) =>
        storedFields?.section === "alias" ? 4 : 1,
      combineWith: "OR",
      fuzzy: (term) => (term.length >= 5 ? 0.18 : false),
      maxFuzzy: 1,
      prefix: (term) => term.length >= 4,
      weights: { fuzzy: 0.25, prefix: 0.65 },
    },
    storeFields: [
      "href",
      "lessonId",
      "lessonOrder",
      "lessonTitle",
      "moduleId",
      "moduleOrder",
      "moduleTitle",
      "numberLabel",
      "accessState",
      "searchText",
      "section",
      "sectionLabel",
      "snippet",
    ],
    tokenize: tokenizeLearningSearchText,
  });

  miniSearch.addAll(documents);

  return {
    documents,
    search(query, { limit = 8 } = {}) {
      const normalizedQuery = normalizeLearningSearchText(query);

      if (tokenizeLearningSearchText(normalizedQuery).length === 0) {
        return [];
      }

      const bestResultByLessonId = new Map<string, LearningSearchResult>();
      const rawResults = miniSearch.search(normalizedQuery) as StoredLearningSearchResult[];

      for (const rawResult of rawResults) {
        const result = adjustLearningSearchResultScore(
          toLearningSearchResult(rawResult),
          normalizedQuery,
        );
        const previousResult = bestResultByLessonId.get(result.lessonId);

        if (!previousResult || compareLearningSearchResultOrder(result, previousResult) < 0) {
          bestResultByLessonId.set(result.lessonId, result);
        }
      }

      return Array.from(bestResultByLessonId.values())
        .sort(compareLearningSearchResultOrder)
        .slice(0, limit);
    },
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getLearningSearchHighlightParts(snippet: string, query: string) {
  const terms = tokenizeLearningSearchText(query)
    .sort((firstTerm, secondTerm) => secondTerm.length - firstTerm.length)
    .map(escapeRegExp);

  if (terms.length === 0) {
    return [{ isMatch: false, text: snippet }];
  }

  const matcher = new RegExp(`(${terms.join("|")})`, "giu");
  const parts: Array<{ isMatch: boolean; text: string }> = [];
  let lastIndex = 0;

  for (const match of snippet.matchAll(matcher)) {
    const matchText = match[0];
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      parts.push({ isMatch: false, text: snippet.slice(lastIndex, matchIndex) });
    }

    parts.push({ isMatch: true, text: matchText });
    lastIndex = matchIndex + matchText.length;
  }

  if (lastIndex < snippet.length) {
    parts.push({ isMatch: false, text: snippet.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ isMatch: false, text: snippet }];
}
