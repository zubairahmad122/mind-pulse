import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { prepareAlarmPermissions, scheduleTestWakeAlarm } from '@/services/sleepAlarm';
import { handleAlarmSupport } from '@/utils/alarmFeedback';

export function useTestAlarm() {
  const [testingSec, setTestingSec] = useState<number | null>(null);
  const busyRef = useRef(false);

  const triggerTestAlarm = async (seconds: number) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setTestingSec(seconds);

    try {
      const support = await prepareAlarmPermissions();
      if (!handleAlarmSupport(support)) return;

      const id = await scheduleTestWakeAlarm(seconds);
      if (!id) {
        Alert.alert('Could not schedule', 'Try again in a moment.');
      }
    } finally {
      busyRef.current = false;
      setTimeout(() => setTestingSec(null), 2500);
    }
  };

  return { triggerTestAlarm, testingSec };
}
