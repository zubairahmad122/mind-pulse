import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AuthHeroLayout, GoogleSignInButton } from '@/components/auth';
import { Button } from '@/components/ui';
import { COLORS, ROUTES } from '@/constants';
import { GoogleSignInCancelledError, useAuth } from '@/context/AuthContext';

export default function SignUpScreen() {
  const router = useRouter();
  const { signInWithGoogle, continueAsGuest } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleGoogle = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      if (error instanceof GoogleSignInCancelledError) return;
      const message = error instanceof Error ? error.message : 'Could not sign in with Google.';
      Alert.alert('Sign In Failed', message);
    } finally {
      setBusy(false);
    }
  };

  const handleContinueAsGuest = async () => {
    setBusy(true);
    try {
      await continueAsGuest();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not continue as guest.';
      Alert.alert('Guest Mode Failed', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthHeroLayout>
      <View style={styles.center}>
        <Text style={styles.title}>Save Your Progress</Text>
        <Text style={styles.subtitle}>
          Create an account to sync your wellness{'\n'}data across all your devices.
        </Text>

        <View style={styles.actions}>
          <GoogleSignInButton onPress={handleGoogle} loading={busy} />

          <Button
            label="Continue with Email"
            onPress={() => router.push(ROUTES.authCreateAccount)}
            variant="outline"
            disabled={busy}
          />

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <Button
            label="Skip for now"
            onPress={handleContinueAsGuest}
            variant="ghost"
            disabled={busy}
          />
        </View>
      </View>

      <TouchableOpacity onPress={() => router.push(ROUTES.authSignIn)} activeOpacity={0.7}>
        <Text style={styles.footer}>
          Already have an account? <Text style={styles.footerLink}>Sign In</Text>
        </Text>
      </TouchableOpacity>
    </AuthHeroLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 8,
  },
  actions: { gap: 12 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, fontSize: 12 },
  footer: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: 16 },
  footerLink: { color: COLORS.purple, fontWeight: '700' },
});
