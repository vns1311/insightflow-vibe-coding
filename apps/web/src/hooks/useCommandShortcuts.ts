import { useHotkeys } from "react-hotkeys-hook";
import { useNavigate } from "react-router-dom";

import { useUIStore } from "../state/uiStore";

const IGNORE_TAGS = ["INPUT", "TEXTAREA", "SELECT"];

function shouldIgnoreEvent(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  if (target.isContentEditable) return true;
  return IGNORE_TAGS.includes(target.tagName);
}

export function useCommandShortcuts() {
  const navigate = useNavigate();
  const openDialog = useUIStore((state) => state.openDialog);
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const commandPaletteOpen = useUIStore((state) => state.commandPaletteOpen);

  useHotkeys(
    "ctrl+k, cmd+k",
    (event) => {
      event.preventDefault();
      setCommandPaletteOpen(!commandPaletteOpen);
    },
    {},
    [commandPaletteOpen, setCommandPaletteOpen]
  );

  const registerKey = (combo: string, action: () => void, deps: unknown[]) => {
    useHotkeys(
      combo,
      (event) => {
        if (shouldIgnoreEvent(event)) {
          return;
        }
        event.preventDefault();
        action();
      },
      { enableOnFormTags: false },
      deps
    );
  };

  registerKey("n", () => openDialog("project"), [openDialog]);
  registerKey("u", () => openDialog("upload"), [openDialog]);
  registerKey("a", () => openDialog("analyze"), [openDialog]);
  registerKey("d", () => openDialog("decision"), [openDialog]);
  registerKey("t", () => openDialog("task"), [openDialog]);

  useHotkeys(
    "g p",
    (event) => {
      event.preventDefault();
      navigate("/");
    },
    {},
    [navigate]
  );
  useHotkeys(
    "g l",
    (event) => {
      event.preventDefault();
      navigate("/library");
    },
    {},
    [navigate]
  );
  useHotkeys(
    "g d",
    (event) => {
      event.preventDefault();
      navigate("/decisions");
    },
    {},
    [navigate]
  );
  useHotkeys(
    "g t",
    (event) => {
      event.preventDefault();
      navigate("/tasks");
    },
    {},
    [navigate]
  );
}
