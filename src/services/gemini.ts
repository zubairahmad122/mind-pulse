/**
 * Google Gemini API — generates personalized wellness insights from journal entries.
 * Uses Gemini 2.5 Flash (free tier via Google AI Studio).
 *
 * Falls back gracefully (returns null) when the API key is missing or the call fails.
 */

const MODEL = 'gemini-2.5-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function getApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  return key && key.length > 0 ? key : null;
}

function buildPrompt(mood: string, triggers: string[], text: string): string {
  return [
    'You are a gentle, empathetic wellness coach. Read the user\'s journal entry and provide a brief,',
    'insightful reflection (1–3 sentences). Be warm, specific, and actionable. Do not use markdown.',
    'Do not mention that you are an AI. Speak directly to the user.',
    '',
    `Mood: ${mood}`,
    `Triggers: ${triggers.length > 0 ? triggers.join(', ') : 'none noted'}`,
    `Reflection: "${text}"`,
    '',
    'Provide a short wellness insight:',
  ].join('\n');
}

export interface GeminiInsightResult {
  insight: string;
  /** Approximate time the API took, in ms. */
  latencyMs: number;
}

/**
 * Calls Gemini Flash 2.5 to generate a personalized wellness insight
 * based on the user's mood, triggers, and journal text.
 *
 * Returns `null` when the API key is not configured or the request fails,
 * so the caller can fall back to a local default.
 */
/**
 * Constructs the prompt for home-screen insights based on the user's current scores.
 */
function buildHomePrompt(params: {
  mindPulseScore: number;
  eyeScore: number;
  sleepScore: number;
  mindScore: number;
  focusArea: string;
  eyeDetail: string;
  sleepDetail: string;
  mindDetail: string;
  hour: number;
}): string {
  const tod = params.hour < 12 ? 'morning' : params.hour < 17 ? 'afternoon' : params.hour < 21 ? 'evening' : 'night';
  return [
    'You are a warm, empathetic wellness coach. The user just checked their MindPulse dashboard.',
    'Provide ONE short, encouraging sentence (max 20 words) that references their actual scores.',
    'Do not use markdown or emoji. Do not mention that you are an AI. Do not use clichés.',
    'Be direct, human, and specific to their numbers.',
    '',
    `MindPulse Score: ${params.mindPulseScore}/100`,
    `Eyes: ${params.eyeScore}/100 (weakest metric: ${params.eyeDetail})`,
    `Sleep: ${params.sleepScore}/100 (weakest metric: ${params.sleepDetail})`,
    `Mind: ${params.mindScore}/100 (weakest metric: ${params.mindDetail})`,
    `Focus area (lowest score): ${params.focusArea}`,
    `Time of day: ${tod}`,
    '',
    'Your short insight:',
  ].join('\n');
}

/**
 * Constructs the prompt for the home-screen tagline based on the user's focus area and score.
 */
function buildTaglinePrompt(params: {
  mindPulseScore: number;
  focusArea: string;
  hour: number;
}): string {
  const tod = params.hour < 12 ? 'morning' : params.hour < 17 ? 'afternoon' : params.hour < 21 ? 'evening' : 'night';
  return [
    'You are a warm wellness coach. Generate ONE short tagline (max 10 words) that',
    'acknowledges the user\'s situation and gently suggests action.',
    'No markdown. No emoji. No AI disclaimers.',
    '',
    `Current score: ${params.mindPulseScore}/100`,
    `Area needing most attention: ${params.focusArea}`,
    `Time: ${tod}`,
    '',
    'Tagline:',
  ].join('\n');
}

/**
 * Calls Gemini Flash 2.5 to generate the home-screen insight text.
 */
export async function generateHomeInsight(params: {
  mindPulseScore: number;
  eyeScore: number;
  sleepScore: number;
  mindScore: number;
  focusArea: string;
  eyeDetail: string;
  sleepDetail: string;
  mindDetail: string;
  hour: number;
}): Promise<string | null> {
  const key = getApiKey();
  if (!key) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(
      `${API_BASE}/${MODEL}:generateContent`,
      {
        signal: controller.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: buildHomePrompt(params) }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 80,
            temperature: 0.8,
            topP: 0.9,
          },
        }),
      },
    );

    clearTimeout(timeoutId);
    if (!res.ok) return null;

    const data = await res.json() as {
      candidates?: { content?: { parts?: { text: string }[] } }[];
    };
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return raw?.trim() ?? null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Calls Gemini Flash 2.5 to generate the home-screen tagline.
 */
