import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";

const aiSchema = z.object({
  action: z.enum(["grammar", "paraphrase", "summary"]),
  text: z.string().min(1).max(10000)
});

const PROMPTS: Record<string, (text: string) => string> = {
  grammar: (text) =>
    `Correct the grammar of the following text without changing its meaning. Return only the corrected text, no explanations:\n\n${text}`,
  paraphrase: (text) =>
    `Paraphrase the following text while preserving its meaning. Return only the paraphrased text, no explanations:\n\n${text}`,
  summary: (text) =>
    `Summarize the following text concisely in 2-4 sentences. Return only the summary:\n\n${text}`
};

export async function processAI(request: Request, response: Response) {
  try {
    const { action, text } = aiSchema.parse(request.body);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      response.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        message: "AI service not configured. Please set GEMINI_API_KEY in your environment."
      });
      return;
    }

    const prompt = PROMPTS[action](text);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errData = await geminiResponse.json().catch(() => ({}));
      response.status(StatusCodes.BAD_GATEWAY).json({
        message: "AI service error",
        details: (errData as any)?.error?.message ?? "Unknown error"
      });
      return;
    }

    const data = await geminiResponse.json() as any;
    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    response.status(StatusCodes.OK).json({ result });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      response.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid request", errors: error.errors });
      return;
    }
    throw error;
  }
}
