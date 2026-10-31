import React, { useState, useRef } from "react";

/**
 * GBS Enterprise Voice Note Player
 * Renders an interactive audio message bubble with waveform, play/pause toggle, and duration
 */
export default function VoiceNotePlayer({
  voiceNote,
  isSender = false,
  senderName = "User",
  senderRole = "ADMIN"
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const togglePlay = () => {
    if (!audioRef.current && voiceNote?.audioUrl) {
      const audio = new Audio(voiceNote.audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      // Simulation toggle
      setIsPlaying(!isPlaying);
    }
  };

  const roleColors = {
    ADMIN: "#3b82f6",
    TEACHER: "#10b981",
    PARENT: "#f59e0b",
    DEVELOPER: "#8b5cf6"
  };

  const badgeColor = roleColors[senderRole] || "#64748b";

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
        maxWidth: "340px",
        boxShadow: "0 4px 15px rgba(0, 0, 0, 0.25)"
      }}>
        <button
          onClick={togglePlay}
          style={{
            background: isSender ? "#3b82f6" : "#10b981",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
          }}
          title={isPlaying ? "Pause" : "Play Voice Note"}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
          {/* Animated or Static Waveform */}
          <div style={{ display: "flex", alignItems: "center", gap: "3px", height: "24px" }}>
            {[10, 20, 14, 26, 18, 28, 12, 22, 16, 24, 18, 30, 14, 26, 20].map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}px`,
                  background: isPlaying ? (isSender ? "#60a5fa" : "#34d399") : "#64748b",
                  borderRadius: "2px",
                  transition: "background 0.3s ease"
                }}
              />
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#94a3b8" }}>
            <span>🎙️ Voice Note</span>
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#e2e8f0" }}>
              {formatTime(currentTime > 0 ? currentTime : voiceNote?.duration || 5)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
