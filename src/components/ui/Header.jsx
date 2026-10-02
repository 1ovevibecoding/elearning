"use client";

import { UserButton } from "@clerk/nextjs";
import { MarkerUnderline } from "./MarkerUnderline";
import { Sparkles } from "lucide-react";

export function Header() {
  return (
    <header className="app-header">
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={24} color="var(--amber)" />
          <h1 className="app-title">
            PREP <span className="marker-word">IELTS<MarkerUnderline /></span>
          </h1>
        </div>
        <p className="app-subtitle" style={{ marginTop: "4px" }}>
          &quot;Work smart in silence, let your result make the noise.&quot;
        </p>
      </div>
      <UserButton
        afterSignOutUrl="/sign-in"
        appearance={{
          elements: {
            avatarBox: "header-avatar",
          },
        }}
      />
    </header>
  );
}
