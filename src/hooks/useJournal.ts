import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { getJournalInsight } from '@/services/gemini';
import { getCachedInsight, setCachedInsight } from '@/services/journalInsightCache';
import { JournalEntry, Mood, StressTrigger } from '@/types/journal.types';

const STORAGE_PREFIX = '@mindpulse/journal';

function mapDoc(id: string, data: Record<string, unknown>): JournalEntry {
  const rawDate = data.date;
  let date: Date;

  if (rawDate && typeof rawDate === 'object' && 'toDate' in rawDate) {
    // Firestore Timestamp
    date = (rawDate as any).toDate();
  } else if (rawDate instanceof Date) {
    date = rawDate;
  } else if (typeof rawDate === 'string') {
    date = new Date(rawDate);
  } else {
    date = new Date();
  }

  return {
    id,
    uid: String(data.uid ?? ''),
    date,
    mood: (data.mood as Mood) ?? 'neutral',
    text: String(data.text ?? ''),
    triggers: (data.triggers as StressTrigger[]) ?? [],
    aiInsight: data.aiInsight ? String(data.aiInsight) : undefined,
  };
}

/** Fallback insight when Gemini is unavailable or the call fails. */
function fallbackInsight(mood: Mood, triggers: StressTrigger[]): string {
  if (triggers.includes('work') && (mood === 'stressed' || mood === 'sad')) {
    return 'Work stress shows up often — try a 5-minute box breathing break after meetings.';
  }
  if (mood === 'stressed') {
    return 'Your nervous system may need rest — a short body scan before bed can help.';
  }
  if (mood === 'calm' || mood === 'good') {
    return 'You are building healthy awareness — keep noting what helps you feel balanced.';
  }
  return 'Writing regularly helps spot patterns — be gentle with yourself on harder days.';
}

export function useJournal(uid?: string, isGuestMode = false) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const storageKey = `${STORAGE_PREFIX}:${uid ?? 'guest'}`;
  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (uid && !isGuestMode) {
        const snap = await firestore()
          .collection('users')
          .doc(uid)
          .collection('journal')
          .orderBy('date', 'desc')
          .get();
        const loaded = snap.docs.map(d => mapDoc(d.id, d.data() as Record<string, unknown>));
        setEntries(loaded);
        await AsyncStorage.setItem(storageKey, JSON.stringify(loaded.map(e => ({ ...e, date: e.date.toISOString() }))));
      } else {
        const raw = await AsyncStorage.getItem(storageKey);
        setEntries(raw ? (JSON.parse(raw) as JournalEntry[]).map(e => ({ ...e, date: new Date(e.date as any) })) : []);
      }
    } catch {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        setEntries(raw ? (JSON.parse(raw) as JournalEntry[]).map(e => ({ ...e, date: new Date(e.date as any) })) : []);
      } catch {
        setEntries([]);
      }
    } finally {
      setLoading(false);
    }
  }, [uid, isGuestMode, storageKey]);

  useEffect(() => {
    load();
  }, [load]);

  const saveEntry = async (input: {
    mood: Mood;
    text: string;
    triggers: StressTrigger[];
  }) => {
    const trimmedText = input.text.trim();

    // 1. Check content-addressed cache first — skip Gemini if we've seen this content before
    const cached = await getCachedInsight(input.mood, input.triggers, trimmedText);
    if (cached) {
      // Cache hit — skip Gemini entirely
      const entryId = `local-${Date.now()}`;
      const entry: JournalEntry = {
        id: entryId,
        uid: uid ?? 'guest',
        date: new Date(),
        mood: input.mood,
        text: trimmedText,
        triggers: input.triggers,
        aiInsight: cached,
      };

      if (uid && !isGuestMode) {
        try {
          const docRef = await firestore()
            .collection('users')
            .doc(uid)
            .collection('journal')
            .add({
              uid,
              mood: entry.mood,
              text: entry.text,
              triggers: entry.triggers,
              aiInsight: cached,
              date: firestore.FieldValue.serverTimestamp(),
            });
          entry.id = docRef.id;
        } catch {
          // fall through to local save
        }
      }

      const next = [entry, ...entries];
      setEntries(next);
      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify(next.map(e => ({ ...e, date: e.date.toISOString() }))),
      );
      return entry;
    }

    // 2. Cache miss — create entry with fallback insight and persist immediately
    const entryId = `local-${Date.now()}`;
    const fallback = fallbackInsight(input.mood, input.triggers);
    const entry: JournalEntry = {
      id: entryId,
      uid: uid ?? 'guest',
      date: new Date(),
      mood: input.mood,
      text: trimmedText,
      triggers: input.triggers,
      aiInsight: fallback,
    };

    let firestoreDocId: string | null = null;
    if (uid && !isGuestMode) {
      try {
        const docRef = await firestore()
          .collection('users')
          .doc(uid)
          .collection('journal')
          .add({
            uid,
            mood: entry.mood,
            text: entry.text,
            triggers: entry.triggers,
            aiInsight: fallback,
            date: firestore.FieldValue.serverTimestamp(),
          });
        firestoreDocId = docRef.id;
        entry.id = docRef.id;
      } catch {
        // fall through to local save
      }
    }

    // Persist to AsyncStorage immediately (with fallback insight)
    const next = [entry, ...entries];
    setEntries(next);
    await AsyncStorage.setItem(
      storageKey,
      JSON.stringify(next.map(e => ({ ...e, date: e.date.toISOString() }))),
    );

    // 3. Call Gemini in the background (don't block the save)
    getJournalInsight(input.mood, input.triggers, trimmedText).then(async (insightResult) => {
      const realInsight = insightResult?.insight ?? fallback;

      // Cache for future saves with the same content
      await setCachedInsight(input.mood, input.triggers, trimmedText, realInsight);

      // Update the entry in local state
      setEntries(prev => {
        const updated = prev.map(e =>
          e.id === entry.id ? { ...e, aiInsight: realInsight } : e,
        );
        // Persist the updated list to AsyncStorage
        AsyncStorage.setItem(
          storageKey,
          JSON.stringify(updated.map(e => ({ ...e, date: e.date.toISOString() }))),
        ).catch(() => {});
        return updated;
      });

      // Update Firestore doc with the real insight
      if (firestoreDocId && uid && !isGuestMode) {
        try {
          await firestore()
            .collection('users')
            .doc(uid)
            .collection('journal')
            .doc(firestoreDocId)
            .update({ aiInsight: realInsight });
        } catch {
          // local state + AsyncStorage already updated
        }
      }
    }).catch(() => {
      // Fallback insight is already saved — no action needed
    });

    // Return the entry immediately (with fallback insight for now)
    return entry;
  };

  const streak = entries.length > 0 ? Math.min(entries.length, 30) : 0;

  return { entries, loading, saveEntry, streak, reload: load };
}
