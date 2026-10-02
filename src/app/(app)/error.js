"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card" style={{ textAlign: "center", padding: "40px 20px", marginTop: 40 }}>
      <div style={{ color: "var(--coral)", marginBottom: 16, display: "inline-block" }}>
        <AlertTriangle size={48} />
      </div>
      <h2 className="section-title" style={{ fontSize: 20, marginBottom: 8 }}>Đã có lỗi xảy ra</h2>
      <p style={{ color: "var(--text-soft)", fontSize: 13, marginBottom: 20 }}>
        Không thể tải nội dung trang này. Vui lòng thử lại.
      </p>
      <button className="btn-primary" onClick={() => reset()} style={{ margin: "0 auto" }}>
        <RotateCcw size={15} /> Thử lại
      </button>
    </div>
  );
}
