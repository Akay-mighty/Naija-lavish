// Abuja places catalog — adapted from phlifestyle.fun's place system
// Each place is a hot-spot on the city map that the player can tap and enter.

export type PlaceCategory =
  | "work"
  | "market"
  | "social"
  | "home"
  | "rest"
  | "service";

export interface PlaceAction {
  id: string;
  label: string;
  kind: "work" | "buy" | "rest" | "spray" | "ride" | "rent";
  reward?: number;       // naira gained (work) or spent (buy/rent)
  energyCost?: number;  // energy drained
  hungerCost?: number;  // belle drained
  vibeCost?: number;    // vibe drained
  vibeGain?: number;    // vibe restored (rest/social)
  cooldownSec?: number;
  desc: string;
  requires?: { cash?: number; level?: number };
}

export interface Place {
  id: string;
  name: string;
  area: string;
  category: PlaceCategory;
  ambience: string;           // short flavour text shown in HUD
  blurb: string;              // longer description in the sheet
  // map position in 3D world units (X, Z)
  pos: [number, number];
  color: string;              // hex for the marker
  accent: string;             // hex accent for highlights
  actions: PlaceAction[];
}

// ---- Job/hustle actions reusable across places ----
const hustles: Record<string, PlaceAction> = {
  bole: {
    id: "bole", label: "Roast & sell bole", kind: "work",
    reward: 850, energyCost: 8, hungerCost: 2, vibeCost: 1, cooldownSec: 25,
    desc: "Roast plantain over charcoal. Quick money, belly-friendly smell.",
  },
  okada: {
    id: "okada", label: "Ride okada", kind: "work",
    reward: 1200, energyCost: 12, hungerCost: 3, vibeCost: 2, cooldownSec: 35,
    desc: "Carry passengers across the city. Fast naira, but the sun no dey smile.",
  },
  load: {
    id: "load", label: "Carry load for market", kind: "work",
    reward: 1500, energyCost: 15, hungerCost: 2, vibeCost: 3, cooldownSec: 40,
    desc: "Help shoppers carry bags to their car. Hard but pays well.",
  },
  danfo: {
    id: "danfo", label: "Conductor duty", kind: "work",
    reward: 1800, energyCost: 14, hungerCost: 3, vibeCost: 2, cooldownSec: 45,
    desc: "Hang on the yellow danfo, collect fare, shout 'Wuse! Wuse!'",
  },
  office: {
    id: "office", label: "Office shift", kind: "work",
    reward: 2500, energyCost: 10, hungerCost: 2, vibeCost: 2, cooldownSec: 60,
    desc: "Sit-down AC job. Brain work, body cool, but na long shift.",
    requires: { cash: 0 },
  },
  bank: {
    id: "bank", label: "Bank teller shift", kind: "work",
    reward: 3500, energyCost: 10, hungerCost: 2, vibeCost: 2, cooldownSec: 90,
    desc: "Count other people's money all day. Respectable, pays steady.",
    requires: { cash: 0 },
  },
  suya: {
    id: "suya", label: "Sell suya at night", kind: "work",
    reward: 2200, energyCost: 15, hungerCost: 3, vibeCost: 2, cooldownSec: 50,
    desc: "Night market hustle. Peppered beef on sticks. Smoky, loud, lucrative.",
  },
  senator: {
    id: "senator", label: "Senator aide shift", kind: "work",
    reward: 5000, energyCost: 12, hungerCost: 2, vibeCost: 3, cooldownSec: 120,
    desc: "Run errands for the big chief. Big money, big politics, long meetings.",
    requires: { cash: 0 },
  },
  photos: {
    id: "photos", label: "Take photos for tourists", kind: "work",
    reward: 1500, energyCost: 8, hungerCost: 1, vibeCost: 1, cooldownSec: 40,
    vibeGain: 5,
    desc: "Snap tourists at the City Gate. Tips come in fast, vibe boosts too.",
  },
};

