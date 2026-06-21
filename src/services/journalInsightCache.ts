/**
 * Content-addressed cache for journal Gemini insights.
 *
 * Stores past AI insights keyed by a hash of (mood + triggers + text)
 * so that re-saving or re-loading identical content shows the cached
 * insight immediately without re-calling the Gemini API.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@mindpulse/insight-cache';
const CACHE_INDEX_KEY = '@mindpulse/insight-cache-index';

/** Simple djb2 hash of a string → hex. Deterministic & fast. */
function hash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h) ^ input.charCodeAt(i);
  return (h >>> 0).toString(16);
}

/** Build a cache key from the entry content (mood + triggers + text). */
function cacheKey(mood: string, triggers: string[], text: string): string {
  return `${CACHE_PREFIX}:${hash(`${mood}|${triggers.sort().join(',')}|${text}`)}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Look up a previously cached insight for the given (mood, triggers, text).
 * Returns the insight string, or `null` if nothing is cached.
 */
export async function getCachedInsight(
  mood: string,
  triggers: string[],
  text: string,
): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(mood, triggers, text));
    return raw ?? null;
  } catch {
    return null;
  }
}

/**
 * Store an insight in the content-addressed cache so it can be reused
 * without calling the Gemini API again.
 */
export async function setCachedInsight(
  mood: string,
  triggers: string[],
  text: string,
  insight: string,
): Promise<void> {
  try {
    const key = cacheKey(mood, triggers, text);
    await AsyncStorage.setItem(key, insight);
    // Track this key for potential future cleanup
    const indexRaw = await AsyncStorage.getItem(CACHE_INDEX_KEY);
    const index: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    if (!index.includes(key)) {
      index.push(key);
      await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
    }
  } catch {
    // cache miss is acceptable
  }
}
