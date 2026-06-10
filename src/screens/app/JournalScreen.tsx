import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuth } from '@/context/AuthContext';
import { useJournal } from '@/hooks/useJournal';
import { Mood, StressTrigger } from '@/types/journal.types';

const MOODS: { id: Mood; emoji: string; label: string }[] = [
  { id: 'calm', emoji: '😌', label: 'Calm' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'neutral', emoji: '😐', label: 'Neutral' },
  { id: 'sad', emoji: '😔', label: 'Sad' },
  { id: 'stressed', emoji: '😰', label: 'Stressed' },
];

const TRIGGERS: { id: StressTrigger; label: string }[] = [
  { id: 'work', label: 'Work' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'health', label: 'Health' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'finance', label: 'Finance' },
  { id: 'studies', label: 'Studies' },
  { id: 'other', label: 'Other' },
];

export default function JournalScreen() {
  const { user, isGuestMode } = useAuth();
  const { entries, loading, saveEntry, streak } = useJournal(user?.uid, isGuestMode);
  const [mood, setMood] = useState<Mood>('neutral');
  const [text, setText] = useState('');
  const [triggers, setTriggers] = useState<StressTrigger[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastInsight, setLastInsight] = useState<string | null>(null);

  const toggleTrigger = (id: StressTrigger) => {
    setTriggers(prev => (prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    if (!text.trim()) {
      Alert.alert('Empty entry', 'Write a few words about how you feel.');
      return;
    }
    setSaving(true);
    try {
      const entry = await saveEntry({ mood, text, triggers });
      setLastInsight(entry.aiInsight ?? null);
      setText('');
      setTriggers([]);
      Alert.alert('Saved', 'Your journal entry was saved.');
    } catch {
      Alert.alert('Error', 'Could not save your entry. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ScreenShell safeBottom>
        <ScreenHeader title="Stress Journal" subtitle="Reflect on your day" showBack />

        <GlassCard style={styles.streakCard}>
          <Text style={styles.streakLabel}>Entries</Text>
          <Text style={styles.streakValue}>{streak}</Text>
        </GlassCard>

        <Text style={styles.sectionTitle}>Mood</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moodRow}>
          {MOODS.map(m => (
            <TouchableOpacity
              key={m.id}
              style={[styles.moodChip, mood === m.id && styles.moodChipActive]}
              onPress={() => setMood(m.id)}
            >
              <Text style={styles.moodEmoji}>{m.emoji}</Text>
              <Text style={styles.moodLabel}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>What's on your mind?</Text>
        <TextInput
          style={styles.input}
          multiline
          maxLength={500}
          placeholder="Write up to 500 characters..."
          placeholderTextColor={colors.text.tertiary}
          value={text}
          onChangeText={setText}
        />
        <Text style={styles.charCount}>{text.length}/500</Text>

        <Text style={styles.sectionTitle}>Triggers</Text>
        <View style={styles.tags}>
          {TRIGGERS.map(t => {
            const active = triggers.includes(t.id);
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.tag, active && styles.tagActive]}
                onPress={() => toggleTrigger(t.id)}
              >
                <Text style={[styles.tagText, active && styles.tagTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {(lastInsight || entries[0]?.aiInsight) && (
          <GlassCard style={styles.insight}>
            <Text style={styles.insightTitle}>✨ Wellness insight</Text>
            <Text style={styles.insightBody}>
              {lastInsight ?? entries[0]?.aiInsight}
            </Text>
          </GlassCard>
        )}

        <PrimaryButton label="Save Entry" onPress={handleSave} loading={saving} />

        <Text style={[styles.sectionTitle, styles.pastTitle]}>Past entries</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent.purple} style={styles.loader} />
        ) : entries.length === 0 ? (
          <Text style={styles.empty}>No entries yet — your reflections will appear here.</Text>
        ) : (
          entries.slice(0, 10).map(entry => (
            <GlassCard key={entry.id} style={styles.entryCard}>
              <Text style={styles.entryDate}>
                {entry.date.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                · {entry.mood}
              </Text>
              <Text style={styles.entryText} numberOfLines={3}>
                {entry.text}
              </Text>
            </GlassCard>
          ))
        )}
      </ScreenShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  streakCard: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  streakLabel: { ...typography.label, color: colors.text.secondary },
  streakValue: { ...typography.headingSmall, color: colors.accent.purple },
  sectionTitle: {
    ...typography.headingSmall,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  pastTitle: { marginTop: spacing.xl },
  moodRow: { marginBottom: spacing.md },
  moodChip: {
    alignItems: 'center',
    padding: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent.purpleBorder,
  },
  moodChipActive: { backgroundColor: colors.accent.purpleLight, borderColor: colors.accent.purple },
  moodEmoji: { fontSize: 24 },
  moodLabel: { ...typography.caption, color: colors.text.secondary },
  input: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent.purpleBorder,
    padding: spacing.md,
    color: colors.text.primary,
    ...typography.bodyLarge,
    textAlignVertical: 'top',
  },
  charCount: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'right',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.accent.purpleBorder,
  },
  tagActive: { backgroundColor: colors.accent.purple, borderColor: colors.accent.purple },
  tagText: { ...typography.label, color: colors.text.secondary },
  tagTextActive: { color: colors.text.primary },
  insight: { marginBottom: spacing.lg, gap: spacing.sm },
  insightTitle: { ...typography.label, color: colors.accent.purple },
  insightBody: { ...typography.body, color: colors.text.secondary, lineHeight: 20 },
  loader: { marginVertical: spacing.lg },
  empty: { ...typography.body, color: colors.text.secondary, marginBottom: spacing.lg },
  entryCard: { marginBottom: spacing.sm, gap: spacing.xs },
  entryDate: { ...typography.caption, color: colors.text.tertiary, textTransform: 'capitalize' },
  entryText: { ...typography.body, color: colors.text.secondary, lineHeight: 20 },
});
