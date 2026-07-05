import { Github } from "lucide-react";
import { useGithubStore } from "@/store/github";
import { useSettingsStore } from "@/store/settings";
import { Tooltip } from "@/components/ui/tooltip";

/** Compact connected-account indicator for the top toolbar. Hidden when
 *  GitHub isn't connected. Clicking it opens Settings → GitHub. */
export function GithubBadge() {
  const status = useGithubStore((s) => s.status);
  const user = useGithubStore((s) => s.user);
  const setSettingsOpen = useSettingsStore((s) => s.setSettingsOpen);
  const setSettingsInitialSection = useSettingsStore(
    (s) => s.setSettingsInitialSection
  );

  if (status !== "connected") return null;

  const login = user?.login ?? "GitHub";
  const open = () => {
    setSettingsInitialSection("github");
    setSettingsOpen(true);
  };

  return (
    <Tooltip label={`Connected as @${login}`} side="bottom">
      <button
        onClick={open}
        aria-label={`GitHub: ${login}`}
        className="flex h-7 items-center gap-1.5 rounded-full border bg-background pl-1 pr-2.5 text-xs font-medium transition-colors hover:bg-accent"
      >
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            className="size-5 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-background">
            <Github className="size-3" />
          </span>
        )}
        <span className="max-w-[100px] truncate">{login}</span>
      </button>
    </Tooltip>
  );
}
