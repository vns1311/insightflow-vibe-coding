import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { api } from "../lib/api";
import { cn } from "../lib/utils";
import { useProjects } from "../hooks/useProjects";
import { useUIStore } from "../state/uiStore";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

export function ActionDialogs() {
  return (
    <>
      <ProjectDialog />
      <UploadDialog />
      <InsightRunDialog />
      <DecisionDialog />
      <TaskDialog />
    </>
  );
}

function ProjectDialog() {
  const queryClient = useQueryClient();
  const activeDialog = useUIStore((state) => state.activeDialog);
  const closeDialog = useUIStore((state) => state.closeDialog);
  const setSelectedProjectId = useUIStore((state) => state.setSelectedProjectId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.createProject({ name, description }),
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      setSelectedProjectId(project.id);
      toast.success(`Created ${project.name}`);
      setName("");
      setDescription("");
      closeDialog();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create project");
    },
  });

  const open = activeDialog === "project";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeDialog();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>Define a project you want to synthesize insights for.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Customer onboarding research"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Context, goals, target audience…"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={closeDialog} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UploadDialog() {
  const activeDialog = useUIStore((state) => state.activeDialog);
  const closeDialog = useUIStore((state) => state.closeDialog);
  const selectedProjectId = useUIStore((state) => state.selectedProjectId);
  const setSelectedProjectId = useUIStore((state) => state.setSelectedProjectId);
  const { data: projects } = useProjects();
  const queryClient = useQueryClient();

  const [projectId, setProjectId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [kind, setKind] = useState("document");

  const mutation = useMutation({
    mutationFn: () => {
      if (!projectId || !file) {
        throw new Error("Project and file are required");
      }
      return api.uploadSource({
        projectId,
        file,
        kind,
        title: title || undefined,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
    },
    onSuccess: async (source) => {
      await queryClient.invalidateQueries({ queryKey: ["sources", projectId ?? "all"] });
      toast.success(`Uploaded ${source.title ?? "source"}`);
      setFile(null);
      setTitle("");
      setTags("");
      closeDialog();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to upload");
    },
  });

  const open = activeDialog === "upload";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectId) {
      toast.error("Select a project to attach the source to");
      return;
    }
    if (!file) {
      toast.error("Choose a file to upload");
      return;
    }
    mutation.mutate();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      closeDialog();
    } else {
      setProjectId(selectedProjectId ?? projects?.[0]?.id ?? null);
      if (!selectedProjectId && projects?.[0]?.id) {
        setSelectedProjectId(projects[0].id);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload source</DialogTitle>
          <DialogDescription>Supported files: PDF, Markdown, or plain text.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="upload-project">Project</Label>
            <select
              id="upload-project"
              value={projectId ?? ""}
              onChange={(event) => setProjectId(event.target.value || null)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">Select a project</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="upload-file">File</Label>
            <Input
              id="upload-file"
              type="file"
              accept=".pdf,.md,.txt"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <Label htmlFor="upload-title">Title</Label>
            <Input
              id="upload-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Optional label for this source"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="upload-kind">Kind</Label>
              <select
                id="upload-kind"
                value={kind}
                onChange={(event) => setKind(event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="document">Document</option>
                <option value="transcript">Transcript</option>
                <option value="note">Note</option>
              </select>
            </div>
            <div>
              <Label htmlFor="upload-tags">Tags</Label>
              <Input
                id="upload-tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="Comma separated (e.g. discovery, interview)"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" type="button" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InsightRunDialog() {
  const activeDialog = useUIStore((state) => state.activeDialog);
  const closeDialog = useUIStore((state) => state.closeDialog);
  const selectedProjectId = useUIStore((state) => state.selectedProjectId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedProjectId) {
        throw new Error("Select a project before starting a run");
      }
      return api.createInsightRun({ project_id: selectedProjectId, prompt: prompt || undefined });
    },
    onSuccess: async (run) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["insight-runs", selectedProjectId ?? "all"] }),
        queryClient.invalidateQueries({ queryKey: ["themes", run.id] }),
      ]);
      toast.success("Insight run started");
      closeDialog();
      navigate(`/runs/${run.id}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to start run");
    },
  });

  const open = activeDialog === "analyze";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeDialog();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start insight run</DialogTitle>
          <DialogDescription>
            We will synthesize the current project sources into themes, claims, and citations.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="run-prompt">Optional guidance</Label>
            <Textarea
              id="run-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Key questions or focus areas for this synthesis."
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" type="button" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || !selectedProjectId}>
              {mutation.isPending ? "Running…" : "Start run"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DecisionDialog() {
  const activeDialog = useUIStore((state) => state.activeDialog);
  const closeDialog = useUIStore((state) => state.closeDialog);
  const selectedProjectId = useUIStore((state) => state.selectedProjectId);
  const decisionDraft = useUIStore((state) => state.decisionDraft);
  const setDecisionDraft = useUIStore((state) => state.setDecisionDraft);
  const clearDecisionDraft = useUIStore((state) => state.clearDecisionDraft);
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [rationale, setRationale] = useState("");
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [risks, setRisks] = useState("");
  const [confidence, setConfidence] = useState(0.6);
  const [citationIds, setCitationIds] = useState<string[]>([]);
  const [linkedClaimIds, setLinkedClaimIds] = useState<string[]>([]);

  useEffect(() => {
    if (activeDialog === "decision") {
      setTitle(decisionDraft.title);
      setRationale(decisionDraft.rationale);
      setPros(decisionDraft.pros);
      setCons(decisionDraft.cons);
      setRisks(decisionDraft.risks);
      setConfidence(decisionDraft.confidence ?? 0.6);
      setCitationIds(decisionDraft.citationSourceIds);
      setLinkedClaimIds(decisionDraft.linkedClaimIds);
    }
  }, [activeDialog, decisionDraft]);

  const { data: sources } = useQuery({
    queryKey: ["sources", selectedProjectId ?? "all"],
    queryFn: () => api.getSources(selectedProjectId ?? undefined),
    enabled: Boolean(selectedProjectId),
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedProjectId) {
        throw new Error("Select a project first");
      }
      if (!title.trim()) {
        throw new Error("Decision title is required");
      }
      return api.createDecision({
        project_id: selectedProjectId,
        title,
        rationale,
        pros,
        cons,
        risks,
        confidence,
        citation_source_ids: citationIds,
        linked_claim_ids: linkedClaimIds,
      });
    },
    onSuccess: async (decision) => {
      await queryClient.invalidateQueries({ queryKey: ["decisions", selectedProjectId ?? "all"] });
      toast.success(`Logged decision "${decision.title}"`);
      setTitle("");
      setRationale("");
      setPros("");
      setCons("");
      setRisks("");
      setConfidence(0.6);
      setCitationIds([]);
      setLinkedClaimIds([]);
      clearDecisionDraft();
      closeDialog();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to record decision");
    },
  });

  const open = activeDialog === "decision";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate();
  };

  const toggleCitation = (id: string) => {
    setCitationIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      setDecisionDraft({ citationSourceIds: next });
      return next;
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeDialog();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record decision</DialogTitle>
          <DialogDescription>Capture the rationale and link to sources backing this decision.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="decision-title">Title</Label>
            <Input
              id="decision-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setDecisionDraft({ title: event.target.value });
              }}
              placeholder="e.g. Expand pilot to APAC"
            />
          </div>
          <div>
            <Label htmlFor="decision-rationale">Rationale</Label>
            <Textarea
              id="decision-rationale"
              value={rationale}
              onChange={(event) => {
                setRationale(event.target.value);
                setDecisionDraft({ rationale: event.target.value });
              }}
              placeholder="What evidence and signals led to this call?"
              rows={4}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="decision-pros">Pros</Label>
              <Textarea
                id="decision-pros"
                value={pros}
                onChange={(event) => {
                  setPros(event.target.value);
                  setDecisionDraft({ pros: event.target.value });
                }}
                placeholder="Positive outcomes"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="decision-cons">Cons</Label>
              <Textarea
                id="decision-cons"
                value={cons}
                onChange={(event) => {
                  setCons(event.target.value);
                  setDecisionDraft({ cons: event.target.value });
                }}
                placeholder="Trade-offs"
                rows={3}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
            <div className="space-y-2">
              <Label htmlFor="decision-risks">Risks</Label>
              <Textarea
                id="decision-risks"
                value={risks}
                onChange={(event) => {
                  setRisks(event.target.value);
                  setDecisionDraft({ risks: event.target.value });
                }}
                placeholder="Risks and mitigations"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="decision-confidence">Confidence</Label>
              <Input
                id="decision-confidence"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={confidence}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  setConfidence(nextValue);
                  setDecisionDraft({ confidence: nextValue });
                }}
              />
              <p className="text-xs text-foreground/60">Enter a value between 0 and 1.</p>
            </div>
          </div>
          {linkedClaimIds.length > 0 && (
            <div className="space-y-2">
              <Label>Linked claims</Label>
              <div className="rounded-lg border border-border/70 bg-muted/40 p-3 text-xs text-foreground/70">
                {linkedClaimIds.map((claimId) => (
                  <div key={claimId} className="truncate">{claimId}</div>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label>Citations</Label>
            <div className="max-h-40 space-y-2 overflow-auto rounded-lg border border-border/80 p-3 text-sm">
              {sources && sources.length > 0 ? (
                sources.map((source) => (
                  <button
                    type="button"
                    key={source.id}
                    onClick={() => toggleCitation(source.id)}
                    className={cn(
                      "w-full rounded-md border border-border/70 px-3 py-2 text-left transition hover:bg-muted",
                      citationIds.includes(source.id) && "border-ring bg-muted"
                    )}
                  >
                    <div className="font-medium text-foreground">{source.title ?? source.uri}</div>
                    <div className="text-xs text-foreground/60">{source.tags?.join(", ")}</div>
                  </button>
                ))
              ) : (
                <div className="text-xs text-foreground/60">Upload sources to cite them here.</div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" type="button" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save decision"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaskDialog() {
  const activeDialog = useUIStore((state) => state.activeDialog);
  const closeDialog = useUIStore((state) => state.closeDialog);
  const selectedProjectId = useUIStore((state) => state.selectedProjectId);
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("todo");
  const [owner, setOwner] = useState("");
  const [dueDate, setDueDate] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedProjectId) {
        throw new Error("Select a project first");
      }
      if (!title.trim()) {
        throw new Error("Task title is required");
      }
      return api.createTask({
        project_id: selectedProjectId,
        title,
        status,
        owner: owner || undefined,
        due_date: dueDate || undefined,
      });
    },
    onSuccess: async (task) => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", selectedProjectId ?? "all"] });
      toast.success(`Task "${task.title}" added`);
      setTitle("");
      setOwner("");
      setStatus("todo");
      setDueDate("");
      closeDialog();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create task");
    },
  });

  const open = activeDialog === "task";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeDialog();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>Delegate follow-ups arising from the insight review.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Validate feature concept with 5 customers"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="task-status">Status</Label>
              <select
                id="task-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <Label htmlFor="task-owner">Owner</Label>
              <Input
                id="task-owner"
                value={owner}
                onChange={(event) => setOwner(event.target.value)}
                placeholder="Optional assignee"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="task-due">Due date</Label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" type="button" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
