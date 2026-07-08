import { useEffect, type ReactNode } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { ThemeProvider } from "@/lib/theme";
import { TopToolbar } from "@/components/layout/TopToolbar";
import { Rail } from "@/components/layout/Rail";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { SearchOmnibar } from "@/components/layout/SearchOmnibar";
import { SettingsModal } from "@/components/layout/SettingsModal";
import { Editor } from "@/components/editor/Editor";
import { PreviewPane } from "@/components/preview/PreviewPane";
import { Library } from "@/components/library/Library";
import { WordCountModal } from "@/components/editor/WordCountModal";
import { HistoryModal } from "@/components/editor/HistoryModal";
import { HotkeysModal } from "@/components/editor/HotkeysModal";
import { useFilesStore, useActiveContent } from "@/store/files";
import { useCompileStore } from "@/store/compile";
import { useSettingsStore } from "@/store/settings";
import { useGitStatusStore } from "@/store/git-status";
import { useGithubStore } from "@/store/github";
import { forwardFromCursor } from "@/features/synctex";
import { checkForUpdatesOnStartup } from "@/lib/updater";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

/** A clearly-grabbable, visible vertical resize handle (12px hit area).
 *  Optionally renders a control cluster at the top/bottom (Overleaf-style),
 *  kept away from the centered grab thumb so it never fights the drag. */
function VHandle({
  id,
  children,
  placement = "center",
}: {
  id: string;
  children?: ReactNode;
  placement?: "top" | "center" | "bottom";
}) {
  return (
    <div className="relative flex w-3 shrink-0 cursor-col-resize">
      <PanelResizeHandle
        id={id}
        style={{ cursor: "col-resize" }}
        className={cn(
          "group absolute inset-0 flex cursor-col-resize items-center justify-center",
          "transition-colors hover:bg-accent/40"
        )}
      >
        <span
          className={cn(
            "pointer-events-none h-10 w-1 rounded-full bg-border transition-colors",
            "group-hover:bg-ring group-data-[resize-handle-state=drag]:bg-ring"
          )}
        />
      </PanelResizeHandle>
      {children && (
        <div
          className={cn(
            "absolute left-1/2 z-10 flex -translate-x-1/2 items-center",
            placement === "center" && "inset-y-0",
            placement === "top" && "top-1",
            placement === "bottom" && "bottom-1"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function DividerBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Tooltip label={title} side="right">
      <button
        type="button"
        aria-label={title}
        onClick={onClick}
        className="flex size-6 items-center justify-center rounded-md border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
      >
        {children}
      </button>
    </Tooltip>
  );
}

const AUTO_COMPILE_DEBOUNCE_MS = 2500;

export default function App() {
  const projectId = useFilesStore((s) => s.projectId);
  const refreshProjects = useFilesStore((s) => s.refreshProjects);
  const activeContent = useActiveContent();
  const recompile = useCompileStore((s) => s.recompile);
  const autoCompile = useCompileStore((s) => s.autoCompile);
  const viewMode = useSettingsStore((s) => s.viewMode);
  const setViewMode = useSettingsStore((s) => s.setViewMode);
  const showTree = useSettingsStore((s) => s.showTree);
  const editorFontSize = useSettingsStore((s) => s.editorFontSize);
  const accentColor = useSettingsStore((s) => s.accentColor);

  // On startup: populate the library. The user picks a project from there.
  useEffect(() => {
    void refreshProjects();
    void useGithubStore.getState().refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Silently check for a new release shortly after launch (no-op in dev / the
  // browser). Only prompts the user if an update is actually available.
  useEffect(() => {
    const id = window.setTimeout(() => checkForUpdatesOnStartup(), 3000);
    return () => window.clearTimeout(id);
  }, []);

  // Apply cosmetic settings (editor font size + accent color) to the document.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--cm-font-size", `${editorFontSize}px`);
    // Default accent is primary blue; accentColor is always a real color.
    const accent = accentColor || "#2563eb";
    root.style.setProperty("--primary", accent);
    root.style.setProperty("--primary-foreground", "#ffffff");
  }, [editorFontSize, accentColor]);

  // Keep the source-control badge count fresh for the current project.
  const refreshGitStatus = useGitStatusStore((s) => s.refresh);
  useEffect(() => {
    refreshGitStatus(projectId);
  }, [projectId, refreshGitStatus]);
  useEffect(() => {
    const tick = () => refreshGitStatus(useFilesStore.getState().projectId);
    const id = window.setInterval(tick, 5000);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshGitStatus]);

  // Always open a project in 50-50 split view.
  useEffect(() => {
    if (projectId) setViewMode("split");
    // Clear the previous project's compile output so a stale PDF never shows.
    useCompileStore.getState().reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Manual recompile: Cmd/Ctrl + Enter. Forward SyncTeX: Cmd/Ctrl + Shift + J.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "Enter") {
        e.preventDefault();
        void recompile();
      } else if (e.shiftKey && e.key.toLowerCase() === "j") {
        e.preventDefault();
        void forwardFromCursor();
      } else if (e.key === "/") {
        e.preventDefault();
        useSettingsStore.getState().setHotkeysOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recompile]);

  // Auto-compile: debounced, skipped while a compile is running.
  useEffect(() => {
    if (!autoCompile || !projectId) return;
    const t = setTimeout(() => {
      if (useCompileStore.getState().status !== "compiling") void recompile();
    }, AUTO_COMPILE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [activeContent, autoCompile, recompile, projectId]);

  if (!projectId) {
    return (
      <ThemeProvider>
        <Library />
        <CommandPalette />
        <SearchOmnibar />
        <SettingsModal />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="flex h-full flex-col">
        <TopToolbar />
        <div className="flex min-h-0 flex-1">
          <Rail />
          <PanelGroup direction="horizontal" className="flex-1">
            {showTree && (
              <>
                <Panel id="sidebar" order={1} defaultSize={20} minSize={12} maxSize={42} className="bg-sidebar">
                  <Sidebar />
                </Panel>
                <VHandle id="h-tree" />
              </>
            )}

            <Panel id="editorpdf" order={2} defaultSize={showTree ? 80 : 100}>
              <PanelGroup direction="horizontal">
                {viewMode !== "pdf" && (
                  <Panel id="editor" order={1} defaultSize={viewMode === "editor" ? 100 : 50} minSize={15}>
                    <Editor />
                  </Panel>
                )}
                {viewMode === "split" && (
                  <VHandle id="h-mid" placement="top">
                    <DividerBtn onClick={() => void forwardFromCursor()} title="Go to PDF (SyncTeX)">
                      <ArrowRight className="size-3.5" />
                    </DividerBtn>
                  </VHandle>
                )}
                {viewMode !== "editor" && (
                  <Panel id="pdf" order={2} defaultSize={viewMode === "pdf" ? 100 : 50} minSize={15}>
                    <PreviewPane />
                  </Panel>
                )}
              </PanelGroup>
            </Panel>
          </PanelGroup>
        </div>

        <CommandPalette />
        <SearchOmnibar />
        <SettingsModal />
        <WordCountModal />
        <HistoryModal />
        <HotkeysModal />
      </div>
    </ThemeProvider>
  );
}
