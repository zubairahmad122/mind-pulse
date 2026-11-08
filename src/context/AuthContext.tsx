import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  onAuthStateChanged,
  signInWithCredential,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as authSignOut,
  GoogleAuthProvider,
  FirebaseAuthTypes,
} from '@react-native-firebase/auth';
import {
  GoogleSignin,
  isCancelledResponse,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import Purchases from 'react-native-purchases';
import { getAuth } from '@/lib/firebase';
import { getGoogleSignInErrorMessage } from '@/utils/googleSignIn';

// RevenueCat must be configured exactly once per app lifetime.
let purchasesConfigured = false;

function configurePurchases() {
  if (purchasesConfigured) return;

  const apiKey = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    default: undefined,
  });

  if (!apiKey) {
    console.warn('[RevenueCat] No API key for this platform — Purchases.configure() skipped');
    return;
  }

  Purchases.configure({ apiKey });
  purchasesConfigured = true;
}

type AuthContextType = {
  user: FirebaseAuthTypes.User | null;
  isGuestMode: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export class GoogleSignInCancelledError extends Error {
  constructor() {
    super('Google sign-in was cancelled');
    this.name = 'GoogleSignInCancelledError';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const googleSignInInProgress = useRef(false);
  // Configure before rendering SubscriptionProvider. React child effects may
  // run before this provider's effects, so configuring only in useEffect can
  // race the first Purchases.getCustomerInfo() call.
  configurePurchases();

  useEffect(() => {
    try {
      GoogleSignin.configure({
        webClientId: '742478012348-ehcquc3rscpo7rlt9dic2diq10sq8nug.apps.googleusercontent.com',
      });
    } catch {
      // Play Services unavailable on some devices
    }

    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, u => {
      setUser(u);
      if (u) {
        setIsGuestMode(false);
        // Link RevenueCat's identity to the real account so entitlements
        // (e.g. an active Pro subscription) are found after a reinstall,
        // a new device, or a fresh sign-in — without this, RevenueCat only
        // ever sees its own per-device anonymous ID, which has no purchase
        // history, and the app reads back as Free until the user manually
        // taps "Restore Purchases".
        if (!u.isAnonymous && purchasesConfigured) {
          Purchases.logIn(u.uid).catch(err => {
            console.warn('[RevenueCat] logIn failed', err);
          });
        }
      }
      setLoading(false);
    });
    // If Firebase never delivers the first auth callback (offline/hung
    // Play Services), don't leave the root layout waiting forever — that
    // used to produce a blank white screen after the launch overlay timed out.
    const loadingFallback = setTimeout(() => setLoading(false), 6000);
    return () => {
      unsubscribe();
      clearTimeout(loadingFallback);
    };
  }, []);

  const signInWithGoogle = async () => {
    if (googleSignInInProgress.current) {
      return;
    }
    googleSignInInProgress.current = true;

    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      const response = await GoogleSignin.signIn();

      if (isCancelledResponse(response)) {
        throw new GoogleSignInCancelledError();
      }

      if (!isSuccessResponse(response)) {
        throw new Error('Google sign-in did not complete. Please try again.');
      }

      let idToken = response.data.idToken;
      if (!idToken) {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens.idToken;
      }

      if (!idToken) {
        throw new Error(
          'Missing Google ID token. Confirm the Firebase web client ID matches google-services.json.',
        );
      }

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(getAuth(), credential);
    } catch (error) {
      if (error instanceof GoogleSignInCancelledError) {
        throw error;
      }
      const message = getGoogleSignInErrorMessage(error);
      if (message === '') {
        throw new GoogleSignInCancelledError();
      }
      throw new Error(message);
    } finally {
      googleSignInInProgress.current = false;
    }
  };

  const continueAsGuest = async () => {
    try {
      await firebaseSignInAnonymously(getAuth());
      setIsGuestMode(false);
    } catch {
      setIsGuestMode(true);
    }
  };

  const signOut = async () => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setIsGuestMode(false);
      return;
    }

    if (!currentUser.isAnonymous) {
      try {
        if (GoogleSignin.hasPreviousSignIn()) {
          await GoogleSignin.signOut();
        }
      } catch {
        // ignore
      }
      if (purchasesConfigured) {
        try {
          await Purchases.logOut();
        } catch (err) {
          console.warn('[RevenueCat] logOut failed', err);
        }
      }
    }

    await authSignOut(auth);
    setIsGuestMode(false);
  };

  // Firebase's onAuthStateChanged only fires on sign-in/sign-out/token
  // refresh — not after updateProfile() — so the displayName set right after
  // signup wouldn't otherwise reach context state until the next full auth
  // event (e.g. app restart). Callers reload + re-sync explicitly instead.
  const refreshUser = async () => {
    const auth = getAuth();
    await auth.currentUser?.reload();
    setUser(auth.currentUser);
  };

  return (
    <AuthContext.Provider
      value={{ user, isGuestMode, loading, signInWithGoogle, continueAsGuest, signOut, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
