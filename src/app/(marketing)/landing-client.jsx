"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Sparkles, ArrowRight, BookOpen, Mic, PenLine, BookOpenCheck } from "lucide-react";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), {
  ssr: false,
  loading: () => <div style={{ height: 350, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-soft)" }}>Đang tải hiệu ứng 3D...</div>,
});

export function LandingClient({ hasUser }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--ink)", color: "var(--paper)" }}>
      {/* Top Bar */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", borderBottom: "1px solid var(--border-soft)" }}>
        <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 24, margin: 0 }}>
          PREP <span style={{ color: "var(--jade)" }}>IELTS</span>
        </h1>
        <div>
          {hasUser ? (
            <Link href="/dashboard" className="btn-primary" style={{ padding: "8px 16px", textDecoration: "none" }}>
              Vào học <ArrowRight size={14} />
            </Link>
          ) : (
            <div style={{ display: "flex", gap: 12 }}>
              <Link href="/sign-in" className="btn-ghost" style={{ padding: "8px 16px", textDecoration: "none" }}>
                Đăng nhập
              </Link>
              <Link href="/sign-up" className="btn-primary" style={{ padding: "8px 16px", textDecoration: "none" }}>
                Đăng ký miễn phí
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section with 3D */}
      <section style={{ padding: "40px 20px 60px", textAlign: "center", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "var(--jade-glow)", borderRadius: 20, color: "var(--jade-light)", fontSize: 13, fontWeight: 600, marginBottom: 20, border: "1px solid var(--jade)" }}>
          <Sparkles size={14} /> Nền tảng luyện thi IELTS thông minh với AI
        </div>
        <h2 style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(36px, 5vw, 56px)", lineHeight: "1.15", margin: "0 0 16px", letterSpacing: "-0.02em" }}>
          Chinh phục Band <span style={{ color: "var(--amber)" }}>7.5+ IELTS</span> cùng Trợ lý AI
        </h2>
        <p style={{ color: "var(--text-soft)", fontSize: "clamp(16px, 2vw, 18px)", maxWidth: 640, margin: "0 auto 20px" }}>
          Hệ thống luyện tập toàn diện: Từ vựng SRS thông minh, Shadowing phát âm chuẩn xác, Chấm chữa Writing & Speaking chi tiết theo tiêu chuẩn Cambridge.
        </p>

        {/* 3D Hero Scene */}
        <div style={{ margin: "0 auto", maxWidth: 600, height: 320 }}>
          <HeroScene />
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", marginTop: 20 }}>
          {hasUser ? (
            <Link href="/dashboard" className="btn-primary" style={{ padding: "14px 28px", fontSize: 16, textDecoration: "none" }}>
              Tiếp tục học ngay <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link href="/sign-up" className="btn-primary" style={{ padding: "14px 28px", fontSize: 16, textDecoration: "none" }}>
                Bắt đầu miễn phí <ArrowRight size={16} />
              </Link>
              <Link href="/diagnostic" className="btn-ghost" style={{ padding: "14px 28px", fontSize: 16, textDecoration: "none" }}>
                Làm Test Đầu Vào
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: "60px 20px", background: "var(--ink-2)", borderTop: "1px solid var(--border-soft)", borderBottom: "1px solid var(--border-soft)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 28, textAlign: "center", marginBottom: 40 }}>
            Tính năng vượt trội cho người tự học
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
            {[
              { icon: BookOpen, title: "Từ vựng SRS", desc: "Hệ thống lặp lại ngắt quãng khoa học giúp ghi nhớ từ vựng vĩnh viễn." },
              { icon: Mic, title: "Shadowing AI", desc: "Phân tích phát âm từng từ bằng Whisper AI, chỉ ra lỗi do dự và sai sót." },
              { icon: PenLine, title: "Writing & Speaking AI", desc: "Chấm chữa bài chi tiết 4 tiêu chí IELTS kèm gợi ý nâng cấp từ vựng band cao." },
              { icon: BookOpenCheck, title: "Reading & Listening", desc: "Kho đề thi chuẩn Cambridge đầy đủ giải thích và 1-click tra từ vựng." },
            ].map((f, i) => (
              <div key={i} className="card" style={{ background: "var(--ink)", border: "1px solid var(--border-soft)", padding: 24, borderRadius: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--jade-glow)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--jade-light)", marginBottom: 16 }}>
                  <f.icon size={22} />
                </div>
                <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--text-bright)" }}>{f.title}</h4>
                <p style={{ fontSize: 13, color: "var(--text-soft)", margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-soft)", fontSize: 13, marginTop: "auto" }}>
        © {new Date().getFullYear()} PREP IELTS. Tất cả quyền được bảo lưu.
      </footer>
    </div>
  );
}
