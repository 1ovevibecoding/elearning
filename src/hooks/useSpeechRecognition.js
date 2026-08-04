"use client";

import { useState, useRef } from "react";

/**
 * Custom hook for browser speech recognition (STT).
 * Uses Web Speech API — best supported on Chrome.
 */
export function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef(null);
  const finalRef = useRef("");

  const supported =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const start = () => {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    finalRef.current = "";

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += t + " ";
        else interim += t;
      }
      setTranscript((finalRef.current + " " + interim).trim());
    };

    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch (e) {
      setListening(false);
    }
  };

  const stop = () => {
    if (recRef.current) recRef.current.stop();
    setListening(false);
  };

  const reset = () => {
    finalRef.current = "";
    setTranscript("");
  };

  return { supported: !!supported, listening, transcript, start, stop, reset };
}
