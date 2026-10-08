// Quest progression for NaijaLavish.
// Each step has: id, label, hint, reward, verify function.
// The verify happens server-side (POST /api/player/quest), so the client
// can't skip steps. The server checks players/{uid}.quest.completed + the
// actual action that triggered the claim.

export interface QuestStep {
  id: string;
  label: string;
  hint: string;
  reward: number;
  // Server-side verification trigger:
  //   - "place" : arrived at placeId (server checks placeId in player doc)
  //   - "action" : actionId happened (server checks cooldowns last fire time)
  //   - "chat" : sent a chat message (server checks cooldowns.chat)
  //   - "bank" : did a bank transfer
  verify: {
    type: "place" | "action" | "chat" | "bank" | "look";
    placeId?: string;
    actionId?: string;
  };
}

export const QUEST_STEPS: QuestStep[] = [
  { id: "q1-bath",   label: "Take a bucket bath",   hint: "Go to Home → Bath to freshen up.", reward: 200, verify: { type: "action", actionId: "bath" } },
  { id: "q2-look",   label: "Change your clothes",   hint: "Open Phone → Boutique, buy an item, equip it.", reward: 300, verify: { type: "look" } },
  { id: "q3-eat",    label: "Eat to fill your belle", hint: "Buy foodstuff at Wuse Market.", reward: 200, verify: { type: "action", actionId: "buy-food" } },
  { id: "q4-wuse",   label: "Visit Wuse Market",    hint: "Tap Map at the bottom → Wuse Market → Walk here.", reward: 200, verify: { type: "place", placeId: "wuse-market" } },
  { id: "q5-bole",   label: "Roast bole at the market", hint: "At Wuse Market, tap 'Roast & sell bole'.", reward: 500, verify: { type: "action", actionId: "bole" } },
  { id: "q6-bank",   label: "Deposit money in the bank", hint: "Open Phone → Bank → Deposit.", reward: 200, verify: { type: "bank" } },
  { id: "q7-owambe", label: "Visit the owambe",     hint: "Tap Map → Transcorp Hilton → Walk here.", reward: 300, verify: { type: "place", placeId: "transcorp" } },
  { id: "q8-spray",  label: "Spray ₦500 at the owambe", hint: "At Transcorp Hilton, tap 'Spray ₦500'.", reward: 500, verify: { type: "action", actionId: "spray-200" } },
  { id: "q9-hello",  label: "Say hello in chat",     hint: "Type a message in the chat box below.", reward: 300, verify: { type: "chat" } },
];

export const TOTAL_QUEST_REWARD = QUEST_STEPS.reduce((acc, s) => acc + s.reward, 0);
