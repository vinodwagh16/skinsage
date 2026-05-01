"use client";
import { useRef, useState } from "react";

interface Props {
  onSend: (text: string, imageBase64?: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      setPreview(result);
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !imageBase64) return;
    onSend(text, imageBase64 ?? undefined);
    setText("");
    setPreview(null);
    setImageBase64(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form onSubmit={submit} style={{ padding: "12px 16px", borderTop: "1px solid #1e293b" }}>
      {preview && (
        <div style={{ marginBottom: 8, position: "relative", display: "inline-block" }}>
          <img src={preview} alt="preview" style={{ height: 60, borderRadius: 8 }} />
          <button type="button" onClick={() => { setPreview(null); setImageBase64(null); }}
            style={{
              position: "absolute", top: -8, right: -8, background: "#ef4444",
              border: "none", borderRadius: "50%", width: 20, height: 20,
              cursor: "pointer", color: "#fff", fontSize: 12,
            }}>×</button>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button type="button" onClick={() => fileRef.current?.click()}
          style={{
            background: "#1e293b", border: "1px solid #334155", borderRadius: 8,
            padding: "8px 12px", cursor: "pointer", color: "#94a3b8", fontSize: 18,
          }} title="Upload skin photo">
          📷
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png"
          onChange={handleImage} style={{ display: "none" }} />
        <input value={text} onChange={e => setText(e.target.value)}
          placeholder="Describe your skin concern or type a message..."
          disabled={disabled}
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #334155",
            background: "#1e293b", color: "#f1f5f9", fontSize: 15,
          }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e as any); } }}
        />
        <button type="submit" disabled={disabled || (!text.trim() && !imageBase64)}
          style={{
            background: "#6366f1", border: "none", borderRadius: 8,
            padding: "10px 16px", cursor: "pointer", color: "#fff", fontSize: 15,
            opacity: disabled ? 0.5 : 1,
          }}>
          Send
        </button>
      </div>
    </form>
  );
}
