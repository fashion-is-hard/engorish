// SessionPlayPage.tsx 안

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SessionPlayPage() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);

  const sessionId = "..."; // 너 기존 sessionId 그대로 사용

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });

      // 1️⃣ Storage 업로드
      const filePath = `user/${sessionId}_${Date.now()}.webm`;

      const { error: uploadError } = await supabase.storage
        .from("audio")
        .upload(filePath, blob, {
          contentType: "audio/webm",
        });

      if (uploadError) {
        console.error(uploadError);
        alert("업로드 실패");
        return;
      }

      // 2️⃣ turn 함수 호출
      const { data, error } = await supabase.functions.invoke("turn", {
        body: {
          session_id: sessionId,
          user_audio_path: filePath,
          mime: "audio/webm",
        },
      });

      if (error) {
        console.error(error);
        alert("AI 응답 실패");
        return;
      }

      // 3️⃣ AI 음성 자동 재생
      if (data?.ai?.audio_url) {
        const audio = new Audio(data.ai.audio_url);
        audio.play();
      }
    };

    mediaRecorder.start();
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <button
      onClick={() => (recording ? stopRecording() : startRecording())}
      style={{
        width: 80,
        height: 80,
        borderRadius: "50%",
        background: recording ? "#94A3B8" : "#374151",
        color: "white",
        fontSize: 18,
      }}
    >
      🎤
    </button>
  );
}