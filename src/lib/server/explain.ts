// Turns raw server errors into short, human sentences + a "what to do" hint.
// Used by /api/player/init and /api/health so the player (and you) can SEE the
// real reason instead of a blank "500".

export interface Explained {
  error: string;
  hint?: string;
  detail: string;
}

export function explain(e: unknown): Explained {
  const err = e as { message?: string; code?: string | number } | undefined;
  const detail = String(err?.message ?? e ?? "Unknown error").slice(0, 400);

  if (/invalid_grant|UNAUTHENTICATED|failed to fetch a valid Google OAuth2 access token|Could not refresh access token|invalid_client|Getting metadata from plugin failed|account not found/i.test(detail)) {
    return {
      error: "Firebase refused the server key.",
      hint:
        "The key was probably disabled after being exposed on public GitHub. In Firebase: Project settings → Service accounts → Generate new private key, then paste it into src/lib/server/serviceAccount.ts (keep the repo PRIVATE).",
      detail,
    };
  }
  if (/NOT_FOUND|does not exist for project|database \(default\)/i.test(detail)) {
    return {
      error: "Firestore database not found.",
      hint:
        "In Firebase console: Build → Firestore Database → Create database (pick a region, production mode).",
      detail,
    };
  }
  if (/PERMISSION_DENIED|has not been used in project|API has not been used|is disabled/i.test(detail)) {
    return {
      error: "The server key is not allowed to use Firestore.",
      hint:
        "Create the Firestore database in the Firebase console (Build → Firestore Database). If it already exists, in Google Cloud enable the 'Cloud Firestore API' and give the firebase-adminsdk account the 'Firebase Admin' role.",
      detail,
    };
  }
  if (/Cannot find module|MODULE_NOT_FOUND|Failed to load|ERR_REQUIRE|is not a function/i.test(detail)) {
    return {
      error: "The server could not load a code package.",
      hint: "Redeploy on Vercel. If it keeps happening, send this detail to your developer.",
      detail,
    };
  }
  if (/timed out|timeout|DEADLINE_EXCEEDED/i.test(detail)) {
    return {
      error: "Firebase took too long to answer.",
      hint: "Usually means the Firestore database is not created yet, or the key is blocked.",
      detail,
    };
  }
  if (/service account not configured|REPLACE_WITH/i.test(detail)) {
    return {
      error: "The server key is still a placeholder.",
      hint: "Paste your real key into src/lib/server/serviceAccount.ts.",
      detail,
    };
  }
  if (/init failed|Failed to parse private key|PEM|private key/i.test(detail)) {
    return {
      error: "The server key is not in the right format.",
      hint:
        "Re-copy the whole key from the downloaded .json file into serviceAccount.ts without changing the \\n characters.",
      detail,
    };
  }
  return { error: "Server error.", detail };
}

/** Race a promise against a timer so a hanging Firebase call can't hang the request. */
export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

export function reply(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
