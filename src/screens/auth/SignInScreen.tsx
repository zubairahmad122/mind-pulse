import { signInWithEmailAndPassword } from '@react-native-firebase/auth';
import { getAuth } from '@/lib/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AuthHeroLayout, GoogleSignInButton } from '@/components/auth';
import { Input } from '@/components/ui';
import { COLORS, FONTS, ROUTES } from '@/constants';
import { GoogleSignInCancelledError, useAuth } from '@/context/AuthContext';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const passwordRef = useRef<TextInput>(null);
  const { signInWithGoogle } = useAuth();

  const pressScale = useRef(new Animated.Value(1)).current;
  const shineX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1600),
        Animated.timing(shineX, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shineX, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shineX]);

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
    <AuthHeroLayout
      showBack={false}
      heroImage={require('@/assets/images/onboarding/login-hero.png')}
      heroLabel="MIND PULSE"
    >
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Continue your journey toward better focus, sleep, and wellness.</Text>

      <View style={styles.form}>
        <Input
          label="Email Address"
          icon="mail-outline"
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
          icon="lock-closed-outline"
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

        <Animated.View style={{ transform: [{ scale: pressScale }] }}>
          <TouchableOpacity
            onPress={handleSignIn}
            onPressIn={() => Animated.spring(pressScale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 0 }).start()}
            onPressOut={() => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start()}
            activeOpacity={0.92}
            disabled={formBusy}
            style={styles.signInBtn}
          >
            <LinearGradient
              colors={['#7EB8FF', '#1A8FFF', '#0F6FD6']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.signInGradient}
            >
              <Text style={styles.signInLabel}>Sign In</Text>
              <Svg width={17} height={17} viewBox="0 0 24 24">
                <Path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </LinearGradient>
            <Animated.View pointerEvents="none" style={[styles.shine, {
              transform: [
                { translateX: shineX.interpolate({ inputRange: [0, 1], outputRange: [-70, 340] }) },
                { rotate: '20deg' },
              ],
            }]}>
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>Continue with</Text>
          <View style={styles.divider} />
        </View>

        <GoogleSignInButton onPress={handleGoogle} loading={googleLoading} disabled={loading} />

        <TouchableOpacity
          onPress={() => router.replace(ROUTES.authCreateAccount)}
          activeOpacity={0.7}
          disabled={formBusy}
        >
          <Text style={styles.footer}>
            Don&apos;t have an account? <Text style={styles.footerLink}>Create Account</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </AuthHeroLayout>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: FONTS.heading, fontSize: 26, color: COLORS.text, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, lineHeight: 21, textAlign: 'center', marginBottom: 24 },
  form: { gap: 16 },
  forgot: { alignSelf: 'flex-end', marginTop: -8 },
  forgotText: { color: COLORS.purpleLight, fontSize: 13, fontWeight: '600' },
  signInBtn: {
    height: 56, borderRadius: 16, overflow: 'hidden',
    shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 12 },
    shadowRadius: 30, shadowOpacity: 0.7, elevation: 10,
  },
  signInGradient: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  signInLabel: { fontFamily: FONTS.bodyBold, fontSize: 16, color: '#fff', letterSpacing: 0.2 },
  shine: { position: 'absolute', top: -20, bottom: -20, width: 46 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, fontSize: 12 },
  footer: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  footerLink: { color: COLORS.purple, fontWeight: '700' },
});
