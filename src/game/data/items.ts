// Boutique items, market goods, and character looks — adapted from phlifestyle.fun's boutique system.

export type ItemCategory = "head" | "face" | "neck" | "wrist" | "phone" | "outfit" | "footwear" | "vehicle" | "home";

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  price: number;          // naira
  emoji: string;          // for quick display
  vibeBoost?: number;     // permanent vibe bonus when equipped/owned
  desc: string;
  requiresLevel?: number;
}

export const ITEMS: Item[] = [
  // Head
  { id: "cap-naija",   name: "Naija Cap",        category: "head",   price: 1500,    emoji: "🧢", vibeBoost: 1, desc: "Green-white-green cap. Repping the flag." },
  { id: "gele",        name: "Gele (Head-tie)",  category: "head",   price: 3000,    emoji: "🧣", vibeBoost: 2, desc: "Big Yoruba aunty energy. Wrapped proper." },
  { id: "fedora",      name: "Fedora Hat",       category: "head",   price: 6500,    emoji: "🎩", vibeBoost: 3, desc: "Fela-era swagger. Clean felt, black band." },

  // Face
  { id: "shades",      name: "Designer Shades",  category: "face",   price: 4500,    emoji: "🕶️", vibeBoost: 2, desc: "Dark lenses, gold arms. Don't smile too much." },
  { id: "gold-shades",name: "24k Gold Shades",  category: "face",   price: 28000,   emoji: "🟡", vibeBoost: 6, desc: "Real gold rim. Paps can snap you from across the street." },

  // Neck
  { id: "chain-silver",name: "Silver Chain",    category: "neck",   price: 12000,   emoji: "🔗", vibeBoost: 3, desc: "Thin silver rope. Quiet flex." },
  { id: "chain-gold",  name: "Gold Chain",      category: "neck",   price: 25000,   emoji: "🥇", vibeBoost: 6, desc: "Heavy gold rope. Click-clack when you walk." },
  { id: "beads",       name: "Beads (Ileke)",   category: "neck",   price: 2200,    emoji: "📿", vibeBoost: 2, desc: "Cowrie beads. Heritage on your chest." },

  // Wrist
  { id: "watch-casual",name: "Casual Watch",    category: "wrist",  price: 8000,    emoji: "⌚", vibeBoost: 2, desc: "Plain leather strap. Office-friendly." },
  { id: "rolex",       name: "Rolex Submariner",category: "wrist", price: 4500000, emoji: "💎", vibeBoost: 15,desc: "The watch. Six-figure naira on your wrist. Big boy certified." },

  // Phone
  { id: "phone-basic", name: "Tecno Spark",     category: "phone",  price: 95000,   emoji: "📱", vibeBoost: 2, desc: "Entry phone. Calls, WhatsApp, small data." },
  { id: "phone-iphone",name: "iPhone 15 Pro",  category: "phone",  price: 1200000, emoji: "📲", vibeBoost: 8, desc: "Big flex. Apps are smooth, paps love the camera." },

  // Outfit
  { id: "ankara-set",  name: "Ankara Set",     category: "outfit", price: 15000,   emoji: "👕", vibeBoost: 3, desc: "Tailor-made. Big day energy." },
  { id: "agbada",      name: "Agbada",         category: "outfit", price: 45000,   emoji: "🧥", vibeBoost: 6, desc: "Three-piece flowing. Big man at the owambe." },
  { id: "senator",     name: "Senator Suit",   category: "outfit", price: 32000,   emoji: "👔", vibeBoost: 5, desc: "Sharp, simple, modern. The IG-baddie default." },

  // Footwear
  { id: "slippers",    name: "Lagos Slippers", category: "footwear",price: 1800,   emoji: "🩴", vibeBoost: 1, desc: "Old faithful. Don't go to owambe with these though." },
  { id: "shoes-leather",name:"Leather Loafers",category: "footwear",price: 22000,  emoji: "👞", vibeBoost: 4, desc: "Italian leather. Office to owambe, no change needed." },

  // Vehicles
  { id: "okada",       name: "Tokunbo Okada",  category: "vehicle",price: 250000,  emoji: "🏍️", vibeBoost: 5, desc: "Your own okada. Pick up passengers, earn steady." },
  { id: "keke",        name: "Keke Napep",     category: "vehicle",price: 750000,  emoji: "🛺", vibeBoost: 8, desc: "Three-wheeled money machine. Yellow and green." },
  { id: "corolla",     name: "Tokunbo Corolla",category: "vehicle",price: 4500000, emoji: "🚗", vibeBoost: 15,desc: "2008 Corolla. Quiet flex. Reliable daily driver." },
  { id: "gwagon",      name: "G-Wagon G63",    category: "vehicle",price: 78000000,emoji: "🚙", vibeBoost: 30,desc: "Black on black. Boys stop and stare. Real big boy." },

  // Homes
  { id: "house-flat",  name: "Face-me-I-face-you", category: "home",price: 450000, emoji: "🏠", vibeBoost: 5, desc: "Single room in a compound. Toilet outside. Small but yours." },
  { id: "house-bq",    name: "BQ Flat",        category: "home",   price: 950000,  emoji: "🏢", vibeBoost: 10,desc: "Self-contained in Maitama backyard. Water, light, secure." },
  { id: "house-duplex",name: "Maitama Duplex", category: "home",   price: 8500000, emoji: "🏡", vibeBoost: 20,desc: "Four-bedroom duplex. Boys' quarters in the back. Power move." },
  { id: "house-villa", name: "Aso Drive Villa", category: "home",  price: 45000000,emoji: "🏰", vibeBoost: 40,desc: "Six-bedroom villa with pool. Neighbours are senators." },
];

export const ITEM_BY_ID: Record<string, Item> = Object.fromEntries(
  ITEMS.map((i) => [i.id, i])
);

// Character looks (gendered starting looks — adapted from phlifestyle avatars)
export interface Look {
  id: string;
  label: string;
  gender: "man" | "woman";
  emoji: string;
  // simple color tokens used by the 3D scene
  skin: string;
  top: string;
  bottom: string;
}

export const LOOKS: Look[] = [
  { id: "man-1", label: "Tee & Jeans",   gender: "man",   emoji: "🧑🏿", skin: "#8b5a3c", top: "#ef4444", bottom: "#1e3a8a" },
  { id: "man-2", label: "Senator",       gender: "man",   emoji: "👨🏿", skin: "#6b4423", top: "#fafafa", bottom: "#fafafa" },
  { id: "man-3", label: "Agbada",        gender: "man",   emoji: "🧔🏿", skin: "#8b5a3c", top: "#fde68a", bottom: "#f5d0fe" },
  { id: "woman-1",label: "Crop & Jeans", gender: "woman", emoji: "👩🏿", skin: "#8b5a3c", top: "#f472b6", bottom: "#0f172a" },
  { id: "woman-2",label: "Ankara",       gender: "woman", emoji: "👩🏾", skin: "#6b4423", top: "#16a34a", bottom: "#dc2626" },
  { id: "woman-3",label: "Gele Set",     gender: "woman", emoji: "🧕🏿", skin: "#8b5a3c", top: "#7c3aed", bottom: "#0f766e" },
];

export const LOOK_BY_ID: Record<string, Look> = Object.fromEntries(
  LOOKS.map((l) => [l.id, l])
);
