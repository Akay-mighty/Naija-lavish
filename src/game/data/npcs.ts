// NPC names, dialogue lines, and quick chat reactions.
// NPCs fill the city so the world feels alive even without a real-time server.

export interface NPC {
  id: string;
  name: string;
  emoji: string;
  vibe: "calm" | "hustler" | "bigboy" | "aunty" | "aboki" | "yankee";
}

const NAMES: Array<[string, NPC["vibe"], string]> = [
  ["Tunde",     "hustler", "🧑🏿"],
  ["Adamu",     "aboki",   "👨🏿"],
  ["Ekaette",   "aunty",   "👩🏿"],
  ["Chidinma",  "bigboy",  "👩🏾"],
  ["Ibrahim",   "calm",    "🧔🏿"],
  ["Folake",    "aunty",   "🧕🏿"],
  ["Sani",      "aboki",   "🧑🏾"],
  ["Ngozi",     "bigboy",  "👩🏿"],
  ["Emeka",     "hustler", "👨🏾"],
  ["Hadiza",    "aunty",   "🧕🏾"],
  ["Yakubu",    "calm",    "🧔🏾"],
  ["Bisi",      "bigboy",  "👩🏿"],
  ["Bayo",      "hustler", "🧑🏿"],
  ["Zainab",    "aunty",   "👩🏾"],
  ["Kunle",     "yankee",  "🧑🏻‍🦱"],
  ["Amaka",     "bigboy",  "👩🏿"],
  ["Dauda",     "aboki",   "🧔🏿"],
  ["Tari",      "calm",    "👩🏾"],
];

export const NPCS: NPC[] = NAMES.map(([name, vibe, emoji], i) => ({
  id: `npc-${i}`,
  name,
  emoji,
  vibe,
}));

// Quick chat lines (Pidgin, taken from phlifestyle flavour)
export const QUICK_LINES = [
  "How far? 💪",
  "You dey ok?",
  "Make we link up later.",
  "I dey hustle, no time.",
  "Big boy things!",
  "Omo, traffic mad today.",
  "You don chop?",
  "Spray me something abeg.",
  "Wetin dey happen?",
  "Abeg, no stress me.",
  "We move 💨",
  "Sharp sharp, no dulling.",
];

// Sticker reactions (used by chat-react buttons)
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

// Per-vibe NPC dialogue pools — keep it short and lively
export const NPC_LINES: Record<NPC["vibe"], string[]> = {
  hustler: [
    "Money must be made, no dulling 🔥",
    "I just finish shift, my back wan break.",
    "You see danfo fare today? E don double.",
    "Big boy things loading...",
    "I dey find customer, you need okada?",
  ],
  aboki: [
    "Come buy suya, fresh pepper today.",
    "Exchange rate don go up again o.",
    "I get change, no worry.",
    "Customer, you look nice today.",
    "We dey close late, come back anytime.",
  ],
  aunty: [
    "My pikkin, you don chop?",
    "How your mama? Greet her for me.",
    "Come buy akara, hot one just land.",
    "No wanah, no follow bad boys.",
    "May God bless your hustle, my dear.",
  ],
  bigboy: [
    "Just came back from yankee last week 🙃",
    "My G-Wagon dey workshop, I drive Corolla today.",
    "Where the owambe dey tonight?",
    "Bottle service or nothing, you know what's up.",
    "₦5m no be money again these days sha.",
  ],
  calm: [
    "The breeze at Jabi nice today.",
    "I just dey observe things, no stress.",
    "Sometimes you gats just sit down.",
    "How your side? Hope cool.",
    "Make we link up for Unity Fountain later.",
  ],
  yankee: [
    "Just touched down last week, jet lag wan finish me.",
    "Where the best suya spot? I miss am die.",
    "Naija changed o, Abuja fine well well.",
    "Bro, you still dey hustle here? Respect.",
    "Got my foreign passport but na Naija be home.",
  ],
};

// Pick a random NPC and a line for them
export function randomNPC(): NPC {
  return NPCS[Math.floor(Math.random() * NPCS.length)];
}

export function randomLine(npc: NPC): string {
  const lines = NPC_LINES[npc.vibe];
  return lines[Math.floor(Math.random() * lines.length)];
}

// Rich list (mock top spenders — feels like the original's leaderboard)
export const RICH_LIST = [
  { rank: 1, name: "Don Jazzy M",    amount: 4_850_000, emoji: "👑" },
  { rank: 2, name: "Chief Okoro",    amount: 2_120_000, emoji: "🎩" },
  { rank: 3, name: "Alhaja Sade",    amount: 1_780_000, emoji: "🧕🏿" },
  { rank: 4, name: "Young Tunde",    amount:   945_000, emoji: "🧑🏿" },
  { rank: 5, name: "Aunty Folake",   amount:   612_000, emoji: "👩🏿" },
  { rank: 6, name: "Boss Emeka",    amount:   488_000, emoji: "👨🏾" },
  { rank: 7, name: "Hadiza M",      amount:   365_000, emoji: "🧕🏾" },
  { rank: 8, name: "Yankee Bayo",   amount:   298_000, emoji: "🧑🏻" },
];

// Quick toast one-liners used when needs drop too low
export const NEED_LINES = {
  hunger: [
    "Your belle dey rumble. Go find food.",
    "Hunger wan finish you. Chop something abeg.",
    "Man shall not live by hustle alone. Go eat.",
  ],
  energy: [
    "Energy don finish. Go sleep or sit down small.",
    "Body no be firewood. Rest small.",
    "You wan collapse? Go rest abeg.",
  ],
  vibe: [
    "Your vibe dey low. Go link up somewhere.",
    "Spirit dey down. Dance or stroll.",
    "Even big boys need to flex. Go out small.",
  ],
};

export function pickLine(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}
