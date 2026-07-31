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

      let id: string | null = null;
      try {
        id = await scheduleTestWakeAlarm(seconds);
      } catch (error) {
        console.warn('Failed to schedule test alarm:', error);
      }
      if (!id) {
        Alert.alert(
          'Could not schedule',
          'Allow “Alarms & reminders” for Mind Pulse in Android Settings, then try again.',
        );
      }
    } finally {
      busyRef.current = false;
      setTimeout(() => setTestingSec(null), 2500);
    }
  };

  return { triggerTestAlarm, testingSec };
}
