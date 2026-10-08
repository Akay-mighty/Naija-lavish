// src/game/data/quests.ts — 9-step quest chain for new players.
// Each step has a hint and a reward. Reward is paid ONLY after the server
// verifies the step really happened (via the API route).

export interface QuestStep {
  id: number;
  title: string;
  hint: string;
  reward: number; // naira
  verifyAction: string; // the API action the server checks
}

export const QUEST_STEPS: QuestStep[] = [
  { id: 1, title: "Bucket Bath", hint: "Tap Phone > Health to take a bucket bath", reward: 200, verifyAction: "bath" },
  { id: 2, title: "Change Clothes", hint: "Tap Phone > Settings to change your look", reward: 200, verifyAction: "wardrobe" },
  { id: 3, title: "Eat Food", hint: "Tap Phone > Buka to buy food", reward: 300, verifyAction: "buka" },
  { id: 4, title: "Go to Wuse Market", hint: "Tap Map at the bottom, then tap Wuse Market", reward: 500, verifyAction: "visit:wuse-market" },
  { id: 5, title: "Roast Bole", hint: "Work at the market to earn some cash", reward: 500, verifyAction: "work" },
  { id: 6, title: "Deposit Money", hint: "Tap Phone > Bank to deposit your cash", reward: 500, verifyAction: "bank-deposit" },
  { id: 7, title: "Visit the Owambe", hint: "Go to the Owambe Hall to join the party", reward: 1000, verifyAction: "visit:owambe" },
  { id: 8, title: "Spray N500", hint: "Tap the dance floor and spray N500 at the owambe", reward: 1000, verifyAction: "spray" },
  { id: 9, title: "Say Hello in Chat", hint: "Tap the chat bar at the bottom and type a message", reward: 1500, verifyAction: "chat" },
];

export const TOTAL_QUEST_REWARD = QUEST_STEPS.reduce((sum, s) => sum + s.reward, 0);

export function getCurrentStep(questProgress: number): QuestStep | null {
  if (questProgress >= QUEST_STEPS.length) return null;
  return QUEST_STEPS[questProgress];
}
