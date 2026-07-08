import { useMemo, useState } from "react";
import {
  ChevronRight,
  CopyPlus,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderTree,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useFilesStore } from "@/store/files";
import { FileIcon } from "@/components/files/fileIcon";
import { logError } from "@/lib/log";
import { cn } from "@/lib/utils";

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

function buildTree(paths: { path: string; is_dir: boolean }[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", isDir: true, children: [] };
  for (const { path, is_dir } of paths) {
    const parts = path.split("/").filter(Boolean);
    let node = root;
    parts.forEach((part, i) => {
      const isLast = i === parts.length - 1;
      const childPath = parts.slice(0, i + 1).join("/");
      let child = node.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: childPath,
          isDir: isLast ? is_dir : true,
          children: [],
        };
        node.children.push(child);
      }
      node = child;
    });
  }
  // folders first, then alphabetical
  const sortRec = (n: TreeNode) => {
    n.children.sort((a, b) =>
      a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1
    );
    n.children.forEach(sortRec);
  };
  sortRec(root);
  return root.children;
}

export function FileTree() {
  const tree = useFilesStore((s) => s.tree);
  const mainDoc = useFilesStore((s) => s.mainDoc);
  const activePath = useFilesStore((s) => s.activePath);
  const openFile = useFilesStore((s) => s.openFile);
  const createFile = useFilesStore((s) => s.createFile);
  const deleteEntry = useFilesStore((s) => s.deleteEntry);
  const renameEntry = useFilesStore((s) => s.renameEntry);
  const copyEntry = useFilesStore((s) => s.copyEntry);
  const setMainDoc = useFilesStore((s) => s.setMainDoc);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newMode, setNewMode] = useState<null | "file" | "dir">(null);
  const [newPath, setNewPath] = useState("");
  const [renamePath, setRenamePath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const nodes = useMemo(() => buildTree(tree), [tree]);

  const commitRename = async (oldPath: string) => {
    const newName = renameValue.trim();
    setRenamePath(null);
    setRenameValue("");
    if (!newName) return;
    const slash = oldPath.lastIndexOf("/");
    const dir = slash >= 0 ? oldPath.slice(0, slash) : "";
    const to = dir ? `${dir}/${newName}` : newName;
    if (to === oldPath) return;
    try {
      await renameEntry(oldPath, to);
    } catch (e) {
      void logError("rename file", e);
    }
  };

  const toggle = (path: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });

  const submitNew = async () => {
    const p = newPath.trim();
    if (!p) {
      setNewMode(null);
      return;
    }
    try {
      await createFile(p, newMode === "dir");
    } catch (e) {
      void logError("create file", e);
    }
    setNewPath("");
    setNewMode(null);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 items-center justify-between border-b border-sidebar-border px-3">
        <div className="flex items-center gap-1.5">
          <FolderTree className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium uppercase tracking-wide text-sidebar-foreground/70">
            Source Tree
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="New file"
            onClick={() => setNewMode("file")}
          >
            <FilePlus className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="New folder"
            onClick={() => setNewMode("dir")}
          >
            <FolderPlus className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-1.5">
        {newMode && (
          <input
            autoFocus
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            onBlur={submitNew}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submitNew();
              if (e.key === "Escape") {
                setNewMode(null);
                setNewPath("");
              }
            }}
            placeholder={newMode === "dir" ? "folder/name" : "file.tex"}
            className="mb-1 w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        )}
        {nodes.map((n) => (
          <TreeRow
            key={n.path}
            node={n}
            depth={0}
            expanded={expanded}
            toggle={toggle}
            mainDoc={mainDoc}
            activePath={activePath}
            onOpen={openFile}
            onDelete={deleteEntry}
            onSetMain={setMainDoc}
            onCopy={copyEntry}
            renamePath={renamePath}
            renameValue={renameValue}
            onStartRename={(p, name) => { setRenamePath(p); setRenameValue(name); }}
            onChangeRename={setRenameValue}
            onCommitRename={commitRename}
            onCancelRename={() => { setRenamePath(null); setRenameValue(""); }}
          />
        ))}
      </div>
    </div>
  );
}

