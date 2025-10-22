import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { api } from "../lib/api";
import { formatDate } from "../lib/utils";
import type { InsightRun } from "../lib/types";
import { useUIStore } from "../state/uiStore";

export function InsightRunsPage() {
  const navigate = useNavigate();
  const selectedProjectId = useUIStore((state) => state.selectedProjectId);
  const openDialog = useUIStore((state) => state.openDialog);
  const queryClient = useQueryClient();

  const { data: runs, isLoading } = useQuery<InsightRun[]>({
    queryKey: ["insight-runs", selectedProjectId ?? "all"],
    queryFn: () => api.getInsightRuns(selectedProjectId ?? undefined),
    enabled: Boolean(selectedProjectId),
  });

  const sortedRuns = useMemo(() => {
    if (!runs) return [];
    return [...runs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [runs]);

  const deleteRun = useMutation({
    mutationFn: api.deleteInsightRun,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["insight-runs", selectedProjectId ?? "all"] });
      toast.success("Insight run deleted");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete run");
    },
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Insight Runs</h1>
          <p className="text-sm text-foreground/70">
            Review past syntheses for the current project or start a new automated analysis.
          </p>
        </div>
        <Button onClick={() => openDialog("analyze")}>Start run</Button>
      </div>
      <Separator />

      {!selectedProjectId && (
        <div className="rounded-xl border border-dashed border-border bg-background/50 p-6 text-sm text-foreground/70">
          Select a project to explore insight runs.
        </div>
      )}

      {selectedProjectId && isLoading && (
        <div className="text-sm text-foreground/60">Loading runs…</div>
      )}

      {selectedProjectId && !isLoading && sortedRuns.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-background/50 p-6 text-sm text-foreground/70">
          No runs yet. Kick off an analysis to populate synthesized insights.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {sortedRuns.map((run) => (
          <Card
            key={run.id}
            className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"
            onClick={() => navigate(`/runs/${run.id}`)}
          >
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center justify-between">
                <span>Insight run</span>
                <Badge className="uppercase">{run.status}</Badge>
              </CardTitle>
              <span className="text-xs text-foreground/60">
                Started {formatDate(run.created_at)}
              </span>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => navigate(`/runs/${run.id}`)}>
                View insights
              </Button>
              <Button variant="secondary" onClick={() => openDialog("analyze")}>
                Rerun
              </Button>
              <Button
                variant="ghost"
                className="text-red-500 hover:text-red-600"
                onClick={(event) => {
                  event.stopPropagation();
                  if (window.confirm("Delete this insight run?")) {
                    deleteRun.mutate(run.id);
                  }
                }}
              >
                Delete
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
