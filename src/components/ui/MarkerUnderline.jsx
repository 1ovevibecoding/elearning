export function MarkerUnderline({ color = "var(--amber)", width = 100 }) {
  return (
    <svg
      className="marker-svg"
      width={width}
      height="10"
      viewBox="0 0 120 10"
      fill="none"
    >
      <path
        d="M2 6C15 2 25 8 40 5C55 2 65 8 80 5C95 2 105 8 118 5"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
