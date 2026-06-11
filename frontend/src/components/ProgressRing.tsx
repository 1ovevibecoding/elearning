interface ProgressRingProps {
  value: number;     // 0-100
  size?: number;     // px
  strokeWidth?: number;
  color?: string;
  label?: string;
  caption?: string;
}

export default function ProgressRing({
  value,
  size = 120,
  strokeWidth = 8,
  color = 'var(--color-accent)',
  label,
  caption,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className="progress-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          className="progress-ring-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="progress-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            '--circumference': circumference,
            '--dash-offset': offset,
          } as React.CSSProperties}
        />
      </svg>
      <div className="progress-ring-label">
        <span className="progress-ring-value">{label ?? `${Math.round(value)}%`}</span>
        {caption && <span className="progress-ring-caption">{caption}</span>}
      </div>
    </div>
  );
}
