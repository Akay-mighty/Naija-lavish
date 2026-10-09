// GET /api/health
// Open https://YOUR-SITE/api/health in a browser to see EXACTLY what is wrong with the
// server side (key, Firestore, Auth). It never prints secrets. Delete this file once
// everything works if you want.

import { explain, reply, withTimeout } from "@/lib/server/explain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface Step {
  name: string;
  ok: boolean;
  ms: number;
  error?: string;
  hint?: string;
  detail?: string;
}

async function run(name: string, fn: () => Promise<unknown>): Promise<Step> {
  const t0 = Date.now();
  try {
    await withTimeout(fn(), 12000, name);
    return { name, ok: true, ms: Date.now() - t0 };
  } catch (e) {
    const x = explain(e);
    return { name, ok: false, ms: Date.now() - t0, error: x.error, hint: x.hint, detail: x.detail };
  }
}

export async function GET() {
  const steps: Step[] = [];
  let admin: typeof import("@/lib/server/admin") | null = null;

  steps.push(
    await run("1. load Firebase Admin + key", async () => {
      admin = await import("@/lib/server/admin");
      admin.adminAuth(); // initialises the app with the key, throws if bad
    })
  );

  if (admin && steps[0].ok) {
    const a = admin as typeof import("@/lib/server/admin");
    steps.push(await run("2. Firestore database reachable", async () => {
      await a.adminDb().doc("_health/ping").get();
    }));
    steps.push(await run("3. Firebase Auth reachable", async () => {
      await a.adminAuth().listUsers(1);
    }));
  }

  const ok = steps.every((s) => s.ok);
  const firstBad = steps.find((s) => !s.ok);
  return reply({
    ok,
    summary: ok
      ? "All good. The server can talk to Firebase."
      : `Problem at "${firstBad?.name}": ${firstBad?.error}${firstBad?.hint ? " → " + firstBad.hint : ""}`,
    steps,
    runtime: { node: process.version, region: process.env.VERCEL_REGION ?? null },
  }, ok ? 200 : 503);
}
