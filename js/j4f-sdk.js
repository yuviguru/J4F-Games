/**
 * J4F Game SDK
 * Provides auth, multiplayer rooms, leaderboards, and sharing for all games.
 *
 * Usage:
 *   <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
 *   <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js"></script>
 *   <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-database-compat.js"></script>
 *   <script src="/js/firebase-config.js"></script>
 *   <script src="/js/j4f-sdk.js"></script>
 *
 *   J4F.auth.login().then(user => console.log(user));
 *   J4F.room.create("pallanguzhi").then(room => console.log(room.code));
 */

const J4F = (() => {
  const db = firebase.database();
  const auth = firebase.auth();

  // Handle redirect result from signInWithRedirect (fires on page reload after redirect)
  auth.getRedirectResult().catch((e) => {
    console.error("Redirect sign-in failed:", e);
  });

  // ─── CODE GENERATION ───
  function genCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ2345789";
    let code = "";
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  // ─── AUTH MODULE ───
  const authModule = {
    // Get current user (null if not logged in)
    getUser() {
      const u = auth.currentUser;
      if (!u) return null;
      return {
        uid: u.uid,
        name: u.displayName || u.phoneNumber || "Player",
        photo: u.photoURL || null,
        email: u.email || null,
        phone: u.phoneNumber || null,
      };
    },

    // Listen for auth state changes
    onAuth(callback) {
      return auth.onAuthStateChanged((u) => {
        callback(u ? authModule.getUser() : null);
      });
    },

    // Sign in with Google
    async login() {
      const provider = new firebase.auth.GoogleAuthProvider();
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      // Use redirect on mobile — popups are unreliable (blocked by browsers, third-party cookie issues)
      if (isMobile) {
        await auth.signInWithRedirect(provider);
        return null; // will reload
      }

      try {
        const result = await auth.signInWithPopup(provider);
        return authModule.getUser();
      } catch (e) {
        // Popup blocked or closed — fall back to redirect
        if (
          e.code === "auth/popup-blocked" ||
          e.code === "auth/popup-closed-by-user" ||
          e.code === "auth/cancelled-popup-request"
        ) {
          await auth.signInWithRedirect(provider);
          return null; // will reload
        }
        throw e;
      }
    },

    // Sign in with phone number
    // Returns a confirmResult — call confirmResult.confirm(code) with the OTP
    async loginPhone(phoneNumber, recaptchaContainer) {
      const verifier = new firebase.auth.RecaptchaVerifier(recaptchaContainer, {
        size: "invisible",
      });
      const confirmResult = await auth.signInWithPhoneNumber(phoneNumber, verifier);
      return confirmResult;
    },

    // Sign in anonymously (for quick play without account)
    async loginGuest() {
      await auth.signInAnonymously();
      return authModule.getUser();
    },

    // Sign out
    async logout() {
      await auth.signOut();
    },
  };

  // ─── ROOM MODULE ───
  let currentRoom = null;
  let roomListener = null;

  const roomModule = {
    // Create a new room
    async create(gameId, initialState = {}) {
      const user = authModule.getUser();
      const code = genCode();
      const roomRef = db.ref("rooms/" + code);

      const roomData = {
        gameId,
        code,
        host: user ? user.uid : "anonymous",
        hostName: user ? user.name : "Player 1",
        guest: null,
        guestName: null,
        state: initialState,
        moveId: 0,
        lastMove: null,
        status: "waiting", // waiting | playing | finished
        createdAt: firebase.database.ServerValue.TIMESTAMP,
      };

      await roomRef.set(roomData);
      currentRoom = { ref: roomRef, code, player: 0 };
      return { code, roomData };
    },

    // Join an existing room
    async join(code) {
      const user = authModule.getUser();
      const roomRef = db.ref("rooms/" + code);
      const snapshot = await roomRef.once("value");
      const data = snapshot.val();

      if (!data) throw new Error("Room not found");
      if (data.guest && data.guest !== "empty") throw new Error("Room is full");

      await roomRef.update({
        guest: user ? user.uid : "anonymous",
        guestName: user ? user.name : "Player 2",
        status: "playing",
      });

      currentRoom = { ref: roomRef, code, player: 1 };
      return { code, roomData: { ...data, guest: user?.uid, status: "playing" } };
    },

    // Listen for room updates (opponent joins, moves, etc.)
    onUpdate(callback) {
      if (!currentRoom) return;
      // Remove previous listener
      if (roomListener) currentRoom.ref.off("value", roomListener);

      roomListener = currentRoom.ref.on("value", (snapshot) => {
        const data = snapshot.val();
        if (data) callback(data);
      });
    },

    // Send a move
    async sendMove(moveData) {
      if (!currentRoom) return;
      const snapshot = await currentRoom.ref.child("moveId").once("value");
      const newMoveId = (snapshot.val() || 0) + 1;

      await currentRoom.ref.update({
        moveId: newMoveId,
        lastMove: moveData,
      });
    },

    // Update game state (board, scores, etc.)
    async updateState(state) {
      if (!currentRoom) return;
      await currentRoom.ref.child("state").update(state);
    },

    // Send move AND state together (atomic)
    async sendMoveAndState(moveData, state) {
      if (!currentRoom) return;
      const snapshot = await currentRoom.ref.child("moveId").once("value");
      const newMoveId = (snapshot.val() || 0) + 1;

      await currentRoom.ref.update({
        moveId: newMoveId,
        lastMove: moveData,
        state: state,
      });
    },

    // Leave room
    async leave() {
      if (roomListener && currentRoom) {
        currentRoom.ref.off("value", roomListener);
        roomListener = null;
      }
      currentRoom = null;
    },

    // Get current room info
    getCurrent() {
      return currentRoom;
    },

    // Check if a room exists
    async exists(code) {
      const snapshot = await db.ref("rooms/" + code).once("value");
      return snapshot.exists();
    },

    // Set room status to finished
    async finish(winner) {
      if (!currentRoom) return;
      await currentRoom.ref.update({ status: "finished", winner });
    },

    // ─── MATCHMAKING ───
    // Search for a random opponent. Calls onMatched(code, player) when found.
    // Returns a cancel function.
    matchmake(gameId, initialState, onMatched, onTimeout) {
      const user = authModule.getUser();
      const uid = user ? user.uid : "anon_" + Math.random().toString(36).slice(2, 8);
      const queueRef = db.ref("matchmaking/" + gameId);
      const myEntryId = queueRef.push().key;
      const myRef = queueRef.child(myEntryId);
      let cancelled = false;
      let matchListener = null;

      // Write ourselves into the queue
      myRef.set({
        key: myEntryId,
        uid,
        name: user ? user.name : "Player",
        ts: firebase.database.ServerValue.TIMESTAMP,
        roomCode: null, // set by the matcher
      });
      myRef.onDisconnect().remove();

      // Listen for someone to assign us a roomCode
      const myListener = myRef.on("value", async (snap) => {
        const val = snap.val();
        if (!val || cancelled) return;
        if (val.roomCode) {
          // We've been matched — join the room
          cleanup();
          try {
            const { roomData } = await roomModule.join(val.roomCode);
            onMatched(val.roomCode, 1, roomData);
          } catch (e) {
            if (onTimeout) onTimeout("Failed to join: " + e.message);
          }
        }
      });

      // Also scan queue for another waiting player to match with
      matchListener = queueRef.on("value", async (snap) => {
        if (cancelled) return;
        const queue = snap.val();
        if (!queue) return;

        // Find another player (not us) who doesn't have a roomCode yet
        const others = Object.values(queue).filter(
          (p) => p.key !== myEntryId && !p.roomCode
        );
        if (others.length === 0) return;

        // Pick the one who's been waiting longest
        others.sort((a, b) => (a.ts || 0) - (b.ts || 0));
        const opponent = others[0];

        // We create the room (first come first serve — use our uid as tiebreak)
        if (uid < opponent.uid) {
          cleanup();
          try {
            const { code } = await roomModule.create(gameId, initialState);
            // Tell the opponent which room to join
            await queueRef.child(opponent.key).update({ roomCode: code });
            // Remove both from queue
            await myRef.remove();
            onMatched(code, 0, null);
          } catch (e) {
            if (onTimeout) onTimeout("Failed to create room: " + e.message);
          }
        }
        // else: the other player will create the room (their uid is smaller)
      });

      // Timeout after 30s
      const timer = setTimeout(() => {
        if (!cancelled) {
          cleanup();
          if (onTimeout) onTimeout("No players found");
        }
      }, 30000);

      function cleanup() {
        cancelled = true;
        clearTimeout(timer);
        if (matchListener) queueRef.off("value", matchListener);
        myRef.off("value", myListener);
        myRef.remove().catch(() => {});
      }

      // Return cancel function
      return cleanup;
    },
  };

  // ─── LEADERBOARD MODULE ───
  const leaderboardModule = {
    // Submit a game result
    async submit(gameId, result) {
      const user = authModule.getUser();
      if (!user) return;

      const ref = db.ref("leaderboard/" + gameId + "/" + user.uid);
      const snapshot = await ref.once("value");
      const current = snapshot.val() || { wins: 0, losses: 0, draws: 0, games: 0 };

      const update = {
        name: user.name,
        photo: user.photo || null,
        wins: current.wins + (result === "win" ? 1 : 0),
        losses: current.losses + (result === "loss" ? 1 : 0),
        draws: current.draws + (result === "draw" ? 1 : 0),
        games: current.games + 1,
        lastPlayed: firebase.database.ServerValue.TIMESTAMP,
      };

      await ref.set(update);
      return update;
    },

    // Get top players for a game
    async get(gameId, limit = 20) {
      const snapshot = await db
        .ref("leaderboard/" + gameId)
        .orderByChild("wins")
        .limitToLast(limit)
        .once("value");

      const entries = [];
      snapshot.forEach((child) => {
        entries.push({ uid: child.key, ...child.val() });
      });
      return entries.reverse(); // highest wins first
    },
  };

  // ─── SHARE MODULE ───
  const shareModule = {
    // Share via WhatsApp
    whatsapp(text) {
      const url = "https://wa.me/?text=" + encodeURIComponent(text);
      window.open(url, "_blank");
    },

    // Share room via WhatsApp
    whatsappRoom(gameTitle, code) {
      const url = window.location.origin + "/games/" + gameTitle.toLowerCase().replace(/\s+/g, "-") + "/";
      const text =
        "🎲 Join my " + gameTitle + " game on J4F!\n\n" +
        "Room code: *" + code + "*\n\n" +
        "Play here: " + url;
      shareModule.whatsapp(text);
    },

    // Copy text to clipboard with fallback
    async copy(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        // Fallback for iframes/restricted contexts
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          document.body.removeChild(ta);
          return true;
        } catch (e2) {
          document.body.removeChild(ta);
          return false;
        }
      }
    },

    // Native share (mobile)
    async native(title, text, url) {
      if (navigator.share) {
        try {
          await navigator.share({ title, text, url });
          return true;
        } catch (e) {
          return false;
        }
      }
      return false;
    },
  };

  // ─── PRESENCE MODULE ───
  const presenceModule = {
    // Track user online status
    goOnline() {
      const user = authModule.getUser();
      if (!user) return;
      const ref = db.ref("presence/" + user.uid);
      ref.set({ online: true, lastSeen: firebase.database.ServerValue.TIMESTAMP });
      ref.onDisconnect().set({ online: false, lastSeen: firebase.database.ServerValue.TIMESTAMP });
    },
  };

  // ─── PUBLIC API ───
  return {
    auth: authModule,
    room: roomModule,
    leaderboard: leaderboardModule,
    share: shareModule,
    presence: presenceModule,
    db, // expose for advanced usage
  };
})();
