"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatInput } from "@/components/chat/ChatInput";
import { Message } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) { router.push("/auth"); return; }
    createSession();
  }, []);

  async function createSession() {
    const res = await fetch(`${API}/chat/session`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (res.status === 401) { router.push("/auth"); return; }
    const data = await res.json();
    setSessionId(data.id);
  }

  async function sendMessage(text: string, imageBase64?: string) {
    if (!sessionId || loading) return;
    setLoading(true);

    const userMsg: Message = {
      id: crypto.randomUUID(), role: "user", content: text,
      imageUrl: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : undefined,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    const res = await fetch(`${API}/chat/session/${sessionId}/message`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text, imageBase64 }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = JSON.parse(line.slice(6));
        if (data.done) break;
        fullText += data.text;
        setStreaming(fullText);
      }
    }

    const assistantMsg: Message = {
      id: crypto.randomUUID(), role: "assistant",
      content: fullText, createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantMsg]);
    setStreaming("");
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: 800, margin: "0 auto" }}>
      <header style={{
        padding: "14px 16px", borderBottom: "1px solid #1e293b",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontWeight: 700, fontSize: 18 }}>🌿 SkinSage</span>
        <button onClick={() => router.push("/progress")}
          style={{
            background: "transparent", border: "1px solid #334155", borderRadius: 8,
            padding: "6px 12px", color: "#94a3b8", cursor: "pointer", fontSize: 13,
          }}>
          Progress
        </button>
      </header>
      <ChatWindow messages={messages} streaming={streaming} />
      <ChatInput onSend={sendMessage} disabled={loading} />
    </div>
  );
}
