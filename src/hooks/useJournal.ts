import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
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

function buildInsight(mood: Mood, triggers: StressTrigger[]): string {
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
    const aiInsight = buildInsight(input.mood, input.triggers);
    const entryId = `local-${Date.now()}`;
    const entry: JournalEntry = {
      id: entryId,
      uid: uid ?? 'guest',
      date: new Date(),
      mood: input.mood,
      text: input.text.trim(),
      triggers: input.triggers,
      aiInsight,
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
            aiInsight: entry.aiInsight,
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
  };

  const streak = entries.length > 0 ? Math.min(entries.length, 30) : 0;

  return { entries, loading, saveEntry, streak, reload: load };
}
