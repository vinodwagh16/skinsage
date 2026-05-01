"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProgressForm } from "@/components/progress/ProgressForm";
import { ProgressList } from "@/components/progress/ProgressList";
import { ProgressLog } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function ProgressPage() {
  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";

  useEffect(() => {
    if (!token) { router.push("/auth"); return; }
    loadLogs();
  }, []);

  async function loadLogs() {
    const res = await fetch(`${API}/progress`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { router.push("/auth"); return; }
    const data = await res.json();
    setLogs(data.logs);
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24,
      }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>🌿 Skin Progress</h1>
        <button onClick={() => router.push("/chat")}
          style={{
            background: "transparent", border: "1px solid #334155", borderRadius: 8,
            padding: "6px 14px", color: "#94a3b8", cursor: "pointer", fontSize: 13,
          }}>
          ← Chat
        </button>
      </div>
      <ProgressForm token={token} onSaved={loadLogs} />
      <ProgressList logs={logs} />
    </div>
  );
}
