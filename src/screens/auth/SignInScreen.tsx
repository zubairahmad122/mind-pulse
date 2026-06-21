import { signInWithEmailAndPassword } from '@react-native-firebase/auth';
import { getAuth } from '@/lib/firebase';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthHeroLayout, GoogleSignInButton } from '@/components/auth';
import { Button, Input } from '@/components/ui';
import { COLORS, ROUTES } from '@/constants';
import { GoogleSignInCancelledError, useAuth } from '@/context/AuthContext';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const passwordRef = useRef<TextInput>(null);
  const { signInWithGoogle } = useAuth();

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      if (error instanceof GoogleSignInCancelledError) return;
      const message = error instanceof Error ? error.message : 'Could not sign in with Google.';
      Alert.alert('Sign In Failed', message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(getAuth(), email.trim(), password);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid email or password.';
      Alert.alert('Sign In Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const formBusy = loading || googleLoading;

  return (
    <AuthHeroLayout>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Sign in to continue your wellness journey</Text>

      <View style={styles.form}>
        <GoogleSignInButton onPress={handleGoogle} loading={googleLoading} disabled={loading} />

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or email</Text>
          <View style={styles.divider} />
        </View>

        <Input
          label="Email Address"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          blurOnSubmit={false}
          editable={!formBusy}
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <Input
          ref={passwordRef}
          label="Password"
          placeholder="Your password"
          value={password}
          onChangeText={setPassword}
          secureToggle
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          returnKeyType="done"
          editable={!formBusy}
          onSubmitEditing={handleSignIn}
        />
        <TouchableOpacity
          style={styles.forgot}
          onPress={() => router.push(ROUTES.authForgotPassword)}
          activeOpacity={0.7}
          disabled={formBusy}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        <Button label="Sign In" onPress={handleSignIn} loading={loading} disabled={googleLoading} />

        <TouchableOpacity
          onPress={() => router.replace(ROUTES.authCreateAccount)}
          activeOpacity={0.7}
          disabled={formBusy}
        >
          <Text style={styles.footer}>
            Don&apos;t have an account? <Text style={styles.footerLink}>Create one</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </AuthHeroLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, lineHeight: 21, textAlign: 'center', marginBottom: 24 },
  form: { gap: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, fontSize: 12 },
  forgot: { alignSelf: 'flex-end', marginTop: -8 },
  forgotText: { color: COLORS.purpleLight, fontSize: 13, fontWeight: '600' },
  footer: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  footerLink: { color: COLORS.purple, fontWeight: '700' },
});
