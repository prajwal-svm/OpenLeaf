import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BOOK_COLOR_OPTIONS, DEFAULT_BOOK_COLOR } from "@/components/library/Book";
import { cn } from "@/lib/utils";
import type { TemplateInfo } from "@/lib/tauri";

export function NewProjectForm({
  templates,
  onSubmit,
  autoFocusName = false,
  busy = false,
  centered = false,
}: {
  templates: TemplateInfo[];
  onSubmit: (name: string, templateId: string, color: string) => void | Promise<void>;
  autoFocusName?: boolean;
  busy?: boolean;
  centered?: boolean;
}) {
  const [selected, setSelected] = useState("blank");
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_BOOK_COLOR);

  return (
    <>
      <div className="grid w-full grid-cols-3 gap-2">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelected(t.id)}
            className={cn(
              "relative rounded-lg border-2 bg-background p-3 text-left transition-colors",
              selected === t.id ? "border-primary" : "border-border hover:bg-accent"
            )}
          >
            {selected === t.id && (
              <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-white">
                <Check className="size-3.5" />
              </span>
            )}
            <div className="text-sm font-medium">{t.name}</div>
            <div className="text-xs text-muted-foreground">{t.description}</div>
          </button>
        ))}
      </div>

      <div className="w-full">
        <p className={cn("mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground", centered && "text-center")}>
          Choose a color for your project cover
        </p>
        <div className={cn("flex flex-wrap items-center gap-2", centered && "justify-center")}>
          {BOOK_COLOR_OPTIONS.map((c) => {
            const active = color === c.hex;
            return (
              <button
                key={c.hex}
                type="button"
                onClick={() => setColor(c.hex)}
                title={c.name}
                aria-label={c.name}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full transition-transform hover:scale-110",
                  active && "scale-110 ring-1 ring-primary ring-offset-2 ring-offset-background"
                )}
                style={{ background: c.hex }}
              >
                {active && <Check className="size-3.5 text-white drop-shadow" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex w-full items-center gap-2">
        <input
          autoFocus={autoFocusName}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) void onSubmit(name, selected, color);
          }}
          placeholder="Project name"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
        <Button
          className="bg-primary text-white hover:bg-primary"
          onClick={() => void onSubmit(name, selected, color)}
          disabled={busy || !name.trim()}
        >
          Create
        </Button>
      </div>
    </>
  );
}
