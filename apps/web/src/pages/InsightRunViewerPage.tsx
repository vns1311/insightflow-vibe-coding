import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../components/ui/drawer";
import { Separator } from "../components/ui/separator";
import { api } from "../lib/api";
import type { InsightRun, Theme, Claim, CitationSnippet } from "../lib/types";
import { formatDate } from "../lib/utils";
import { useUIStore } from "../state/uiStore";

export function InsightRunViewerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const openDialog = useUIStore((state) => state.openDialog);
  const selectedProjectId = useUIStore((state) => state.selectedProjectId);
  const setDecisionDraft = useUIStore((state) => state.setDecisionDraft);
  const decisionDraft = useUIStore((state) => state.decisionDraft);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: run, isLoading } = useQuery<InsightRun>({
    queryKey: ["runs", id],
    queryFn: () => api.getInsightRun(id!),
    enabled: Boolean(id),
    staleTime: 0,
  });

  const payloadThemes = (run?.payload?.themes as Theme[] | undefined) ?? [];
  const { data: fallbackThemes } = useQuery<Theme[]>({
    queryKey: ["themes", run?.id],
    queryFn: () => api.getThemes(run!.id),
    enabled: Boolean(run?.id && payloadThemes.length === 0),
  });

  const themes = payloadThemes.length > 0 ? payloadThemes : fallbackThemes ?? [];

  const claims = useMemo(() => themes.flatMap((theme) => theme.claims ?? []), [themes]);
  const activeCitations: CitationSnippet[] = selectedClaim?.citations ?? [];
  const runProjectKey = run?.project_id ?? selectedProjectId ?? "all";

  useEffect(() => {
    if (run && selectedProjectId && run.project_id !== selectedProjectId) {
      toast.info("Switched project. Showing that project's runs instead.");
      navigate("/runs");
    }
  }, [run?.project_id, selectedProjectId, navigate]);

  const deleteRun = useMutation({
    mutationFn: ({ runId }: { runId: string }) => api.deleteInsightRun(runId),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["insight-runs", runProjectKey] });
      await queryClient.invalidateQueries({ queryKey: ["runs", variables.runId] });
      toast.success("Insight run deleted");
      navigate("/runs");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete run");
    },
  });

  const openCitations = (claim: Claim) => {
    if (!claim.citations || claim.citations.length === 0) {
      toast.error("No citations available for this claim.");
      return;
    }
    setSelectedClaim(claim);
    setDrawerOpen(true);
  };

  const addClaimToDecision = (theme: Theme, claim: Claim) => {
    const linkedIds = Array.from(new Set([...decisionDraft.linkedClaimIds, claim.id]));
    const citationSourceIds = Array.from(
      new Set([
        ...decisionDraft.citationSourceIds,
        ...(claim.citations?.map((citation) => citation.source_id) ?? []),
      ])
    );
    const narrativeLine = `- ${claim.statement}`;
    const mergedRationale = decisionDraft.rationale
      ? `${decisionDraft.rationale.trim()}\n${narrativeLine}`
      : narrativeLine;
    const mergedPros = decisionDraft.pros
      ? `${decisionDraft.pros.trim()}\n${narrativeLine}`
      : narrativeLine;
    const updatedConfidence = Math.max(decisionDraft.confidence ?? 0.6, claim.confidence ?? 0.6);

    setDecisionDraft({
      title: decisionDraft.title || `Decision on ${theme.title}`,
      rationale: mergedRationale,
      pros: mergedPros,
      linkedClaimIds: linkedIds,
      citationSourceIds,
      confidence: updatedConfidence,
    });
    toast.success("Added claim to decision draft");
  };

  const copyLocation = (value?: string | null) => {
    if (!value) return;
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success("Citation location copied"))
      .catch(() => toast.error("Unable to copy citation location"));
  };

  if (!id) {
    return <div className="text-sm text-foreground/60">Select an insight run to view details.</div>;
  }

  return (
    <>
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Insight Run</h1>
            <p className="text-sm text-foreground/70">
              Review synthesized themes, claims, and supporting citations from your latest analysis.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {decisionDraft.linkedClaimIds.length > 0 && (
              <Button variant="secondary" onClick={() => openDialog("decision")}>
                Open decision draft
              </Button>
            )}
            {run && (
              <Button
                variant="ghost"
                className="text-red-500 hover:text-red-600"
                onClick={() => {
                  if (window.confirm("Delete this insight run?")) {
                    deleteRun.mutate({ runId: run.id });
                  }
                }}
              >
                Delete run
              </Button>
            )}
            <Button onClick={() => openDialog("analyze")}>New run</Button>
          </div>
        </div>
        <Separator />

        {isLoading && <div className="text-sm text-foreground/60">Loading run…</div>}
        {!run && !isLoading && <div className="text-sm text-foreground/60">Run not found.</div>}

        {run && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-background/70 p-4 text-sm text-foreground/70">
              <div className="flex items-center gap-3">
                <Badge className="uppercase">{run.status}</Badge>
                <span>Started {formatDate(run.created_at)}</span>
              </div>
              {themes.length > 0 && (
                <div className="mt-3 text-xs text-foreground/60">
                  Generated {themes.length} themes. Claims: {claims.length}.
                </div>
              )}
            </div>

            <div className="grid gap-4">
              {themes?.map((theme) => (
                <Card key={theme.id} className="border border-border/70 shadow-sm">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between">
                      <CardTitle>{theme.title}</CardTitle>
                      <Badge>{Math.round((theme.confidence ?? 0) * 100)}%</Badge>
                    </div>
                    {theme.summary && <p className="text-sm text-foreground/70">{theme.summary}</p>}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(theme.claims ?? []).map((claim: Claim) => {
                      const citationCount = claim.citations?.length ?? 0;
                      return (
                        <div key={claim.id} className="rounded-lg border border-border/70 bg-muted/30 p-4">
                            <div className="flex flex-col gap-3">
                              <div>
                                <p className="text-sm font-medium text-foreground">{claim.statement}</p>
                                <p className="mt-2 text-xs text-foreground/60">
                                  Confidence: {Math.round((claim.confidence ?? 0) * 100)}%
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="secondary"
                                  className="px-3 py-1 text-xs"
                                  onClick={() => addClaimToDecision(theme, claim)}
                                >
                                  Add to decision draft
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="border border-border px-3 py-1 text-xs font-medium hover:bg-background"
                                  onClick={() => openCitations(claim)}
                                  disabled={citationCount === 0}
                                >
                                  View citations ({citationCount})
                                </Button>
                              </div>
                            </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </section>

      <Drawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            setSelectedClaim(null);
          }
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Citations</DrawerTitle>
            <DrawerDescription>
              Evidence linked to “{selectedClaim?.statement}”
            </DrawerDescription>
          </DrawerHeader>
          <DrawerBody className="space-y-4">
            {activeCitations.length === 0 ? (
              <p className="text-sm text-foreground/60">No citations available for this claim.</p>
            ) : (
              activeCitations.map((citation) => (
                <div key={citation.id} className="rounded-lg border border-border/70 bg-muted/20 p-4 text-sm">
                  <div className="font-medium text-foreground">
                    Source #{citation.source_id.slice(0, 6)}
                  </div>
                  {citation.quote && (
                    <p className="mt-2 text-foreground/70">“{citation.quote}”</p>
                  )}
                  {citation.location && (
                    <Button
                      variant="ghost"
                      className="mt-3 px-0 text-xs"
                      onClick={() => copyLocation(citation.location)}
                    >
                      Copy reference path
                    </Button>
                  )}
                </div>
              ))
            )}
          </DrawerBody>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="secondary">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
