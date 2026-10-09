# NaijaLavish — Firebase Setup (Rules + Steps)

## 1. Firestore Security Rules

Copy-paste this into Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Players: client may only update name, username, lookId, gender, placeId, lastSeen
    // All other fields (cash, bank, banned, adult, etc.) are server-only via API routes
    match /players/{uid} {
      allow read: if true;
      allow create: if false;  // only /api/player/init creates (uses Admin SDK, bypasses rules)
      allow update: if request.auth.uid == uid &&
        request.resource.data.diff(resource.data)
          .affectedKeys()
          .hasOnly(['name', 'username', 'lookId', 'gender', 'placeId', 'lastSeen']);
    }

    // Chat: client read-only, writes via /api/chat only
    match /chat/{id} {
      allow read: if true;
      allow write: if false;
    }

    // Admin docs: admin only
    match /admins/{uid} {
      allow read: if request.auth.uid == uid;
      allow write: if false;
    }

    match /adminActions/{id} {
      allow read: if false;
      allow write: if false;
    }

    // Events (sprays etc.): server-written, client read
    match /events/{placeId}/{type}/{id} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

**Important:** The server routes use the Firebase Admin SDK, which **bypasses all Firestore rules**. So even though the rules say `allow create: if false` for players, the `/api/player/init` route CAN create player docs because it uses the Admin SDK. The rules only restrict what the CLIENT can write directly.

## 2. Realtime Database Rules

Copy-paste this into Firebase Console → Realtime Database → Rules, then tap **Publish**:

```json
{
  "rules": {
    "presence": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && auth.uid == $uid"
      }
    }
  }
}
```

**Why `.read` sits on `presence` and not on `$uid`:** the game listens to the whole
`presence` list to draw the other players. A read rule on `$uid` only allows reading ONE
player's node, so listing everyone is refused and players can never see each other.

**Check the database URL.** In Firebase Console → Realtime Database, the address shown at
the top is the real URL. A database created in `europe-west1` looks like
`https://naijalavish-default-rtdb.europe-west1.firebasedatabase.app`, not `...firebaseio.com`.
It must match `databaseURL` in `src/lib/firebase.ts`.

## 3. Enable Authentication Providers

Firebase Console → Authentication → Sign-in method:

1. **Anonymous** → Enable ✅
2. **Google** → Enable ✅ (you already did this)
3. **Email/Password** → Enable ✅ (players log in with it; the first "Email/Password" switch only, not "Email link")
4. Add your domain to **Authorized domains**: `naija-lavish.vercel.app`

## 4. Enable Firestore Database

Firebase Console → Firestore Database → Create database:
- Mode: **Production mode**
- Location: `europe-west1` (closest to Africa)

## 5. Enable Realtime Database

Firebase Console → Realtime Database → Create database:
- URL: `https://naijalavish-default-rtdb.firebaseio.com`
- Location: `europe-west1`
- Start in **locked mode** (then paste the rules above)

## 6. Admin User Setup (for ?admin=1)

1. Firebase Console → Authentication → Users → Add User
   - Email: your admin email
   - Password: your admin password
2. Copy the new user's `uid`
3. Firestore → Create document at `admins/{uid}` with content:
   ```json
   { "admin": true }
   ```

## 7. Debug Endpoint

After deploying, visit: `https://naija-lavish.vercel.app/api/debug`

This will show:
- Whether the Admin SDK initialized successfully
- Whether the private key is valid (not redacted)
- The private key length + first/last 20 chars

If `admin.ok` is `false`, the error message will tell you exactly what's wrong.
