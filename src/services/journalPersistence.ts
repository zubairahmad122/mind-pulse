import AsyncStorage from '@react-native-async-storage/async-storage';

function journalCacheKey(uid?: string): string {
  return `@mindpulse/journal:${uid ?? 'guest'}`;
}

interface CachedJournalEntry {
  date: string;
}

/**
 * Reads the locally-cached journal entries (written by useJournal) and
 * returns just their local YYYY-MM-DD date keys — the cheap subset Mind
 * Score and Achievements need, without pulling in the full useJournal hook
 * (Firestore + Gemini wiring).
 */
export async function loadJournalDateKeys(uid?: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(journalCacheKey(uid));
    if (!raw) return [];
    const entries: CachedJournalEntry[] = JSON.parse(raw);
    return entries.map((e) => new Date(e.date).toLocaleDateString('sv'));
  } catch {
    return [];
  }
}
