import { ProgressLog } from "@/types";

export function ProgressList({ logs }: { logs: ProgressLog[] }) {
  if (!logs.length) {
    return (
      <p style={{ color: "#475569", textAlign: "center", padding: 40 }}>
        No progress logs yet. Start logging to track your improvement!
      </p>
    );
  }

  return (
    <div>
      {logs.map(log => (
        <div key={log.id} style={{
          background: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 12,
          border: "1px solid #334155",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "#94a3b8" }}>
              {new Date(log.date).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </span>
            <span style={{ color: "#f59e0b" }}>
              {"★".repeat(log.rating)}{"☆".repeat(5 - log.rating)}
            </span>
          </div>
          {log.notes && <p style={{ margin: 0, fontSize: 14, color: "#f1f5f9" }}>{log.notes}</p>}
          {log.photoUrl && (
            <img src={log.photoUrl} alt="Progress"
              style={{ marginTop: 10, maxWidth: "100%", borderRadius: 8 }} />
          )}
        </div>
      ))}
    </div>
  );
}
