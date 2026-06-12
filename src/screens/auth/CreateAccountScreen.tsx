import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  updateProfile,
} from '@react-native-firebase/auth';
import { getAuth } from '@/lib/firebase';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthScreenLayout } from '@/components/auth';
import { AuthBackButton, Button, Input } from '@/components/ui';
import { ROUTES } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { migrateGuestData } from '@/services/guestMigration';

export default function CreateAccountScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const auth = getAuth();
      const isAnonymous = currentUser?.isAnonymous ?? false;

      if (isAnonymous) {
        // Link anonymous account to email/password. The uid is preserved, so
        // Firestore data and AsyncStorage caches already belong to this account —
        // no migration needed (re-running it would duplicate synced history).
        const credential = EmailAuthProvider.credential(email.trim(), password);
        const result = await linkWithCredential(currentUser!, credential);
        await updateProfile(result.user, { displayName: name.trim() });
      } else {
        // Brand new account (anonymous sign-in was unavailable) — migrate any
        // guest data saved under the ':guest' AsyncStorage keys.
        const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(user, { displayName: name.trim() });
        void migrateGuestData(user.uid);
      }
    } catch (error: any) {
      Alert.alert('Sign Up Error', error.message ?? 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout>
      <AuthBackButton />

      <Text className="text-[30px] font-bold text-white mb-2 mt-2">Create Account</Text>
      <Text className="text-[15px] text-app-muted leading-6 mb-8">
        Join AuraSync and start your{'\n'}holistic wellness journey.
      </Text>

      <View className="gap-5">
        <Input
          label="Full Name"
          placeholder="Your full name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <Input
          ref={emailRef}
          label="Email Address"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <Input
          ref={passwordRef}
          label="Password"
          placeholder="Min. 6 characters"
          value={password}
          onChangeText={setPassword}
          secureToggle
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={handleSignUp}
        />
        <Button label="Create Account" onPress={handleSignUp} loading={loading} />

        <TouchableOpacity onPress={() => router.replace(ROUTES.authSignIn)} activeOpacity={0.7}>
          <Text className="text-app-muted text-sm text-center">
            Already have an account?{' '}
            <Text className="text-app-purple font-bold">Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </AuthScreenLayout>
  );
}

