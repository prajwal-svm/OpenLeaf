import { useEffect, useState } from "react";
import { ExternalLink, Globe, Github, X, RefreshCw } from "lucide-react";
import { open } from "@tauri-apps/plugin-shell";
import { Button } from "@/components/ui/button";
import { LeafLogo } from "@/components/layout/LeafLogo";
import { appVersion } from "@/lib/tauri";
import { checkForUpdates } from "@/lib/updater";
import { cn } from "@/lib/utils";

const REPO = "https://github.com/prajwal-svm/OpenLeaf";
const AUTHOR_URL = "http://prajwal.me";
const DOCS = "https://www.overleaf.com/learn";

export function AboutModal({ open: isOpen, onClose }: { open: boolean; onClose: () => void }) {
  const [version, setVersion] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isOpen) void appVersion().then(setVersion).catch(() => setVersion(""));
  }, [isOpen]);

  if (!isOpen) return null;

  const onCheckUpdates = async () => {
    setChecking(true);
    try {
      await checkForUpdates({ silent: false });
    } finally {
      setChecking(false);
    }
  };

  const ext = (url: string) => () => void open(url);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border bg-popover p-6 text-popover-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <LeafLogo className="size-12" />
          <h2 className="mt-3 text-base font-semibold">OpenLeaf</h2>
          {version && (
            <span className="mt-0.5 text-xs text-muted-foreground">Version {version}</span>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            A local-first, cross-platform LaTeX &amp; resume authoring app.
          </p>
          <button
            onClick={onCheckUpdates}
            disabled={checking}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-60"
          >
            <RefreshCw className={cn("size-3.5", checking && "animate-spin")} />
            {checking ? "Checking…" : "Check for updates"}
          </button>
        </div>

        <div className="mt-5 space-y-1 border-t pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Author</p>
          <button
            onClick={ext(AUTHOR_URL)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
          >
            <Globe className="size-4 text-muted-foreground" />
            <span className="flex-1">Prajwal Murthy</span>
            <ExternalLink className="size-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="mt-3 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Project</p>
          <button
            onClick={ext(REPO)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
          >
            <Github className="size-4 text-muted-foreground" />
            <span className="flex-1 truncate">Open Source - GitHub</span>
            <ExternalLink className="size-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={ext(`${REPO}#readme`)}>
            Learn more
          </Button>
          <Button size="sm" className="flex-1" onClick={ext(DOCS)}>
            Documentation
          </Button>
        </div>
      </div>
    </div>
  );
}
