import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";
import { cache } from "react";
import { db } from "./db";
import { timed } from "./perf";

export const COOKIE = "pc_session";
const TTL_MS = 1000 * 60 * 60 * 24 * 14;
const sha = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

export type SessionUser = { id: string; username: string; role: "USER" | "ADMIN" | "SUPER_ADMIN"; active: boolean };

// SUPER_ADMIN is decided by server config only, never by user input.
export function roleFor(username: string) {
  const admin = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  return admin && username === admin ? ("SUPER_ADMIN" as const) : ("USER" as const);
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const { error } = await db.from("sessions").insert({
    token_hash: sha(token), user_id: userId, expires_at: new Date(Date.now() + TTL_MS).toISOString(),
  });
  if (error) throw error;
  cookies().set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", path: "/",
    secure: process.env.NODE_ENV === "production", maxAge: TTL_MS / 1000,
  });
}

// cache() = hasil dipakai ulang HANYA di dalam satu request (layout + halaman + komponen server yang memanggil getUser
// tidak lagi masing-masing bertanya ke database). Tidak dibagi antar request / antar pengguna; setiap request tetap
// memeriksa cookie sesi dan database seperti sebelumnya.
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const { data } = await timed("auth.getUser", () => db
    .from("sessions")
    .select("expires_at, users(id, username, role, active)")
    .eq("token_hash", sha(token))
    .maybeSingle());
  const u = (data as any)?.users as SessionUser | undefined;
  if (!data || !u || new Date(data.expires_at) < new Date() || !u.active) return null;
  return u;
});

export async function destroySession() {
  const token = cookies().get(COOKIE)?.value;
  if (token) await db.from("sessions").delete().eq("token_hash", sha(token));
  cookies().delete(COOKIE);
}

// Very small in-memory limiter (use Redis/Upstash when running multiple instances).
const hits = new Map<string, { n: number; t: number }>();
export function limited(key: string, max = 10, windowMs = 15 * 60 * 1000) {
  const now = Date.now(), h = hits.get(key);
  if (!h || now - h.t > windowMs) { hits.set(key, { n: 1, t: now }); return false; }
  h.n++; return h.n > max;
}