export const PLACES: Place[] = [
  {
    id: "wuse-market",
    name: "Wuse Market",
    area: "Wuse",
    category: "market",
    ambience: "Bustling stalls, haggling voices, suya smoke.",
    blurb:
      "The biggest open-air market in Abuja. Buy food, clothes, phone accessories. Roast bole by the entrance — quick steady money if you can stand the heat.",
    pos: [-12, 6],
    color: "#10b981",
    accent: "#a7f3d0",
    actions: [
      hustles.bole,
      {
        id: "buy-food", label: "Buy foodstuff", kind: "buy",
        reward: -650, energyCost: 0, hungerCost: 0, vibeGain: 25,
        desc: "Stock up rice, beans, plantain. Belle fills, wallet trims.",
      },
    ],
  },
  {
    id: "area1",
    name: "Area 1 Junction",
    area: "Garki",
    category: "work",
    ambience: "Okada revving, hawkers shouting, danfo horns.",
    blurb:
      "The busiest junction in Garki. Okada riders wait for passengers, conductors shout destinations. Best spot to start a hustle from nothing.",
    pos: [-4, 4],
    color: "#f59e0b",
    accent: "#fde68a",
    actions: [
      hustles.okada,
      hustles.danfo,
    ],
  },
  {
    id: "garki-market",
    name: "Garki Modern Market",
    area: "Garki",
    category: "market",
    ambience: "Polished tiles, AC hum, fancy boutiques.",
    blurb:
      "The 'modern' market — enclosed, cool, organised. Carries load for shoppers, work the boutique, or just cool down.",
    pos: [-2, 10],
    color: "#06b6d4",
    accent: "#a5f3fc",
    actions: [
      hustles.load,
      {
        id: "boutique", label: "Wuse Boutique", kind: "buy",
        reward: 0, desc: "Try on shades, gele, chains. Big flex energy.",
      },
    ],
  },
  {
    id: "maitama",
    name: "Maitama Towers",
    area: "Maitama",
    category: "work",
    ambience: "Glass towers, suits, luxury SUVs.",
    blurb:
      "Where the big boys work. Banks, oil companies, embassies. Office shifts pay well but you need energy and clean outfit.",
    pos: [6, -4],
    color: "#6366f1",
    accent: "#c7d2fe",
    actions: [
      hustles.office,
      hustles.bank,
    ],
  },
  {
    id: "berger",
    name: "Berger Junction",
    area: "Wuse",
    category: "work",
    ambience: "Yellow danfo lined up, agbero shouting 'Area! Area!'.",
    blurb:
      "Danfo park at the heart of Wuse. Conductors, drivers, agbero. Hop on as conductor and earn your daily bread.",
    pos: [-8, -2],
    color: "#eab308",
    accent: "#fef08a",
    actions: [hustles.danfo],
  },
  {
    id: "jabi",
    name: "Jabi Lake",
    area: "Jabi",
    category: "rest",
    ambience: "Calm water, paddle boats, ice cream sellers.",
    blurb:
      "The lake is the city's lungs. Walk the promenade, sit by the water, watch the sun go down. Vibe recovers fast here.",
    pos: [-14, -6],
    color: "#0ea5e9",
    accent: "#bae6fd",
    actions: [
      {
        id: "stroll", label: "Stroll by the lake", kind: "rest",
        energyCost: 4, vibeGain: 35, reward: 0,
        desc: "Walk the promenade. Mind clears, vibe returns.",
      },
      {
        id: "boat", label: "Paddle boat ride", kind: "rest",
        reward: -1000, energyCost: 6, vibeGain: 45,
        desc: "Rent a paddle boat for 30 minutes. Worth every naira.",
      },
    ],
  },
  {
    id: "millennium",
    name: "Millennium Park",
    area: "Maitama",
    category: "rest",
    ambience: "Green lawns, families picnicking, fountain splash.",
    blurb:
      "The biggest green park in Abuja. Free entry. Sit on the grass, eat suya, recharge your spirit.",
    pos: [4, 0],
    color: "#22c55e",
    accent: "#bbf7d0",
    actions: [
      {
        id: "picnic", label: "Sit & relax", kind: "rest",
        energyCost: 0, vibeGain: 25, reward: 0,
        desc: "Free bench. Free grass. Free sun. Belle and vibe both recover.",
      },
      {
        id: "suya", label: "Buy suya plate", kind: "buy",
        reward: -800, hungerCost: 0, vibeGain: 15,
        desc: "Mallam's peppered beef, wrapped in foil. Hot, sweet, fills belle.",
      },
    ],
  },
  {
    id: "transcorp",
    name: "Transcorp Hilton",
    area: "Maitama",
    category: "social",
    ambience: "Marble lobby, jazz music, big men in agbada.",
    blurb:
      "The owambe spot for Abuja's who-is-who. Spray money at the dance floor, top the rich list, flex your outfit.",
    pos: [10, -8],
    color: "#d946ef",
    accent: "#f5d0fe",
    actions: [
      {
        id: "spray-200", label: "Spray ₦200", kind: "spray",
        reward: -200, vibeGain: 30,
        desc: "Make it rain small. Crowd cheers, dancers smile.",
      },
      {
        id: "spray-1000", label: "Spray ₦1,000 bundle", kind: "spray",
        reward: -1000, vibeGain: 70,
        desc: "Big bundle, big flex. Your name rings the bell tonight.",
      },
      {
        id: "dance", label: "Dance to afrobeats", kind: "rest",
        energyCost: 6, vibeGain: 50, reward: 0,
        desc: "Step on the floor. Burna Boy on the speakers. Body no dey lie.",
      },
    ],
  },
  {
    id: "magicland",
    name: "Magicland Amusement Park",
    area: "Area 11",
    category: "social",
    ambience: "Ferris wheel, kids screaming (happily), music.",
    blurb:
      "Abuja's amusement park. Rides, food court, dance floor. Friday nights turn to owambe — be there.",
    pos: [2, -10],
    color: "#ef4444",
    accent: "#fecaca",
    actions: [
      {
        id: "ride-ferris", label: "Ferris wheel ride", kind: "rest",
        reward: -1500, energyCost: 2, vibeGain: 55,
        desc: "See the whole city from up top. WORTH IT.",
      },
      {
        id: "dance", label: "Dance at the food court", kind: "rest",
        energyCost: 5, vibeGain: 40, reward: 0,
        desc: "Afrobeats on the speakers, lights flashing. Free entry.",
      },
    ],
  },
  {
    id: "home",
    name: "Your House",
    area: "—",
    category: "home",
    ambience: "Your space. Sleep, change, store your things.",
    blurb:
      "Your house. Sleep to recover energy and pass time. Change outfit, store items you've bought.",
    pos: [14, 8],
    color: "#84cc16",
    accent: "#d9f99d",
    actions: [
      {
        id: "sleep", label: "Sleep (recover energy)", kind: "rest",
        energyCost: 0, vibeGain: 20, reward: 0,
        desc: "6 hours of sleep. Energy fills back up, world moves on.",
      },
      {
        id: "wardrobe", label: "Wardrobe", kind: "buy",
        reward: 0, desc: "Change your look, equip items you've bought.",
      },
    ],
  },
  {
    id: "unity",
    name: "Unity Fountain",
    area: "Central",
    category: "rest",
    ambience: "Spray of water, kids playing, evening joggers.",
    blurb:
      "Iconic roundabout fountain. Free chill spot. People watch at sunset — sometimes buskers show up.",
    pos: [0, 0],
    color: "#14b8a6",
    accent: "#99f6e4",
    actions: [
      {
        id: "sit", label: "Sit by the fountain", kind: "rest",
        energyCost: 0, vibeGain: 20, reward: 0,
        desc: "Free breeze, free kids' laughter, free vibe.",
      },
    ],
  },
  {
    id: "national-mosque",
    name: "National Mosque",
    area: "Central",
    category: "rest",
    ambience: "Golden domes gleaming, call to prayer echoing, peaceful courts.",
    blurb:
      "One of the largest mosques in West Africa. Golden domes and minarets against the sky. The courtyard is open, calm, and free to sit in. Mind your dress code — cover shoulders and remove shoes.",
    pos: [8, 2],
    color: "#fbbf24",
    accent: "#fef3c7",
    actions: [
      {
        id: "meditate", label: "Meditate in the courtyard", kind: "rest",
        energyCost: 5, vibeGain: 35, reward: 0,
        desc: "Sit quietly under the arches. The peace here is real. Vibe recovers fast.",
      },
      {
        id: "donate", label: "Donate ₦500 to charity box", kind: "spray",
        reward: -500, vibeGain: 25,
        desc: "Small donation, big blessing. Sadaqah flows back as vibe.",
      },
    ],
  },
  {
    id: "aso-rock",
    name: "Aso Rock Viewpoint",
    area: "Three Arms Zone",
    category: "rest",
    ambience: "Massive monolith rising 400m, panoramic view of the whole FCT.",
    blurb:
      "The 400-metre granite monolith that gives Abuja its name ('Aso' = 'the victorious'). Hike to the viewpoint at sunset — you can see the entire Federal Capital Territory spread below.",
    pos: [-16, -12],
    color: "#78716c",
    accent: "#e7e5e4",
    actions: [
      {
        id: "hike", label: "Hike to the viewpoint", kind: "rest",
        reward: -500, energyCost: 8, vibeGain: 45,
        desc: "Pay ₦500 for the guided trail. Worth every naira — the view is unreal.",
      },
      {
        id: "sunset", label: "Watch the sunset", kind: "rest",
        energyCost: 2, vibeGain: 30, reward: 0,
        desc: "Free if you're already at the top. Sky turns gold, then red, then purple.",
      },
    ],
  },
  {
    id: "night-market",
    name: "Area 1 Night Market",
    area: "Garki",
    category: "market",
    ambience: "Neon-lit stalls, suya smoke, music into the AM.",
    blurb:
      "After 8 PM, this stretch of Garki transforms. Stalls light up, mallams fire up their suya grills, music plays from speakers. Best night hustle spot in Abuja.",
    pos: [-6, -8],
    color: "#a855f7",
    accent: "#e9d5ff",
    actions: [
      hustles.suya,
      {
        id: "buy-suya", label: "Buy suya plate (₦800)", kind: "buy",
        reward: -800, hungerCost: 0, vibeGain: 20,
        desc: "Half-plate of peppered beef + ram. Wrapped in foil, still hot.",
      },
      {
        id: "buy-drink", label: "Buy chilled zobo (₦300)", kind: "buy",
        reward: -300, vibeGain: 15,
        desc: "Hibiscus drink with cucumber and lime. Cools the body, lifts the spirit.",
      },
    ],
  },
  {
    id: "city-gate",
    name: "Abuja City Gate",
    area: "Central",
    category: "rest",
    ambience: "Iconic three-arch gate, tourists snapping photos, flags flying.",
    blurb:
      "The monumental gate that welcomes you to Abuja. Three arches, the Nigerian coat of arms, and a view down the ceremonial boulevard. Tourists tip well here.",
    pos: [16, 0],
    color: "#0ea5e9",
    accent: "#bae6fd",
    actions: [
      hustles.photos,
      {
        id: "relax-gate", label: "Relax at the gate", kind: "rest",
        energyCost: 0, vibeGain: 15, reward: 0,
        desc: "Sit on the steps, watch the flags, feel the capital.",
      },
    ],
  },
  {
    id: "national-assembly",
    name: "National Assembly",
    area: "Three Arms Zone",
    category: "work",
    ambience: "Dome-roofed complex, senators in agbada, convoys of SUVs.",
    blurb:
      "Where the senators and reps sit. Big money moves here — aide shifts pay ₦5,000+. You need to look sharp and have energy to spare.",
    pos: [10, 2],
    color: "#dc2626",
    accent: "#fecaca",
    actions: [
      hustles.senator,
      {
        id: "lobby", label: "Lobby for a contract", kind: "rest",
        energyCost: 10, vibeGain: -5, reward: 0,
        desc: "Network with the big boys. No cash now, but maybe later. Energy drain is real.",
      },
    ],
  },
];

export const PLACE_BY_ID: Record<string, Place> = Object.fromEntries(
  PLACES.map((p) => [p.id, p])
);

// Default starting place (Unity Fountain — center of the city)
export const START_PLACE_ID = "home";
