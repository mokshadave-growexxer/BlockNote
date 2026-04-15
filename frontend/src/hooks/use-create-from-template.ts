import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { Template } from "../constants/templates";
import { createDocumentFromTemplate } from "../services/template-service";
import { useTemplateStore } from "../store/template-store";

interface UseCreateFromTemplateReturn {
  create: (template: Template) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useCreateFromTemplate(): UseCreateFromTemplateReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const closeModal = useTemplateStore((s) => s.closeModal);

  const create = useCallback(
    async (template: Template) => {
      setIsLoading(true);
      setError(null);
      try {
        const documentId = await createDocumentFromTemplate(template);
        // Refresh document list in background
        await queryClient.invalidateQueries({ queryKey: ["documents"] });
        closeModal();
        navigate(`/editor/${documentId}`);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to create document. Please try again.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, queryClient, closeModal]
  );

  return { create, isLoading, error };
}
