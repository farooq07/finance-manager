import Constants, { ExecutionEnvironment } from 'expo-constants';

// Expo Go doesn't contain the Google sign-in native module, and importing it
// there crashes the app — so it is loaded only when used, and the button is
// hidden in Expo Go. Development and store builds have it.
export const googleSignInAvailable = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

type GoogleLib = typeof import('@react-native-google-signin/google-signin');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const lib = (): GoogleLib => require('@react-native-google-signin/google-signin');

let configuredFor: string | null = null;

/**
 * Point the native Google picker at the backend's *web* client ID: the ID
 * token it returns then has that audience, which is what /auth/google
 * verifies. (The Android OAuth client only has to exist in Google Cloud for
 * package com.wealthaxis.app + the signing SHA-1.)
 */
export function configureGoogle(webClientId: string) {
    if (configuredFor === webClientId) return;
    lib().GoogleSignin.configure({ webClientId });
    configuredFor = webClientId;
}

/** The Google ID token, or null if the user closed the picker. */
export async function signInWithGoogle(): Promise<string | null> {
    const { GoogleSignin, isCancelledResponse } = lib();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return null;
    const idToken = response.data.idToken;
    if (!idToken) throw new Error('Google did not return an ID token');
    return idToken;
}
