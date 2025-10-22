import { Menu, Sparkles } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { useProjects } from "../hooks/useProjects";
import { useUIStore } from "../state/uiStore";
import { cn, formatRelative } from "../lib/utils";
import { Button } from "./ui/button";
import { CommandPalette } from "./CommandPalette";
import { useCommandShortcuts } from "../hooks/useCommandShortcuts";
import { ActionDialogs } from "./ActionDialogs";
import { useQueryClient } from "@tanstack/react-query";

export function Layout() {
  useCommandShortcuts();
  const { data: projects } = useProjects();
  const selectedProjectId = useUIStore((state) => state.selectedProjectId);
  const setSelectedProjectId = useUIStore((state) => state.setSelectedProjectId);
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const queryClient = useQueryClient();

  const activeProject = projects?.find((project) => project.id === selectedProjectId) ?? null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-white to-accent/60 text-foreground">
      <aside className="hidden w-64 flex-col border-r border-border bg-white/80 backdrop-blur lg:flex lg:shadow-soft">
        <div className="flex items-center gap-2 border-b border-border px-6 py-5">
          <Sparkles className="h-5 w-5 text-foreground" />
          <div>
            <div className="text-sm font-semibold">InsightFlow</div>
            <div className="text-xs text-foreground/60">Evidence synthesis hub</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-5 text-sm">
          <NavItem to="/">Projects overview</NavItem>
          <NavItem to="/library">Source library</NavItem>
          <NavItem to="/runs">Insight runs</NavItem>
          <NavItem to="/decisions">Decision canvas</NavItem>
          <NavItem to="/tasks">Task board</NavItem>
        </nav>
        <div className="border-t border-border px-5 py-4 text-xs text-foreground/60">
          {activeProject ? (
            <>
              <div className="font-medium text-foreground">{activeProject.name}</div>
              <div>Updated {formatRelative(activeProject.created_at)}</div>
            </>
          ) : (
            <div className="text-foreground/50">Select a project to focus.</div>
          )}
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-white/80 px-4 py-4 shadow-subtle backdrop-blur lg:px-8">
          <button className="rounded-lg border border-border/70 bg-white/80 p-2 shadow-subtle transition hover:bg-accent/60 lg:hidden">
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <div className="text-sm text-foreground/70">
            {activeProject ? `Focused on ${activeProject.name}` : "No project selected"}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <select
              className="h-10 rounded-lg border border-border bg-white/80 px-3 text-sm text-foreground/80 shadow-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={selectedProjectId ?? ""}
              onChange={(event) => {
                const value = event.target.value || null;
                setSelectedProjectId(value);
                queryClient.invalidateQueries({ queryKey: ["insight-runs"], exact: false });
              }}
            >
              <option value="">All projects</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <Button variant="secondary" className="hidden gap-2 lg:inline-flex" onClick={() => setCommandPaletteOpen(true)}>
              <Sparkles className="h-4 w-4" />
              Command (⌘/Ctrl + K)
            </Button>
          </div>
        </header>
        <main className="flex-1 px-4 py-8 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-6xl space-y-8">
            <Outlet />
          </div>
        </main>
      </div>
      <CommandPalette />
      <ActionDialogs />
    </div>
  );
}

interface NavItemProps {
  to: string;
  children: React.ReactNode;
}

function NavItem({ to, children }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-foreground/70 transition hover:bg-accent hover:text-foreground",
          isActive && "bg-primary/10 text-primary"
        )
      }
    >
      {children}
    </NavLink>
  );
}
