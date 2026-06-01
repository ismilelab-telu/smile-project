import type { Diagnostic as CodeMirrorDiagnostic } from "@codemirror/lint";
import type { EditorState } from "@codemirror/state";

export type CodeDiagnostic = {
  column: number;
  length: number;
  line: number;
  message: string;
};

const pythonIdentifierPattern = "[A-Za-z_][A-Za-z0-9_]*";

export function getTypedPandasAlias(code: string) {
  const normalizedCode = code.replace(/\r\n?/g, "\n");
  const match = new RegExp(
    `^\\s*import\\s+pandas\\s+as\\s+(${pythonIdentifierPattern})\\b`,
    "m",
  ).exec(normalizedCode);

  return getAllowedPythonIdentifier(match?.[1]);
}

export function getTypedDataframeName(code: string) {
  const normalizedCode = code.replace(/\r\n?/g, "\n");
  const match = new RegExp(`^\\s*(${pythonIdentifierPattern})\\s*=`, "m").exec(normalizedCode);

  return getAllowedPythonIdentifier(match?.[1]);
}

function getAllowedPythonIdentifier(identifier: string | undefined) {
  if (!identifier || identifier.startsWith("__")) {
    return null;
  }

  return identifier;
}

export function getSmartPredictionCompletionIndex(expectedCode: string, typedCode: string) {
  let expectedIndex = 0;
  let typedIndex = 0;

  while (typedIndex < typedCode.length) {
    const typedCharacter = typedCode[typedIndex] ?? "";

    if (isCodePredictionWhitespace(typedCharacter)) {
      while (
        typedIndex < typedCode.length &&
        isCodePredictionWhitespace(typedCode[typedIndex] ?? "")
      ) {
        typedIndex += 1;
      }

      if (isCodePredictionWhitespace(expectedCode[expectedIndex] ?? "")) {
        while (
          expectedIndex < expectedCode.length &&
          isCodePredictionWhitespace(expectedCode[expectedIndex] ?? "")
        ) {
          expectedIndex += 1;
        }
      }

      continue;
    }

    while (
      expectedIndex < expectedCode.length &&
      isCodePredictionWhitespace(expectedCode[expectedIndex] ?? "")
    ) {
      expectedIndex += 1;
    }

    if (expectedCode[expectedIndex] !== typedCharacter) {
      return null;
    }

    expectedIndex += 1;
    typedIndex += 1;
  }

  return expectedIndex;
}

export function getVisualPredictionCompletionIndex(expectedCode: string, typedCode: string) {
  const normalizedTypedCode = typedCode.replace(/\r\n?/g, "\n");
  let expectedIndex = 0;
  let typedIndex = 0;

  while (typedIndex < normalizedTypedCode.length) {
    const typedCharacter = normalizedTypedCode[typedIndex] ?? "";

    if (typedCharacter === "\n") {
      while (
        expectedIndex < expectedCode.length &&
        isHorizontalCodePredictionWhitespace(expectedCode[expectedIndex] ?? "")
      ) {
        expectedIndex += 1;
      }

      if (expectedCode[expectedIndex] !== "\n") {
        return null;
      }

      expectedIndex += 1;
      typedIndex += 1;
      continue;
    }

    if (isHorizontalCodePredictionWhitespace(typedCharacter)) {
      while (
        typedIndex < normalizedTypedCode.length &&
        isHorizontalCodePredictionWhitespace(normalizedTypedCode[typedIndex] ?? "")
      ) {
        typedIndex += 1;
      }

      while (
        expectedIndex < expectedCode.length &&
        isHorizontalCodePredictionWhitespace(expectedCode[expectedIndex] ?? "")
      ) {
        expectedIndex += 1;
      }

      continue;
    }

    while (
      expectedIndex < expectedCode.length &&
      isHorizontalCodePredictionWhitespace(expectedCode[expectedIndex] ?? "")
    ) {
      expectedIndex += 1;
    }

    if (expectedCode[expectedIndex] !== typedCharacter) {
      return null;
    }

    expectedIndex += 1;
    typedIndex += 1;
  }

  return expectedIndex;
}

function isCodePredictionWhitespace(character: string) {
  return character === " " || character === "\n" || character === "\t";
}

function isHorizontalCodePredictionWhitespace(character: string) {
  return character === " " || character === "\t";
}

export function createCodeMirrorDiagnostics(
  state: EditorState,
  diagnostics: CodeDiagnostic[],
): CodeMirrorDiagnostic[] {
  return diagnostics.map((diagnostic) => {
    const lineNumber = Math.max(1, Math.min(state.doc.lines, diagnostic.line));
    const line = state.doc.line(lineNumber);
    let from = Math.max(line.from, Math.min(line.to, line.from + diagnostic.column - 1));
    let to = Math.min(line.to, from + Math.max(1, diagnostic.length));

    if (to <= from) {
      if (from < state.doc.length) {
        to = from + 1;
      } else if (from > 0) {
        from -= 1;
        to = from + 1;
      }
    }

    return {
      from,
      message: diagnostic.message,
      renderMessage: () => createCodeMirrorDiagnosticMessage(diagnostic.message),
      severity: "error",
      to,
    };
  });
}

export function createCodeMirrorDiagnosticMessage(message: string) {
  const container = document.createElement("span");

  message.split(/(`[^`]+`)/g).forEach((part) => {
    const isInlineCode = part.length > 1 && part.startsWith("`") && part.endsWith("`");

    if (!isInlineCode) {
      container.append(document.createTextNode(part));
      return;
    }

    const code = document.createElement("code");
    code.textContent = part.slice(1, -1);
    container.append(code);
  });

  return container;
}
