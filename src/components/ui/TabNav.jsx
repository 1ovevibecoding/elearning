"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

const navGroups = [
  {
    title: "Theo dõi",
    items: [
      { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
      { href: "/diagnostic", label: "Test Đầu Vào", icon: Compass, badge: "AI Test" },
    ],
  },
  {
    title: "Học",
    items: [
      { href: "/vocab", label: "Từ vựng", icon: BookOpen },
      { href: "/shadowing", label: "Shadowing", icon: Mic },
    ],
  },
  {
    title: "Luyện thi",
    items: [
      { href: "/writing-speaking", label: "Writing & Speaking", icon: PenLine },
      { href: "/reading", label: "Reading Test", icon: BookOpenCheck },
      { href: "/listening", label: "Listening Test", icon: Headphones },
    ],
  },
];

export function TabNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop / Tablet Sidebar / Tab Nav */}
      <nav className="tab-nav" aria-label="Main Navigation">
        {navGroups.map((group) => (
          <div key={group.title} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-soft)", textTransform: "uppercase", marginRight: 4 }}>
              {group.title}:
            </span>
            {group.items.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`tab-btn ${active ? "active" : ""}`}
                  aria-current={active ? "page" : undefined}
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
                  {active && <MarkerUnderline width={t.label.length * 8 + (t.badge ? 30 : 0)} />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Mobile Bottom Nav */}
      <div className="mobile-bottom-nav">
          {[
            { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
            { href: "/vocab", label: "Từ vựng", icon: BookOpen },
            { href: "/writing-speaking", label: "IELTS", icon: PenLine },
            { href: "/reading", label: "Reading", icon: BookOpenCheck },
            { href: "/diagnostic", label: "Test", icon: Compass },
          ].map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-nav-item ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
      </div>
    </>
  );
}
