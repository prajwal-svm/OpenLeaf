import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, FileText, List } from "lucide-react";
import { useActiveContent, useFilesStore } from "@/store/files";
import { gotoLine } from "@/components/editor/cm/controller";
import { readFileContent } from "@/lib/tauri";

interface OutlineItem {
  level: number;
  title: string;
  line: number;
  /** Project-relative file this entry lives in. */
  file: string;
  /** A structural heading, or an included file with no headings of its own. */
  kind: "section" | "file";
}

const PATTERNS: [number, RegExp][] = [
  [0, /^\s*\\part\*?\s*\{([^}]*)\}/],
  [1, /^\s*\\chapter\*?\s*\{([^}]*)\}/],
  [2, /^\s*\\section\*?\s*\{([^}]*)\}/],
  [3, /^\s*\\subsection\*?\s*\{([^}]*)\}/],
  [4, /^\s*\\subsubsection\*?\s*\{([^}]*)\}/],
  [5, /^\s*\\paragraph\*?\s*\{([^}]*)\}/],
];

const INPUT_RE = /^\s*\\(?:input|include)\s*\{([^}]*)\}/;

function dirname(p: string): string {
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(0, i) : "";
}
function basename(p: string): string {
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(i + 1) : p;
}
function joinInput(dir: string, rel: string): string {
  let r = rel.replace(/^\.\//, "").trim();
  if (r.startsWith("/")) r = r.slice(1);
  const resolved = dir ? `${dir}/${r}` : r;
  return /\.[^/\\]+$/.test(resolved) ? resolved : `${resolved}.tex`;
}

/**
 * Build a combined outline by walking `\input`/`\include` from the active file
 * into the included files (depth-limited, cycle-guarded). Sections appear in
 * document order; an include with no headings is listed as a file entry so the
 * pane is never mysteriously empty.
 */
async function buildOutline(
  projectId: string,
  activeFile: string,
  content: string
): Promise<OutlineItem[]> {
  const out: OutlineItem[] = [];
  const visited = new Set<string>();

  const walk = async (file: string, text: string, depth: number) => {
    if (depth > 4 || visited.has(file)) return;
    visited.add(file);
    const dir = dirname(file);
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      if (ln.trimStart().startsWith("%")) continue;
      for (const [level, re] of PATTERNS) {
        const m = ln.match(re);
        if (m) {
          out.push({ level, title: m[1].trim(), line: i + 1, file, kind: "section" });
          break;
        }
      }
      const im = ln.match(INPUT_RE);
      if (im) {
        const target = joinInput(dir, im[1]);
        try {
          const sub = await readFileContent(projectId, target);
          const before = out.length;
          await walk(target, sub, depth + 1);
          if (out.length === before) {
            // Included file has no headings - surface it as a clickable entry.
            out.push({ level: 2, title: basename(target), line: 1, file: target, kind: "file" });
          }
        } catch {
          /* missing/unreadable include - ignore */
        }
      }
    }
  };

  await walk(activeFile, content, 0);
  return out;
}

export function Outline() {
  const content = useActiveContent();
  const projectId = useFilesStore((s) => s.projectId);
  const activePath = useFilesStore((s) => s.activePath);
  const [collapsed, setCollapsed] = useState(false);
  const [items, setItems] = useState<OutlineItem[]>([]);

  useEffect(() => {
    if (!projectId || !activePath) {
      setItems([]);
      return;
    }
    let cancelled = false;
    // Debounce so typing in the body doesn't re-walk includes on every keystroke.
    const t = setTimeout(async () => {
      const result = await buildOutline(projectId, activePath, content);
      if (!cancelled) setItems(result);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [projectId, activePath, content]);

  const jump = (item: OutlineItem) => {
    const store = useFilesStore.getState();
    if (item.file && item.file !== store.activePath) {
      void store.openFile(item.file).then(() => {
        window.setTimeout(() => gotoLine(item.line), 80);
      });
    } else {
      gotoLine(item.line);
    }
  };

  return (
    <div className="flex shrink-0 flex-col border-t border-sidebar-border">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex h-8 items-center gap-1.5 px-3 text-xs font-medium uppercase tracking-wide text-sidebar-foreground/70 hover:bg-sidebar-accent"
      >
        {collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
        <List className="size-3.5" />
        Outline
      </button>
      {!collapsed && (
        <div className="max-h-[40vh] overflow-auto pb-2">
          {items.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-muted-foreground/70">
              No sections or includes found in this document.
            </p>
          ) : (
            items.map((item, i) => {
              const crossFile = item.file !== activePath;
              return (
                <button
                  key={i}
                  onClick={() => jump(item)}
                  className="flex w-full cursor-pointer items-center gap-1 truncate py-0.5 pr-2 text-left text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  style={{ paddingLeft: `${item.level * 12 + 12}px` }}
                  title={`${item.title} - ${item.file}:${item.line}`}
                >
                  {item.kind === "file" && <FileText className="size-3 shrink-0 text-muted-foreground" />}
                  <span className={item.kind === "file" ? "truncate text-muted-foreground" : "truncate"}>
                    {item.title}
                  </span>
                  {crossFile && (
                    <span className="ml-auto shrink-0 rounded bg-muted px-1 text-[9px] text-muted-foreground/70">
                      {basename(item.file)}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
