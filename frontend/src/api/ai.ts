import { http } from "./http";
import type { AIAction } from "../store/ai-store";

export async function processAI(action: AIAction, text: string): Promise<string> {
  const { data } = await http.post<{ result: string }>("/ai/process", { action, text });
  return data.result;
}

export async function generateMioContent(prompt: string, context?: string): Promise<string> {
  const { data } = await http.post<{ markdown: string }>("/ai/mio", { prompt, context });
  return data.markdown;
}
