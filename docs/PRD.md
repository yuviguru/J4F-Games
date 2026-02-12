# J4F — Just For Fun

## Product Requirements Document

### Vision
A Miniclip-style gaming platform for traditional and casual games. Mobile-first PWA with real-time online multiplayer, social features, and WhatsApp-driven viral growth.

### Target Audience
- Mobile gamers (18-45) who enjoy casual/traditional games
- South Asian diaspora with nostalgia for childhood board games
- Groups of friends looking for quick multiplayer fun

### Platform Name
**J4F — Just For Fun** (Tamil: ஜஸ்ட் ஃபார் ஃபன்)

---

## Phase 1 — MVP Launch

### Features (Priority Order)
1. **WhatsApp Invite** — Share game link + room code via WhatsApp
2. **Google/Phone Login** — Firebase Auth (Google OAuth + Phone OTP)
3. **Online Multiplayer Rooms** — Create/Join with 4-letter codes, real-time moves via Firebase Realtime DB
4. **Leaderboards** — Per-game win/loss stats

### Games
1. **Pallanguzhi** (பல்லாங்குழி) — Traditional mancala, 2-player
2. **Raaja Raani** (ராஜா ராணி) — Traditional card role game

### Tech Stack
| Layer | Tech | Reason |
|-------|------|--------|
| Frontend | Vanilla HTML/CSS/JS + React (CDN) | No build step, instant deploy |
| Auth | Firebase Auth | Google + Phone OTP, free tier |
| Realtime | Firebase Realtime Database | Live multiplayer, <100ms latency |
| Database | Firebase Firestore | User profiles, scores, history |
| Hosting | Netlify | Free, CDN, drag-drop deploy |
| PWA | Service Worker + Manifest | Installable on Android/iOS |

### Architecture
```
j4f/
├── index.html              # Portal home page
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── js/
│   ├── firebase-config.js  # Firebase project config
│   └── j4f-sdk.js          # Game SDK (auth, rooms, leaderboard)
├── css/
│   └── portal.css          # Portal styles
├── games/
│   └── pallanguzhi/
│       └── index.html      # Pallanguzhi game (self-contained)
└── assets/
    ├── icon-192.png
    └── icon-512.png
```

### Game SDK API
```javascript
// Auth
J4F.auth.login()           // Google popup
J4F.auth.loginPhone(num)   // Phone OTP
J4F.auth.getUser()         // Current user
J4F.auth.onAuth(cb)        // Auth state listener

// Rooms
J4F.room.create(gameId)    // Returns { code: "ABCD" }
J4F.room.join(code)        // Joins room, returns room data
J4F.room.onUpdate(cb)      // Listen for opponent's moves
J4F.room.sendMove(data)    // Send your move
J4F.room.leave()           // Leave room

// Social
J4F.share.whatsapp(text)   // Open WhatsApp with text
J4F.share.copy(text)       // Copy to clipboard

// Leaderboard
J4F.leaderboard.submit(gameId, score)
J4F.leaderboard.get(gameId, limit)
```

---

## Phase 2 — Growth
- Raaja Raani game
- Friends list
- Challenge a friend
- Match history
- Player profiles with avatars

## Phase 3 — Economy
- Coins system
- Daily rewards
- Tournaments
- Premium cosmetics (seed skins, board themes)

## Phase 4 — Store Launch
- Capacitor wrapper for Android/iOS
- Google Play Store submission
- App Store submission

## Phase 5 — Scale
- Auto-matchmaking
- Chat in-game
- Spectator mode
- More games (Ludo, Carrom, Aadu Puli Aattam)
