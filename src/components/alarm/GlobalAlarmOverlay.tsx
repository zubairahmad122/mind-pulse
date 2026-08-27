import { WakeUpAlarmScreen } from './WakeUpAlarmScreen';

type Props = {
  visible: boolean;
  label: string;
  onStop: () => void;
  onSnooze?: () => void;
  ringtoneId?: string;
  volume?: number;
};

export function GlobalAlarmOverlay({ visible, label, onStop, onSnooze, ringtoneId, volume }: Props) {
  return (
    <WakeUpAlarmScreen
      visible={visible}
      label={label}
      onWake={onStop}
      onSnooze={onSnooze}
      // The native module already plays the ringtone on Android; the overlay is
      // only the UI on top of it. Sound here would double up.
      playSound={false}
      ringtoneId={ringtoneId}
      volume={volume}
    />
  );
}
