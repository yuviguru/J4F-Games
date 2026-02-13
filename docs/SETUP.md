# J4F — Firebase Setup Guide

## Step 1: Create Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Create a project"**
3. Name it: `j4f-games`
4. Disable Google Analytics (optional for now)
5. Click **Create**

## Step 2: Enable Authentication

1. In Firebase Console → **Authentication** → **Sign-in method**
2. Enable **Google** → Save
3. Enable **Phone** → Save

## Step 3: Create Realtime Database

1. Go to **Realtime Database** → **Create Database**
2. Choose your region (closest to your users)
3. Start in **Test mode** (we'll add rules later)
4. Copy the database URL (looks like `https://j4f-games-default-rtdb.firebaseio.com`)

## Step 4: Set Database Rules

Go to **Realtime Database** → **Rules** and paste:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    },
    "matchmaking": {
      "$gameId": {
        "$entryId": {
          ".read": true,
          ".write": true
        }
      }
    },
    "users": {
      "$uid": {
        ".read": true,
        ".write": "$uid === auth.uid"
      }
    },
    "leaderboard": {
      "$gameId": {
        ".read": true,
        "$uid": {
          ".write": "$uid === auth.uid"
        }
      }
    }
  }
}
```

## Step 5: Get Your Config

1. Go to **Project Settings** (gear icon) → **General**
2. Scroll to **"Your apps"** → Click **Web** (</> icon)
3. Register app name: `j4f-web`
4. Copy the `firebaseConfig` object

## Step 6: Add Config to Project

Open `js/firebase-config.js` and replace the placeholder:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "j4f-games.firebaseapp.com",
  databaseURL: "https://j4f-games-default-rtdb.firebaseio.com",
  projectId: "j4f-games",
  storageBucket: "j4f-games.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 7: Deploy to Netlify

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the entire `j4f/` folder
3. Your site is live!

## Step 8: Update Firebase Auth Domain

1. Back in Firebase Console → **Authentication** → **Settings**
2. Add your Netlify URL to **Authorized domains**:
   - `your-site-name.netlify.app`

## Cost (Firebase Free Tier)
- Auth: 10K verifications/month (phone), unlimited Google
- Realtime DB: 1GB stored, 10GB/month download
- Firestore: 20K writes/day, 50K reads/day
- This is MORE than enough for thousands of daily players
