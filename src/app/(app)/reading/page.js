"use client";
export const dynamic = "force-dynamic";

import { useApp } from "@/context/AppContext";
import { ReadingPanel } from "@/components/ReadingPanel";

export default function ReadingPage() {
  const { readingHistory, setReadingHistory, supabase, userId, setVocabList, onActivityDone } = useApp();

  return (
    <ReadingPanel
      history={readingHistory}
      setHistory={setReadingHistory}
      supabase={supabase}
      userId={userId}
      setVocabList={setVocabList}
      onActivityDone={onActivityDone}
    />
  );
}
