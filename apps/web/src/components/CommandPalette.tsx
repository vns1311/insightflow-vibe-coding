import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command, FilePlus2, FolderPlus, Layers, LibraryBig, Search, Sparkles, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useUIStore } from "../state/uiStore";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

interface CommandAction {
  id: string;
  label: string;
  shortcut?: string;
  hint?: string;
  onSelect: () => void;
}

export function CommandPalette() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const commandPaletteOpen = useUIStore((state) => state.commandPaletteOpen);
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const openDialog = useUIStore((state) => state.openDialog);
  const selectedProjectId = useUIStore((state) => state.selectedProjectId);

  const actions = useMemo<CommandAction[]>(() => {
    return [
      {
        id: "new-project",
        label: "New Project",
        shortcut: "N",
        onSelect: () => openDialog("project"),
      },
      {
        id: "upload-source",
        label: selectedProjectId ? "Upload Source" : "Upload Source (Select project first)",
        shortcut: "U",
        onSelect: () => openDialog("upload"),
      },
      {
        id: "start-run",
        label: selectedProjectId ? "Start Insight Run" : "Start Insight Run (Select project first)",
        shortcut: "A",
        onSelect: () => openDialog("analyze"),
      },
      {
        id: "record-decision",
        label: selectedProjectId ? "Record Decision" : "Record Decision (Select project first)",
        shortcut: "D",
        onSelect: () => openDialog("decision"),
      },
      {
        id: "create-task",
        label: selectedProjectId ? "Create Task" : "Create Task (Select project first)",
        shortcut: "T",
        onSelect: () => openDialog("task"),
      },
      {
        id: "view-projects",
        label: "Go to Projects",
        hint: "Go to dashboard",
        onSelect: () => navigate("/"),
      },
      {
        id: "view-library",
        label: "Go to Library",
        onSelect: () => navigate("/library"),
      },
      {
        id: "view-runs",
        label: "Go to Insight Runs",
        onSelect: () => navigate("/runs"),
      },
      {
        id: "view-decisions",
        label: "Go to Decisions",
        onSelect: () => navigate("/decisions"),
      },
      {
        id: "view-tasks",
        label: "Go to Tasks",
        onSelect: () => navigate("/tasks"),
      },
    ];
  }, [navigate, openDialog, selectedProjectId]);

  const filtered = useMemo(() => {
    if (!search) return actions;
    const value = search.toLowerCase();
    return actions.filter((action) => action.label.toLowerCase().includes(value));
  }, [actions, search]);

  useEffect(() => {
    if (!commandPaletteOpen) {
      setSearch("");
    }
  }, [commandPaletteOpen]);

  return (
    <DialogPrimitive.Root open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <DialogPrimitive.Content className="fixed left-1/2 top-24 z-50 w-full max-w-xl -translate-x-1/2 rounded-xl border border-border bg-white/90 shadow-soft backdrop-blur">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 text-foreground/60" />
            <input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search commands..."
              className="h-9 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground/40"
            />
            <span className="text-xs text-foreground/50">esc</span>
          </div>
          <div className="max-h-80 space-y-1 overflow-auto py-2">
            {filtered.length === 0 && (
              <div className="px-4 py-3 text-sm text-foreground/60">No commands found.</div>
            )}
            {filtered.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  setCommandPaletteOpen(false);
                  action.onSelect();
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition hover:bg-accent"
                )}
              >
                <div className="flex items-center gap-3">
                  <CommandIcon id={action.id} />
                  <span>{action.label}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground/40">
                  {action.hint && <span>{action.hint}</span>}
                  {action.shortcut && (
                    <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{action.shortcut}</kbd>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-foreground/50">
            <div className="flex items-center gap-1">
              <Command className="h-3 w-3" />
              <span>Command palette</span>
            </div>
            <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => setCommandPaletteOpen(false)}>
              Close
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function CommandIcon({ id }: { id: string }) {
  const map: Record<string, JSX.Element> = {
    "new-project": <FolderPlus className="h-4 w-4 text-foreground/70" />,
    "upload-source": <LibraryBig className="h-4 w-4 text-foreground/70" />,
    "start-run": <Sparkles className="h-4 w-4 text-foreground/70" />,
    "view-runs": <Sparkles className="h-4 w-4 text-foreground/70" />,
    "record-decision": <Target className="h-4 w-4 text-foreground/70" />,
    "create-task": <FilePlus2 className="h-4 w-4 text-foreground/70" />,
    "view-projects": <Layers className="h-4 w-4 text-foreground/70" />,
    "view-library": <LibraryBig className="h-4 w-4 text-foreground/70" />,
    "view-decisions": <Target className="h-4 w-4 text-foreground/70" />,
    "view-tasks": <FilePlus2 className="h-4 w-4 text-foreground/70" />,
  };
  return map[id] ?? <Sparkles className="h-4 w-4 text-foreground/70" />;
}
