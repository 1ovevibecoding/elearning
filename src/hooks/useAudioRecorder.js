"use client";

import { useState, useRef, useCallback } from "react";

/**
 * useAudioRecorder — Records real audio using MediaRecorder API.
 * Returns an actual audio blob (WebM/Opus) that can be sent to Whisper.
 * Unlike useSpeechRecognition, this captures the actual audio signal.
 */
export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [durationMs, setDurationMs] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(null);
  const streamRef = useRef(null);

  const supported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  const start = useCallback(async () => {
    if (!supported) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Prefer WebM/Opus (Groq Whisper compatible)
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg;codecs=opus";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setDurationMs(Date.now() - startTimeRef.current);

        // Stop all microphone tracks
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setIsRecording(false);
      };

      mediaRecorder.start(100); // collect chunks every 100ms
      setIsRecording(true);
      setAudioBlob(null);
    } catch (err) {
      console.error("Microphone access denied:", err);
      setIsRecording(false);
    }
  }, [supported]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setAudioBlob(null);
    setDurationMs(0);
    setIsRecording(false);
    chunksRef.current = [];
  }, []);

  return { supported: !!supported, isRecording, audioBlob, durationMs, start, stop, reset };
}
