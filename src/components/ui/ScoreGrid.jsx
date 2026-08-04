export function ScoreGrid({ items }) {
  return (
    <div className="scorecard-grid">
      {items.map(([label, value]) => (
        <div key={label} className="scorecard-item">
          <div className="scorecard-value">{value}</div>
          <div className="scorecard-label">{label}</div>
        </div>
      ))}
    </div>
  );
}
