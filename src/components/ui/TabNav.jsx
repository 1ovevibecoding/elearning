"use client";

import {
  LayoutDashboard,
  BookOpen,
  Mic,
  PenLine,
  BookOpenCheck,
  Headphones,
} from "lucide-react";
import { MarkerUnderline } from "./MarkerUnderline";

const tabs = [
  { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
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
          {tab === t.key && <MarkerUnderline width={t.label.length * 8} />}
        </button>
      ))}
    </nav>
  );
}
