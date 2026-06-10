import firestore from '@react-native-firebase/firestore';

export interface RecoverySessionData {
  type: string;
  durationSeconds: number;
  completedAt: number;
}

export async function saveRecoverySession(
  uid: string,
  data: RecoverySessionData,
): Promise<void> {
  await firestore()
    .collection('users')
    .doc(uid)
    .collection('recoverySessions')
    .add(data);
}