interface RowProps {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  toggle: (p: string) => void;
  mainDoc: string;
  activePath: string | null;
  onOpen: (p: string) => void;
  onDelete: (p: string) => void;
  onSetMain: (p: string) => void;
  onCopy: (p: string) => void;
  renamePath: string | null;
  renameValue: string;
  onStartRename: (path: string, name: string) => void;
  onChangeRename: (v: string) => void;
  onCommitRename: (path: string) => void;
  onCancelRename: () => void;
}

function TreeRow({
  node,
  depth,
  expanded,
  toggle,
  mainDoc,
  activePath,
  onOpen,
  onDelete,
  onSetMain,
  onCopy,
  renamePath,
  renameValue,
  onStartRename,
  onChangeRename,
  onCommitRename,
  onCancelRename,
}: RowProps) {
  const isOpen = expanded.has(node.path) || !node.isDir;
  const isActive = activePath === node.path;
  const isMain = mainDoc === node.path;
  const isRenaming = renamePath === node.path;

  const content = (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-1.5 rounded-md py-1.5 pr-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent",
        isActive && "bg-sidebar-accent"
      )}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      onClick={() =>
        node.isDir ? toggle(node.path) : void onOpen(node.path)
      }
    >
      {node.isDir ? (
        <>
          <ChevronRight
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform",
              expanded.has(node.path) && "rotate-90"
            )}
          />
          {expanded.has(node.path) ? (
            <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <Folder className="size-4 shrink-0 text-muted-foreground" />
          )}
        </>
      ) : (
        <>
          <span className="w-3.5 shrink-0" />
          <FileIcon name={node.name} className="size-4 shrink-0" />
        </>
      )}
      <span className="truncate">{node.name}</span>
      {isMain && (
        <Star className="ml-auto size-3 shrink-0 fill-foreground text-foreground" />
      )}
    </div>
  );

  return (
    <div>
      {isRenaming ? (
        <div style={{ paddingLeft: `${depth * 12 + 0}px` }} className="py-0.5">
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => onChangeRename(e.target.value)}
            onBlur={() => onCommitRename(node.path)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommitRename(node.path);
              if (e.key === "Escape") onCancelRename();
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none"
          />
        </div>
      ) : (
        <ContextMenu>
          <ContextMenuTrigger asChild>{content}</ContextMenuTrigger>
          <ContextMenuContent className="w-52">
            {node.isDir ? (
              <ContextMenuItem
                onClick={() => {
                  /* open folder actions could go here */
                }}
              >
                Open
              </ContextMenuItem>
            ) : (
              <>
                <ContextMenuItem onClick={() => onOpen(node.path)}>
                  Open
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={!node.path.endsWith(".tex")}
                  onClick={() => onSetMain(node.path)}
                >
                  Set as main document
                </ContextMenuItem>
              </>
            )}
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onStartRename(node.path, node.name)}>
              <Pencil className="mr-2 size-4" /> Rename
            </ContextMenuItem>
            <ContextMenuItem onClick={() => void onCopy(node.path)}>
              <CopyPlus className="mr-2 size-4" /> Make a copy
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                if (
                  window.confirm(
                    `Delete ${node.path}? This cannot be undone (until Git history, Phase 5).`
                  )
                )
                  void onDelete(node.path);
              }}
            >
              <Trash2 className="mr-2 size-4" /> Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )}
      {node.isDir && expanded.has(node.path) && (
        <>
          {isOpen &&
            node.children.map((c) => (
              <TreeRow
                key={c.path}
                node={c}
                depth={depth + 1}
                expanded={expanded}
                toggle={toggle}
                mainDoc={mainDoc}
                activePath={activePath}
                onOpen={onOpen}
                onDelete={onDelete}
                onSetMain={onSetMain}
                onCopy={onCopy}
                renamePath={renamePath}
                renameValue={renameValue}
                onStartRename={onStartRename}
                onChangeRename={onChangeRename}
                onCommitRename={onCommitRename}
                onCancelRename={onCancelRename}
              />
            ))}
        </>
      )}
    </div>
  );
}
