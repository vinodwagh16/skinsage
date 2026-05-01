"use client";
import { useState } from "react";

interface Props {
  onSaved: () => void;
  token: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function ProgressForm({ onSaved, token }: Props) {
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState("");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhotoBase64((ev.target?.result as string).split(",")[1]);
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`${API}/progress`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        notes, rating, photoBase64,
      }),
    });
    setSaving(false);
    setNotes("");
    setPhotoBase64(null);
    onSaved();
  }

  return (
    <form onSubmit={submit} style={{ background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 24 }}>
      <h3 style={{ margin: "0 0 16px" }}>Log Today&apos;s Progress</h3>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#94a3b8" }}>
          Skin rating today
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" onClick={() => setRating(n)}
              style={{
                width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer",
                background: rating >= n ? "#f59e0b" : "#0f172a", fontSize: 16,
              }}>
              {n <= rating ? "★" : "☆"}
            </button>
          ))}
        </div>
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="How is your skin feeling? Any improvements or concerns?"
        rows={3}
        style={{
          width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #334155",
          background: "#0f172a", color: "#f1f5f9", fontSize: 14, resize: "vertical",
          boxSizing: "border-box",
        }} />
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
        <label style={{ cursor: "pointer", fontSize: 13, color: "#6366f1" }}>
          📷 Add photo
          <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
        </label>
        {photoBase64 && <span style={{ fontSize: 12, color: "#22c55e" }}>✓ Photo added</span>}
      </div>
      <button type="submit" disabled={saving}
        style={{
          marginTop: 14, width: "100%", padding: "10px 0", borderRadius: 8, background: "#6366f1",
          border: "none", color: "#fff", cursor: "pointer", fontSize: 15, opacity: saving ? 0.6 : 1,
        }}>
        {saving ? "Saving..." : "Save Progress"}
      </button>
    </form>
  );
}
