import { getAuth as getRNFirebaseAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';

export function getAuth() {
  return getRNFirebaseAuth();
}

export function getDb() {
  return getFirestore();
}
