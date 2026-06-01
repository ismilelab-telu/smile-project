import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";

import {
  createCodeMirrorDiagnosticMessage,
  createCodeMirrorDiagnostics,
  getSmartPredictionCompletionIndex,
  getTypedDataframeName,
  getTypedPandasAlias,
  getVisualPredictionCompletionIndex,
} from "./pandas-code-editor-utils";

describe("pandas code editor utilities", () => {
  it("detects the typed Pandas alias and dataframe name", () => {
    expect(getTypedPandasAlias("import pandas as pan")).toBe("pan");
    expect(getTypedPandasAlias("  import pandas as pd\n")).toBe("pd");
    expect(getTypedPandasAlias("import pandas")).toBeNull();
    expect(getTypedPandasAlias("import pandas as __pd")).toBeNull();

    expect(getTypedDataframeName('data = pd.read_csv("data/file.csv")')).toBe("data");
    expect(getTypedDataframeName('  pan = pan.read_csv("data/file.csv")')).toBe("pan");
    expect(getTypedDataframeName('1df = pd.read_csv("data/file.csv")')).toBeNull();
    expect(getTypedDataframeName('__df = pd.read_csv("data/file.csv")')).toBeNull();
  });

  it("matches prediction prefixes while tolerating whitespace differences", () => {
    const expectedCode =
      'import pandas as pd\n\ndf = pd.read_csv("data/Food_Delivery_Times.csv")\ndf.head()';
    const typedCode = "import pandas as pd\n\n\tdf=";
    const completionIndex = getSmartPredictionCompletionIndex(expectedCode, typedCode);

    expect(completionIndex).not.toBeNull();
    expect(expectedCode.slice(completionIndex ?? 0)).toBe(
      ' pd.read_csv("data/Food_Delivery_Times.csv")\ndf.head()',
    );
  });

  it("rejects prediction prefixes after a real token mismatch", () => {
    const expectedCode =
      'import pandas as pd\n\ndf = pd.read_csv("data/Food_Delivery_Times.csv")\ndf.head()';

    expect(getSmartPredictionCompletionIndex(expectedCode, "import numpy as np")).toBeNull();
  });

  it("keeps expected newlines visible for visual predictions", () => {
    const expectedCode =
      'import pandas as pd\n\ndf = pd.read_csv("data/Food_Delivery_Times.csv")\ndf.head()';
    const completionIndex = getVisualPredictionCompletionIndex(
      expectedCode,
      "import pandas as pd ",
    );

    expect(completionIndex).not.toBeNull();
    expect(expectedCode.slice(completionIndex ?? 0)).toMatch(/^\n\ndf =/);
  });

  it("advances visual predictions after typed newlines", () => {
    const expectedCode =
      'import pandas as pd\n\ndf = pd.read_csv("data/Food_Delivery_Times.csv")\ndf.head()';
    const completionIndex = getVisualPredictionCompletionIndex(
      expectedCode,
      "import pandas as pd\n\n",
    );

    expect(completionIndex).not.toBeNull();
    expect(expectedCode.slice(completionIndex ?? 0)).toMatch(/^df =/);
  });

  it("maps backend diagnostics to CodeMirror document ranges", () => {
    const state = EditorState.create({
      doc: 'import pandas as pd\n\ndf = pd.read_csv("data/wrong.csv")\ndf.head()',
    });
    const line = state.doc.line(3);

    const [diagnostic] = createCodeMirrorDiagnostics(state, [
      {
        column: 6,
        length: 11,
        line: 3,
        message: "Only `pd.read_csv(...)` can load the CSV.",
      },
    ]);

    expect(diagnostic).toMatchObject({
      from: line.from + 5,
      message: "Only `pd.read_csv(...)` can load the CSV.",
      severity: "error",
      to: line.from + 16,
    });
  });

  it("keeps an end-of-line diagnostic visible", () => {
    const state = EditorState.create({ doc: "abc" });
    const [diagnostic] = createCodeMirrorDiagnostics(state, [
      {
        column: 4,
        length: 1,
        line: 1,
        message: "Put `df.head()` on the last line.",
      },
    ]);

    expect(diagnostic).toMatchObject({
      from: 2,
      to: 3,
    });
  });

  it("formats inline code inside diagnostic tooltip messages", () => {
    const message = createCodeMirrorDiagnosticMessage(
      "Only `df.head()` can produce output in this lesson runtime.",
    );

    expect(message.textContent).toBe("Only df.head() can produce output in this lesson runtime.");
    expect(message.querySelector("code")?.textContent).toBe("df.head()");
  });
});
