import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";

// In-memory fallback so the store also works where localStorage is absent
// (e.g. Node during tests) without changing behavior in the browser.
const memory = new Map<string, string>();
const memoryStorage: StateStorage = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => void memory.set(k, v),
  removeItem: (k) => void memory.delete(k),
};

/**
 * The "ignore" dictionary for the spell/grammar checkers. Any flagged word or
 * phrase the user dismisses — proper nouns, product names ("Spanner"),
 * identifiers ("L5"), or a style suggestion they disagree with — is remembered
 * and never flagged again. Words can be ignored just for one project or
 * everywhere. Persisted to the webview's localStorage so it survives restarts.
 */
interface DictionaryState {
  /** projectId -> ignored words (as written). */
  ignored: Record<string, string[]>;
  /** words ignored across every project. */
  global: string[];
  ignore: (projectId: string, word: string) => void;
  ignoreGlobal: (word: string) => void;
  unignore: (projectId: string, word: string) => void;
  unignoreGlobal: (word: string) => void;
  clear: (projectId: string) => void;
}

export const useDictionary = create<DictionaryState>()(
  persist(
    (set) => ({
      ignored: {},
      global: [],
      ignore: (projectId, word) =>
        set((s) => {
          const w = word.trim();
          if (!w) return s;
          const cur = s.ignored[projectId] ?? [];
          if (cur.includes(w)) return s;
          return { ignored: { ...s.ignored, [projectId]: [...cur, w] } };
        }),
      ignoreGlobal: (word) =>
        set((s) => {
          const w = word.trim();
          if (!w || s.global.includes(w)) return s;
          return { global: [...s.global, w] };
        }),
      unignore: (projectId, word) =>
        set((s) => ({
          ignored: {
            ...s.ignored,
            [projectId]: (s.ignored[projectId] ?? []).filter((x) => x !== word.trim()),
          },
        })),
      unignoreGlobal: (word) =>
        set((s) => ({ global: s.global.filter((x) => x !== word.trim()) })),
      clear: (projectId) =>
        set((s) => {
          const next = { ...s.ignored };
          delete next[projectId];
          return { ignored: next };
        }),
    }),
    {
      name: "openleaf.dictionary",
      storage: createJSONStorage(() =>
        typeof localStorage !== "undefined" ? localStorage : memoryStorage
      ),
    }
  )
);

/** Is `word` ignored — globally, or for this specific project? */
export function isWordIgnored(projectId: string | null, word: string): boolean {
  const w = word.trim();
  const s = useDictionary.getState();
  if (s.global.includes(w)) return true;
  if (projectId && (s.ignored[projectId] ?? []).includes(w)) return true;
  return false;
}

/** Ignore `word` for just this project. */
export function ignoreWordForProject(projectId: string | null, word: string): void {
  if (!projectId) return;
  useDictionary.getState().ignore(projectId, word);
}

/** Ignore `word` across all projects. */
export function ignoreWordGlobally(word: string): void {
  useDictionary.getState().ignoreGlobal(word);
}
