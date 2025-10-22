import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";
import { api } from "../lib/api";
import { formatDate } from "../lib/utils";
import type { Decision, Task } from "../lib/types";
import { useUIStore } from "../state/uiStore";

const STATUSES = [
  { key: "todo", label: "To-Do" },
  { key: "in_progress", label: "Doing" },
  { key: "done", label: "Done" },
];

type BoardKey = string | "unassigned";

export function TaskBoardPage() {
  const selectedProjectId = useUIStore((state) => state.selectedProjectId);
  const openDialog = useUIStore((state) => state.openDialog);
  const queryClient = useQueryClient();

  const { data: tasks, isLoading: isLoadingTasks } = useQuery({
    queryKey: ["tasks", selectedProjectId ?? "all"],
    queryFn: () => api.getTasks(selectedProjectId ?? undefined),
  });

  const { data: decisions } = useQuery({
    queryKey: ["decisions", selectedProjectId ?? "all"],
    queryFn: () => api.getDecisions(selectedProjectId ?? undefined),
  });

  const [drafts, setDrafts] = useState<Record<BoardKey, string>>({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<{ title: string; owner: string; due_date: string } | null>(null);

  const createTask = useMutation({
    mutationFn: api.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", selectedProjectId ?? "all"] });
      toast.success("Task created");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to create task");
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Parameters<typeof api.updateTask>[1] }) =>
      api.updateTask(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", selectedProjectId ?? "all"] });
      toast.success("Task updated");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to update task");
    },
  });

  const deleteTask = useMutation({
    mutationFn: api.deleteTask,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", selectedProjectId ?? "all"] });
      toast.success("Task deleted");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete task");
    },
  });

  const decisionSections: Array<Decision | { id: "unassigned"; title: string }> = useMemo(() => {
    const base = decisions ?? [];
    return [...base, { id: "unassigned", title: "Unassigned tasks" }];
  }, [decisions]);

  const board = useMemo(() => {
    const map = new Map<BoardKey, Record<string, Task[]>>();
    const ensure = (key: BoardKey) => {
      if (!map.has(key)) {
        map.set(key, {
          todo: [],
          in_progress: [],
          done: [],
        });
      }
      return map.get(key)!;
    };
    tasks?.forEach((task) => {
      const key: BoardKey = (task.decision_id as BoardKey) ?? "unassigned";
      const columns = ensure(key);
      const status = STATUSES.find((item) => item.key === task.status) ? task.status : "todo";
      columns[status]?.push(task);
    });
    return map;
  }, [tasks]);

  const handleDraftChange = (key: BoardKey, value: string) => {
    setDrafts((current) => ({ ...current, [key]: value }));
  };

  const handleAddTask = (key: BoardKey, decisionId?: string | null) => {
    const title = drafts[key]?.trim();
    if (!title || !selectedProjectId) {
      toast.error("Enter a task title first");
      return;
    }
    createTask.mutate({
      project_id: selectedProjectId,
      title,
      status: "todo",
      decision_id: decisionId ?? null,
    });
    setDrafts((current) => ({ ...current, [key]: "" }));
  };

  const handleStatusChange = (task: Task, status: string) => {
    updateTask.mutate({ taskId: task.id, data: { status } });
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingValues({
      title: task.title,
      owner: task.owner ?? "",
      due_date: task.due_date?.slice(0, 10) ?? "",
    });
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingValues(null);
  };

  const saveEditing = (task: Task) => {
    if (!editingValues) return;
    updateTask.mutate({
      taskId: task.id,
      data: {
        title: editingValues.title,
        owner: editingValues.owner || null,
        due_date: editingValues.due_date || null,
      },
    });
    cancelEditing();
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Task Board</h1>
          <p className="text-sm text-foreground/70">
            Track follow-ups emerging from your insights and decisions.
          </p>
        </div>
        <Button onClick={() => openDialog("task")}>New task</Button>
      </div>
      <Separator />

      {isLoadingTasks && <div className="text-sm text-foreground/60">Loading tasks…</div>}

      <div className="space-y-6">
        {decisionSections.map((decision) => {
          const key: BoardKey = decision.id === "unassigned" ? "unassigned" : (decision.id as BoardKey);
          const columns = board.get(key) ?? { todo: [], in_progress: [], done: [] };
          const decisionTitle = decision.id === "unassigned" ? decision.title : decision.title;
          const draft = drafts[key] ?? "";

          return (
            <Card key={decision.id} className="space-y-4 bg-background/80">
              <CardHeader className="flex flex-col gap-2">
                <CardTitle className="text-lg font-semibold">
                  {decisionTitle}
                </CardTitle>
                {decision.id !== "unassigned" && (
                  <Button variant="ghost" className="w-fit px-0 text-xs text-foreground/70" onClick={() => openDialog("decision")}>
                    View decision details
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {STATUSES.map((status) => {
                    const columnTasks = columns[status.key] ?? [];
                    return (
                      <div key={status.key} className="rounded-xl border border-dashed border-border/70 bg-white/70 p-3">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-foreground">{status.label}</h3>
                          <span className="text-xs text-foreground/50">{columnTasks.length}</span>
                        </div>

                        {status.key === "todo" && (
                          <div className="mb-3 flex items-center gap-2">
                            <Input
                              placeholder="Add task"
                              value={draft}
                              onChange={(event) => handleDraftChange(key, event.target.value)}
                              className="h-9 flex-1"
                            />
                            <Button
                              variant="secondary"
                              className="px-3"
                              onClick={() => handleAddTask(key, decision.id === "unassigned" ? null : (decision.id as string))}
                              disabled={createTask.isPending}
                            >
                              Add
                            </Button>
                          </div>
                        )}

                        <div className="space-y-3">
                          {columnTasks.length ? (
                            columnTasks.map((task) => {
                              const isEditing = editingTaskId === task.id;
                              return (
                                <div key={task.id} className="rounded-lg border border-border/70 bg-muted/30 p-3 shadow-subtle">
                                  {isEditing && editingValues ? (
                                    <div className="space-y-3 text-sm">
                                      <Input
                                        value={editingValues.title}
                                        onChange={(event) =>
                                          setEditingValues((prev) => prev && { ...prev, title: event.target.value })
                                        }
                                      />
                                      <div className="grid gap-2 md:grid-cols-2">
                                        <Input
                                          placeholder="Owner"
                                          value={editingValues.owner}
                                          onChange={(event) =>
                                            setEditingValues((prev) => prev && { ...prev, owner: event.target.value })
                                          }
                                        />
                                        <Input
                                          type="date"
                                          value={editingValues.due_date}
                                          onChange={(event) =>
                                            setEditingValues((prev) => prev && { ...prev, due_date: event.target.value })
                                          }
                                        />
                                      </div>
                                      <div className="flex items-center justify-end gap-2">
                                        <Button variant="ghost" onClick={cancelEditing}>
                                          Cancel
                                        </Button>
                                        <Button variant="secondary" onClick={() => saveEditing(task)}>
                                          Save
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-3 text-sm text-foreground/80">
                                      <div className="flex items-start justify-between gap-2">
                                        <p className="font-medium text-foreground">{task.title}</p>
                                        <button
                                          className="text-xs text-foreground/60 underline"
                                          onClick={() => startEditing(task)}
                                        >
                                          Edit
                                        </button>
                                      </div>
                                      <div className="text-xs text-foreground/60">
                                        Owner: {task.owner || "Unassigned"} • Due {formatDate(task.due_date)}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <label className="text-xs text-foreground/50" htmlFor={`status-${task.id}`}>
                                          Status
                                        </label>
                                        <select
                                          id={`status-${task.id}`}
                                          value={task.status}
                                          onChange={(event) => handleStatusChange(task, event.target.value)}
                                          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                                        >
                                          {STATUSES.map((option) => (
                                            <option key={option.key} value={option.key}>
                                              {option.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <button
                                        className="text-xs text-red-500 underline"
                                        onClick={() => {
                                          if (window.confirm("Delete this task?")) {
                                            deleteTask.mutate(task.id);
                                          }
                                        }}
                                      >
                                        Delete task
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-foreground/50">No tasks yet.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
