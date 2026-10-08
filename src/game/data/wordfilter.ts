// Word filter — English + pidgin insults/profanity.
// Used by /api/chat before writing to Firestore.

// Lowercase, no spaces. Match anywhere in the message (case-insensitive).
const BANNED_WORDS = [
  // English profanity
  "fuck", "shit", "bitch", "asshole", "dick", "pussy", "cunt", "nigger", "nigga",
  "faggot", "retard", "whore", "slut",
  // Pidgin / Naija insults
  "ashawo", "ashewo", "olofo", "oloshio", "olofo", "bastard", "bitch",
  "mumu", "ode", "werey", "olofo", "ignoramus", "idiot",
  // Scam / contact info
  "sends", "dm me", "call me", "whatsapp", "080", "070", "081", "090",
  "bitcoin", "crypto", "invest", "double your", "promote", "click here",
  "http://", "https://", "www.",
];

const BANNED_REGEXES = [
  /\b\d{11}\b/,                              // phone numbers (Nigerian)
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,      // phone-style
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,  // emails
];

export function filterMessage(text: string): { ok: boolean; reason?: string; clean?: string } {
  const clean = text.trim();
  if (clean.length < 1) return { ok: false, reason: "Message empty." };
  if (clean.length > 200) return { ok: false, reason: "Message too long (max 200)." };

  const lower = clean.toLowerCase();

  for (const w of BANNED_WORDS) {
    if (lower.includes(w)) {
      return { ok: false, reason: `Blocked word: "${w}".` };
    }
  }
  for (const re of BANNED_REGEXES) {
    if (re.test(clean)) {
      return { ok: false, reason: "Phone/email/links not allowed in chat." };
    }
  }
  return { ok: true, clean };
}
