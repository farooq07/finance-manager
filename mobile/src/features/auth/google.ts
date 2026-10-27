import { GoogleSignin, isCancelledResponse } from '@react-native-google-signin/google-signin';

let configuredFor: string | null = null;

/**
 * Point the native Google picker at the backend's *web* client ID: the ID
 * token it returns then has that audience, which is what /auth/google
 * verifies. (The Android OAuth client only has to exist in Google Cloud for
 * package com.wealthaxis.app + the signing SHA-1.)
 */
export function configureGoogle(webClientId: string) {
    if (configuredFor === webClientId) return;
    GoogleSignin.configure({ webClientId });
    configuredFor = webClientId;
}

/** The Google ID token, or null if the user closed the picker. */
export async function signInWithGoogle(): Promise<string | null> {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return null;
    const idToken = response.data.idToken;
    if (!idToken) throw new Error('Google did not return an ID token');
    return idToken;
}