export async function generateTagline(params: {
  mindPulseScore: number;
  focusArea: string;
  hour: number;
}): Promise<string | null> {
  const key = getApiKey();
  if (!key) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(
      `${API_BASE}/${MODEL}:generateContent`,
      {
        signal: controller.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: buildTaglinePrompt(params) }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 40,
            temperature: 0.8,
            topP: 0.9,
          },
        }),
      },
    );

    clearTimeout(timeoutId);
    if (!res.ok) return null;

    const data = await res.json() as {
      candidates?: { content?: { parts?: { text: string }[] } }[];
    };
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return raw?.trim() ?? null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Constructs the prompt for personalised sleep tips based on sleep data and journal entries.
 */
function buildSleepTipPrompt(params: {
  avgBedtime: string;
  avgWakeTime: string;
  avgDurationHours: number;
  consistencyScore: number;
  avgQuality: number | null;
  sessionCount: number;
  scheduleBedtime: string;
  scheduleWakeTime: string;
  recentJournalEntries: { mood: string; triggers: string[]; text: string; aiInsight?: string }[];
}): string {
  const journalSection = params.recentJournalEntries.length > 0
    ? `\nRecent journal reflections:\n${params.recentJournalEntries.slice(0, 3).map((e, i) =>
        `  ${i + 1}. Mood: ${e.mood} | Triggers: ${e.triggers.join(', ') || 'none'} | "${e.text.slice(0, 120)}"`
      ).join('\n')}`
    : '\nNo recent journal entries.';

  return [
    'You are a warm, science-informed sleep coach. The user is setting up their sleep routine.',
    'Provide ONE specific, actionable recommendation (2-3 sentences) based on their actual sleep data.',
    'Reference their numbers naturally. Do not use markdown. Do not mention that you are an AI.',
    'Be direct, human, and practical.',
    '',
    'Sleep data:',
    `  Average bedtime: ${params.avgBedtime}`,
    `  Average wake time: ${params.avgWakeTime}`,
    `  Average duration: ${params.avgDurationHours}h`,
    `  Schedule target bedtime: ${params.scheduleBedtime}`,
    `  Schedule target wake: ${params.scheduleWakeTime}`,
    `  Consistency score (0-100): ${params.consistencyScore}`,
    `  Average quality (1-5): ${params.avgQuality ?? 'no data'}`,
    `  Sessions analyzed: ${params.sessionCount}`,journalSection,
    '',
    'Your sleep recommendation:',
  ].join('\n');
}

/**
 * Calls Gemini Flash 2.5 to generate a personalised sleep recommendation
 * based on the user's sleep tracking data and recent journal entries.
 */
export async function generateSleepTip(params: {
  avgBedtime: string;
  avgWakeTime: string;
  avgDurationHours: number;
  consistencyScore: number;
  avgQuality: number | null;
  sessionCount: number;
  scheduleBedtime: string;
  scheduleWakeTime: string;
  recentJournalEntries: { mood: string; triggers: string[]; text: string; aiInsight?: string }[];
}): Promise<string | null> {
  const key = getApiKey();
  if (!key) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(
      `${API_BASE}/${MODEL}:generateContent`,
      {
        signal: controller.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: buildSleepTipPrompt(params) }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 120,
            temperature: 0.8,
            topP: 0.9,
          },
        }),
      },
    );

    clearTimeout(timeoutId);
    if (!res.ok) return null;

    const data = await res.json() as {
      candidates?: { content?: { parts?: { text: string }[] } }[];
    };
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return raw?.trim() ?? null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Constructs the prompt for daily wellness tips based on the user's scores and journal data.
 */
function buildDailyTipPrompt(params: {
  mindPulseScore: number;
  eyeScore: number;
  sleepScore: number;
  mindScore: number;
  focusArea: string;
  recentJournalEntries: { mood: string; triggers: string[]; text: string }[];
}): string {
  const journalSection = params.recentJournalEntries.length > 0
    ? `\nRecent journal themes:\n${params.recentJournalEntries.slice(0, 3).map((e, i) =>
        `  ${i + 1}. Mood: ${e.mood} | Triggers: ${e.triggers.join(', ') || 'none'}`
      ).join('\n')}`
    : '';

  return [
    'You are a warm, practical wellness coach. The user is checking their daily dashboard.',
    'Provide ONE short, actionable wellness tip (1-2 sentences, max 25 words) based on their',
    'current scores and journal context. Be specific, not generic. No markdown. No AI disclaimers.',
    '',
    `MindPulse Score: ${params.mindPulseScore}/100`,
    `Eyes: ${params.eyeScore}/100 | Sleep: ${params.sleepScore}/100 | Mind: ${params.mindScore}/100`,
    `Focus area: ${params.focusArea}`,journalSection,
    '',
    'Daily tip:',
  ].join('\n');
}

/**
 * Calls Gemini Flash 2.5 to generate a personalised daily wellness tip for the home screen.
 */
