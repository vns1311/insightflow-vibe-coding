import { create } from "zustand";

type DialogType = "project" | "upload" | "analyze" | "decision" | "task" | null;

export interface DecisionDraft {
  title: string;
  rationale: string;
  pros: string;
  cons: string;
  risks: string;
  confidence: number;
  linkedClaimIds: string[];
  citationSourceIds: string[];
}

const emptyDecisionDraft: DecisionDraft = {
  title: "",
  rationale: "",
  pros: "",
  cons: "",
  risks: "",
  confidence: 0.6,
  linkedClaimIds: [],
  citationSourceIds: [],
};

interface UIState {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  activeDialog: DialogType;
  openDialog: (dialog: Exclude<DialogType, null>) => void;
  closeDialog: () => void;
  decisionDraft: DecisionDraft;
  setDecisionDraft: (draft: Partial<DecisionDraft>) => void;
  clearDecisionDraft: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedProjectId: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  activeDialog: null,
  openDialog: (dialog) => set({ activeDialog: dialog }),
  closeDialog: () => set({ activeDialog: null }),
  decisionDraft: emptyDecisionDraft,
  setDecisionDraft: (draft) =>
    set((state) => ({ decisionDraft: { ...state.decisionDraft, ...draft } })),
  clearDecisionDraft: () => set({ decisionDraft: emptyDecisionDraft }),
}));
