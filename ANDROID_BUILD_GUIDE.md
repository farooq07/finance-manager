# Android APK Build Guide

## 📱 Finance Manager Mobile - Android Build

**App Name**: Finance Manager  
**Package**: com.farooqibex.financemanager  
**Minimum SDK**: API 24 (Android 7.0)  
**Target SDK**: API 36 (Android 15)  
**Build Status**: ⏳ Building...

---

## 🚀 Build Information

### What's Being Built
- **Type**: Debug APK (for testing)
- **Architecture**: ARM64-v8a & ARMv7
- **Gradle Version**: 8.14.3
- **NDK Version**: 27.1.12297006
- **Kotlin**: 2.1.20

### APK Location (once built)
```
finance-manager-mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📋 Pre-requisites Installed

✅ Node.js & npm  
✅ Expo & EAS CLI  
✅ Android SDK (API 24-36)  
✅ Android NDK (27.1.12297006)  
✅ Gradle 8.14.3  
✅ Local.properties configured  

---

## 🔧 Build Steps Completed

1. ✅ Fixed app.json (SVG → PNG for icons)
2. ✅ Installed dependencies (with --legacy-peer-deps)
3. ✅ Created eas.json configuration
4. ✅ Prebuild Android native code
5. ✅ Configure Android SDK path
6. ✅ Running Gradle build...

---

## 📦 Installation Instructions

### Once APK is Ready

**Option 1: USB Cable**
```bash
# Enable USB debugging on Android device
# Connect device to computer
adb install -r finance-manager-mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

**Option 2: Direct File Transfer**
1. Copy APK to device via USB cable or file transfer
2. Open file manager on device
3. Tap the APK file
4. Follow installation prompts

**Option 3: Share via Email/Drive**
1. Upload APK to Google Drive or email
2. Download on Android device
3. Install from Downloads

---

## 🧪 Testing Checklist

Once app is installed:

- [ ] App launches without crashes
- [ ] Login page displays correctly
- [ ] Can log in with super admin credentials:
  - Email: `farooqshad07@gmail.com`
  - Password: `admin`
  - OTP: `123456`
- [ ] Dashboard loads with data
- [ ] Can navigate between tabs
- [ ] Can view financial data
- [ ] Dark mode works
- [ ] No major performance issues

---

## 🔐 Release Build (for Play Store)

When ready for Play Store upload:

```bash
cd android
./gradlew assembleRelease
# OR for App Bundle
./gradlew bundleRelease
```

**Requirements for Play Store**:
- Signed APK/AAB with release keystore
- Version code incremented
- Privacy policy configured
- App screenshots & descriptions
- 20.5 MB minimum free space

---

## 📊 Build Performance

- **Build Time**: ~5-10 minutes (first time)
- **Build Size**: ~350 MB (debug APK)
- **Output**: Unoptimized (debug APK)

---

## ⚠️ Troubleshooting

### APK Not Installing
- Check Android version compatibility (API 24+)
- Clear app cache: `adb shell pm clear com.farooqibex.financemanager`
- Reinstall: `adb install -r app-debug.apk`

### App Crashes on Launch
- Check logcat: `adb logcat`
- Ensure backend API is running
- Verify API_URL in .env

### Build Fails
- Clear Gradle cache: `./gradlew clean`
- Rebuild: `./gradlew assembleDebug`

---

## 📱 API Configuration

The mobile app connects to:
```
Backend API: http://localhost:5000  (or configured in .env)
```

**Required Backend Services**:
- ✅ Auth API (/api/auth)
- ✅ Users API (/api/users)
- ✅ Dashboard API (/api/dashboard)
- ✅ All financial data APIs

---

##  Device Requirements

**Minimum**:
- Android 7.0 (API 24)
- 100 MB free space
- RAM: 2 GB+

**Recommended**:
- Android 12+ (API 31+)
- 200 MB free space
- RAM: 4 GB+

---

## 📝 App Config Details

```json
{
  "name": "Finance Manager",
  "version": "1.0.0",
  "package": "com.farooqibex.financemanager",
  "minSdk": 24,
  "targetSdk": 36
}
```

---

## 🎯 Next Steps

1. ⏳ Wait for build to complete
2. 📥 Locate APK file in debug outputs
3. 📱 Install on Android device
4. 🧪 Test all features
5. 🔄 Report any bugs/issues
6. 📤 Prepare for Play Store upload

---

**Build initiated at**: 2026-04-12 ~10:55  
**Status**: In Progress  
**ETA**: 10-15 minutes  

Monitor the build output for completion notifications! 🚀
