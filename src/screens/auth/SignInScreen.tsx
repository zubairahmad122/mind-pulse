import { signInWithEmailAndPassword } from '@react-native-firebase/auth';
import { getAuth } from '@/lib/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, {
  Defs,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedBackground from '@/components/AnimatedBackground';
import { GoogleSignInButton } from '@/components/auth';
import { Input } from '@/components/ui';
import { COLORS, FONTS, ROUTES } from '@/constants';
import {
  BACKGROUND,
  BUTTON,
  GLASS_CARD,
  PILLAR_COLORS,
  RADIUS,
  SPACING,
} from '@/constants/designSystem';
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
      const message =
        error instanceof Error
          ? error.message
          : 'Could not sign in with Google.';
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
      const message =
        error instanceof Error ? error.message : 'Invalid email or password.';
      Alert.alert('Sign In Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const formBusy = loading || googleLoading;

  return (
    <SafeAreaView style={styles.root}>
      <AnimatedBackground />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.iconWrap}>
                <Svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 128 112"
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                >
                  <Defs>
                    <RadialGradient id="signInIconGlow" cx="50%" cy="50%" r="50%">
                      <Stop offset="0%" stopColor="#00D4FF" stopOpacity={0.16} />
                      <Stop offset="52%" stopColor="#1A8FFF" stopOpacity={0.05} />
                      <Stop offset="100%" stopColor="#1A8FFF" stopOpacity={0} />
                    </RadialGradient>
                  </Defs>
                  <Rect width="128" height="112" fill="url(#signInIconGlow)" />
                </Svg>
                <Image
                  source={require('@/assets/expo.icon/Assets/mind-pulse-playstore.png')}
                  style={styles.brandIcon}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle} numberOfLines={2}>
                Continue your journey toward better sleep, focus and wellbeing.
              </Text>
            </View>

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
                fieldStyle={styles.inputField}
                labelStyle={styles.inputLabel}
                focusColor={PILLAR_COLORS.relax}
                style={styles.inputText}
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
                fieldStyle={styles.inputField}
                labelStyle={styles.inputLabel}
                focusColor={PILLAR_COLORS.relax}
                style={styles.inputText}
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

              <View style={styles.signInShadow}>
                <TouchableOpacity
                  onPress={handleSignIn}
                  activeOpacity={0.88}
                  disabled={formBusy}
                  style={styles.signInBtn}
                >
                  <LinearGradient
                    colors={BUTTON.primaryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.signInGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Text style={styles.signInLabel}>Sign In</Text>
                        <Svg width={17} height={17} viewBox="0 0 24 24">
                          <Path
                            d="M5 12h14M13 6l6 6-6 6"
                            fill="none"
                            stroke="#fff"
                            strokeWidth={2.2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>Continue with</Text>
                <View style={styles.divider} />
              </View>

              <GoogleSignInButton
                onPress={handleGoogle}
                loading={googleLoading}
                disabled={loading}
                style={styles.googleButton}
              />

              <TouchableOpacity
                onPress={() => router.replace(ROUTES.authCreateAccount)}
                activeOpacity={0.7}
                disabled={formBusy}
                style={styles.createAccount}
              >
                <Text style={styles.footer}>
                  Don&apos;t have an account?{' '}
                  <Text style={styles.footerLink}>Create Account</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BACKGROUND.base,
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: SPACING.screenTop,
    paddingBottom: 24,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    justifyContent: 'flex-start',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconWrap: {
    width: 128,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  brandIcon: {
    width: 128,
    height: 128,
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
  },
  title: {
    fontFamily: FONTS.heading,
    fontWeight: '700',
    fontSize: 32,
    lineHeight: 38,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 5,
    maxWidth: 350,
    fontFamily: FONTS.body,
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  form: { gap: 14 },
  inputField: {
    height: 60,
    borderRadius: 16,
    paddingRight: 20,
    backgroundColor: GLASS_CARD.bg,
    borderColor: GLASS_CARD.border,
  },
  inputText: { paddingLeft: 4 },
  inputLabel: {
    fontFamily: FONTS.bodySemi,
    fontSize: 13,
    letterSpacing: 2,
    color: 'rgba(245,247,251,0.6)',
  },
  forgot: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: {
    color: COLORS.purpleLight,
    fontFamily: FONTS.bodySemi,
    fontSize: 13,
  },
  signInShadow: {
    borderRadius: RADIUS.button,
    shadowColor: PILLAR_COLORS.relax,
    shadowOffset: { width: 0, height: 7 },
    shadowRadius: 16,
    shadowOpacity: 0.28,
    elevation: 5,
  },
  signInBtn: {
    height: 60,
    borderRadius: RADIUS.button,
    overflow: 'hidden',
  },
  signInGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signInLabel: {
    fontFamily: FONTS.bodyBold,
    fontWeight: '700',
    fontSize: 17,
    color: '#FFFFFF',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 2,
  },
  divider: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  dividerText: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: FONTS.body,
    fontSize: 12,
  },
  googleButton: {
    height: 60,
    minHeight: 60,
    borderRadius: RADIUS.button,
    borderColor: GLASS_CARD.border,
    backgroundColor: GLASS_CARD.bg,
  },
  createAccount: { marginTop: 8 },
  footer: {
    color: 'rgba(255,255,255,0.62)',
    fontFamily: FONTS.body,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 2,
  },
  footerLink: {
    color: COLORS.purple,
    fontFamily: FONTS.bodyBold,
    fontWeight: '700',
  },
});
