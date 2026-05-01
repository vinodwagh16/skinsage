"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmailForm } from "@/components/auth/EmailForm";
import { PhoneForm } from "@/components/auth/PhoneForm";

export default function AuthPage() {
  const [method, setMethod] = useState<"email" | "phone">("email");
  const router = useRouter();

  function onSuccess(_token: string, _name: string) {
    router.push("/chat");
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 380, padding: 32, background: "#1e293b", borderRadius: 16 }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 24 }}>SkinSage</h1>
        <p style={{ color: "#94a3b8", margin: "0 0 24px", fontSize: 14 }}>
          AI-powered skin health advisor
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {(["email", "phone"] as const).map(m => (
            <button key={m} onClick={() => setMethod(m)}
              style={{
                flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
                background: method === m ? "#6366f1" : "#0f172a", color: "#f1f5f9", fontSize: 14,
              }}>
              {m === "email" ? "Email / Social" : "Phone OTP"}
            </button>
          ))}
        </div>
        {method === "email" ? <EmailForm onSuccess={onSuccess} /> : <PhoneForm onSuccess={onSuccess} />}
      </div>
    </main>
  );
}
