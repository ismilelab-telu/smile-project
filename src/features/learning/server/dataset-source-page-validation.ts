import type {
  DatasetSourcePageValidationResult,
  DatasetSourcePageValidationStatus,
} from "../types";

type ValidationLocale = "id" | "en";

type DatasetSourcePageValidationInput = {
  id: string;
  label?: string;
  notes?: string;
  url: string;
};

type DatasetSourcePageValidationRequestBody = {
  locale?: ValidationLocale;
  sources?: DatasetSourcePageValidationInput[];
};

type DatasetSourcePageValidationResponseBody = {
  results: DatasetSourcePageValidationResult[];
};

const maxRequestCharacters = 16_384;
const maxSourcesPerRequest = 5;
const maxResponseBytes = 96_000;
const fetchTimeoutMs = 8_000;

const signalPatterns = [
  {
    id: "dataset",
    label: { en: "dataset signal", id: "sinyal dataset" },
    pattern: /\b(data\s*set|dataset|data card|data table)\b/i,
  },
  {
    id: "download",
    label: { en: "download or file signal", id: "sinyal download atau file" },
    pattern: /\b(download|csv|xlsx|json|parquet|api)\b/i,
  },
  {
    id: "license",
    label: { en: "license signal", id: "sinyal lisensi" },
    pattern: /\b(license|licence|lisensi|permission|usage)\b/i,
  },
  {
    id: "period",
    label: { en: "period signal", id: "sinyal periode" },
    pattern: /\b(20\d{2}|period|date|time|daily|monthly|year|tanggal|periode)\b/i,
  },
  {
    id: "cafe",
    label: { en: "cafe domain signal", id: "sinyal domain kafe" },
    pattern: /\b(coffee|cafe|café|shop|restaurant|sales|transaction|order)\b/i,
  },
  {
    id: "kaggle",
    label: { en: "Kaggle source signal", id: "sinyal sumber Kaggle" },
    pattern: /\bkaggle\b/i,
  },
] as const;

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

function getCopy(locale: ValidationLocale) {
  return {
    blockedUrl:
      locale === "en"
        ? "This URL is not allowed for automatic validation."
        : "URL ini tidak diizinkan untuk validasi otomatis.",
    fetchFailed:
      locale === "en"
        ? "The page could not be fetched automatically."
        : "Halaman tidak bisa dibaca otomatis.",
    invalidBody: locale === "en" ? "Invalid validation payload." : "Payload validasi tidak valid.",
    invalidUrl:
      locale === "en"
        ? "Use a complete HTTP or HTTPS URL."
        : "Gunakan URL HTTP atau HTTPS yang lengkap.",
    noReadableBody:
      locale === "en"
        ? "The page did not return readable text."
        : "Halaman tidak mengembalikan teks yang bisa dibaca.",
    weakDatasetSignal:
      locale === "en"
        ? "The page was reachable, but dataset signals are still weak."
        : "Halaman bisa dibaca, tetapi sinyal dataset masih lemah.",
  };
}

function isValidationLocale(value: unknown): value is ValidationLocale {
  return value === "id" || value === "en";
}

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "").replace(/\.$/, "");
}

function parseIpv4(hostname: string) {
  const parts = hostname.split(".");

  if (parts.length !== 4) {
    return null;
  }

  const numbers = parts.map((part) => Number(part));

  if (numbers.some((number) => !Number.isInteger(number) || number < 0 || number > 255)) {
    return null;
  }

  return numbers;
}

function isPrivateIpv4(hostname: string) {
  const parts = parseIpv4(hostname);

  if (!parts) {
    return false;
  }

  const [first, second] = parts;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isBlockedHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);

  return (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    isPrivateIpv4(normalized)
  );
}

function parsePublicHttpUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    if (isBlockedHostname(url.hostname)) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll(/&#x([\dA-Fa-f]+);/g, (_, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    )
    .replaceAll(/&#(\d+);/g, (_, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 10)),
    )
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function extractFirstMatch(html: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = pattern.exec(html);

    if (match?.[1]) {
      return decodeHtmlEntities(match[1].replaceAll(/\s+/g, " ").trim());
    }
  }

  return undefined;
}

function extractPageText(html: string) {
  return decodeHtmlEntities(
    html
      .replaceAll(/<script[\s\S]*?<\/script>/gi, " ")
      .replaceAll(/<style[\s\S]*?<\/style>/gi, " ")
      .replaceAll(/<[^>]+>/g, " ")
      .replaceAll(/\s+/g, " ")
      .trim(),
  );
}

