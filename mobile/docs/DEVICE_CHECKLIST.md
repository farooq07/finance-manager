# WealthAxis — real-device checklist (Foundation)

Run on a real Android phone before each release. Unit tests can't catch
fonts, keyboards, fingerprint sensors or the app switcher.

## Install a test build

```bash
cd mobile
npx eas login                                   # your Expo account (farookshad)
npx eas build --profile preview --platform android
```

Install the APK from the link EAS prints (or scan its QR code).

> Google sign-in needs an Android OAuth client in Google Cloud Console for
> package `com.wealthaxis.app` with the SHA-1 shown by `npx eas credentials`
> (Android → Keystore). Without it the Google button shows an error.

## Checks

| # | Do this | Expect |
|---|---|---|
| 1 | Open the app for the first time | Splash, then **Welcome back** sign-in screen on a soft gradient |
| 2 | Create an account | "Check your email"; the link in the email confirms the address |
| 3 | Sign in with email + password | 6-digit code screen; code arrives by email |
| 4 | Enter a wrong code | The server's message under the form |
| 5 | Enter the right code | **Choose a 6-digit PIN** → **Enter it again** |
| 6 | Enter a different PIN the second time | "PINs didn't match. Try again." |
| 7 | Finish the PIN | Fingerprint offer (if the phone has one) → turn it on, scan |
| 8 | Onboarding: pick Gold, add a bank `Meezan` with `1,50,000` | Net worth so far shows PKR 150,000 |
| 9 | Continue | **You're set up** with your net worth → **Go to Home** |
| 10 | Home | "Hi, <name>", net-worth card; pull down to refresh |
| 11 | Tap Accounts / Invest / More | "Not here yet · Coming in the next update" |
| 12 | Tap the centre **+** | Sheet: Expense / Transfer / Import statement / Ask AI |
| 13 | Open the app switcher | WealthAxis card shows the logo, not your balances |
| 14 | Leave the app 5+ minutes, come back | Locked: fingerprint prompt or PIN pad |
| 15 | Enter a wrong PIN 5 times | "N tries left" each time, then signed out |
| 16 | Kill the app, reopen | Locked (PIN / fingerprint), then Home |
| 17 | Airplane mode, reopen | Still signed in; "You're offline — showing saved data" |
| 18 | Phone dark mode on | Dark slate gradient, readable text everywhere |
| 19 | Smallest phone you have: type the OTP / balance | Fields stay above the keyboard |
| 20 | Google sign-in (after the OAuth client exists) | Picker → straight in; closing the picker does nothing |
