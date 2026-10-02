"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { createClerkSupabaseClient } from "@/lib/supabase";
import { Header } from "@/components/ui/Header";
import { TabNav } from "@/components/ui/TabNav";
import { Toast } from "@/components/ui/Toast";
import { QuickSelectionVocab } from "@/components/QuickSelectionVocab";
import { AppProvider } from "@/context/AppContext";
import { recordActivity } from "@/lib/utils";
import { usePathname } from "next/navigation";

export default function AppLayoutClient({ children }) {
  const { user, isLoaded: userLoaded } = useUser();
  const userId = user?.id;
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const showToast = (msg) => setToast(msg);

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

  async function onActivityDone(type) {
    if (!userId) return;
    try {
      await recordActivity(supabase, userId, type);
      const [actRes, statsRes] = await Promise.all([
        supabase.from("daily_activities").select("*").eq("user_id", userId).order("activity_date", { ascending: false }),
        supabase.from("user_stats").select("*").eq("user_id", userId).single(),
      ]);
      if (actRes.data) setActivities(actRes.data);
      if (statsRes.data) setUserStats(statsRes.data);
    } catch (e) {
      console.error(e);
      showToast("Không thể đồng bộ hoạt động với CSDL");
    }
  }

  const { getToken } = useAuth();
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const supabase = useMemo(() => createClerkSupabaseClient(getToken), [getToken]);

  useEffect(() => {
    async function fetchData() {
      if (!userId) return;
      try {
        await supabase.from("profiles").upsert({
          id: userId,
          display_name: user?.fullName || user?.firstName || "Learner",
        });

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
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [supabase, userId, user?.fullName, user?.firstName]);

  if (!userLoaded || loading) {
    return <div className="loading-state">Đang tải...</div>;
  }

  return (
    <AppProvider value={{
        supabase, userId, onActivityDone, showToast,
        vocabList, setVocabList, shadowingHistory, setShadowingHistory,
        writingHistory, speakingHistory, readingHistory, listeningHistory,
        examinerHistory, activities, userStats, setUserStats
    }}>
      <div className="app-shell">
        <Toast message={toast} onClose={() => setToast(null)} />
        <QuickSelectionVocab supabase={supabase} userId={userId} vocabList={vocabList} setVocabList={setVocabList} onActivityDone={onActivityDone} />
        <Header />
        <TabNav currentPath={pathname} />
        <main className="app-main">
          {children}
        </main>
      </div>
    </AppProvider>
  );
}
