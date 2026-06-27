import { updateProfile } from '@react-native-firebase/auth';
import { getAuth } from '@/lib/firebase';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
} from 'react-native';
import { AmbientBackground } from '@/components/ui';
import { ScreenShell } from '@/components/layout/ScreenShell';
import Input from '@/components/ui/Input';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuth } from '@/context/AuthContext';

export default function EditProfileScreen() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.displayName ?? '');
  const [email] = useState(user?.email ?? '');
  const [sleepGoal, setSleepGoal] = useState('8');
  const [reminders, setReminders] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    setLoading(true);
    try {
      const current = getAuth().currentUser;
      if (current) await updateProfile(current, { displayName: name.trim() });
      Alert.alert('Saved', 'Profile updated.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not save.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ScreenShell safeBottom ambient={<AmbientBackground subtle />}>
        <ScreenHeader title="Edit Profile" showBack />
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <GlassCard style={styles.form}>
            <Input label="Name" value={name} onChangeText={setName} placeholder="Your name" />
            <Input label="Email" value={email} onChangeText={() => {}} editable={false} />
            <Input
              label="Sleep goal (hours)"
              value={sleepGoal}
              onChangeText={setSleepGoal}
              keyboardType="numeric"
            />
          </GlassCard>

          <GlassCard style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Push notifications</Text>
            <Switch
              value={reminders}
              onValueChange={setReminders}
              trackColor={{ false: colors.text.tertiary, true: colors.accent.purple }}
            />
          </GlassCard>

          <PrimaryButton label="Save Changes" onPress={handleSave} loading={loading} />
        </ScrollView>
      </ScreenShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: spacing.md, marginBottom: spacing.md },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  toggleLabel: { ...typography.bodyLarge, color: colors.text.primary },
});
