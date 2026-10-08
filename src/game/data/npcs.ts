// NPCs in NaijaLavish are WORLD CHARACTERS ONLY — they stand at places, can be
// tapped for a speech bubble, but they NEVER write into the chat panel, NEVER
// count as online players, and NEVER have a presence entry in RTDB.
// Real chat comes from real players via Firestore (see Chat.tsx).

export interface NPC {
  id: string;
  name: string;
  emoji: string;
  vibe: "calm" | "hustler" | "bigboy" | "aunty" | "aboki" | "yankee";
  placeId: string;        // where they stand in the world
  pos: [number, number];  // world x, z
  line: string;           // single speech-bubble line shown when tapped
}

// Each NPC has exactly ONE fixed line — no random chatter, no fake conversation.
export const NPCS: NPC[] = [
  { id: "npc-1", name: "Mama Bola",  emoji: "👩🏿", vibe: "aunty",   placeId: "wuse-market",     pos: [-11, 7],  line: "Bole fresh from the fire! ₦200 only." },
  { id: "npc-2", name: "Mallam Sani", emoji: "👨🏿", vibe: "aboki",   placeId: "wuse-market",     pos: [-13, 5],  line: "Change dollars here, best rate for you." },
  { id: "npc-3", name: "Driver Emeka",emoji: "🧑🏿", vibe: "hustler", placeId: "area1",           pos: [-5, 5],   line: "Okada ready! Where you dey go?" },
  { id: "npc-4", name: "Aunty Folake",emoji: "🧕🏿", vibe: "aunty",   placeId: "garki-market",    pos: [-3, 11],  line: "Ankara material, fine one. Come look." },
  { id: "npc-5", name: "Big Boy Tunde",emoji: "🧔🏿", vibe: "bigboy", placeId: "transcorp",       pos: [11, -7],  line: "Bottle service only. You know what's up." },
  { id: "npc-6", name: "Uncle Yakubu",emoji: "🧔🏾", vibe: "calm",   placeId: "millennium",      pos: [5, 1],    line: "Sit down, breathe. The park is free." },
  { id: "npc-7", name: "Hadiza",      emoji: "🧕🏾", vibe: "aunty",   placeId: "night-market",    pos: [-7, -7],  line: "Zobo cold, suya hot. Take your pick." },
  { id: "npc-8", name: "Tourist Bayo",emoji: "🧑🏻", vibe: "yankee",  placeId: "city-gate",       pos: [15, 1],   line: "Just touched down from yankee. This gate na proper flex." },
];

// NPCs grouped by placeId for quick lookup
export const NPCS_BY_PLACE: Record<string, NPC[]> = NPCS.reduce((acc, n) => {
  (acc[n.placeId] ||= []).push(n);
  return acc;
}, {} as Record<string, NPC[]>);

// Sticker reactions — user-triggered only (sent through /api/chat like a message)
export const STICKERS = [
  { id: "fire",    emoji: "🔥", label: "Hot" },
  { id: "laugh",   emoji: "😂", label: "Laugh" },
  { id: "love",    emoji: "❤️", label: "Love" },
  { id: "money",   emoji: "💵", label: "Spray" },
  { id: "flex",    emoji: "💪", label: "Flex" },
  { id: "party",   emoji: "🎉", label: "Owambe" },
  { id: "cry",     emoji: "😭", label: "Sad" },
  { id: "shrug",   emoji: "🤷🏿", label: "Shrug" },
];

// Quick lines — user-triggered only (sent through /api/chat)
export const QUICK_LINES = [
  "How far? 💪",
  "You dey ok?",
  "Make we link up later.",
  "I dey hustle, no time.",
  "Big boy things!",
  "Wetin dey happen?",
  "We move 💨",
  "Sharp sharp, no dulling.",
];
