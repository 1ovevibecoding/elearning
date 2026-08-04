"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import { Header } from "@/components/ui/Header";
import { TabNav } from "@/components/ui/TabNav";
import { Dashboard } from "@/components/Dashboard";
import { VocabTab } from "@/components/VocabTab";
import { ShadowingTab } from "@/components/ShadowingTab";
import { IeltsTab } from "@/components/IeltsTab";
import { Gamification, ActivityHeatmap, DailyMissions, TargetBandPlanner } from "@/components/Gamification";
import { todayStr } from "@/lib/utils";
import { ReadingPanel } from "@/components/ReadingPanel";
import { ListeningPanel } from "@/components/ListeningPanel";

export default function Home() {
  const { user, isLoaded: userLoaded } = useUser();
  const userId = user?.id;

  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  // App State
  const [vocabList, setVocabList] = useState([]);
  const [shadowingHistory, setShadowingHistory] = useState([]);
  const [writingHistory, setWritingHistory] = useState([]);
  const [speakingHistory, setSpeakingHistory] = useState([]);
  const [readingHistory, setReadingHistory] = useState([]);
  const [listeningHistory, setListeningHistory] = useState([]);
  const [examinerHistory, setExaminerHistory] = useState([]);
  const [activities, setActivities] = useState([]);
  const [userStats, setUserStats] = useState({});

  // Create Supabase client
  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }, []);

  // Fetch all user data
  useEffect(() => {
    async function fetchData() {
      if (!userId) return;
      try {
        // Upsert Profile first
        const { error: profileErr } = await supabase.from("profiles").upsert({
          id: userId,
          display_name: user?.fullName || user?.firstName || "Learner",
        });

        if (profileErr) {
          console.error("Profile upsert failed", profileErr);
        }

        // Fetch all user data in parallel
        const [
          vocabRes, shadowRes, writingRes, speakingRes, readingRes, listeningRes, examinerRes, activitiesRes, statsRes
        ] = await Promise.all([
          supabase.from("vocabulary").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
          supabase.from("shadowing_sessions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
          supabase.from("writing_attempts").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
          supabase.from("speaking_attempts").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
          supabase.from("reading_tests").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
          supabase.from("listening_tests").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
          supabase.from("examiner_sessions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
          supabase.from("daily_activities").select("*").eq("user_id", userId).order("activity_date", { ascending: false }),
          supabase.from("user_stats").select("*").eq("user_id", userId).single(),
        ]);

        setVocabList(vocabRes.data || []);
        setShadowingHistory(shadowRes.data || []);
        setWritingHistory(writingRes.data || []);
        setSpeakingHistory(speakingRes.data || []);
        setReadingHistory(readingRes.data || []);
        setListeningHistory(listeningRes.data || []);
        setExaminerHistory(examinerRes.data || []);
        setActivities(activitiesRes.data || []);
        setUserStats(statsRes.data || {});
      } catch (err) {
        console.error("Error fetching data:", err);
      }
      setLoading(false);
    }

    fetchData();
  }, [supabase, userId, user?.fullName, user?.firstName]);

  if (!userLoaded) {
    return (
      <div className="app-shell">
        <div className="loading-state">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header />
      <TabNav tab={tab} setTab={setTab} />
      <main className="app-main">
        {loading ? (
          <div className="loading-state">
            Đang tải dữ liệu của bạn...
          </div>
        ) : (
          <>
            {/* ─── Dashboard & Gamification ─── */}
            {tab === "dashboard" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <TargetBandPlanner 
                  stats={userStats} 
                  onSave={async (updates) => {
                    await supabase.from("user_stats").upsert({ user_id: userId, ...updates });
                    setUserStats((p) => ({ ...p, ...updates }));
                  }}
                />
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
                  <DailyMissions 
                    todayActivity={activities.find((a) => a.activity_date === todayStr())} 
                    stats={userStats}
                    setTab={setTab} 
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
                  setTab={setTab}
                />
              </div>
            )}

            {tab === "vocab" && (
              <VocabTab
                vocabList={vocabList}
                setVocabList={setVocabList}
                supabase={supabase}
                userId={userId}
              />
            )}
            {tab === "shadowing" && (
              <ShadowingTab
                history={shadowingHistory}
                setHistory={setShadowingHistory}
                supabase={supabase}
                userId={userId}
              />
            )}
            {tab === "ielts" && (
              <IeltsTab
                writingHistory={writingHistory}
                setWritingHistory={setWritingHistory}
                speakingHistory={speakingHistory}
                setSpeakingHistory={setSpeakingHistory}
                examinerHistory={examinerHistory}
                setExaminerHistory={setExaminerHistory}
                supabase={supabase}
                userId={userId}
              />
            )}
            {tab === "reading" && (
              <ReadingPanel
                history={readingHistory}
                setHistory={setReadingHistory}
                supabase={supabase}
                userId={userId}
                setVocabList={setVocabList}
              />
            )}
            {tab === "listening" && (
              <ListeningPanel
                history={listeningHistory}
                setHistory={setListeningHistory}
                supabase={supabase}
                userId={userId}
                setVocabList={setVocabList}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
