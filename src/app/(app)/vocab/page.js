"use client";

import { useApp } from "@/context/AppContext";
import { VocabTab } from "@/components/VocabTab";

export default function VocabPage() {
  const { vocabList, setVocabList, supabase, userId, onActivityDone } = useApp();
  return (
    <VocabTab
      vocabList={vocabList}
      setVocabList={setVocabList}
      supabase={supabase}
      userId={userId}
      onActivityDone={onActivityDone}
    />
  );
}
