import { useState, useEffect, useCallback } from 'react';

const CONFETTI_COLORS = ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#06B6D4'];

interface Piece {
  id: number;
  left: string;
  color: string;
  delay: string;
  size: number;
}

export default function Confetti({ duration = 2500 }: { duration?: number }) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [visible, setVisible] = useState(true);

  const generate = useCallback(() => {
    const items: Piece[] = [];
    for (let i = 0; i < 40; i++) {
      items.push({
        id: i,
        left: `${Math.random() * 100}%`,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        delay: `${Math.random() * 0.8}s`,
        size: 6 + Math.random() * 8,
      });
    }
    setPieces(items);
  }, []);

  useEffect(() => {
    generate();
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [generate, duration]);

  if (!visible) return null;

  return (
    <div className="confetti-container">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            backgroundColor: p.color,
            animationDelay: p.delay,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
    </div>
  );
}
