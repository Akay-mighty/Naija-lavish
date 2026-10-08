# NaijaLavish

A free multiplayer life-sim game set in Abuja, Nigeria. Built with Next.js 16 + Three.js + TypeScript + Firebase.

## Quick start

```bash
bun install        # or npm install
bun run dev        # starts Next.js on http://localhost:3000
```

## What's in the box

- **Landing page** — Apple-clean hero, features grid, places preview
- **Title screen** — Sign up / Log in / Play as guest, gender + look picker, adult consent
- **3D Abuja city** — Three.js top-down map with **12 real places** (Wuse Market, Area 1, Maitama, Transcorp Hilton, Jabi Lake, Millennium Park, Magicland, Berger, Garki, Unity Fountain, National Mosque, Aso Rock, Night Market, City Gate, National Assembly, Home)
- **Tap-to-walk character** with walk animation, pulsing place markers, day/night cycle
- **HUD** — Cash pill, Belle/Energy/Vibe need bars, mood emoji, place info, clock, sound toggle
- **Place sheets** — Hustle actions (bole, okada, danfo, office, bank, suya, senator, photos), buy actions, rest actions, spray actions, cooldowns
- **Phone UI** — Dark phone shell with 7 apps: Gist (chat), Bank (deposit/withdraw), Wallet (net worth), Boutique (24 items), Photos (Lavish Card), Contacts, Settings
- **Real-time multiplayer chat** — Firebase Firestore-backed, players see each other's messages live
- **Presence** — Real-time online player list, see who's at your spot vs elsewhere
- **Day/night cycle** — 1 game day = 2.4 minutes real time. Sun/moon orbit the sky, lights change color, dusk/dawn glow
- **Sound effects** — Web Audio API tones for cash earn/spend, spray, arrival, chat, warnings, ban, rest, phone vibration. Toggle in HUD
- **Admin dashboard** at `/?admin=1` — Email/password login (`akay@naijalavish.com` / `363438`), real-time stats, player table with credit/debit/set-need/ban/reset, action log, settings

## Tech stack

- **Framework**: Next.js 16 (App Router) + TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **3D**: Three.js
- **Animation**: Framer Motion
- **State**: Zustand + localStorage persistence
- **Backend**: Firebase (Firestore for players + chat + presence + admin actions)
- **Sound**: Web Audio API (no asset files needed)

## Firebase setup (required for multiplayer features)

1. Go to [Firebase Console](https://console.firebase.google.com/project/naijalavish/firestore)
2. Enable Firestore Database (production mode, pick a location close to your users)
3. Set security rules (see Settings tab in admin dashboard for template)
4. Players will sync in real-time once enabled

The game works fully offline (localStorage only) until Firestore is enabled.

## Deploy to Vercel

```bash
git push origin main
```

Vercel auto-detects Next.js. No env vars needed (Firebase config is in `src/lib/firebase.ts`).

## Admin access

Visit `https://your-domain.vercel.app/?admin=1`

- **Email**: `akay@naijalavish.com`
- **Password**: `363438`

To change credentials: edit `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `src/game/components/AdminDashboard.tsx`.

## File structure

```
src/
  app/
    layout.tsx         Poppins font, SEO metadata, viewport
    page.tsx           ?admin=1 detection, screen routing
    globals.css        NaijaLavish theme (green + gold)
  lib/
    firebase.ts        Firebase init with provided config
    firestore.ts       Player sync, real-time chat, presence, admin actions
  game/
    data/
      places.ts        12 Abuja places + 8 hustle job types
      items.ts         24 boutique items + 6 character looks
      npcs.ts          18 NPCs, quick lines, stickers, rich list
    store/
      usePlayer.ts     Zustand store (localStorage-persisted)
      useToasts.ts     Toast notification store
    lib/
      format.ts        Naira formatting, clock, color utils
      sound.ts         Web Audio API SoundManager
    components/
      Landing.tsx      Hero, features, places preview
      TitleScreen.tsx   Signup/login/guest
      Game.tsx         Master shell, listen for arrive events, day/night tick
      Scene3D.tsx      Three.js city + character + day/night cycle
      HUD.tsx          Cash, needs, mood, place, clock, sound toggle
      BottomNav.tsx    Home/Map/People/Phone/Hide
      PlaceSheet.tsx   Actions for current place (with SFX)
      MapSheet.tsx     Place picker
      PeopleSheet.tsx  Real online players + NPCs + rich list
      Phone.tsx        7-app phone UI
      Chat.tsx         Real-time Firestore-backed chat
      Toasts.tsx       Toast notifications
      AdminDashboard.tsx  Full admin control panel
public/
  manifest.webmanifest PWA manifest
  icon-48.png, icon-180.png  Brand icons
vercel.json             Framework config + security headers
```

## Security notes

- Admin password is hardcoded (MVP). For production: use Firebase Auth
- Firestore rules in test mode allow all reads/writes. Lock down before going public
- No real money is involved. Players start with ₦5,000 fake naira

Made with love for Naija. 🇳🇬
