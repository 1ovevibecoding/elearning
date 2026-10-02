"use client";

import { useApp } from "@/context/AppContext";
import { IeltsTab } from "@/components/IeltsTab";

export default function WritingSpeakingPage() {
  const {
    writingHistory, setWritingHistory,
    speakingHistory, setSpeakingHistory,
    examinerHistory, setExaminerHistory,
    supabase, userId, onActivityDone
  } = useApp();

  return (
    <IeltsTab
      writingHistory={writingHistory}
      setWritingHistory={setWritingHistory}
      speakingHistory={speakingHistory}
      setSpeakingHistory={setSpeakingHistory}
      examinerHistory={examinerHistory}
      setExaminerHistory={setExaminerHistory}
      supabase={supabase}
      userId={userId}
      onActivityDone={onActivityDone}
    />
  );
}
