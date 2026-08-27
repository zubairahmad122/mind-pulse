import { isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';

export function getGoogleSignInErrorMessage(error: unknown): string {
  if (isErrorWithCode(error)) {
    switch (error.code) {
      case statusCodes.SIGN_IN_CANCELLED:
        return '';
      case statusCodes.IN_PROGRESS:
        return 'Sign-in is already in progress. Please wait.';
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return 'Google Play Services is not available on this device.';
      default:
        return error.message || 'Could not sign in with Google.';
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Could not sign in with Google.';
}

export function isGoogleSignInCancelled(error: unknown): boolean {
  return isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED;
}
