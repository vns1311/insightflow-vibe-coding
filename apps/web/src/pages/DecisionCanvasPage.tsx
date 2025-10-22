import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { api } from "../lib/api";
import { formatDate } from "../lib/utils";
import { useUIStore } from "../state/uiStore";

export function DecisionCanvasPage() {
  const selectedProjectId = useUIStore((state) => state.selectedProjectId);
  const openDialog = useUIStore((state) => state.openDialog);
  const queryClient = useQueryClient();

  const { data: decisions, isLoading } = useQuery({
    queryKey: ["decisions", selectedProjectId ?? "all"],
    queryFn: () => api.getDecisions(selectedProjectId ?? undefined),
  });

  const deleteDecision = useMutation({
    mutationFn: api.deleteDecision,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["decisions", selectedProjectId ?? "all"] });
      toast.success("Decision deleted");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete decision");
    },
  });

  const sorted = useMemo(() => {
    if (!decisions) return [];
    return [...decisions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [decisions]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Decision Canvas</h1>
          <p className="text-sm text-foreground/70">
            Capture the calls you make and keep evidence linked for easy recall.
          </p>
        </div>
        <Button onClick={() => openDialog("decision")}>Record decision</Button>
      </div>
      <Separator />

      {isLoading && <div className="text-sm text-foreground/60">Loading decisions…</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {sorted.map((decision) => (
          <Card key={decision.id} className="space-y-3">
            <CardHeader>
              <div className="flex w-full items-start justify-between gap-3">
                <div>
                  <CardTitle>{decision.title}</CardTitle>
                  <span className="text-xs text-foreground/50">Logged {formatDate(decision.created_at)}</span>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {decision.confidence != null && (
                    <Badge>{Math.round(decision.confidence * 100)}% confidence</Badge>
                  )}
                  <Button
                    variant="ghost"
                    className="px-0 text-xs text-red-500 hover:text-red-600"
                    onClick={() => {
                      if (window.confirm("Delete this decision? Tasks linked to it will remain but lose the association.")) {
                        deleteDecision.mutate(decision.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-foreground/80">
              <div>
                <strong className="text-foreground">Rationale</strong>
                <p className="mt-1 whitespace-pre-line text-foreground/75">{decision.rationale || "No rationale provided."}</p>
              </div>
              {decision.pros && (
                <div>
                  <strong className="text-foreground">Pros</strong>
                  <p className="mt-1 whitespace-pre-line text-foreground/70">{decision.pros}</p>
                </div>
              )}
              {decision.cons && (
                <div>
                  <strong className="text-foreground">Cons</strong>
                  <p className="mt-1 whitespace-pre-line text-foreground/70">{decision.cons}</p>
                </div>
              )}
              {decision.risks && (
                <div>
                  <strong className="text-foreground">Risks</strong>
                  <p className="mt-1 whitespace-pre-line text-foreground/70">{decision.risks}</p>
                </div>
              )}
              {decision.linked_claim_ids?.length ? (
                <div>
                  <strong className="text-foreground">Linked claims</strong>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-foreground/60">
                    {decision.linked_claim_ids.map((claimId) => (
                      <span key={claimId} className="rounded-full bg-accent/60 px-2 py-1">{claimId.slice(0, 8)}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              <Button
                variant="ghost"
                className="px-0 text-xs text-foreground/70 underline"
                onClick={() => {
                  api
                    .exportProjectMarkdown(decision.project_id)
                    .then((content) => {
                      navigator.clipboard
                        .writeText(content)
                        .then(() => toast.success("Export copied to clipboard"))
                        .catch(() => toast.error("Unable to copy export"));
                    })
                    .catch((error) => toast.error(error instanceof Error ? error.message : "Export failed"));
                }}
              >
                Copy export markdown
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && sorted.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-background/50 p-6 text-sm text-foreground/70">
          No decisions yet. Press D to record a decision and link it back to evidence.
        </div>
      )}
    </section>
  );
}
