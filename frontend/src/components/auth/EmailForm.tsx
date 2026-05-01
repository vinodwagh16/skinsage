"use client";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";

interface Props {
  onSuccess: (token: string, name: string) => void;
}

export function EmailForm({ onSuccess }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const path = mode === "register" ? "/auth/register" : "/auth/login";
      const body = mode === "register" ? { name, email, password } : { email, password };
      const res = await apiClient.post<{ token: string; user: { name: string } }>(path, body);
      localStorage.setItem("token", res.token);
      onSuccess(res.token, res.user.name);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {mode === "register" && (
        <input placeholder="Name" value={name} onChange={e => setName(e.target.value)}
          style={inputStyle} required />
      )}
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
        style={inputStyle} required />
      <input type="password" placeholder="Password (min 8 chars)" value={password}
        onChange={e => setPassword(e.target.value)} style={inputStyle} required minLength={8} />
      {error && <p style={{ color: "#f87171", fontSize: 14 }}>{error}</p>}
      <button type="submit" style={btnStyle}>
        {mode === "register" ? "Create Account" : "Login"}
      </button>
      <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}
        style={{ ...btnStyle, background: "transparent", border: "1px solid #334155" }}>
        {mode === "login" ? "New here? Register" : "Have an account? Login"}
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 14px", borderRadius: 8, border: "1px solid #334155",
  background: "#1e293b", color: "#f1f5f9", fontSize: 15,
};
const btnStyle: React.CSSProperties = {
  padding: "10px 14px", borderRadius: 8, background: "#6366f1",
  color: "#fff", border: "none", cursor: "pointer", fontSize: 15,
};
