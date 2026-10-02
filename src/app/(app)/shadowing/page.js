"use client";
export const dynamic = "force-dynamic";

import { useApp } from "@/context/AppContext";
import { ShadowingTab } from "@/components/ShadowingTab";

export default function ShadowingPage() {
  const { shadowingHistory, setShadowingHistory, supabase, userId, onActivityDone } = useApp();

  return (
    <ShadowingTab
      history={shadowingHistory}
      setHistory={setShadowingHistory}
      supabase={supabase}
      userId={userId}
      onActivityDone={onActivityDone}
    />
  );
}
