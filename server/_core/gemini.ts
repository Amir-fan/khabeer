/**
 * Direct Gemini API client
 * Uses Google Gemini API directly (not through proxy)
 */

import { ENV } from "./env";
import { logger } from "./logger";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

interface GeminiMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

interface GeminiRequest {
  contents: GeminiMessage[];
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Invoke Gemini API directly
 */
export async function invokeGemini(params: {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
}): Promise<{
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    logger.error("GEMINI_API_KEY is not configured");
    throw new Error("AI service is not configured. Please contact support.");
  }

  const request: GeminiRequest = {
    contents: [
      {
        role: "user",
        parts: [{ text: params.userMessage }],
      },
    ],
    systemInstruction: {
      parts: [{ text: params.systemPrompt }],
    },
    generationConfig: {
      temperature: params.temperature ?? 0.7,
      maxOutputTokens: params.maxTokens ?? 8192,
      responseMimeType: params.responseFormat === "json" ? "application/json" : undefined,
    },
  };

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Gemini API error", new Error(errorText), { status: response.status });
      throw new Error(`AI service error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GeminiResponse;

    if (!data.candidates || data.candidates.length === 0) {
      logger.error("Gemini API returned no candidates");
      throw new Error("AI service returned no response");
    }

    const candidate = data.candidates[0];
    const text = candidate.content.parts[0]?.text || "";

    if (!text) {
      logger.error("Gemini API returned empty text");
      throw new Error("AI service returned empty response");
    }

    return {
      text,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount,
          }
        : undefined,
    };
  } catch (error) {
    logger.error("Gemini API invocation failed", error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Mandatory disclaimer for all AI responses
 */
export const AI_DISCLAIMER = `
---
⚠️ تنبيه مهم:
هذا التحليل يُقدم لأغراض تعليمية فقط ولا يُعتبر حكماً شرعياً ملزماً أو نصيحة استثمارية. القرار النهائي يبقى مسؤولية المستخدم. يُنصح بمراجعة متخصص شرعي معتمد للحالات المعقدة.
`;

