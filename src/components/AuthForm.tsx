"use client";
import { useState } from "react";
import MeowTitle from "@/components/MeowTitle";
export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr("");
    const f = new FormData(e.currentTarget);
    const r = await fetch(`/api/auth/${mode}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: f.get("username"), password: f.get("password") }),
    });
    if (r.ok) { window.location.href = "/home"; return; }
    setErr((await r.json().catch(() => ({}))).error ?? "Something went wrong."); setBusy(false);
  }
  const reg = mode === "register";
  return (
    <form onSubmit={submit} className="box">
      <div className="px"><MeowTitle size={12} /></div>
      <h1>{reg ? "Create account" : "Log in"}</h1>
      <label>Username<input name="username" required autoComplete="username" /></label>
      <label>Password<input name="password" type="password" required minLength={8} autoComplete={reg ? "new-password" : "current-password"} /></label>
      {err && <p role="alert" className="err">{err}</p>}
      <button disabled={busy}>{busy ? "Please wait..." : reg ? "Register" : "Log in"}</button>
      <a href={reg ? "/login" : "/register"}>{reg ? "Already have an account? Log in" : "New here? Create an account"}</a>
    </form>
  );
}
