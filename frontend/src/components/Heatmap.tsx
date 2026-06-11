import { useEffect, useState, useMemo } from 'react';
import * as api from '../services/api';

interface ActivityData {
  date: string;
  count: number;
}

export default function Heatmap() {
  const [data, setData] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getActivity()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const cells = useMemo(() => {
    return data.map((d) => {
      let level = 0;
      if (d.count >= 10) level = 4;
      else if (d.count >= 5) level = 3;
      else if (d.count >= 2) level = 2;
      else if (d.count >= 1) level = 1;
      return { date: d.date, level };
    });
  }, [data]);

  const months = useMemo(() => {
    const labels: string[] = [];
    let lastMonth = '';
    for (const d of data) {
      const month = new Date(d.date).toLocaleDateString('en-US', { month: 'short' });
      if (month !== lastMonth) {
        labels.push(month);
        lastMonth = month;
      }
    }
    return labels.slice(-5);
  }, [data]);

  if (loading) {
    return <div className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-md)' }} />;
  }

  return (
    <div>
      <div className="heatmap-container">
        <div className="heatmap-grid">
          {cells.map((cell) => (
            <div
              key={cell.date}
              className="heatmap-cell"
              data-level={cell.level || undefined}
              title={`${cell.date}: ${cell.level === 0 ? 'No activity' : `Level ${cell.level}`}`}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="heatmap-labels" style={{ flex: 1 }}>
          {months.map((m, i) => (
            <span key={`${m}-${i}`}>{m}</span>
          ))}
        </div>
        <div className="heatmap-legend">
          <span>Less</span>
          <div className="heatmap-legend-cell" style={{ background: 'var(--color-border-light)' }} />
          <div className="heatmap-legend-cell" style={{ background: '#d4edda' }} />
          <div className="heatmap-legend-cell" style={{ background: '#82d397' }} />
          <div className="heatmap-legend-cell" style={{ background: '#3dbf5e' }} />
          <div className="heatmap-legend-cell" style={{ background: '#16A34A' }} />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
