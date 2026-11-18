import React, { useState, useRef, useEffect } from "react";

const SIMULATED_EMPTY_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

function isValidRealAudioUrl(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === SIMULATED_EMPTY_WAV) return false;
  return (
    (trimmed.startsWith("data:audio/") && trimmed.length > 100) ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  );
}

/**
 * GBS Real Recorded Voice Note Player
 * Plays ONLY the sender's exact recorded audio stream — never substitutes robotic TTS or fake sample voices.
 */
export default function VoiceNotePlayer({
  voiceNote,
  isSender = false,
  senderName = "User",
  senderRole = "ADMIN"
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(Number(voiceNote?.duration || 0));
  const [playbackError, setPlaybackError] = useState(null);
  const audioRef = useRef(null);

  const hasValidAudio = isValidRealAudioUrl(voiceNote?.audioUrl);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setTotalDuration(Number(voiceNote?.duration || 0));
    setPlaybackError(null);
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = "";
      } catch { }
      audioRef.current = null;
    }
    return () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.src = "";
        } catch { }
        audioRef.current = null;
      }
    };
  }, [voiceNote?.audioUrl, voiceNote?.duration]);

  const formatTime = (secs) => {
    const safe = Math.max(0, Math.floor(Number(secs) || 0));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const togglePlay = () => {
    if (!hasValidAudio) {
      setPlaybackError("Recorded audio file is missing for this legacy entry.");
      return;
    }
    setPlaybackError(null);

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (!audioRef.current) {
      const audio = new Audio(voiceNote.audioUrl);
      audioRef.current = audio;
      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          setTotalDuration(Math.round(audio.duration));
        }
      };
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime || 0);
      };
      audio.onerror = () => {
        setIsPlaying(false);
        setPlaybackError("This device cannot decode the recorded audio format.");
      };
    }

    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(() => {
        setIsPlaying(false);
        setPlaybackError("Playback blocked — tap ▶ again to listen to the recording.");
      });
  };

  const roleColors = {
    ADMIN: "#3b82f6",
    TEACHER: "#10b981",
    PARENT: "#f59e0b",
    DEVELOPER: "#8b5cf6"
  };

  const badgeColor = roleColors[senderRole] || "#64748b";
  const displayTotal = totalDuration > 0 ? totalDuration : Number(voiceNote?.duration || 1);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: isSender ? "flex-end" : "flex-start",
      margin: "8px 0"
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginBottom: "4px",
        fontSize: "0.75rem",
        color: "#94a3b8"
      }}>
        <span style={{ fontWeight: 700, color: badgeColor }}>{senderName}</span>
        <span style={{
          background: `${badgeColor}22`,
          color: badgeColor,
          padding: "1px 6px",
          borderRadius: "4px",
          fontSize: "0.65rem",
          fontWeight: 800
        }}>
          {senderRole}
        </span>
        <span>•</span>
        <span>{voiceNote?.timestamp || "Just now"}</span>
      </div>

      <div style={{
        background: isSender
          ? "linear-gradient(135deg, rgba(37, 99, 235, 0.4), rgba(30, 58, 138, 0.6))"
          : "linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))",
        border: `1px solid ${isSender ? "rgba(59, 130, 246, 0.5)" : "rgba(100, 116, 139, 0.4)"}`,
        borderRadius: isSender ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        minWidth: "260px",
        maxWidth: "360px",
        boxShadow: "0 4px 15px rgba(0, 0, 0, 0.25)"
      }}>
        <button
          type="button"
          onClick={togglePlay}
          disabled={!hasValidAudio}
          style={{
            background: !hasValidAudio ? "#475569" : (isSender ? "#3b82f6" : "#10b981"),
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            cursor: hasValidAudio ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
          }}
          title={!hasValidAudio ? "Audio recording unavailable" : (isPlaying ? "Pause" : "Play Exact Recorded Voice Note")}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "2.5px", height: "30px", padding: "2px 0" }}>
            {[8, 14, 22, 12, 28, 16, 26, 10, 18, 24, 14, 30, 20, 28, 12, 22, 16, 26, 32, 18, 24, 10, 16, 28, 14, 22, 18, 26, 12, 20, 14, 8].map((baseHeight, i) => {
              const activeRatio = currentTime > 0 && displayTotal > 0 ? currentTime / displayTotal : 0;
              const isPast = i / 32 <= activeRatio;
              const barColor = isPast
                ? (isSender ? "#60a5fa" : "#34d399")
                : (isSender ? "rgba(96, 165, 250, 0.4)" : "rgba(148, 163, 184, 0.45)");

              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: isPlaying ? `${Math.max(6, (baseHeight + (i % 3) * 4) % 32)}px` : `${baseHeight}px`,
                    background: barColor,
                    borderRadius: "3px",
                    transition: "height 0.15s ease, background 0.2s ease",
                    animation: isPlaying ? `wavePulse 0.8s ease-in-out infinite alternate ${i * 0.04}s` : "none"
                  }}
                />
              );
            })}
          </div>

          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes wavePulse {
              0% { transform: scaleY(0.5); }
              50% { transform: scaleY(1.2); }
              100% { transform: scaleY(0.7); }
            }
          `}} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", color: "#94a3b8", gap: "8px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span>🎙️</span>
              <strong style={{ color: hasValidAudio ? (isSender ? "#93c5fd" : "#86efac") : "#f87171" }}>
                {hasValidAudio ? "Exact Recorded Voice" : "No Audio Recorded"}
              </strong>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#f8fafc" }}>
                {formatTime(currentTime > 0 ? currentTime : displayTotal)}
              </span>
              {hasValidAudio && (
                <a
                  href={voiceNote.audioUrl}
                  download={`gbs-voice-note-${voiceNote.id || Date.now()}.webm`}
                  style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 700 }}
                  title="Download recorded audio"
                >
                  ⬇
                </a>
              )}
            </div>
          </div>

          {playbackError && (
            <div style={{ fontSize: "0.7rem", color: "#fca5a5" }}>
              {playbackError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
