import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bell, Moon } from 'lucide-react-native';

// ─── Time string <-> Date ────────────────────────────────────────────────────────

function timeToDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatTimeAmPm(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')}`;
}

function formatAmPm(time: string): string {
  const [h] = time.split(':').map(Number);
  return h >= 12 ? 'PM' : 'AM';
}

/** "in 3h 12m" — relative to now, rolling to tomorrow if the time already passed today. */
function timeUntilLabel(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  const totalMinutes = Math.round((target.getTime() - now.getTime()) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0 && minutes === 0) return 'now';
  if (hours === 0) return `in ${minutes}m`;
  if (minutes === 0) return `in ${hours}h`;
  return `in ${hours}h ${minutes}m`;
}

// ─── Glass Card wrapper — matches HomeDashboard ─────────────────────────────────

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={{
      borderRadius: 24, overflow: 'hidden',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
      width: '100%', maxWidth: 384,
    }}>
      <BlurView intensity={36} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(59,130,246,0.08)', 'rgba(10,14,28,0.5)']}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.06)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40 }}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  title: string;
  initialTime: string; // "HH:MM"
  accent?: string;
  icon?: 'bed' | 'wake';
  /** Common times for this field, shown as one-tap chips (e.g. ["22:00","22:30","23:00"]). iOS only. */
  quickPicks?: string[];
  onConfirm: (time: string) => void;
  onCancel: () => void;
}

/**
 * On Android, @react-native-community/datetimepicker always shows its own
 * native Dialog window for the spinner — there's no inline-embedded mode like
 * iOS has. Wrapping it in our own Modal+Cancel/Set Time chrome produced two
 * nested dialogs at once. So on Android we skip our own UI entirely and let
 * the native dialog (the exact OS picker users already know) be the whole UI.
 * On iOS the inline spinner embeds correctly, so we keep our custom shell there.
 */
export function TimePickerModal({
  visible,
  title,
  initialTime,
  accent = '#60a5fa',
  icon = 'bed',
  quickPicks = [],
  onConfirm,
  onCancel,
}: Props) {
  const [date, setDate] = useState(() => timeToDate(initialTime));
  const openedRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      openedRef.current = false;
      return;
    }
    setDate(timeToDate(initialTime));

    if (Platform.OS === 'android' && !openedRef.current) {
      openedRef.current = true;
      DateTimePickerAndroid.open({
        value: timeToDate(initialTime),
        mode: 'time',
        is24Hour: false,
        display: 'spinner',
        onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
          if (event.type === 'set' && selectedDate) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onConfirm(dateToTime(selectedDate));
          } else {
            onCancel();
          }
        },
      });
    }
  }, [visible, initialTime, onConfirm, onCancel]);

  const applyQuickPick = (time: string) => {
    void Haptics.selectionAsync();
    setDate(timeToDate(time));
  };

  const handlePickerChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) setDate(selectedDate);
  };

  const handleConfirm = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm(dateToTime(date));
  };

  if (Platform.OS === 'android') {
    return null;
  }

  const currentTime = dateToTime(date);
  const IconComponent = icon === 'wake' ? Bell : Moon;
  const iconColor = icon === 'wake' ? '#a78bfa' : '#60a5fa';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        {/* Accent glow behind the card */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 280,
            height: 280,
            borderRadius: 140,
            backgroundColor: accent + '18',
            top: '18%',
            opacity: 0.6,
          }}
        />

        <GlassCard>
          {/* Accent icon + title */}
          <View style={{ alignItems: 'center', paddingTop: 20 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: icon === 'wake'
                  ? 'rgba(167,139,250,0.12)'
                  : 'rgba(96,165,250,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <IconComponent size={22} color={iconColor} fill={iconColor} />
            </View>
            <Text style={[styles.title, { color: accent }]}>{title}</Text>
          </View>

          {/* Large time display */}
          <View style={{ alignItems: 'center', marginTop: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <Text style={styles.timeLarge}>{formatTimeAmPm(currentTime)}</Text>
              <Text style={[styles.ampmLabel, { color: accent }]}>{formatAmPm(currentTime)}</Text>
            </View>
            <Text style={styles.countdown}>{timeUntilLabel(currentTime)}</Text>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 4, marginTop: 14 }} />

          {/* Quick picks — most common times, one tap */}
          {quickPicks.length > 0 && (
            <View style={styles.quickPicksRow}>
              {quickPicks.map(time => {
                const active = time === currentTime;
                return (
                  <TouchableOpacity
                    key={time}
                    onPress={() => applyQuickPick(time)}
                    activeOpacity={0.8}
                    style={[
                      styles.quickPickChip,
                      active
                        ? { backgroundColor: accent + '25', borderColor: accent + '60' }
                        : { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {active && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: accent }} />}
                      <Text style={[
                        styles.quickPickText,
                        { color: active ? '#FFFFFF' : 'rgba(255,255,255,0.5)' },
                      ]}>
                        {formatTimeAmPm(time)}
                        <Text style={{ fontSize: 8, fontWeight: '600', opacity: 0.6 }}> {formatAmPm(time)}</Text>
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Native OS time picker — inline spinner */}
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={date}
              mode="time"
              display="spinner"
              is24Hour={false}
              onChange={handlePickerChange}
              themeVariant="dark"
              accentColor={accent}
              textColor="#FFFFFF"
            />
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={onCancel} activeOpacity={0.8} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <LinearGradient
              colors={icon === 'wake' ? ['#a78bfa', '#7c3aed'] : ['#3b82f6', '#2563eb']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.confirmBtn}
            >
              <TouchableOpacity
                onPress={handleConfirm}
                activeOpacity={0.85}
                style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={styles.confirmText}>Set Time</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* Bottom spacer for safe area */}
          <View style={{ height: 8 }} />
        </GlassCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  timeLarge: {
    fontSize: 52,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  ampmLabel: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
    marginLeft: 6,
    letterSpacing: 1,
  },
  countdown: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 2,
  },
  quickPicksRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  quickPickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickPickText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pickerWrap: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: -8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.4,
    elevation: 6,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