function extractMetadata(html: string) {
  return {
    description: extractFirstMatch(html, [
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["'][^>]*>/i,
    ]),
    title: extractFirstMatch(html, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["'][^>]*>/i,
      /<title[^>]*>([^<]+)<\/title>/i,
    ]),
  };
}

async function readTextSnippet(response: Response) {
  const reader = response.body?.getReader();

  if (!reader) {
    return "";
  }

  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let totalBytes = 0;

  while (totalBytes < maxResponseBytes) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;
    chunks.push(decoder.decode(value, { stream: true }));

    if (totalBytes >= maxResponseBytes) {
      await reader.cancel();
      break;
    }
  }

  chunks.push(decoder.decode());

  return chunks.join("");
}

function collectSignals(content: string, locale: ValidationLocale) {
  return signalPatterns
    .filter((signal) => signal.pattern.test(content))
    .map((signal) => signal.label[locale]);
}

function createResult(input: {
  checkedAt?: string;
  description?: string;
  httpStatus?: number;
  issues?: string[];
  signals?: string[];
  sourceId: string;
  status: DatasetSourcePageValidationStatus;
  title?: string;
  url: string;
}): DatasetSourcePageValidationResult {
  return {
    checkedAt: input.checkedAt ?? new Date().toISOString(),
    description: input.description,
    httpStatus: input.httpStatus,
    issues: input.issues ?? [],
    signals: input.signals ?? [],
    sourceId: input.sourceId,
    status: input.status,
    title: input.title,
    url: input.url,
  };
}

export async function validateDatasetSourcePage(
  source: DatasetSourcePageValidationInput,
  locale: ValidationLocale = "id",
): Promise<DatasetSourcePageValidationResult> {
  const copy = getCopy(locale);
  const rawUrl = source.url.trim();
  const parsedUrl = parsePublicHttpUrl(rawUrl);

  if (!parsedUrl) {
    const hasHttpPrefix = /^https?:\/\//i.test(rawUrl);

    return createResult({
      issues: [hasHttpPrefix ? copy.blockedUrl : copy.invalidUrl],
      sourceId: source.id,
      status: "invalid",
      url: rawUrl,
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), fetchTimeoutMs);

  try {
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
        "user-agent": "SmileLearningDatasetValidator/1.0",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";

    if (!response.ok) {
      return createResult({
        httpStatus: response.status,
        issues: [`${copy.fetchFailed} HTTP ${response.status}.`],
        sourceId: source.id,
        status: "unreachable",
        url: parsedUrl.toString(),
      });
    }

    if (
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/xhtml")
    ) {
      return createResult({
        httpStatus: response.status,
        issues: [copy.noReadableBody],
        signals: [contentType],
        sourceId: source.id,
        status: "partial",
        url: parsedUrl.toString(),
      });
    }

    const html = await readTextSnippet(response);
    const metadata = extractMetadata(html);
    const pageText = extractPageText(html);
    const combinedContent = `${metadata.title ?? ""} ${metadata.description ?? ""} ${pageText}`;
    const signals = collectSignals(combinedContent, locale);

    return createResult({
      description: metadata.description,
      httpStatus: response.status,
      issues: signals.length >= 2 ? [] : [copy.weakDatasetSignal],
      signals,
      sourceId: source.id,
      status: signals.length >= 2 ? "valid" : "partial",
      title: metadata.title,
      url: parsedUrl.toString(),
    });
  } catch {
    return createResult({
      issues: [copy.fetchFailed],
      sourceId: source.id,
      status: "unreachable",
      url: parsedUrl.toString(),
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function isValidationSource(value: unknown): value is DatasetSourcePageValidationInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const source = value as Partial<DatasetSourcePageValidationInput>;

  return typeof source.id === "string" && typeof source.url === "string";
}

async function parseValidationRequest(request: Request) {
  const rawBody = await request.text();

  if (rawBody.length > maxRequestCharacters) {
    return null;
  }

  try {
    const body = JSON.parse(rawBody) as DatasetSourcePageValidationRequestBody;
    const locale = isValidationLocale(body.locale) ? body.locale : "id";
    const sources = Array.isArray(body.sources)
      ? body.sources.filter(isValidationSource).slice(0, maxSourcesPerRequest)
      : [];

    return { locale, sources };
  } catch {
    return null;
  }
}

export async function handleDatasetSourcePageValidationRequest(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        allow: "POST, OPTIONS",
      },
      status: 204,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  const parsedRequest = await parseValidationRequest(request);
  const locale = parsedRequest?.locale ?? "id";
  const copy = getCopy(locale);

  if (!parsedRequest || parsedRequest.sources.length === 0) {
    return jsonResponse({ error: copy.invalidBody }, { status: 400 });
  }

  const results = await Promise.all(
    parsedRequest.sources.map((source) => validateDatasetSourcePage(source, locale)),
  );
  const body: DatasetSourcePageValidationResponseBody = { results };

  return jsonResponse(body);
}
