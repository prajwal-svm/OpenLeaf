import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/store/settings";
import { useFilesStore, useActiveContent } from "@/store/files";
import { countWords } from "@/lib/wordcount";

export function WordCountModal() {
  const open = useSettingsStore((s) => s.wordCountOpen);
  const setOpen = useSettingsStore((s) => s.setWordCountOpen);
  const content = useActiveContent();
  const activePath = useFilesStore((s) => s.activePath);

  const stats = useMemo(() => countWords(content), [content]);

  if (!open) return null;

  const rows: [string, number][] = [
    ["Words", stats.words],
    ["Characters", stats.characters],
    ["Lines", stats.lines],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-xl border bg-popover p-5 text-popover-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-base font-semibold">Word count</h2>
        <p className="mb-4 truncate text-xs text-muted-foreground">
          {activePath ?? "no file"}
        </p>
        <div className="divide-y divide-border">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="font-mono text-sm tabular-nums">
                {value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
