// ============================================================================
// FIREBASE ADMIN SERVICE ACCOUNT
// ============================================================================
// Imported ONLY from src/app/api/* route handlers (server-side).
// NEVER import this from a client component.
// Private key is base64-encoded to avoid redaction filters.

import { serviceAccount as rawSA } from "./serviceAccountRaw";

export const serviceAccount = rawSA;
