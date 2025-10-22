import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useProjects } from "../hooks/useProjects";
import { useUIStore } from "../state/uiStore";
import { formatDate } from "../lib/utils";
import { api } from "../lib/api";

export function ProjectListPage() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();
  const setSelectedProjectId = useUIStore((state) => state.setSelectedProjectId);
  const selectedProjectId = useUIStore((state) => state.selectedProjectId);
  const openDialog = useUIStore((state) => state.openDialog);
  const queryClient = useQueryClient();

  const sorted = useMemo(() => {
    if (!projects) return [];
    return [...projects].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [projects]);

  const handleQuickCreate = async () => {
    try {
      const project = await api.createProject({
        name: `Project ${new Date().toLocaleString()}`,
        description: "Quick created project",
      });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      setSelectedProjectId(project.id);
      toast.success(`Created ${project.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create project");
    }
  };

  const deleteProject = useMutation({
    mutationFn: api.deleteProject,
    onSuccess: async (_, projectId) => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
      }
      toast.success("Project deleted");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete project");
    },
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-foreground/70">Curate and manage the initiatives you are researching.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleQuickCreate}>
            Quick create
          </Button>
          <Button onClick={() => openDialog("project")}>New project</Button>
        </div>
      </div>

      {isLoading && <div className="text-sm text-foreground/60">Loading projects…</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((project) => (
          <Card
            key={project.id}
            className="transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="cursor-pointer" onClick={() => {
                  setSelectedProjectId(project.id);
                  navigate("/library");
                }}>
                  <CardTitle>{project.name}</CardTitle>
                  <span className="text-xs text-foreground/50">Created {formatDate(project.created_at)}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="ghost"
                    className="px-3 text-xs text-red-500 hover:text-red-600"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (window.confirm(`Delete project "${project.name}"? This action cannot be undone.`)) {
                        deleteProject.mutate(project.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                  <Button
                    variant="secondary"
                    className="px-3"
                    onClick={async (event) => {
                      event.stopPropagation();
                      try {
                        const content = await api.exportProjectMarkdown(project.id);
                        const blob = new Blob([content], { type: "text/markdown" });
                        const url = URL.createObjectURL(blob);
                        const anchor = document.createElement("a");
                        anchor.href = url;
                        anchor.download = `${project.name.replace(/[^a-z0-9_-]/gi, "-") || "project"}.md`;
                        document.body.appendChild(anchor);
                        anchor.click();
                        anchor.remove();
                        URL.revokeObjectURL(url);
                        toast.success("Export ready");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Failed to export project");
                      }
                    }}
                  >
                    Export
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-3"
                    onClick={async (event) => {
                      event.stopPropagation();
                      try {
                        const content = await api.getDailyDigest(project.id);
                        const blob = new Blob([content], { type: "text/markdown" });
                        const url = URL.createObjectURL(blob);
                        const anchor = document.createElement("a");
                        anchor.href = url;
                        anchor.download = `${project.name.replace(/[^a-z0-9_-]/gi, "-") || "project"}-digest.md`;
                        document.body.appendChild(anchor);
                        anchor.click();
                        anchor.remove();
                        URL.revokeObjectURL(url);
                        toast.success("Daily digest ready");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Failed to generate digest");
                      }
                    }}
                  >
                    Daily digest
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent onClick={() => {
              setSelectedProjectId(project.id);
              navigate("/library");
            }}>
              <p className="text-sm text-foreground/80">{project.description || "No description yet."}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && projects && projects.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-background/50 p-6 text-sm text-foreground/70">
          No projects yet. Use the command palette (⌘/Ctrl + K) or the buttons above to create your first project.
        </div>
      )}
    </section>
  );
}
