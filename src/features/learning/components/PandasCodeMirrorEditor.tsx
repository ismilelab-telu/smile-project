import { indentMore } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { linter } from "@codemirror/lint";
import { Compartment, EditorState, Prec, type Extension } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  GutterMarker,
  gutter,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { minimalSetup } from "codemirror";
import { useEffect, useMemo, useRef } from "react";

import {
  createCodeMirrorDiagnostics,
  getSmartPredictionCompletionIndex,
  getVisualPredictionCompletionIndex,
  type CodeDiagnostic,
} from "./pandas-code-editor-utils";

const pandasCodeHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#e11d48", fontWeight: "600" },
  { tag: [tags.string, tags.special(tags.string)], color: "#059669" },
  { tag: [tags.number, tags.bool, tags.null], color: "#0284c7" },
  { tag: [tags.operator, tags.punctuation], color: "#64748b" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "#0284c7" },
  { tag: [tags.comment, tags.docComment], color: "#737373", fontStyle: "italic" },
  { tag: tags.className, color: "#b45309" },
  { tag: tags.variableName, color: "#171717" },
]);

const pandasCodeEditorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#ffffff",
      color: "#171717",
      fontFamily: "var(--font-mono)",
      fontSize: "14px",
    },
    "&.cm-focused": {
      outline: "none",
    },
    ".cm-activeLine": {
      backgroundColor: "transparent",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#f5f5f5",
      color: "#404040",
    },
    ".cm-content": {
      caretColor: "#171717",
      minHeight: "8rem",
      padding: "12px 16px",
    },
    ".cm-cursor": {
      borderLeftColor: "#171717",
      borderLeftWidth: "2px",
    },
    ".cm-gutters": {
      backgroundColor: "#fafafa",
      borderRight: "1px solid #d4d4d4",
      color: "#737373",
    },
    ".cm-line": {
      padding: "0 0 0 12px",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 12px 0 14px",
    },
    ".cm-matchingBracket": {
      backgroundColor: "rgba(14, 165, 233, 0.18)",
      outline: "1px solid rgba(14, 165, 233, 0.4)",
    },
    ".cm-panels": {
      backgroundColor: "#fafafa",
      color: "#171717",
    },
    ".cm-scroller": {
      fontFamily: "var(--font-mono)",
      lineHeight: "1.5rem",
      overflow: "auto",
    },
    ".cm-selectionBackground": {
      backgroundColor: "rgba(14, 165, 233, 0.32) !important",
    },
  },
  { dark: false },
);

class PandasPredictionWidget extends WidgetType {
  constructor(private readonly predictionText: string) {
    super();
  }

  eq(widget: PandasPredictionWidget) {
    return widget.predictionText === this.predictionText;
  }

  toDOM() {
    const element = document.createElement("span");
    element.className = "cm-pandas-prediction";
    element.textContent = this.predictionText;

    return element;
  }

  ignoreEvent() {
    return true;
  }
}

const pandasCodeDiagnosticGutterMarker = new (class extends GutterMarker {
  toDOM() {
    const element = document.createElement("span");
    element.className = "cm-pandas-diagnostic-marker";

    return element;
  }
})();

function createPandasDiagnosticGutter(diagnostics: CodeDiagnostic[]) {
  return gutter({
    class: "cm-pandas-diagnostic-gutter",
    lineMarker: (view, line) =>
      diagnostics.some((diagnostic) => {
        const lineNumber = Math.max(1, Math.min(view.state.doc.lines, diagnostic.line));

        return view.state.doc.line(lineNumber).from === line.from;
      })
        ? pandasCodeDiagnosticGutterMarker
        : null,
  });
}

function createPandasPredictionExtension(expectedCode: string, isDisabled: boolean) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = getPandasPredictionDecorations(view, expectedCode, isDisabled);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = getPandasPredictionDecorations(update.view, expectedCode, isDisabled);
        }
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
    },
  );
}

function getPandasPredictionDecorations(
  view: EditorView,
  expectedCode: string,
  isDisabled: boolean,
) {
  if (isDisabled) {
    return Decoration.set([]);
  }

  const selection = view.state.selection.main;
  const code = view.state.doc.toString();

  if (!selection.empty || selection.from !== code.length) {
    return Decoration.set([]);
  }

  const expectedCompletionIndex = getVisualPredictionCompletionIndex(expectedCode, code);

  if (expectedCompletionIndex === null || expectedCompletionIndex >= expectedCode.length) {
    return Decoration.set([]);
  }

  return Decoration.set([
    Decoration.widget({
      side: 1,
      widget: new PandasPredictionWidget(expectedCode.slice(expectedCompletionIndex)),
    }).range(view.state.doc.length),
  ]);
}

