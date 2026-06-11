interface StreakBadgeProps {
  days: number;
}

export default function StreakBadge({ days }: StreakBadgeProps) {
  const isActive = days > 0;

  return (
    <div className={`streak-badge${isActive ? ' active' : ''}`}>
      <span className="streak-fire">🔥</span>
      <span>{days} day{days !== 1 ? 's' : ''}</span>
    </div>
  );
}
