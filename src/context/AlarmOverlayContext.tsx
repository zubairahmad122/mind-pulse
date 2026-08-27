import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, Modal, Platform } from 'react-native';
import { AlarmPermissionModal } from '@/components/alarm/AlarmPermissionModal';
import { GlobalAlarmOverlay } from '@/components/alarm/GlobalAlarmOverlay';
import {
  getAlarmPermissionStatus,
  markPermissionSetupDone,
  openAutostartSettings,
  requestAllAlarmPermissions,
  shouldShowPermissionSetup,
} from '@/services/alarmPermissions';
import { getNativeAlarmModule, hasNativeAlarmModule } from '@/services/nativeAlarm';
import { scheduleWakeAlarm, stopAlarmRinging } from '@/services/sleepAlarm';
import { ALARM_NATIVE_EVENTS } from '@/types/alarm.types';

type AlarmOverlayContextValue = {
  permissionReady: boolean;
  recheckPermissions: () => Promise<void>;
};

const AlarmOverlayContext = createContext<AlarmOverlayContextValue>({
  permissionReady: true,
  recheckPermissions: async () => {},
});

async function syncRingingOverlay(
  setVisible: (v: boolean) => void,
  setLabel: (l: string) => void,
): Promise<void> {
  const native = getNativeAlarmModule();
  if (!native?.isAlarmRinging) return;
  try {
    const ringing = await native.isAlarmRinging();
    if (ringing) {
      const label = await native.getRingingLabel();
      setLabel(label || 'Time to wake up');
      setVisible(true);
    } else {
      setVisible(false);
    }
  } catch {
    // Ignore — native bridge not ready
  }
}

export function AlarmOverlayProvider({ children }: { children: React.ReactNode }) {
  const [permissionReady, setPermissionReady] = useState(Platform.OS !== 'android');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  const [alarmVisible, setAlarmVisible] = useState(false);
  const [alarmLabel, setAlarmLabel] = useState('Time to wake up');

  const recheckPermissions = useCallback(async () => {
    if (Platform.OS !== 'android' || !hasNativeAlarmModule()) {
      setPermissionReady(true);
      return;
    }
    try {
      const status = await getAlarmPermissionStatus();
      setPermissionReady(status.ready);
      if (!status.ready) {
        const show = await shouldShowPermissionSetup();
        setShowPermissionModal(show);
      } else {
        setShowPermissionModal(false);
        await markPermissionSetupDone();
      }
    } catch {
      setPermissionReady(true);
    }
  }, []);

  const syncOverlay = useCallback(async () => {
    await syncRingingOverlay(setAlarmVisible, setAlarmLabel);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void recheckPermissions();
      void syncOverlay();
    }, 800);
    return () => clearTimeout(t);
  }, [recheckPermissions, syncOverlay]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void syncOverlay();
        void recheckPermissions();
      }
    });
    return () => sub.remove();
  }, [syncOverlay, recheckPermissions]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !hasNativeAlarmModule()) return;

    let firedSub: { remove: () => void } | null = null;
    let stoppedSub: { remove: () => void } | null = null;

    try {
      const native = getNativeAlarmModule()!;
      firedSub = native.addListener(ALARM_NATIVE_EVENTS.fired, payload => {
        setAlarmLabel(payload?.label ?? 'Time to wake up');
        setAlarmVisible(true);
      });
      stoppedSub = native.addListener(ALARM_NATIVE_EVENTS.stopped, () => {
        setAlarmVisible(false);
      });
    } catch {
      // addListener can fail before the native module is ready
    }

    return () => {
      firedSub?.remove();
      stoppedSub?.remove();
    };
  }, []);

  const handleAllowPermissions = async () => {
    setRequestingPermissions(true);
    try {
      const status = await requestAllAlarmPermissions();
      setPermissionReady(status.ready);
      if (status.ready) {
        setShowPermissionModal(false);
        await markPermissionSetupDone();
      }
    } finally {
      setRequestingPermissions(false);
    }
  };

  const handleDismissPermission = async () => {
    await markPermissionSetupDone();
    setShowPermissionModal(false);
  };

  const handleStopAlarm = async () => {
    await stopAlarmRinging();
    setAlarmVisible(false);
  };

  const handleSnoozeAlarm = async () => {
    await stopAlarmRinging();
    setAlarmVisible(false);
    // Re-arm the alarm 9 minutes from now.
    await scheduleWakeAlarm(new Date(Date.now() + 9 * 60 * 1000), alarmLabel);
  };

  const value = useMemo(
    () => ({ permissionReady, recheckPermissions }),
    [permissionReady, recheckPermissions],
  );

  return (
    <AlarmOverlayContext.Provider value={value}>
      {children}
      <Modal visible={showPermissionModal} transparent animationType="fade">
        <AlarmPermissionModal
          loading={requestingPermissions}
          onAllow={handleAllowPermissions}
          onLater={handleDismissPermission}
          onAutostart={() => void openAutostartSettings()}
        />
      </Modal>
      <GlobalAlarmOverlay
        visible={alarmVisible}
        label={alarmLabel}
        onStop={handleStopAlarm}
        onSnooze={handleSnoozeAlarm}
      />
    </AlarmOverlayContext.Provider>
  );
}

export const useAlarmOverlay = () => useContext(AlarmOverlayContext);
