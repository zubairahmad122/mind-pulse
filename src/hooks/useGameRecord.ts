import { useCallback, useEffect, useState } from 'react';
import { getGameRecord, submitGameScore, type GameId, type GameRecord } from '@/services/gameRecords';

export function useGameRecord(uid: string | undefined, gameId: GameId) {
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);

  useEffect(() => {
    getGameRecord(uid, gameId).then(setRecord);
  }, [uid, gameId]);

  const submit = useCallback(
    async (value: number) => {
      const isNew = await submitGameScore(uid, gameId, value);
      if (isNew) {
        setRecord({ value, updatedAt: Date.now() });
        setIsNewRecord(true);
        setTimeout(() => setIsNewRecord(false), 4000);
      }
      return isNew;
    },
    [uid, gameId],
  );

  return { record, isNewRecord, submit };
}
