# 📱 Finance Manager Mobile - Complete Setup Guide

## ✅ What's Fixed

### 1. API Configuration
- **Fallback URL**: `http://192.168.18.138:5000/api` (hardcoded in api.ts)
- **Environment Variable**: `EXPO_PUBLIC_API_URL` in `.env`
- **Auto-detection**: App will work with or without environment variable

### 2. Error Handling
- Improved auth check error handling
- App won't crash if API is unavailable on startup
- Graceful fallback to login screen

### 3. Backend
- Added root route `/` for health checks
- All API endpoints configured
- Auth endpoint `/api/auth/me` verified

---

## 🚀 Final Setup Steps

### Step 1: Ensure Backend is Running
```bash
cd backend
npm start
```

**Should output:**
```
Server running on port 5000
[Cron] Initializing weekly email summary cron job...
```

### Step 2: Verify API is Accessible
```bash
curl http://192.168.18.138:5000
```

**Should return:**
```json
{
  "message": "Finance Manager API is running",
  "version": "1.0.0",
  "timestamp": "..."
}
```

### Step 3: Build New Release APK
```bash
cd finance-manager-mobile
npx eas build --platform android --profile preview
```

**Wait for build to complete (~10-15 minutes)**

### Step 4: Install on Phone
1. Download APK from EAS build link
2. Transfer to phone via USB or email
3. Uninstall old version
4. Install new APK
5. Open app

---

## 📱 Test the App

### First Time Opening
- App should show loading screen briefly
- Then redirect to **Login Screen**

### Login Credentials
```
Email: farooqshad07@gmail.com
Password: admin
OTP: 123456
```

### What to Expect
1. ✅ App opens without crashing
2. ✅ Login screen displays
3. ✅ After login → Dashboard loads
4. ✅ All data from admin user visible
5. ✅ Can navigate between tabs

---

## 🔧 Troubleshooting

### App Still Crashing?
1. Check backend is running: `npm start` in backend folder
2. Check phone is on same WiFi as computer
3. Check API is accessible: `curl http://192.168.18.138:5000`

### Check Logs
```bash
adb logcat | grep -i "error\|crash\|exception"
```

### If API URL is Wrong
The `.env` file has the correct URL:
```
EXPO_PUBLIC_API_URL=http://192.168.18.138:5000/api
```

---

## 📊 Final Checklist

Before declaring success:
- [ ] Backend running on port 5000
- [ ] Backend accessible from computer: `curl http://192.168.18.138:5000`
- [ ] New APK built from EAS
- [ ] Old APK uninstalled from phone
- [ ] New APK installed on phone
- [ ] App opens without crashing
- [ ] Login screen displays
- [ ] Can log in with credentials above
- [ ] Dashboard loads with data
- [ ] All tabs accessible

---

## 🎉 Success Criteria

App is working properly when:
✅ Opens without crashes
✅ Shows login screen on first launch
✅ Accepts login credentials
✅ Displays dashboard with financial data
✅ Can navigate all screens without errors
✅ Data persists between app restarts

---

**All fixes applied. App should now work properly!**
