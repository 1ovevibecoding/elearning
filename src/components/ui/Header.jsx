"use client";

import { UserButton } from "@clerk/nextjs";
import { MarkerUnderline } from "./MarkerUnderline";

export function Header() {
  return (
    <header className="app-header">
      <div>
        <h1 className="app-title">
          Bàn Học{" "}
          <span className="marker-word">
            IELTS
            <MarkerUnderline />
          </span>
        </h1>
        <p className="app-subtitle">
          Từ vựng · Shadowing · Luyện kỹ năng — có AI đồng hành
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
