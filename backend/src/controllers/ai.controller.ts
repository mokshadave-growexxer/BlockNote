import type { Request, Response as ExpressResponse } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";

const aiSchema = z.object({
  action: z.enum(["grammar", "paraphrase", "summary"]),
  text: z.string().min(1).max(10000)
});

const mioSchema = z.object({
  prompt: z.string().trim().min(1).max(10000),
  context: z.string().trim().max(20000).optional()
});

const MIO_SYSTEM_PROMPT = `You are Mio AI, an intelligent and creative writing assistant inside a note-taking application.

Your job is to generate high-quality, well-structured content based on user input.

Rules:
- Output ONLY clean Markdown.
- Do NOT include explanations or extra text.
- Use headings, bullet points, numbered lists, and tables when appropriate.
- For to-do lists, use:
  - [ ] Task
- Do NOT include images, image placeholders, or Markdown image syntax.
- Format code using proper Markdown code blocks.
- Adapt tone based on request (formal, casual, etc.).
- Keep content clear, useful, and well-structured.

The output MUST be compatible with Markdown-to-BlockNote conversion.`;

const PROMPTS: Record<string, (text: string) => string> = {
  grammar: (text) =>
    `Correct the grammar of the following text without changing its meaning. Return only the corrected text, no explanations:\n\n${text}`,
  paraphrase: (text) =>
    `Paraphrase the following text while preserving its meaning. Return only the paraphrased text, no explanations:\n\n${text}`,
  summary: (text) =>
    `Summarize the following text concisely in 2-4 sentences. Return only the summary:\n\n${text}`
};

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL?.trim(),
  "gemini-2.5-flash",
  "gemini-2.0-flash"
].filter((value): value is string => Boolean(value));

type GeminiRequestBody = {
  contents: Array<{
    role?: string;
    parts: Array<{ text: string }>;
  }>;
  generationConfig?: Record<string, unknown>;
  system_instruction?: {
    parts: Array<{ text: string }>;
  };
};

function extractGeminiText(data: any) {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

async function parseGeminiError(geminiResponse: globalThis.Response) {
  const errData = await geminiResponse.json().catch(async () => {
    const text = await geminiResponse.text().catch(() => "");
    return text ? { error: { message: text } } : {};
  });

  return (errData as any)?.error?.message ?? "Unknown error";
}

async function generateWithGemini(apiKey: string, body: GeminiRequestBody) {
  let lastError = "Unknown error";

  for (const model of GEMINI_MODELS) {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000)
      }
    );

    if (geminiResponse.ok) {
      const data = await geminiResponse.json();
      const text = extractGeminiText(data);

      if (text) {
        return text;
      }

      lastError = "Gemini returned an empty response.";
      continue;
    }

    lastError = await parseGeminiError(geminiResponse);

    const isModelIssue =
      geminiResponse.status === StatusCodes.NOT_FOUND ||
      geminiResponse.status === StatusCodes.BAD_REQUEST;

    if (!isModelIssue) {
      break;
    }
  }

  const error = new Error(lastError);
  (error as Error & { status?: number }).status = StatusCodes.BAD_GATEWAY;
  throw error;
}

export async function processAI(request: Request, response: ExpressResponse) {
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
    const result = await generateWithGemini(apiKey, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
    });

    response.status(StatusCodes.OK).json({ result });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      response.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid request", errors: error.errors });
      return;
    }

    response.status(error?.status ?? StatusCodes.BAD_GATEWAY).json({
      message: "AI service error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

export async function generateMioContent(request: Request, response: ExpressResponse) {
  try {
    const { prompt, context } = mioSchema.parse(request.body);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      response.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        message: "AI service not configured. Please set GEMINI_API_KEY in your environment."
      });
      return;
    }

    const userPrompt = context
      ? `User request:\n${prompt}\n\nOptional current document context:\n${context}`
      : `User request:\n${prompt}`;
    const markdown = await generateWithGemini(apiKey, {
      system_instruction: { parts: [{ text: MIO_SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
    });

    response.status(StatusCodes.OK).json({ markdown });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      response.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid request", errors: error.errors });
      return;
    }

    response.status(error?.status ?? StatusCodes.BAD_GATEWAY).json({
      message: "Mio AI service error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
