import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { FileText, Search } from "lucide-react";
import { useSettingsStore } from "@/store/settings";
import { useFilesStore } from "@/store/files";
import { searchDocs, type SearchHit } from "@/lib/tauri";
import { gotoLine } from "@/components/editor/cm/controller";
import { cn } from "@/lib/utils";

function basename(p: string) {
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(i + 1) : p;
}

export function SearchOmnibar() {
  const open = useSettingsStore((s) => s.searchOpen);
  const setSearchOpen = useSettingsStore((s) => s.setSearchOpen);
  const openProject = useFilesStore((s) => s.openProject);
  const openFile = useFilesStore((s) => s.openFile);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounced search across all projects.
  useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        setHits(await searchDocs(query));
      } catch {
        setHits([]);
      }
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  // ⌘/Ctrl + Shift + F toggles global search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchOpen(!useSettingsStore.getState().searchOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearchOpen]);

  const openHit = async (hit: SearchHit) => {
    setSearchOpen(false);
    await openProject(hit.project_id);
    await openFile(hit.path);
    // Give the editor a tick to mount before jumping.
    window.setTimeout(() => gotoLine(hit.line), 120);
  };

  const reset = (next: boolean) => {
    if (!next) {
      setQuery("");
      setHits([]);
    }
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(v) => {
        setSearchOpen(v);
        reset(v);
      }}
      label="Search documents"
      className="fixed left-1/2 top-[20%] z-50 w-[min(640px,92vw)] -translate-x-1/2"
    >
      <div className="overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            autoFocus
            placeholder="Search across all documents…"
            className="flex h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <span className="shrink-0 text-xs text-muted-foreground">
            {loading ? "…" : hits.length > 0 ? `${hits.length}` : ""}
          </span>
        </div>
        <Command.List className="max-h-[min(60vh,420px)] overflow-auto p-1.5">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            {query.trim() ? "No matches found." : "Type to search every project."}
          </Command.Empty>
          {hits.map((hit, i) => (
            <Command.Item
              key={`${hit.project_id}:${hit.path}:${hit.line}:${i}`}
              value={`${hit.project_name} ${hit.path} ${hit.preview}`}
              onSelect={() => void openHit(hit)}
              className="flex cursor-pointer flex-col gap-0.5 rounded-md px-2.5 py-2 text-sm outline-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
            >
              <div className="flex items-center gap-2">
                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{basename(hit.path)}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {hit.project_name} · {hit.path} : {hit.line}
                </span>
              </div>
              <PreviewLine preview={hit.preview} query={query} />
            </Command.Item>
          ))}
        </Command.List>
      </div>
    </Command.Dialog>
  );
}

function PreviewLine({ preview, query }: { preview: string; query: string }) {
  if (!query.trim()) return <span className="truncate text-xs text-muted-foreground">{preview}</span>;
  const idx = preview.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0)
    return <span className="truncate font-mono text-xs text-muted-foreground">{preview}</span>;
  return (
    <span className={cn("truncate font-mono text-xs text-muted-foreground")}>
      {preview.slice(0, idx)}
      <mark className="rounded-sm bg-primary/25 px-0.5 text-foreground">
        {preview.slice(idx, idx + query.length)}
      </mark>
      {preview.slice(idx + query.length)}
    </span>
  );
}
