import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { loadEyeGameProgress } from '@/services/eyeGameProgress';
import {
  calculateEyeGameLevel,
  getEyeGameMilestone,
} from '@/utils/eyeGameProgress';

export function useEyeGameProgress(uid?: string) {
  const [totalXp, setTotalXp] = useState(0);
  const [roundsCompleted, setRoundsCompleted] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void loadEyeGameProgress(uid).then(record => {
        if (!active) return;
        setTotalXp(record.totalXp);
        setRoundsCompleted(record.roundsCompleted);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [uid]),
  );

  const levelProgress = calculateEyeGameLevel(totalXp);
  const milestone = getEyeGameMilestone(levelProgress.level);

  return {
    ...levelProgress,
    title: milestone.current.title,
    badge: milestone.current.badge,
    cosmetic: milestone.current.cosmetic,
    nextMilestone: milestone.next,
    roundsCompleted,
    loading,
  };
}
