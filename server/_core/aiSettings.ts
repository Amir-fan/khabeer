import { getSetting } from "../db";

export type AiSettings = {
  systemPrompt?: string | null;
  memoryEnabled: boolean;
  maxTokens?: number | null;
  shortMaxTokens?: number | null;
};

const DEFAULT_MAX_TOKENS = 2000;
const DEFAULT_SHORT_MAX_TOKENS = 150;

function parseBoolean(val: string | null): boolean | null {
  if (val === null || val === undefined) return null;
  const lowered = val.toString().trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(lowered)) return true;
  if (["false", "0", "no", "off"].includes(lowered)) return false;
  return null;
}

function parseNumber(val: string | null): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

/**
 * Load AI runtime settings from system settings.
 * Keys (string):
 * - ai:systemPrompt
 * - ai:memoryEnabled ("true"/"false")
 * - ai:maxTokens (number)
 * - ai:shortMaxTokens (number)
 */
export async function loadAiSettings(): Promise<AiSettings> {
  const systemPrompt = (await getSetting("ai:systemPrompt")) ?? null;
  const memoryEnabledRaw = await getSetting("ai:memoryEnabled");
  const maxTokensRaw = await getSetting("ai:maxTokens");
  const shortMaxTokensRaw = await getSetting("ai:shortMaxTokens");

  const memoryParsed = parseBoolean(memoryEnabledRaw);
  const maxTokensParsed = parseNumber(maxTokensRaw);
  const shortMaxTokensParsed = parseNumber(shortMaxTokensRaw);

  return {
    systemPrompt,
    memoryEnabled: memoryParsed !== null ? memoryParsed : true,
    maxTokens: maxTokensParsed ?? DEFAULT_MAX_TOKENS,
    shortMaxTokens: shortMaxTokensParsed ?? DEFAULT_SHORT_MAX_TOKENS,
  };
}

