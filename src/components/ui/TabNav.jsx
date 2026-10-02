"use client";

import {
  LayoutDashboard,
  Compass,
  BookOpen,
  Mic,
  PenLine,
  BookOpenCheck,
  Headphones,
} from "lucide-react";
import { MarkerUnderline } from "./MarkerUnderline";

const tabs = [
  { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { key: "diagnostic", label: "Test Đầu Vào", icon: Compass, badge: "AI Test" },
  { key: "vocab", label: "Từ vựng", icon: BookOpen },
  { key: "shadowing", label: "Shadowing", icon: Mic },
  { key: "ielts", label: "Writing & Speaking", icon: PenLine },
  { key: "reading", label: "Reading Test", icon: BookOpenCheck },
  { key: "listening", label: "Listening Test", icon: Headphones },
];

export function TabNav({ tab, setTab }) {
  return (
    <nav className="tab-nav">
      {tabs.map((t) => (
        <button
          key={t.key}
          className={`tab-btn ${tab === t.key ? "active" : ""}`}
          onClick={() => setTab(t.key)}
        >
          <t.icon size={16} />
          <span>{t.label}</span>
          {t.badge && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "1px 6px",
                borderRadius: 10,
                background: "var(--jade)",
                color: "#fff",
                marginLeft: 4,
              }}
            >
              {t.badge}
            </span>
          )}
          {tab === t.key && <MarkerUnderline width={t.label.length * 8 + (t.badge ? 30 : 0)} />}
        </button>
      ))}
    </nav>
  );
}

