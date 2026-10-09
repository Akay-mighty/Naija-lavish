"use client";

// Shared fetch helper that ALWAYS returns a result object (never throws).
// If the server answers with something that is not JSON (an HTML/plain-text
// error page), we show the HTTP status and the first words of the page so the
// real problem is visible instead of "Unexpected token '<'".

export interface ApiResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  status: number;
}

function snippet(text: string): string {
  return text
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
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

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      if (res.status === 404) {
        return { ok: false, status: 404, error: "API endpoint not found. Make sure the latest code is deployed." };
      }
      const s = snippet(text);
      return {
        ok: false,
        status: res.status,
        error: `Server problem (status ${res.status})${s ? `: ${s}` : ""}. Open /api/health on your site to see what is wrong.`,
      };
    }

    // JSON error from our routes: message + optional "what to do" hint
    const message = data?.error
      ? `${data.error}${data.hint ? ` ${data.hint}` : ""}`
      : undefined;
    return { ok: res.ok && data?.ok !== false, data, status: res.status, error: message };
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message || "Network error. Check your connection." };
  }
}
