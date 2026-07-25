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
  View,
} from 'react-native';
import { AmbientBackground } from '@/components/ui';
import { ScreenShell } from '@/components/layout/ScreenShell';
import Input from '@/components/ui/Input';
import { GradientCTA } from '@/components/ui/GradientCTA';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { colors } from '@/constants/colors';
import { SURFACE } from '@/constants/designSystem';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuth } from '@/context/AuthContext';

// The app's generic brand purple, not a pillar color — Profile isn't pillar-scoped.
const ACCENT = SURFACE.purple;

export default function EditProfileScreen() {
  const { user } = useAuth();
  const initialName = user?.displayName ?? '';
  const initialReminders = true;
  const [name, setName] = useState(initialName);
  const [email] = useState(user?.email ?? '');
  const [reminders, setReminders] = useState(initialReminders);
  const [loading, setLoading] = useState(false);
  const hasChanges = name.trim() !== initialName.trim() || reminders !== initialReminders;

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
            {/* Read-only — changing the Auth email needs its own verification
                flow; editing it here would silently desync from Firebase Auth. */}
            <View style={styles.readOnlyField}>
              <Input label="Email" value={email} onChangeText={() => {}} editable={false} />
            </View>
          </GlassCard>

          <GlassCard style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Push notifications</Text>
            <Switch
              value={reminders}
              onValueChange={setReminders}
              trackColor={{ false: colors.text.tertiary, true: ACCENT }}
            />
          </GlassCard>

          <GradientCTA
            label="Save Changes"
            onPress={() => void handleSave()}
            loading={loading}
            disabled={!hasChanges}
          />
        </ScrollView>
      </ScreenShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: spacing.md, marginBottom: spacing.md },
  readOnlyField: { opacity: 0.5 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  toggleLabel: { ...typography.bodyLarge, color: colors.text.primary },
});
