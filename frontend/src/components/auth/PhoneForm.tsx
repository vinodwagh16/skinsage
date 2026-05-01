"use client";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";

interface Props {
  onSuccess: (token: string, name: string) => void;
}

export function PhoneForm({ onSuccess }: Props) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState("");

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apiClient.post("/auth/phone/send-otp", { phone });
      setStep("otp");
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await apiClient.post<{ token: string; user: { name: string } }>(
        "/auth/phone/verify-otp", { phone, otp }
      );
      localStorage.setItem("token", res.token);
      onSuccess(res.token, res.user.name);
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (step === "otp") {
    return (
      <form onSubmit={verifyOtp} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>OTP sent to {phone}</p>
        <input placeholder="Enter 6-digit OTP" value={otp} onChange={e => setOtp(e.target.value)}
          style={inputStyle} required maxLength={6} />
        {error && <p style={{ color: "#f87171", fontSize: 14 }}>{error}</p>}
        <button type="submit" style={btnStyle}>Verify OTP</button>
      </form>
    );
  }

  return (
    <form onSubmit={sendOtp} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input placeholder="+91 9876543210" value={phone} onChange={e => setPhone(e.target.value)}
        style={inputStyle} required />
      {error && <p style={{ color: "#f87171", fontSize: 14 }}>{error}</p>}
      <button type="submit" style={btnStyle}>Send OTP</button>
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
