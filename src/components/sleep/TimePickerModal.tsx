import { useEffect, useState } from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// ─── Time string <-> parts ───────────────────────────────────────────────────────

function parseTime(time: string): { hour12: number; minute: number; isPm: boolean } {
  const [h, m] = time.split(':').map(Number);
  const hh = ((h % 24) + 24) % 24;
  return {
    hour12: hh % 12 === 0 ? 12 : hh % 12,
    minute: ((m % 60) + 60) % 60,
    isPm: hh >= 12,
  };
}

function buildTime(hour12: number, minute: number, isPm: boolean): string {
  const base = hour12 % 12; // 12 -> 0
  const hour24 = isPm ? base + 12 : base;
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function wrap(value: number, min: number, max: number): number {
  const span = max - min + 1;
  return ((((value - min) % span) + span) % span) + min;
}

// ─── Editable stepper column ─────────────────────────────────────────────────────

function Stepper({
  value,
  min,
  max,
  pad,
  accent,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  pad: boolean;
  accent: string;
  onChange: (next: number) => void;
}) {
  const [text, setText] = useState(String(value));

  // Keep the text field in sync when steppers change the value.
  useEffect(() => {
    setText(pad ? String(value).padStart(2, '0') : String(value));
  }, [value, pad]);

  const step = (delta: number) => {
    void Haptics.selectionAsync();
    onChange(wrap(value + delta, min, max));
  };

  const commitText = () => {
    const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
    if (Number.isNaN(n)) {
      setText(pad ? String(value).padStart(2, '0') : String(value));
      return;
    }
    onChange(Math.min(max, Math.max(min, n)));
  };

  return (
    <View className="items-center">
      <TouchableOpacity
        onPress={() => step(1)}
        hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
        className="w-12 h-9 items-center justify-center rounded-xl"
        style={{ backgroundColor: accent + '22' }}
      >
        <ChevronUp size={22} color={accent} />
      </TouchableOpacity>

      <TextInput
        value={text}
        onChangeText={t => setText(t.replace(/[^0-9]/g, '').slice(0, 2))}
        onEndEditing={commitText}
        onBlur={commitText}
        keyboardType="number-pad"
        selectTextOnFocus
        maxLength={2}
        style={{
          width: 84,
          height: 76,
          marginVertical: 8,
          textAlign: 'center',
          fontSize: 40,
          fontWeight: '800',
          color: '#FFFFFF',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
        }}
      />

      <TouchableOpacity
        onPress={() => step(-1)}
        hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
        className="w-12 h-9 items-center justify-center rounded-xl"
        style={{ backgroundColor: accent + '22' }}
      >
        <ChevronDown size={22} color={accent} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  title: string;
  initialTime: string; // "HH:MM"
  accent?: string;
  onConfirm: (time: string) => void;
  onCancel: () => void;
}

export function TimePickerModal({
  visible,
  title,
  initialTime,
  accent = '#7B61FF',
  onConfirm,
  onCancel,
}: Props) {
  const [hour12, setHour12] = useState(12);
  const [minute, setMinute] = useState(0);
  const [isPm, setIsPm] = useState(false);

  // Re-seed whenever the modal opens with a (possibly new) time.
  useEffect(() => {
    if (!visible) return;
    const p = parseTime(initialTime);
    setHour12(p.hour12);
    setMinute(p.minute);
    setIsPm(p.isPm);
  }, [visible, initialTime]);

  const handleConfirm = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm(buildTime(hour12, minute, isPm));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/70 px-6">
        <View
          className="w-full max-w-sm rounded-3xl p-5"
          style={{ backgroundColor: '#141029', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 1.5, color: accent, textTransform: 'uppercase', textAlign: 'center' }}>
            {title}
          </Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 4 }}>
            Tap a number to type, or use the arrows
          </Text>

          {/* HH : MM   AM/PM */}
          <View className="flex-row items-center justify-center gap-2 mt-6">
            <Stepper value={hour12} min={1} max={12} pad={false} accent={accent} onChange={setHour12} />
            <Text style={{ fontSize: 40, fontWeight: '800', color: 'rgba(255,255,255,0.4)', marginHorizontal: 2 }}>:</Text>
            <Stepper value={minute} min={0} max={59} pad accent={accent} onChange={setMinute} />

            {/* AM / PM toggle */}
            <View className="ml-2 gap-2">
              {[
                { label: 'AM', value: false },
                { label: 'PM', value: true },
              ].map(opt => {
                const active = isPm === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setIsPm(opt.value);
                    }}
                    activeOpacity={0.8}
                    className="w-14 py-2.5 rounded-xl items-center"
                    style={{
                      backgroundColor: active ? accent : 'rgba(255,255,255,0.05)',
                      borderWidth: 1,
                      borderColor: active ? accent : 'rgba(255,255,255,0.12)',
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '800', color: active ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Actions */}
          <View className="flex-row gap-3 mt-7">
            <TouchableOpacity
              onPress={onCancel}
              activeOpacity={0.8}
              className="flex-1 items-center py-3.5 rounded-2xl border border-white/10 bg-white/[0.04]"
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              activeOpacity={0.85}
              className="flex-1 items-center py-3.5 rounded-2xl"
              style={{ backgroundColor: accent }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 }}>Set Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
