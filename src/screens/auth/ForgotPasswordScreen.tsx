import { sendPasswordResetEmail } from '@react-native-firebase/auth';
import { getAuth } from '@/lib/firebase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AuthScreenLayout } from '@/components/auth';
import { AuthBackButton, Button, Input } from '@/components/ui';
import { COLORS, ROUTES } from '@/constants';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Missing Email', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(getAuth(), email.trim());
      setSent(true);
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'Could not send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout>
      <AuthBackButton />

      <View className="flex-1 justify-center gap-4">
        {sent ? (
          <>
            <View style={styles.iconOrb}>
              <Text style={{ fontSize: 40 }}>📬</Text>
            </View>
            <Text className="text-[28px] font-bold text-white text-center mt-4">
              Check Your Email
            </Text>
            <Text className="text-[15px] text-app-muted text-center leading-6 mb-6">
              We sent a reset link to{'\n'}
              <Text className="text-app-purple-light font-semibold">{email}</Text>
            </Text>
            <Button label="Back to Sign In" onPress={() => router.replace(ROUTES.authSignIn)} />
          </>
        ) : (
          <>
            <View style={styles.iconOrb}>
              <Text style={{ fontSize: 40 }}>🔑</Text>
            </View>
            <Text className="text-[28px] font-bold text-white text-center mt-4">
              Forgot Password?
            </Text>
            <Text className="text-[15px] text-app-muted text-center leading-6 mb-4">
              Enter your email and we&apos;ll send{'\n'}a link to reset your password.
            </Text>
            <View className="gap-4">
              <Input
                label="Email Address"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Button label="Send Reset Link" onPress={handleReset} loading={loading} />
            </View>
          </>
        )}
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  iconOrb: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.borderHi,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
  },
});
