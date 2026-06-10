import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export function getAuth() {
  return auth();
}

export function getDb() {
  return firestore();
}
