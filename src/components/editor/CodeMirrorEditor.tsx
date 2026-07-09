import { useEffect, useRef } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
} from "@codemirror/view";
import {
  foldGutter,
  indentOnInput,
  indentUnit,
  bracketMatching,
  foldKeymap,
} from "@codemirror/language";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from "@codemirror/autocomplete";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { vscodeSearch } from "./cm/search-panel";
import { vim } from "@replit/codemirror-vim";

import { editorTheme } from "./cm/theme";
import { latexCompletions, slashCompletions } from "./cm/latex";
import { languageForPath } from "./cm/languages";
import { setEditorView } from "./cm/controller";
import { spellLintExtensions, refreshEditorLints } from "./cm/spellcheck";
import { useDictionary } from "@/lib/dictionary";
import { mathHover } from "./cm/math-preview";
import { createLatexLinter } from "./cm/latex-linter";
import { createPreflightLinter } from "./cm/preflight-linter";
import { codeIntel } from "./cm/code-intel";
import { hoverIntel } from "./cm/hover-intel";
import { latexFolding } from "./cm/latex-folding";
import { inlineDiffPlugin } from "./cm/inline-ai/plugin";
import { toggleInlineEdit } from "./cm/inline-ai/openSession";
import { useFilesStore, useActiveContent } from "@/store/files";
import { useSettingsStore } from "@/store/settings";

export function CodeMirrorEditor() {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const vimCompartmentRef = useRef<Compartment | null>(null);
  const spellCompartmentRef = useRef<Compartment | null>(null);
  const langCompartmentRef = useRef<Compartment | null>(null);
  const historyCompartmentRef = useRef<Compartment | null>(null);
  const prevPathRef = useRef<string | null>(null);
  const suppressSyncRef = useRef(false);

  const activePath = useFilesStore((s) => s.activePath);
  const activeContent = useActiveContent();
  const docVersion = useFilesStore((s) => s.docVersion);
  const setContent = useFilesStore((s) => s.setContent);
  const vimEnabled = useSettingsStore((s) => s.vim);
  const spellcheck = useSettingsStore((s) => s.spellcheck);
  const harper = useSettingsStore((s) => s.harper);
  const showRegionalism = useSettingsStore((s) => s.showRegionalism);
  const showWordChoice = useSettingsStore((s) => s.showWordChoice);
  const dictGlobal = useDictionary((s) => s.global);
  const dictIgnored = useDictionary((s) => s.ignored);

  // Create the editor once.
  useEffect(() => {
    if (!hostRef.current) return;
    const initial = useFilesStore.getState();
    const initialPath = initial.activePath;
    const initialContent = initialPath
      ? initial.files[initialPath]?.content ?? ""
      : "";
    const vimCompartment = new Compartment();
    vimCompartmentRef.current = vimCompartment;
    const spellCompartment = new Compartment();
    spellCompartmentRef.current = spellCompartment;
    const langCompartment = new Compartment();
    langCompartmentRef.current = langCompartment;
    const historyCompartment = new Compartment();
    historyCompartmentRef.current = historyCompartment;
    prevPathRef.current = initialPath;
    const initialSpell = useSettingsStore.getState().spellcheck;
    const initialHarper = useSettingsStore.getState().harper;
    const initialLang = initialPath ? languageForPath(initialPath) : null;

    const state = EditorState.create({
      doc: initialContent,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        foldGutter({ openText: "▾", closedText: "▸" }),
        latexFolding(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        indentUnit.of("    "),
        bracketMatching(),
        closeBrackets(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        EditorView.lineWrapping,
        langCompartment.of(initialLang ? initialLang : []),
        editorTheme(),
        historyCompartment.of(history()),
        autocompletion({
          override: [latexCompletions, slashCompletions],
          activateOnTyping: true,
          closeOnBlur: true,
        }),
        vscodeSearch(),
        mathHover(),
        createLatexLinter(),
        createPreflightLinter(),
        codeIntel(),
        hoverIntel(),
        inlineDiffPlugin,
        keymap.of([
          { key: "Mod-l", run: (v) => { toggleInlineEdit(v); return true; } },
          indentWithTab,
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
        ]),
        vimCompartment.of(vimEnabled ? vim() : []),
        spellCompartment.of(
          initialSpell || initialHarper
            ? spellLintExtensions({ spell: initialSpell, harper: initialHarper })
            : []
        ),
        EditorView.updateListener.of((vu) => {
          if (vu.docChanged && !suppressSyncRef.current) {
            const path = useFilesStore.getState().activePath;
            if (path) setContent(path, vu.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    setEditorView(view);
    view.focus();

    return () => {
      view.destroy();
      setEditorView(null);
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the active file changes (or a version is restored), swap the document.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !activePath) return;
    const pathChanged = prevPathRef.current !== activePath;
    suppressSyncRef.current = true;
    const current = view.state.doc.toString();
    const lang = languageForPath(activePath);
    const effects = [langCompartmentRef.current!.reconfigure(lang ? lang : [])];
    // Drop the undo history when moving to a different file, so undo/redo never
    // crosses file boundaries (a change from file A must not replay into file B).
    if (pathChanged) {
      effects.push(historyCompartmentRef.current!.reconfigure([]));
    }
    if (current !== activeContent) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: activeContent },
        effects,
      });
    } else {
      view.dispatch({ effects });
    }
    // Re-install a fresh, empty history for the new file.
    if (pathChanged) {
      view.dispatch({ effects: historyCompartmentRef.current!.reconfigure(history()) });
    }
    prevPathRef.current = activePath;
    queueMicrotask(() => {
      suppressSyncRef.current = false;
    });
    view.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath, docVersion]);

  // Toggle vim without recreating the editor.
  useEffect(() => {
    const view = viewRef.current;
    const compartment = vimCompartmentRef.current;
    if (!view || !compartment) return;
    view.dispatch({
      effects: compartment.reconfigure(vimEnabled ? vim() : []),
    });
  }, [vimEnabled]);

  // Toggle spellcheck / Harper grammar without recreating the editor.
  useEffect(() => {
    const view = viewRef.current;
    const compartment = spellCompartmentRef.current;
    if (!view || !compartment) return;
    view.dispatch({
      effects: compartment.reconfigure(
        spellcheck || harper
          ? spellLintExtensions({ spell: spellcheck, harper })
          : []
      ),
    });
  }, [spellcheck, harper]);

  // Re-lint when the ignore dictionary or lint-category mutes change (e.g. the
  // user un-ignores a word or toggles a category in Settings).
  useEffect(() => {
    refreshEditorLints(viewRef.current);
  }, [showRegionalism, showWordChoice, dictGlobal, dictIgnored]);

  return <div ref={hostRef} className="h-full overflow-auto" />;
}
