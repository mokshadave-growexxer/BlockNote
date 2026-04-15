import { create } from "zustand";

interface TemplateState {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const useTemplateStore = create<TemplateState>((set) => ({
  isOpen: false,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
}));
