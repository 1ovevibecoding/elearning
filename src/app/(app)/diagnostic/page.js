"use client";

import { useApp } from "@/context/AppContext";
import { DiagnosticTest } from "@/components/DiagnosticTest";

export default function DiagnosticPage() {
  const { supabase, userId, userStats, setUserStats, onActivityDone } = useApp();

  return (
    <div className="app-page">
      <DiagnosticTest
        supabase={supabase}
        userId={userId}
        userStats={userStats}
        setUserStats={setUserStats}
        onActivityDone={onActivityDone}
      />
    </div>
  );
}
