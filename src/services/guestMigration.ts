import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';

/**
 * Migrate all guest data from AsyncStorage to Firestore under the given uid.
 *
 * Only call this for a brand-new account (uid was just created). If a user
 * upgrades an anonymous account via linkWithCredential, the uid is preserved
 * and all data is already correctly scoped to it — calling this again would
 * duplicate already-synced records (e.g. relax sessions).
 */
export async function migrateGuestData(uid: string): Promise<void> {
  const batch = firestore().batch();
  const keysToClear: string[] = [];
  let hasWrites = false;

  // 1. Sleep sessions
  try {
    const sessionsRaw = await AsyncStorage.getItem('@mindpulse/guest-sessions');
    if (sessionsRaw) {
      const sessions = JSON.parse(sessionsRaw) as Record<string, unknown>[];
      for (const session of sessions) {
        const { id: _id, ...data } = session;
        const ref = firestore().collection('users').doc(uid).collection('sleepSessions').doc();
        batch.set(ref, data);
        hasWrites = true;
      }
      keysToClear.push('@mindpulse/guest-sessions');
    }
  } catch {
    // Non-critical — skip
  }

  // 2. Eye sessions
  try {
    const eyeRaw = await AsyncStorage.getItem('@mindpulse/eye-sessions:guest');
    if (eyeRaw) {
      const sessions = JSON.parse(eyeRaw) as Record<string, unknown>[];
      for (const session of sessions) {
        const ref = firestore().collection('users').doc(uid).collection('eyeSessions').doc();
        batch.set(ref, session);
        hasWrites = true;
      }
      keysToClear.push('@mindpulse/eye-sessions:guest');
    }
  } catch {
    // skip
  }

  // 3. Journal entries
  try {
    const journalRaw = await AsyncStorage.getItem('@mindpulse/journal:guest');
    if (journalRaw) {
      const entries = JSON.parse(journalRaw) as Record<string, unknown>[];
      for (const entry of entries) {
        const { id: _id, uid: _uid, date, ...data } = entry;
        const ref = firestore().collection('users').doc(uid).collection('journal').doc();
        batch.set(ref, {
          ...data,
          uid,
          date: date ? new Date(date as string) : firestore.FieldValue.serverTimestamp(),
        });
        hasWrites = true;
      }
      keysToClear.push('@mindpulse/journal:guest');
    }
  } catch {
    // skip
  }

  // 4. Recovery sessions
  try {
    const recoveryRaw = await AsyncStorage.getItem('@mindpulse/recovery:guest');
    if (recoveryRaw) {
      const sessions = JSON.parse(recoveryRaw) as Record<string, unknown>[];
      for (const session of sessions) {
        const ref = firestore().collection('users').doc(uid).collection('recoverySessions').doc();
        batch.set(ref, session);
        hasWrites = true;
      }
      keysToClear.push('@mindpulse/recovery:guest');
    }
  } catch {
    // skip
  }

  // 5. Game records
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const gameKeys = allKeys.filter(k => k.startsWith('@mindpulse/game-record:guest:'));
    for (const key of gameKeys) {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const gameId = key.replace('@mindpulse/game-record:guest:', '');
        const data = JSON.parse(raw) as Record<string, unknown>;
        const ref = firestore()
          .collection('users').doc(uid)
          .collection('gameRecords').doc(gameId);
        batch.set(ref, data);
        hasWrites = true;
      }
      keysToClear.push(key);
    }
  } catch {
    // skip
  }

  // 6. Sleep schedule
  try {
    const scheduleRaw = await AsyncStorage.getItem('@mindpulse/sleep-schedule:guest');
    if (scheduleRaw) {
      const schedule = JSON.parse(scheduleRaw) as Record<string, unknown>;
      const { uid: _uid, ...data } = schedule;
      const ref = firestore()
        .collection('users').doc(uid)
        .collection('settings').doc('sleepSchedule');
      batch.set(ref, data, { merge: true });
      hasWrites = true;
      keysToClear.push('@mindpulse/sleep-schedule:guest');
    }
  } catch {
    // skip
  }

  // 7. Relax sessions (global key, not per-user)
  try {
    const relaxRaw = await AsyncStorage.getItem('@mindpulse/relax-sessions');
    if (relaxRaw) {
      const sessions = JSON.parse(relaxRaw) as Record<string, unknown>[];
      for (const session of sessions) {
        const ref = firestore().collection('users').doc(uid).collection('relaxSessions').doc();
        batch.set(ref, session);
        hasWrites = true;
      }
      // Keep the AsyncStorage key — RelaxContext still uses it for local cache
    }
  } catch {
    // skip
  }

  // 8. Sleep preset preference (local-only — move to the new uid's key)
  try {
    const presetId = await AsyncStorage.getItem('@mindpulse/sleep-preset:guest');
    if (presetId) {
      await AsyncStorage.setItem(`@mindpulse/sleep-preset:${uid}`, presetId);
      await AsyncStorage.removeItem('@mindpulse/sleep-preset:guest');
    }
  } catch {
    // skip
  }

  // 9. In-progress sleep tracking session (local-only — move to the new uid's key)
  try {
    const activeRaw = await AsyncStorage.getItem('@mindpulse/active-sleep:guest');
    if (activeRaw) {
      await AsyncStorage.setItem(`@mindpulse/active-sleep:${uid}`, activeRaw);
      await AsyncStorage.removeItem('@mindpulse/active-sleep:guest');
    }
  } catch {
    // skip
  }

  // Commit all writes in a single batch (max 500 operations), then clear local cache
  if (hasWrites) {
    try {
      await batch.commit();
      // Only clear AsyncStorage after successful Firestore commit
      for (const key of keysToClear) {
        await AsyncStorage.removeItem(key);
      }
    } catch {
      // batch failed — data stays in AsyncStorage, no loss
    }
  }
}
