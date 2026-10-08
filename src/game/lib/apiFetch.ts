"use client";

// Shared fetch helper that ALWAYS returns JSON (never throws on HTML responses).
// If the server returns HTML (e.g. 500 error page), we convert it to a
// friendly JSON error instead of letting res.json() throw "Unexpected token '<'".

export interface ApiResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  status: number;
}

export async function apiFetch<T = any>(
  path: string,
  options: {
    method?: "POST" | "GET" | "PUT" | "DELETE";
    body?: any;
    idToken?: string | null;
  } = {}
): Promise<ApiResult<T>> {
  const { method = "POST", body, idToken } = options;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (idToken) headers["authorization"] = `Bearer ${idToken}`;

  try {
    const res = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Always try to parse as JSON; if it fails (HTML error page), return friendly error
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      // Server returned HTML (likely a 500 error page or 404)
      if (res.status === 404) {
        return { ok: false, status: 404, error: "API endpoint not found. Make sure you deployed the latest code." };
      }
      return {
        ok: false,
        status: res.status,
        error: `Server returned an error (status ${res.status}). Check your Firebase service account configuration in src/lib/server/serviceAccount.ts.`,
      };
    }

    return { ok: res.ok && data?.ok !== false, data, status: res.status, error: data?.error };
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message || "Network error. Check your connection." };
  }
}
