import React, { useState, useRef, useEffect } from "react";

const SIMULATED_EMPTY_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

function pickSupportedAudioMimeType() {
  if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") {
    return "";
  }
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/aac"
  ];
  if (typeof window.MediaRecorder.isTypeSupported !== "function") {
    return "";
  }
  return candidates.find((type) => window.MediaRecorder.isTypeSupported(type)) || "";
}

/**
 * GBS Real Microphone Voice Note Recorder
 * Always captures, previews, and dispatches the sender's exact recorded microphone audio.
 * Never fabricates sample audio tones or simulated recordings when mic access is denied.
 */
export default function VoiceNoteRecorder({ onSendVoiceNote, onCancel, role = "USER" }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordedMimeType, setRecordedMimeType] = useState("audio/webm");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [permissionError, setPermissionError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioElementRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  const formatTime = (secs) => {
    const safe = Math.max(0, Math.floor(Number(secs) || 0));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const cleanupPreviewAudio = () => {
    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.src = "";
      } catch { }
      audioElementRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackTime(0);
  };

  const stopMediaTracks = () => {
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch { }
      mediaStreamRef.current = null;
    }
  };

  const startWaveformAnimation = (analyser) => {
    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const bufferLength = 64;
      const dataArray = new Uint8Array(bufferLength);

      if (analyser) {
        analyser.getByteFrequencyData(dataArray);
      }

      const barWidth = (width / bufferLength) * 1.6;
      let x = 0;
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "#38bdf8");
      gradient.addColorStop(0.5, "#818cf8");
      gradient.addColorStop(1, "#34d399");
      ctx.fillStyle = gradient;

      for (let i = 0; i < bufferLength; i++) {
        const val = dataArray[i];
        const barHeight = Math.max((val / 255) * height, 3);
        const y = (height - barHeight) / 2;
        ctx.fillRect(x, y, Math.max(barWidth - 1, 2), barHeight);
        x += barWidth;
        if (x > width) break;
      }
    };
    render();
  };

  const startRecording = async () => {
    setPermissionError(null);
    cleanupPreviewAudio();
    audioChunksRef.current = [];
    setRecordedAudioUrl(null);
    setAudioBlob(null);
    setIsProcessingAudio(false);

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia ||
      typeof window.MediaRecorder === "undefined"
    ) {
      setPermissionError(
        "Microphone audio recording is not supported on this browser. Please use Chrome, Edge, or Safari with microphone permission."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      mediaStreamRef.current = stream;

      const preferredMime = pickSupportedAudioMimeType();
      const mediaRecorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const resolvedMime = mediaRecorder.mimeType || preferredMime || "audio/webm";
      setRecordedMimeType(resolvedMime);

      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyserRef.current = analyser;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        startWaveformAnimation(analyser);
      } catch (webaudioErr) {
        console.warn("Web Audio analyser notice:", webaudioErr);
        startWaveformAnimation(null);
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        stopMediaTracks();
        const chunks = audioChunksRef.current.slice();
        if (chunks.length === 0) {
          setIsProcessingAudio(false);
          setPermissionError("No audio was captured by your microphone. Please try recording again and speak into the mic.");
          return;
        }

        const mime = mediaRecorder.mimeType || resolvedMime || "audio/webm";
        const blob = new Blob(chunks, { type: mime });
        if (!blob || blob.size < 64) {
          setIsProcessingAudio(false);
          setPermissionError("Recording was too short or empty. Please record for at least 1 second.");
          return;
        }

        setAudioBlob(blob);
        setRecordedMimeType(mime);
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result;
          setIsProcessingAudio(false);
          if (typeof base64data === "string" && base64data !== SIMULATED_EMPTY_WAV && base64data.length > 100) {
            setRecordedAudioUrl(base64data);
          } else {
            setPermissionError("Could not encode recorded audio cleanly. Please try again.");
          }
        };
        reader.onerror = () => {
          setIsProcessingAudio(false);
          setPermissionError("Failed to read microphone audio buffer.");
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      stopMediaTracks();
      const errName = err?.name || "";
      setPermissionError(
        errName === "NotAllowedError" || errName === "PermissionDeniedError"
          ? "Microphone permission was denied. Click the browser address bar lock/mic icon to allow microphone access so your real voice can be recorded."
          : "No working microphone was detected or it is busy in another app. Connect/allow your microphone to record your exact voice note."
      );
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      setIsProcessingAudio(true);
      try {
        mediaRecorderRef.current.requestData?.();
      } catch { }
      mediaRecorderRef.current.stop();
    } else {
      stopMediaTracks();
    }
  };

  const togglePlayback = () => {
    if (!recordedAudioUrl) return;
    if (!audioElementRef.current || audioElementRef.current.src !== recordedAudioUrl) {
      cleanupPreviewAudio();
      const audio = new Audio(recordedAudioUrl);
      audioElementRef.current = audio;
      audio.onended = () => {
        setIsPlaying(false);
        setPlaybackTime(0);
      };
      audio.ontimeupdate = () => {
        setPlaybackTime(Math.floor(audio.currentTime || 0));
      };
      audio.onerror = () => {
        setIsPlaying(false);
        setPermissionError("Browser could not play back this recording preview.");
      };
    }

    if (audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.pause();
        setIsPlaying(false);
      } else {
        audioElementRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          setIsPlaying(false);
          setPermissionError("Tap Play again to start audio playback.");
        });
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      cleanupPreviewAudio();
      stopMediaTracks();
    };
  }, []);

  const handleSend = () => {
    if (isRecording || isProcessingAudio || !recordedAudioUrl || !audioBlob || audioBlob.size < 64) {
      setPermissionError("Please finish recording your real voice note before sending.");
      return;
    }

    cleanupPreviewAudio();
    const finalDuration = Math.max(recordingDuration, 1);
    const voiceNoteData = {
      id: `vn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      audioUrl: recordedAudioUrl,
      mimeType: recordedMimeType,
      duration: finalDuration,
      durationLabel: formatTime(finalDuration),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: new Date().toLocaleDateString(),
      senderRole: role,
      sizeBytes: audioBlob.size,
      isGenuineRecording: true
    };

    if (onSendVoiceNote) {
      onSendVoiceNote(voiceNoteData);
    }
    setRecordedAudioUrl(null);
    setAudioBlob(null);
    setRecordingDuration(0);
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))",
      border: "1px solid rgba(59, 130, 246, 0.4)",
      borderRadius: "14px",
      padding: "16px 20px",
      color: "#f8fafc",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.2rem" }}>🎙️</span>
          <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#60a5fa" }}>
            GBS Real Voice Note Recorder
          </span>
          <span style={{
            fontSize: "0.7rem",
            background: "rgba(59, 130, 246, 0.2)",
            color: "#93c5fd",
            padding: "2px 8px",
            borderRadius: "999px",
            fontWeight: 700
          }}>
            {role}
          </span>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={() => {
              cleanupPreviewAudio();
              stopMediaTracks();
              onCancel();
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: "1.1rem"
            }}
            title="Cancel Voice Note"
          >
            ✕
          </button>
        )}
      </div>

      {permissionError && (
        <div style={{ fontSize: "0.8rem", color: "#fca5a5", background: "rgba(239, 68, 68, 0.16)", border: "1px solid rgba(239, 68, 68, 0.45)", padding: "8px 10px", borderRadius: "8px", lineHeight: 1.45 }}>
          ⚠️ {permissionError}
        </div>
      )}

      {!recordedAudioUrl ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: "48px",
                  height: "48px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 15px rgba(239, 68, 68, 0.6)",
                  animation: "pulse 1.5s infinite"
                }}
                title="Stop Recording"
              >
                ⬛
              </button>
            ) : (
              <button
                type="button"
                disabled={isProcessingAudio}
                onClick={startRecording}
                style={{
                  background: "linear-gradient(135deg, #1e293b, #0f172a)",
                  color: "#fff",
                  border: "2px solid #38bdf8",
                  borderRadius: "50%",
                  width: "52px",
                  height: "52px",
                  cursor: isProcessingAudio ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 16px rgba(56, 189, 248, 0.4)"
                }}
                title="Start Recording Your Exact Voice"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="8" y="2" width="8" height="11" rx="4" fill="#e2e8f0" stroke="#38bdf8" strokeWidth="1.2" />
                  <circle cx="12" cy="7.5" r="1.4" fill="#ef4444" />
                  <path d="M5 9v2a7 7 0 0014 0V9" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="12" y1="18" x2="12" y2="22" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                  <line x1="7" y1="22" x2="17" y2="22" stroke="#e2e8f0" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </button>
            )}

            <div>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", color: isRecording ? "#ef4444" : "#e2e8f0", fontFamily: "monospace" }}>
                {formatTime(recordingDuration)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                {isProcessingAudio
                  ? "⏳ Saving your exact recorded audio..."
                  : isRecording
                    ? "🔴 Microphone live: speak clearly, then press Stop"
                    : "Click microphone to record your real voice"}
              </div>
            </div>
          </div>

          {isRecording && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(2, 6, 23, 0.7)",
              padding: "4px 10px",
              borderRadius: "8px",
              border: "1px solid rgba(56, 189, 248, 0.3)"
            }}>
              <span style={{ fontSize: "0.68rem", color: "#38bdf8", fontWeight: 800, letterSpacing: "1px" }}>LIVE MIC:</span>
              <canvas
                ref={canvasRef}
                width={200}
                height={32}
                style={{ width: "200px", height: "32px", display: "block" }}
              />
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(15, 23, 42, 0.6)",
            padding: "8px 14px",
            borderRadius: "10px",
            border: "1px solid rgba(59, 130, 246, 0.3)"
          }}>
            <button
              type="button"
              onClick={togglePlayback}
              style={{
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title={isPlaying ? "Pause Preview" : "Play Exact Recording Preview"}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "3px", flex: 1, margin: "0 14px" }}>
              {[12, 24, 18, 30, 16, 26, 20, 32, 14, 28, 22, 15, 25, 19, 29].map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}px`,
                    background: isPlaying ? "#34d399" : "#64748b",
                    borderRadius: "2px"
                  }}
                />
              ))}
            </div>

            <span style={{ fontSize: "0.85rem", color: "#38bdf8", fontFamily: "monospace", fontWeight: 700 }}>
              {formatTime(playbackTime > 0 ? playbackTime : recordingDuration)}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <span style={{ fontSize: "0.75rem", color: "#34d399", fontWeight: 700 }}>
              ✓ Real voice captured ({Math.max(1, Math.round((audioBlob?.size || 0) / 1024))} KB)
            </span>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => {
                  cleanupPreviewAudio();
                  setRecordedAudioUrl(null);
                  setAudioBlob(null);
                  setRecordingDuration(0);
                }}
                style={{
                  background: "rgba(239, 68, 68, 0.2)",
                  color: "#f87171",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                🗑️ Re-record
              </button>
              <button
                type="button"
                disabled={isProcessingAudio || !recordedAudioUrl}
                onClick={handleSend}
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "#fff",
                  border: "none",
                  padding: "8px 18px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)"
                }}
              >
                🚀 Send Exact Voice Note ({formatTime(recordingDuration)})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
