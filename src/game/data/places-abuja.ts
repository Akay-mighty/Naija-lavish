// src/game/data/places-abuja.ts — Abuja places with world positions + building specs.
// Each place has a silhouette type that tells CityScene how to build it.

export type SilhouetteType =
  | "market" | "roundabout" | "mansion" | "tower" | "lake" | "park"
  | "ferris" | "flyover" | "apartments" | "fountain" | "mosque"
  | "rock" | "nightmarket" | "arch" | "dome" | "home";

export interface Place3D {
  id: string;
  name: string;
  area: string;
  category: "work" | "market" | "social" | "home" | "rest" | "service";
  ambience: string;
  pos: [number, number];
  color: string;
  accent: string;
  silhouette: SilhouetteType;
  height: number;
}

export const PLACES_3D: Place3D[] = [
  { id: "wuse-market", name: "Wuse Market", area: "Wuse", category: "market", ambience: "Bustling stalls and hawkers", pos: [-12, 6], color: "#0d7c4a", accent: "#c87f3f", silhouette: "market", height: 4 },
  { id: "area1", name: "Area 1 Roundabout", area: "Garki", category: "work", ambience: "Taxis circle the roundabout", pos: [-4, 4], color: "#d4a017", accent: "#9c7510", silhouette: "roundabout", height: 3 },
  { id: "garki-market", name: "Garki Market", area: "Garki", category: "market", ambience: "Old shops, steady trade", pos: [-2, 10], color: "#1e3a8a", accent: "#2f7de1", silhouette: "market", height: 4 },
  { id: "maitama", name: "Maitama", area: "Maitama", category: "work", ambience: "Embassies and mansions", pos: [6, -4], color: "#7c3aed", accent: "#c8463d", silhouette: "mansion", height: 5 },
  { id: "berger", name: "Berger Flyover", area: "Wuse", category: "work", ambience: "Traffic junction under flyover", pos: [-8, -2], color: "#6b4f3f", accent: "#d4a017", silhouette: "flyover", height: 8 },
  { id: "jabi", name: "Jabi Lake", area: "Jabi", category: "rest", ambience: "Calm water, boats, sunset", pos: [-14, -6], color: "#2f7de1", accent: "#0ea5e9", silhouette: "lake", height: 3 },
  { id: "millennium", name: "Millennium Park", area: "Maitama", category: "rest", ambience: "Green lawns, fountains", pos: [4, 0], color: "#0d7c4a", accent: "#b8e6cf", silhouette: "park", height: 2 },
  { id: "transcorp", name: "Transcorp Hilton", area: "Maitama", category: "social", ambience: "5-star hotel, conference hall", pos: [10, -8], color: "#1a0f1f", accent: "#d4a017", silhouette: "tower", height: 12 },
  { id: "magicland", name: "Magicland", area: "Area 11", category: "social", ambience: "Amusement park, Ferris wheel", pos: [2, -10], color: "#c8463d", accent: "#f5d77a", silhouette: "ferris", height: 7 },
  { id: "home", name: "Home", area: "Self-Con", category: "home", ambience: "Your room, your space", pos: [14, 8], color: "#0d7c4a", accent: "#d4a017", silhouette: "home", height: 3 },
  { id: "unity", name: "Unity Fountain", area: "Central", category: "rest", ambience: "Spark of unity, water spray", pos: [0, 0], color: "#1e3a8a", accent: "#2f7de1", silhouette: "fountain", height: 4 },
  { id: "national-mosque", name: "National Mosque", area: "Central", category: "rest", ambience: "Golden dome, serene", pos: [8, 2], color: "#d4a017", accent: "#0d7c4a", silhouette: "mosque", height: 6 },
  { id: "aso-rock", name: "Aso Rock", area: "Three Arms", category: "rest", ambience: "Massive granite monolith", pos: [-16, -12], color: "#6b4f3f", accent: "#2b1810", silhouette: "rock", height: 14 },
  { id: "night-market", name: "Night Market", area: "Garki", category: "market", ambience: "String lights, suya smoke", pos: [-6, -8], color: "#7c3aed", accent: "#f5d77a", silhouette: "nightmarket", height: 3 },
  { id: "city-gate", name: "City Gate", area: "Central", category: "rest", ambience: "Welcome arch to Abuja", pos: [16, 0], color: "#d4a017", accent: "#0d7c4a", silhouette: "arch", height: 6 },
  { id: "national-assembly", name: "National Assembly", area: "Three Arms", category: "work", ambience: "Senate and Representatives", pos: [10, 2], color: "#c8463d", accent: "#1e3a8a", silhouette: "dome", height: 7 },
];

export const PLACE_BY_ID: Record<string, Place3D> = Object.fromEntries(PLACES_3D.map(p => [p.id, p]));
export const START_PLACE = "unity";
export const BOUNDS = { minX: -22, maxX: 22, minZ: -16, maxZ: 16 };
