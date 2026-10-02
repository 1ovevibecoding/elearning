"use client";

import { useApp } from "@/context/AppContext";
import { Dashboard } from "@/components/Dashboard";
import { ActivityHeatmap, DailyMissions, TargetBandPlanner, LeagueProgress } from "@/components/Gamification";

export function DashboardContent() {
  const {
    supabase, userId,
    vocabList, shadowingHistory, writingHistory, speakingHistory, readingHistory, listeningHistory,
    activities, userStats, setUserStats, showToast
  } = useApp();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <LeagueProgress stats={userStats} />
      <TargetBandPlanner
        stats={userStats}
        onSave={async (updates) => {
          const { error } = await supabase.from("user_stats").upsert({ user_id: userId, ...updates });
          if (error) {
            showToast("Lỗi lưu mục tiêu band");
          } else {
            setUserStats((p) => ({ ...p, ...updates }));
          }
        }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        <DailyMissions
          todayActivity={activities.find((a) => a.activity_date === new Date().toISOString().slice(0, 10))}
          stats={userStats}
        />
        <ActivityHeatmap
          activities={activities}
          currentStreak={userStats.current_streak || 0}
          longestStreak={userStats.longest_streak || 0}
        />
      </div>

      <Dashboard
        vocabList={vocabList}
        shadowingHistory={shadowingHistory}
        writingHistory={writingHistory}
        speakingHistory={speakingHistory}
        readingHistory={readingHistory}
        listeningHistory={listeningHistory}
      />
    </div>
  );
}
