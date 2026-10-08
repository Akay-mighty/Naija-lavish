# NaijaLavish

A free, 18+ multiplayer life-sim set in Abuja, Nigeria. Built with Next.js 16 + Three.js + TypeScript + Firebase.

## Quick start

```bash
bun install
bun run dev          # http://localhost:3000
```

## What's in the box

- **Landing page** — Apple-clean hero, features grid, places preview
- **Title screen** — Date-of-birth age gate (18+), gender + look picker, anonymous Firebase Auth sign-up
- **3D Abuja city** — Three.js top-down map with real Abuja places
- **Tap-to-walk character** + day/night cycle + sound effects (Web Audio API)
- **HUD** — Cash, Belle/Energy/Vibe need bars, mood, clock, sound toggle
- **Place sheets** — Hustle (bole, okada, danfo, office, bank, suya, senator, photos), buy, rest, spray
- **Phone UI** — Gist (chat), Bank (deposit/withdraw), Wallet, Boutique, Photos, Contacts, Settings
- **Real-time multiplayer chat** — Firestore-backed, server-validated (rate limit + word filter)
- **Real-time presence** — RTDB-backed, see who's online + where they are
- **Admin dashboard** at `/?admin=1` — Firebase Auth email/password, real-time player table, credit/debit/set-need/ban/unban/reset, audit log

## Tech stack

- **Framework**: Next.js 16 (App Router) + TypeScript 5
- **Styling**: Tailwind CSS 4
- **3D**: Three.js
- **Animation**: Framer Motion
- **State**: Zustand + localStorage (client mirror of server profile)
- **Backend**: Firebase (Auth + Firestore + Realtime Database)
- **Server routes**: Next.js route handlers (Node.js runtime) + firebase-admin
- **Sound**: Web Audio API (no asset files)

## Firebase setup (required)

### 1. Enable Firestore + Realtime Database

1. Go to [Firebase Console → naijalavish](https://console.firebase.google.com/project/naijalavish)
2. Enable **Firestore Database** (production mode)
3. Enable **Realtime Database** (create `https://naijalavish-default-rtdb.firebaseio.com`)
4. Enable **Authentication** → Sign-in method: **Anonymous** + **Email/Password**

### 2. Firestore Security Rules

Set these in Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Players: client may only update name, username, lookId, gender, placeId, lastSeen
    // All other fields (cash, bank, banned, adult, etc.) are server-only via API routes
    match /players/{uid} {
      allow read: if true;
      allow create: if false;  // only /api/player/init creates
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

    // Admin docs: admin only (verified by admins/{uid} check server-side)
    match /admins/{uid} {
      allow read: if request.auth.uid == uid;
      allow write: if false;  // create via Firebase Console
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

### 3. Realtime Database Rules

Set these in Firebase Console → Realtime Database → Rules:

```json
{
  "rules": {
    "presence": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth.uid == $uid"
      }
    }
  }
}
```

### 4. Admin user setup

1. Firebase Console → Authentication → Add User (email/password)
2. Copy the new user's `uid`
3. Firestore → Create document at `admins/{uid}` with content `{ admin: true }`
4. Log in at `/?admin=1` with the email/password

### 5. Firebase Admin service account

The server routes need a Firebase Admin service account to verify ID tokens + write to Firestore.

1. Firebase Console → Project Settings → Service Accounts → **Generate new private key**
2. Open `src/lib/server/serviceAccount.ts`
3. Replace the placeholder fields with your real values from the JSON

**Important**: This file is imported ONLY from `src/app/api/*` route handlers (server-side). Never import it from a client component.

## Deploy to Vercel

```bash
git push origin main
```

Vercel auto-detects Next.js. No env vars needed — Firebase client config is hardcoded in `src/lib/firebase.ts`, and the admin service account is in `src/lib/server/serviceAccount.ts`.

## File structure

```
src/
  app/
    layout.tsx              Poppins font, SEO metadata, viewport
    page.tsx                ?admin=1 detection, auth gate, screen routing
    globals.css             NaijaLavish theme (green + gold)
    api/
      player/init/route.ts  Create player profile (server, ID-token verified)
      action/route.ts       Work/buy/spray/bank/rest (server, transaction-safe)
      chat/route.ts         Send chat (server, rate-limited + word-filtered)
      daily/route.ts        Daily reward (Africa/Lagos day, 7-day streak)
      admin/
        login/route.ts      Admin login endpoint
        player/[uid]/route.ts  Admin writes to player (credit/debit/ban/etc)
        players/route.ts    List all players
        actions/route.ts    List admin audit log
  lib/
    firebase.ts             Client Firebase init (Auth + Firestore + RTDB)
    firestore.ts            Client service layer (read + limited writes)
    server/
      serviceAccount.ts     PLACEHOLDER — replace with your Firebase Admin key
      admin.ts              firebase-admin init (server-only)
      guards.ts             Token verification + ban/admin checks
  game/
    data/
      places.ts             Abuja places + hustle actions
      items.ts              Boutique items + character looks
      npcs.ts               World NPCs (speech bubbles, NOT chat writers)
      wordfilter.ts         Chat word filter
    store/
      usePlayer.ts          Zustand store (mirrors server profile)
      useAuth.ts            Firebase Auth state + admin check
      useToasts.ts          Toast notifications
    lib/
      format.ts             Naira formatting, clock, color utils
      sound.ts              Web Audio API SoundManager
    three/
      avatar.ts             Shared avatar factory (local + remote players)
    components/
      Landing.tsx           Hero, features, places preview
      TitleScreen.tsx       DOB age gate + signup
      Game.tsx              Master shell, auth + presence init
      Scene3D.tsx            Three.js city + character + presence writes
      HUD.tsx               Cash, needs, mood, clock, sound toggle
      BottomNav.tsx          Home/Map/People/Phone/Hide
      PlaceSheet.tsx         Actions (calls /api/action)
      MapSheet.tsx           Place picker
      PeopleSheet.tsx        Real online players + NPCs
      Phone.tsx             7-app phone UI (Bank calls /api/action)
      Chat.tsx               Real-time Firestore chat + Share empty state
      Toasts.tsx             Toast notifications
      AdminDashboard.tsx     Firebase Auth admin login + player table
public/
  manifest.webmanifest      PWA manifest
  icon-48.png, icon-180.png Brand icons
vercel.json                 Framework config + security headers
```

## Security model

- **Client never writes cash/bank/banned/adult** — only the server (via route handlers) can
- **Player profile** — client may only update name, username, lookId, gender, placeId, lastSeen (enforced by Firestore rules)
- **Chat** — server validates rate limit (1 per 2s) + word filter (English + pidgin insults, phone numbers, emails, links)
- **Actions** (work/buy/spray/bank/rest) — validated server-side inside Firestore transactions (cooldown, cost, location)
- **Admin** — Firebase email/password + `admins/{uid}` Firestore doc check on every request

## Solo mode

If anonymous auth fails (network blocked), the game falls back to **solo mode** with a clear "Offline" badge. Chat + multiplayer are disabled, but the world + NPCs still work.

Made with love for Naija. 🇳🇬
