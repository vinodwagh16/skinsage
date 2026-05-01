"use client";
import { useEffect, useRef } from "react";
import { Message } from "@/types";
import { MessageBubble } from "./MessageBubble";

interface Props {
  messages: Message[];
  streaming?: string;
}

export function ChatWindow({ messages, streaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>
      {messages.length === 0 && (
        <div style={{ textAlign: "center", color: "#475569", paddingTop: 80 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
          <h2 style={{ margin: "0 0 8px", color: "#94a3b8" }}>Welcome to SkinSage</h2>
          <p style={{ fontSize: 14, color: "#475569" }}>
            Upload a photo of your skin concern or describe it in words to get started.
          </p>
        </div>
      )}
      {messages.map(m => <MessageBubble key={m.id} message={m} />)}
      {streaming && (
        <MessageBubble message={{
          id: "streaming", role: "assistant",
          content: streaming + "▋", createdAt: new Date().toISOString(),
        }} />
      )}
      <div ref={bottomRef} />
    </div>
  );
}
