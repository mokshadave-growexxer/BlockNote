import { create } from "zustand";

export type AIAction = "grammar" | "paraphrase" | "summary";

interface AIState {
  isOpen: boolean;
  action: AIAction | null;
  inputText: string;
  result: string;
  isLoading: boolean;
  error: string | null;
  openModal: (action: AIAction, text: string) => void;
  closeModal: () => void;
  setResult: (result: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAIStore = create<AIState>((set) => ({
  isOpen: false,
  action: null,
  inputText: "",
  result: "",
  isLoading: false,
  error: null,
  openModal: (action, inputText) =>
    set({ isOpen: true, action, inputText, result: "", error: null, isLoading: false }),
  closeModal: () =>
    set({ isOpen: false, action: null, inputText: "", result: "", error: null, isLoading: false }),
  setResult: (result) => set({ result }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
