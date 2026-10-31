const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const apiBase = API;

/** Authenticated fetch with one automatic token refresh. Browser only. */
export async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
  const doFetch = (token: string | null) =>
    fetch(`${API}${path}`, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` } });

  let res = await doFetch(localStorage.getItem("accessToken"));
  const refreshToken = localStorage.getItem("refreshToken");
  if (res.status === 401 && refreshToken) {
    const r = await fetch(`${API}/auth/refresh`, { method: "POST", headers: { Authorization: `Bearer ${refreshToken}` } });
    if (!r.ok) throw new Error("Session expired");
    const { accessToken } = await r.json();
    localStorage.setItem("accessToken", accessToken);
    res = await doFetch(accessToken);
  }
  return res;
}

export async function apiJson<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetchWithAuth(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message.join(", ") : data.message;
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return data as T;
}