function acceptPandasPrediction(view: EditorView, expectedCode: string, isDisabled: boolean) {
  if (isDisabled) {
    return false;
  }

  const code = view.state.doc.toString();
  const selection = view.state.selection.main;
  const expectedCompletionIndex = getSmartPredictionCompletionIndex(expectedCode, code);

  if (
    !selection.empty ||
    selection.from !== code.length ||
    expectedCompletionIndex === null ||
    expectedCompletionIndex >= expectedCode.length
  ) {
    return false;
  }

  view.dispatch({
    changes: {
      from: 0,
      insert: expectedCode,
      to: view.state.doc.length,
    },
    scrollIntoView: true,
    selection: {
      anchor: expectedCode.length,
    },
  });

  return true;
}

function getCodeMirrorEditableExtensions(isDisabled: boolean): Extension[] {
  return [EditorState.readOnly.of(isDisabled), EditorView.editable.of(!isDisabled)];
}

function createCodeMirrorLinter(diagnostics: CodeDiagnostic[]) {
  return linter((view) => createCodeMirrorDiagnostics(view.state, diagnostics), {
    delay: 0,
  });
}

export function PandasCodeMirrorEditor({
  ariaLabel,
  diagnostics,
  disabled,
  expectedCode,
  onChange,
  readOnly,
  value,
}: {
  ariaLabel: string;
  diagnostics: CodeDiagnostic[];
  disabled: boolean;
  expectedCode: string;
  onChange: (value: string) => void;
  readOnly: boolean;
  value: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const editableCompartmentRef = useRef(new Compartment());
  const gutterCompartmentRef = useRef(new Compartment());
  const linterCompartmentRef = useRef(new Compartment());
  const predictionCompartmentRef = useRef(new Compartment());
  const isDisabled = disabled || readOnly;
  const diagnosticsKey = useMemo(
    () =>
      diagnostics
        .map(
          (diagnostic) =>
            `${diagnostic.line}:${diagnostic.column}:${diagnostic.length}:${diagnostic.message}`,
        )
        .join("\n"),
    [diagnostics],
  );
  const editorPropsRef = useRef({
    expectedCode,
    isDisabled,
    onChange,
  });

  useEffect(() => {
    editorPropsRef.current = {
      expectedCode,
      isDisabled,
      onChange,
    };
  }, [expectedCode, isDisabled, onChange]);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return;
    }

    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: value,
        extensions: [
          minimalSetup,
          lineNumbers(),
          highlightActiveLineGutter(),
          python(),
          syntaxHighlighting(pandasCodeHighlightStyle),
          pandasCodeEditorTheme,
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({
            "aria-label": ariaLabel,
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              editorPropsRef.current.onChange(update.state.doc.toString());
            }
          }),
          Prec.high(
            keymap.of([
              {
                key: "Tab",
                run: (editorView) =>
                  acceptPandasPrediction(
                    editorView,
                    editorPropsRef.current.expectedCode,
                    editorPropsRef.current.isDisabled,
                  ) || indentMore(editorView),
              },
            ]),
          ),
          editableCompartmentRef.current.of(getCodeMirrorEditableExtensions(isDisabled)),
          gutterCompartmentRef.current.of(createPandasDiagnosticGutter(diagnostics)),
          linterCompartmentRef.current.of(createCodeMirrorLinter(diagnostics)),
          predictionCompartmentRef.current.of(
            createPandasPredictionExtension(expectedCode, isDisabled),
          ),
        ],
      }),
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;

    if (!view) {
      return;
    }

    const currentValue = view.state.doc.toString();

    if (currentValue !== value) {
      view.dispatch({
        changes: {
          from: 0,
          insert: value,
          to: currentValue.length,
        },
      });
    }
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;

    if (!view) {
      return;
    }

    view.dispatch({
      effects: [
        editableCompartmentRef.current.reconfigure(getCodeMirrorEditableExtensions(isDisabled)),
        gutterCompartmentRef.current.reconfigure(createPandasDiagnosticGutter(diagnostics)),
        linterCompartmentRef.current.reconfigure(createCodeMirrorLinter(diagnostics)),
        predictionCompartmentRef.current.reconfigure(
          createPandasPredictionExtension(expectedCode, isDisabled),
        ),
      ],
    });
  }, [diagnostics, diagnosticsKey, expectedCode, isDisabled]);

  return <div className="lesson-code-mirror" ref={hostRef} />;
}
