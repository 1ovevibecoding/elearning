import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { LandingClient } from "./landing-client";

export const metadata = {
  title: "PREP IELTS - Trang chủ",
};

export default async function LandingPage() {
  const user = await currentUser();
  const hasUser = !!user;

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
              Vào học →
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

      <LandingClient hasUser={hasUser} />
    </div>
  );
}
