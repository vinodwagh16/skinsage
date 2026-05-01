import { Doctor } from "@/types";

export function DoctorCard({ doctor }: { doctor: Doctor }) {
  const stars = "★".repeat(Math.round(doctor.rating)) + "☆".repeat(5 - Math.round(doctor.rating));
  const practoUrl = `https://www.practo.com/search/doctors?results_type=doctor&q=${encodeURIComponent(doctor.name + " " + doctor.address)}&city=${encodeURIComponent(doctor.address.split(",").pop()?.trim() ?? "")}`;
  const justdialUrl = `https://www.justdial.com/search?q=${encodeURIComponent("dermatologist " + doctor.address)}`;
  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${doctor.placeId}`;

  return (
    <div style={{
      background: "#1e293b", borderRadius: 12, padding: "14px 16px", marginBottom: 10,
      border: "1px solid #334155",
    }}>
      <strong style={{ fontSize: 15 }}>{doctor.name}</strong>
      <div style={{ color: "#f59e0b", fontSize: 13, marginTop: 2 }}>{stars} {doctor.rating.toFixed(1)}</div>
      <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>{doctor.address}</div>
      {doctor.openNow !== undefined && (
        <div style={{ fontSize: 12, color: doctor.openNow ? "#22c55e" : "#ef4444", marginTop: 4 }}>
          {doctor.openNow ? "● Open now" : "● Closed"}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={linkStyle("#3b82f6")}>Maps</a>
        <a href={practoUrl} target="_blank" rel="noopener noreferrer" style={linkStyle("#8b5cf6")}>Practo</a>
        <a href={justdialUrl} target="_blank" rel="noopener noreferrer" style={linkStyle("#f59e0b")}>Justdial</a>
      </div>
    </div>
  );
}

function linkStyle(bg: string): React.CSSProperties {
  return {
    padding: "4px 12px", borderRadius: 6, background: bg, color: "#fff",
    fontSize: 12, textDecoration: "none", fontWeight: 600,
  };
}
