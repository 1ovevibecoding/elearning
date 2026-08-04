export function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="stat-card">
      <Icon size={18} className="stat-icon" style={{ color: accent }} />
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
