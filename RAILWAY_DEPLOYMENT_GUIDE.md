# 🚂 Railway.app Deployment Guide

**Complete step-by-step guide to deploy your backend in 15 minutes**

---

## 📋 **Prerequisites**

✅ GitHub account (you have this)
✅ Backend code pushed to GitHub
✅ Railway.app account (free, takes 2 minutes)

---

## 🎯 **Step 1: Create Railway Account** (2 minutes)

1. Go to https://railway.app
2. Click "Start Free"
3. Click "Continue with GitHub"
4. Authorize Railway to access your repos
5. **Done!** ✅

---

## 🚀 **Step 2: Deploy Backend** (5 minutes)

### **Method A: From Dashboard (Easiest)**

1. Log into Railway dashboard
2. Click "New Project"
3. Click "Deploy from GitHub"
4. Select your repository: `Vibe-coding/Finance-manager`
5. Select branch: `main`
6. Railway auto-detects Node.js and PostgreSQL
7. Click "Deploy"
8. **Wait 3-5 minutes for deployment**

### **Method B: From CLI**

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

---

## 🔐 **Step 3: Configure Environment Variables** (3 minutes)

Your backend needs `.env` variables on Railway:

1. Go to your Railway project dashboard
2. Click "Variables" tab
3. Add these variables:

```
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
NODE_ENV=production
DATABASE_URL=<auto-filled by Railway>
DIRECT_URL=<auto-filled by Railway>
GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=your_app_password
```

**About DATABASE_URL:**
- Railway automatically creates PostgreSQL
- DATABASE_URL is auto-populated
- Just add other variables

**About GMAIL:**
- Keep blank if you don't need email OTP
- Or add your Gmail credentials

4. Click "Save"
5. **Done!** ✅

---

## 📊 **Step 4: Run Database Migrations** (3 minutes)

Your database needs to be set up with tables:

### **Option A: Automatic (Recommended)**

Railway will auto-run migrations if you add to `package.json`:

```json
{
  "scripts": {
    "start": "node server.js",
    "postinstall": "npx prisma migrate deploy && npx prisma db seed"
  }
}
```

Then Railway runs postinstall automatically.

### **Option B: Manual**

Connect to Railway database and run:
```bash
npx prisma migrate deploy
npx prisma db seed
```

---

## 🌐 **Step 5: Get Your Backend URL** (1 minute)

1. Go to Railway project dashboard
2. Click "Deployments" tab
3. Find "Service" section
4. Copy the URL (looks like: `https://your-app-abc123.railway.app`)
5. **This is your backend URL!** ✅

---

## 📱 **Step 6: Update Mobile App** (2 minutes)

Update your mobile app to use the deployed backend:

**File:** `finance-manager-mobile/.env`

```env
EXPO_PUBLIC_API_URL=https://your-app-abc123.railway.app/api
```

Replace `your-app-abc123` with your actual Railway URL.

---

## 🔨 **Step 7: Rebuild & Deploy APK** (15 minutes)

Rebuild the mobile app with new backend URL:

```bash
cd finance-manager-mobile
npm install
npx eas build --platform android --profile preview
```

Wait for build to complete, then:
1. Download APK from EAS
2. Install on phone
3. **App now uses your deployed backend!** ✅

---

## ✅ **Verification**

Test that everything works:

```bash
# Test backend is live
curl https://your-app-abc123.railway.app

# Should return:
# {"message":"Finance Manager API is running"...}

# Test login endpoint
curl -X POST https://your-app-abc123.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"farooqshad07@gmail.com","password":"admin"}'

# Should return OTP and userId
```

---

## 🎉 **Testing on Phone**

1. Install new APK
2. Open app
3. Login with: `farooqshad07@gmail.com` / `admin` / OTP: `123456`
4. Should load dashboard with your data
5. **You're done!** ✅

---

## 📊 **What You Get on Railway Free Tier**

- ✅ PostgreSQL database (PostgreSQL)
- ✅ Backend hosting (Node.js)
- ✅ $5/month credit
- ✅ Unlimited projects
- ✅ GitHub integration
- ✅ Auto-deploys on push
- ✅ 500MB storage

**Cost:** Usually FREE with $5 credit (your app uses ~1MB)

---

## 🔄 **Future Updates**

After deployment, every time you push to GitHub:

1. Push to `main` branch
2. Railway auto-detects changes
3. Automatically rebuilds and deploys
4. Backend is updated in ~2 minutes
5. **Zero downtime!**

---

## 🐛 **Troubleshooting**

### **Build fails**

Check Railway logs:
1. Go to Deployments tab
2. Click latest deployment
3. View build logs
4. Look for errors

Common fixes:
```bash
# Clear npm cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm start
```

### **Database connection fails**

Check DATABASE_URL:
1. Go to Variables tab
2. Verify DATABASE_URL is set
3. Run migrations manually via CLI
4. Check Prisma schema is correct

### **App can't connect to backend**

Check API URL in mobile app:
```env
# Should be
EXPO_PUBLIC_API_URL=https://your-railway-url/api

# NOT
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 💡 **Pro Tips**

1. **Auto-deploy on push:**
   - Railway watches your GitHub branch
   - Every push auto-deploys
   - No manual steps needed

2. **Monitor app:**
   - Go to "Monitoring" tab in Railway
   - See CPU, memory, uptime
   - Get alerts if app crashes

3. **Scale up later:**
   - Railway auto-scales under load
   - Pay only for what you use
   - Generous free tier

4. **Database backups:**
   - Railway auto-backs up PostgreSQL
   - Data is safe and encrypted
   - Easy restore if needed

---

## 📞 **Need Help?**

Railway support: https://railway.app/support

Common issues: https://docs.railway.app/

---

## 🎯 **Total Time Required**

- Create account: 2 min
- Deploy backend: 5 min
- Configure variables: 3 min
- Update app: 2 min
- Rebuild APK: 15 min
- **Total: ~30 minutes** ⏱️

---

**Your backend is now live and automatically deployed!**

No more need to keep your computer running! 🎉

---

**Next: Choose between:**
1. ✅ Use Railway (recommended)
2. 👍 Use Render.com (alternative)
3. 💎 Use Supabase + Vercel (free but complex)
