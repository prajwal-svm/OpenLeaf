import { useState } from "react";
import { AlertTriangle, ArrowUpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { installUpdate } from "@/lib/updater";
import { logError } from "@/lib/log";
import { useUpdatesStore } from "@/store/updates";

/**
 * Global, in-app update prompt. When the startup check finds a newer version it
 * populates the updates store, and this branded card slides in (bottom-right)
 * instead of a native OS dialog. Mounted once, app-wide.
 */
export function UpdateNotice() {
  const available = useUpdatesStore((s) => s.available);
  const dismiss = useUpdatesStore((s) => s.dismiss);
  const [phase, setPhase] = useState<"idle" | "downloading" | "error">("idle");
  const [percent, setPercent] = useState(0);

  if (!available) return null;

  const install = async () => {
    setPhase("downloading");
    setPercent(0);
    try {
      await installUpdate(available, setPercent);
      // installUpdate relaunches on success; the lines below are unreachable then.
    } catch (e) {
      await logError("updater", e);
      setPhase("error");
    }
  };

  const notes = available.body?.trim();

  return (
    <div className="fixed bottom-4 right-4 z-[200] w-[min(92vw,26rem)] overflow-hidden rounded-xl border bg-popover shadow-xl">
      <div className="flex items-start gap-2 px-4 pt-3">
        <ArrowUpCircle className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Update available · v{available.version}</p>
          {available.currentVersion && (
            <p className="text-xs text-muted-foreground">You're on v{available.currentVersion}</p>
          )}
        </div>
        {phase !== "downloading" && (
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {phase === "idle" && notes && (
        <Markdown className="mx-4 mt-2 max-h-40 overflow-auto rounded bg-background/60 p-2.5 text-xs text-muted-foreground [scrollbar-width:thin]">
          {notes}
        </Markdown>
      )}

      {phase === "downloading" ? (
        <div className="space-y-1.5 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {percent >= 100 ? "Installing…" : `Downloading… ${percent}%`}
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">OpenLeaf will restart to finish.</p>
        </div>
      ) : phase === "error" ? (
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="size-4" />
            Update failed. Please try again later.
          </span>
          <Button size="sm" variant="secondary" onClick={() => setPhase("idle")}>
            Back
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3">
          <Button size="sm" onClick={install}>
            Update now
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss}>
            Later
          </Button>
        </div>
      )}
    </div>
  );
}
