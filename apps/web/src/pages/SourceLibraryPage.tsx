import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { api } from "../lib/api";
import { formatDate } from "../lib/utils";
import { useUIStore } from "../state/uiStore";

export function SourceLibraryPage() {
  const selectedProjectId = useUIStore((state) => state.selectedProjectId);
  const openDialog = useUIStore((state) => state.openDialog);
  const queryClient = useQueryClient();

  const deleteSource = useMutation({
    mutationFn: api.deleteSource,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sources", selectedProjectId ?? "all"] });
      toast.success("Source removed");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Unable to delete source");
    },
  });

  const { data: sources, isLoading } = useQuery({
    queryKey: ["sources", selectedProjectId ?? "all"],
    queryFn: () => api.getSources(selectedProjectId ?? undefined),
  });

  const handleImportObsidian = async () => {
    if (!selectedProjectId) {
      toast.error("Select a project before importing Obsidian notes.");
      return;
    }
    const folder = window.prompt("Relative folder path inside the Obsidian vault", ".");
    if (folder === null) {
      return;
    }
    try {
      await api.importObsidian({ project_id: selectedProjectId, folder: folder || "." });
      await queryClient.invalidateQueries({ queryKey: ["sources", selectedProjectId ?? "all"] });
      toast.success("Obsidian notes imported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to import notes");
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Source Library</h1>
          <p className="text-sm text-foreground/70">
            Upload research materials, transcripts, or notes. We keep a searchable archive per project.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleImportObsidian}>
            Import Obsidian
          </Button>
          <Button onClick={() => openDialog("upload")} className="gap-2">
            <UploadCloud className="h-4 w-4" />
            Upload source
          </Button>
        </div>
      </div>
      <Separator />

      {isLoading && <div className="text-sm text-foreground/60">Loading sources…</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sources?.map((source) => (
          <Card key={source.id} className="flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="line-clamp-1">{source.title || source.uri}</CardTitle>
              <span className="text-xs text-foreground/50 uppercase tracking-wide">{source.kind}</span>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-foreground/60">Uploaded {formatDate(source.created_at)}</p>
              <div className="flex flex-wrap gap-2">
                {source.tags?.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start px-0 text-xs text-foreground/70 underline"
                onClick={() => {
                  navigator.clipboard
                    .writeText(source.content_ptr)
                    .then(() => toast.success("Source path copied to clipboard"))
                    .catch(() => toast.error("Unable to copy path"));
                }}
              >
                Copy text location
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start px-0 text-xs text-red-500 hover:text-red-600"
                onClick={() => {
                  if (window.confirm("Delete this source?")) {
                    deleteSource.mutate(source.id);
                  }
                }}
              >
                Delete source
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && sources && sources.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-background/50 p-6 text-sm text-foreground/70">
          No sources uploaded yet. Use the upload button or press U to bring up the upload drawer.
        </div>
      )}
    </section>
  );
}
