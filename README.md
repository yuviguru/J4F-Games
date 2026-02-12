# J4F — Just For Fun 🎲

A gaming platform for traditional and casual games. Mobile-first PWA with real-time online multiplayer.

## Quick Start

### 1. Set up Firebase (5 min)
Follow the steps in `docs/SETUP.md` to create a Firebase project and get your config.

### 2. Add your Firebase config
Edit `js/firebase-config.js` and paste your Firebase config values.

### 3. Deploy to Netlify
- Go to [app.netlify.com/drop](https://app.netlify.com/drop)
- Drag the entire `j4f/` folder
- Your site is live!

### 4. Update Firebase authorized domains
Add your `.netlify.app` domain to Firebase Auth > Settings > Authorized domains.

## Project Structure

```
j4f/
├── index.html                    # Portal home (game catalog)
├── manifest.json                 # PWA manifest
├── sw.js                         # Service worker (offline support)
├── js/
│   ├── firebase-config.js        # 🔑 Your Firebase config goes here
│   └── j4f-sdk.js                # Game SDK (auth, rooms, leaderboard, share)
├── games/
│   └── pallanguzhi/
│       └── index.html            # Pallanguzhi game
├── assets/
│   ├── icon-192.png              # PWA icon
│   └── icon-512.png              # PWA icon
└── docs/
    ├── PRD.md                    # Product requirements
    └── SETUP.md                  # Firebase setup guide
```

## Games

| Game | Status | Description |
|------|--------|-------------|
| Pallanguzhi | ✅ Live | Traditional South Indian mancala |
| Raaja Raani | 🔜 Soon | Classic card role game |
| Aadu Puli Aattam | 🔜 Soon | Goats vs Tigers strategy |
| Ludo | 🔜 Soon | Classic race board game |

## Game SDK (`J4F`)

Every game can use the shared SDK:

```javascript
// Auth
const user = await J4F.auth.login();         // Google sign-in
const guest = await J4F.auth.loginGuest();   // Anonymous play

// Multiplayer
const { code } = await J4F.room.create("pallanguzhi");
await J4F.room.join("ABCD");
J4F.room.onUpdate(data => { /* handle opponent moves */ });
await J4F.room.sendMove({ pit: 3 });

// Share
J4F.share.whatsapp("Join my game! Code: ABCD");
await J4F.share.copy("Room code: ABCD");

// Leaderboard
await J4F.leaderboard.submit("pallanguzhi", "win");
const top = await J4F.leaderboard.get("pallanguzhi", 20);
```

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (no build step)
- **Auth**: Firebase Authentication (Google + Phone + Guest)
- **Realtime**: Firebase Realtime Database
- **Hosting**: Netlify (free tier)
- **PWA**: Installable on Android & iOS
