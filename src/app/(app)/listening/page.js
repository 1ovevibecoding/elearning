"use client";

import { useApp } from "@/context/AppContext";
import { ListeningPanel } from "@/components/ListeningPanel";

export default function ListeningPage() {
  const { listeningHistory, setListeningHistory, supabase, userId, setVocabList, onActivityDone } = useApp();

  return (
    <div className="app-page">
      <ListeningPanel
        history={listeningHistory}
        setHistory={setListeningHistory}
        supabase={supabase}
        userId={userId}
        setVocabList={setVocabList}
        onActivityDone={onActivityDone}
      />
    </div>
  );
}
