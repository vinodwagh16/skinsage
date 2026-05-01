import { Message } from "@/types";

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div style={{
      display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 12,
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%", background: "#6366f1",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, marginRight: 8, flexShrink: 0, alignSelf: "flex-end",
        }}>🌿</div>
      )}
      <div style={{
        maxWidth: "75%", padding: "10px 14px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        background: isUser ? "#6366f1" : "#1e293b",
        color: "#f1f5f9", fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap",
      }}>
        {message.imageUrl && (
          <img src={message.imageUrl} alt="Uploaded skin"
            style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 8, display: "block" }} />
        )}
        {message.content}
      </div>
    </div>
  );
}