export async function generateDailyTip(params: {
  mindPulseScore: number;
  eyeScore: number;
  sleepScore: number;
  mindScore: number;
  focusArea: string;
  recentJournalEntries: { mood: string; triggers: string[]; text: string }[];
}): Promise<string | null> {
  const key = getApiKey();
  if (!key) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(
      `${API_BASE}/${MODEL}:generateContent`,
      {
        signal: controller.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: buildDailyTipPrompt(params) }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 80,
            temperature: 0.8,
            topP: 0.9,
          },
        }),
      },
    );

    clearTimeout(timeoutId);
    if (!res.ok) return null;

    const data = await res.json() as {
      candidates?: { content?: { parts?: { text: string }[] } }[];
    };
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return raw?.trim() ?? null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Constructs the prompt for a weekly reflection combining scores, journal, and sleep data.
 */
function buildWeeklyReflectionPrompt(params: {
  scores: ({ date: string; mindPulseScore: number } | null)[];
  journalEntries: { mood: string; text: string; triggers: string[] }[];
  sleepSessions: number;
  avgSleepDuration: string;
  currentFocusArea: string;
  eyeScore: number;
  sleepScore: number;
  mindScore: number;
}): string {
  const scoresLine = params.scores
    .map(s => s ? `${s.date.slice(5)}: ${s.mindPulseScore}/100` : '— no data —')
    .join('\n  ');

  const journalSummary = params.journalEntries.length > 0
    ? params.journalEntries.slice(0, 5).map((e, i) =>
        `  ${i + 1}. Mood: ${e.mood} | Triggers: ${e.triggers.join(', ') || 'none'} | "${e.text.slice(0, 80)}"`
      ).join('\n')
    : '  No journal entries this week.';

  return [
    'You are a warm, insightful wellness coach. The user is viewing their weekly summary.',
    'Write a brief, encouraging reflection (3-5 sentences) that:',
    '- References their actual score trends this week',
    '- Acknowledges patterns they might notice in their journal entries',
    '- Notes their sleep consistency',
    '- Offers one specific, actionable suggestion for the coming week',
    'Do not use markdown. Do not mention that you are an AI. Speak directly to the user.',
    '',
    'This week\'s scores:',
    `  ${scoresLine}`,
    '',
    `Current: Eye ${params.eyeScore}/100 | Sleep ${params.sleepScore}/100 | Mind ${params.mindScore}/100`,
    `Focus area: ${params.currentFocusArea}`,
    `Sleep sessions logged: ${params.sleepSessions} (avg ${params.avgSleepDuration})`,
    '',
    'Journal entries this week:',
    journalSummary,
    '',
    'Your weekly reflection:',
  ].join('\n');
}

/**
 * Calls Gemini Flash 2.5 to generate a weekly reflection summary.
 */
export async function generateWeeklyReflection(params: {
  scores: ({ date: string; mindPulseScore: number } | null)[];
  journalEntries: { mood: string; text: string; triggers: string[] }[];
  sleepSessions: number;
  avgSleepDuration: string;
  currentFocusArea: string;
  eyeScore: number;
  sleepScore: number;
  mindScore: number;
}): Promise<string | null> {
  const key = getApiKey();
  if (!key) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(
      `${API_BASE}/${MODEL}:generateContent`,
      {
        signal: controller.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: buildWeeklyReflectionPrompt(params) }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.8,
            topP: 0.9,
          },
        }),
      },
    );

    clearTimeout(timeoutId);
    if (!res.ok) return null;

    const data = await res.json() as {
      candidates?: { content?: { parts?: { text: string }[] } }[];
    };
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return raw?.trim() ?? null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/** Calls Gemini Flash 2.5 to generate a personalized wellness insight for journal entries. */
export async function getJournalInsight(
  mood: string,
  triggers: string[],
  text: string,
): Promise<GeminiInsightResult | null> {
  const key = getApiKey();
  if (!key) return null;

  const start = Date.now();
  // 8-second timeout to prevent hanging saves when offline or slow
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(
      `${API_BASE}/${MODEL}:generateContent`,
      {
        signal: controller.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: buildPrompt(mood, triggers, text) }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 150,
            temperature: 0.7,
            topP: 0.9,
          },
        }),
      },
    );

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`Gemini API returned ${res.status}: ${await res.text().catch(() => 'unknown')}`);
      return null;
    }

    const data = await res.json() as {
      candidates?: {
        content?: { parts?: { text: string }[] };
        finishReason?: string;
      }[];
    };

    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw || raw.trim().length === 0) return null;

    return {
      insight: raw.trim(),
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('Gemini API call failed:', err);
    return null;
  }
}
