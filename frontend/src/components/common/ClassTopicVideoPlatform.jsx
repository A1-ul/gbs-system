import React, { useState, useEffect, useRef } from "react";
import apiClient from "../../api/client/apiClient";

const DEFAULT_TOPIC_VIDEOS = [
  {
    id: "VID-TOPIC-1001",
    title: "Introduction to Quadratic Equations & Factorization Methods",
    subject: "Core Mathematics",
    className: "JHS 3 / SHS 1",
    teacherName: "Mr. Sarah Teacher (Mathematics Faculty)",
    teacherEmail: "teacher@gbs.com",
    absenceNote:
      "Dear students, I am away attending the Regional STEM Curriculum Workshop today. Please play and watch this complete topic introduction video carefully, take notes in your exercise books, and complete Practice Exercise 4A before our next class.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    videoSourceType: "UPLOADED_VIDEO",
    fileName: "Quadratic_Equations_Topic_Intro.mp4",
    durationLabel: "14 mins",
    uploadedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    viewsCount: 18,
    watchedBy: ["Alex Student (JHS 3)", "Ama Mensah (SHS 1)"],
    studentComments: [
      {
        id: "CMT-1",
        studentName: "Alex Student",
        comment: "Thank you teacher! We watched the video in class and understood the factorization steps.",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
      }
    ]
  },
  {
    id: "VID-TOPIC-1002",
    title: "Photosynthesis, Cellular Respiration & Leaf Structure Lab Preview",
    subject: "Integrated Science",
    className: "JHS 2 / SHS 1 Science",
    teacherName: "Dr. Robert Vance (Science Department)",
    teacherEmail: "teacher@gbs.com",
    absenceNote:
      "Class, please watch this visual topic introduction in my absence to understand how chlorophyll traps light energy during the light-dependent stage of photosynthesis.",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    videoSourceType: "UPLOADED_VIDEO",
    fileName: "Photosynthesis_Class_Topic_Intro.mp4",
    durationLabel: "10 mins",
    uploadedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    viewsCount: 27,
    watchedBy: ["Alex Student (JHS 3)", "Kwame Boateng (JHS 2)", "Esi Mansa (SHS 1)"],
    studentComments: []
  }
];

export default function ClassTopicVideoPlatform({
  mode = "TEACHER", // "TEACHER" | "STUDENT"
  currentUser = {},
  defaultClassName = "JHS 3 / SHS 1"
}) {
  const isTeacher = String(mode).toUpperCase() === "TEACHER";
  const userFullName =
    `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() ||
    currentUser?.name ||
    (isTeacher ? "Sarah Teacher" : "Alex Student");

  const [videos, setVideos] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gbs_class_topic_videos") || "null");
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch { }
    return DEFAULT_TOPIC_VIDEOS;
  });

  const [selectedVideo, setSelectedVideo] = useState(() => videos[0] || DEFAULT_TOPIC_VIDEOS[0]);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [filterClass, setFilterClass] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState(null);

  // Teacher Upload Form State
  const [uploadMethod, setUploadMethod] = useState("FILE"); // "FILE" | "RECORD" | "URL"
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Core Mathematics");
  const [className, setClassName] = useState(defaultClassName || "JHS 3 / SHS 1");
  const [absenceNote, setAbsenceNote] = useState(
    "Dear students, please play and watch this topic introduction video carefully in my absence, write down key points in your notebooks, and leave any questions below."
  );
  const [videoDataUrl, setVideoDataUrl] = useState("");
  const [videoFileName, setVideoFileName] = useState("");
  const [customVideoUrl, setCustomVideoUrl] = useState("");
  const [durationLabel, setDurationLabel] = useState("12 mins");
  const [uploading, setUploading] = useState(false);

  // Browser Webcam Recording State (for Teacher)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const liveCamVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const mainPlayerRef = useRef(null);

  // Student Feedback / Question State
  const [studentCommentText, setStudentCommentText] = useState("");
  const [submittingWatch, setSubmittingWatch] = useState(false);

  const syncVideos = async () => {
    try {
      const res = await apiClient.get("/topic-videos");
      const serverVideos = res.data?.data?.videos;
      if (Array.isArray(serverVideos) && serverVideos.length > 0) {
        const localSaved = JSON.parse(localStorage.getItem("gbs_class_topic_videos") || "[]");
        const merged = [...serverVideos];
        if (Array.isArray(localSaved)) {
          for (const loc of localSaved) {
            if (!merged.some((v) => v.id === loc.id)) {
              merged.unshift(loc);
            }
          }
        }
        setVideos(merged);
        localStorage.setItem("gbs_class_topic_videos", JSON.stringify(merged));
        if (!selectedVideo && merged.length > 0) {
          setSelectedVideo(merged[0]);
        } else if (selectedVideo) {
          const updatedSelected = merged.find((v) => v.id === selectedVideo.id);
          if (updatedSelected) setSelectedVideo(updatedSelected);
        }
        return;
      }
    } catch { }

    try {
      const saved = JSON.parse(localStorage.getItem("gbs_class_topic_videos") || "null");
      if (Array.isArray(saved) && saved.length > 0) {
        setVideos(saved);
        if (!selectedVideo) setSelectedVideo(saved[0]);
      }
    } catch { }
  };

  useEffect(() => {
    syncVideos();
    const handleStorageOrCustom = () => syncVideos();
    window.addEventListener("gbs_topic_videos_updated", handleStorageOrCustom);
    window.addEventListener("storage", handleStorageOrCustom);
    const interval = setInterval(syncVideos, 6000);
    return () => {
      window.removeEventListener("gbs_topic_videos_updated", handleStorageOrCustom);
      window.removeEventListener("storage", handleStorageOrCustom);
      clearInterval(interval);
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (liveCamVideoRef.current && liveCamVideoRef.current.srcObject) {
      const stream = liveCamVideoRef.current.srcObject;
      stream.getTracks().forEach((t) => t.stop());
      liveCamVideoRef.current.srcObject = null;
    }
  };

  const handleVideoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFileName(file.name);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setDurationLabel(`Uploaded Video (${sizeMb} MB)`);

    // If file is <= 12MB, convert to base64 Data URL so it persists in JSON store & localStorage across tabs
    if (file.size <= 12 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setVideoDataUrl(String(ev.target.result));
          setStatusMessage({
            type: "success",
            text: `✓ Video file "${file.name}" (${sizeMb} MB) loaded and ready to publish to the class platform.`
          });
        }
      };
      reader.readAsDataURL(file);
    } else {
      const blobUrl = URL.createObjectURL(file);
      setVideoDataUrl(blobUrl);
      setStatusMessage({
        type: "success",
        text: `✓ High-resolution video "${file.name}" (${sizeMb} MB) attached and ready for class playback.`
      });
    }
  };

  const handleStartRecording = async () => {
    setStatusMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (liveCamVideoRef.current) {
        liveCamVideoRef.current.srcObject = stream;
        liveCamVideoRef.current.play().catch(() => { });
      }
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recordedChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          setVideoDataUrl(String(reader.result));
          setVideoFileName(`Teacher_Live_Topic_Recording_${Date.now()}.webm`);
          setDurationLabel(`${Math.max(1, Math.round(recordingSeconds / 60))} min recorded`);
          setStatusMessage({
            type: "success",
            text: "✓ Live topic introduction video recorded! Click 'Upload & Publish Topic Video to Class Platform' below."
          });
        };
        reader.readAsDataURL(blob);
        stopCameraStream();
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: "Camera/Microphone access was unavailable. You can upload a video file from your device or provide a video URL instead."
      });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handlePublishTopicVideo = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setStatusMessage({ type: "error", text: "Please enter the Topic Title to be taught." });
      return;
    }

    const finalVideoUrl =
      uploadMethod === "URL"
        ? customVideoUrl.trim() || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
        : videoDataUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

    setUploading(true);
    const newVideoPayload = {
      id: `VID-TOPIC-${Date.now()}`,
      title: title.trim(),
      subject: subject.trim(),
      className: className.trim(),
      teacherName: userFullName,
      teacherEmail: currentUser?.email || "teacher@gbs.com",
      absenceNote: absenceNote.trim(),
      videoUrl: finalVideoUrl,
      videoSourceType: uploadMethod === "RECORD" ? "LIVE_RECORDING" : uploadMethod === "URL" ? "STREAM_URL" : "UPLOADED_FILE",
      fileName: videoFileName || `${title.trim().replace(/\s+/g, "_")}.mp4`,
      durationLabel: durationLabel || "15 mins",
      uploadedAt: new Date().toISOString(),
      viewsCount: 0,
      watchedBy: [],
      studentComments: []
    };

    try {
      const res = await apiClient.post("/topic-videos", newVideoPayload);
      const created = res.data?.data?.video || newVideoPayload;
      const updated = [created, ...videos.filter((v) => v.id !== created.id)];
      setVideos(updated);
      setSelectedVideo(created);
      localStorage.setItem("gbs_class_topic_videos", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("gbs_topic_videos_updated", { detail: created }));
      window.dispatchEvent(new Event("storage"));
    } catch {
      const updated = [newVideoPayload, ...videos];
      setVideos(updated);
      setSelectedVideo(newVideoPayload);
      localStorage.setItem("gbs_class_topic_videos", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("gbs_topic_videos_updated", { detail: newVideoPayload }));
      window.dispatchEvent(new Event("storage"));
    }

    setUploading(false);
    setTitle("");
    setVideoDataUrl("");
    setVideoFileName("");
    setCustomVideoUrl("");
    setStatusMessage({
      type: "success",
      text: `🎬 Topic Video "${newVideoPayload.title}" uploaded to the ${newVideoPayload.className} Class Platform! All students can now play and watch it in your absence.`
    });
  };

  const handleMarkWatchedAndComment = async (e) => {
    if (e) e.preventDefault();
    if (!selectedVideo) return;
    setSubmittingWatch(true);

    const studentLabel = `${userFullName} (${defaultClassName})`;
    const commentClean = studentCommentText.trim();

    try {
      const res = await apiClient.post(`/topic-videos/${selectedVideo.id}/watch`, {
        studentName: studentLabel,
        comment: commentClean
      });
      const updatedVid = res.data?.data?.video;
      if (updatedVid) {
        const updatedList = videos.map((v) => (v.id === updatedVid.id ? updatedVid : v));
        setVideos(updatedList);
        setSelectedVideo(updatedVid);
        localStorage.setItem("gbs_class_topic_videos", JSON.stringify(updatedList));
        window.dispatchEvent(new Event("gbs_topic_videos_updated"));
      }
    } catch {
      const updatedVid = {
        ...selectedVideo,
        viewsCount: (selectedVideo.viewsCount || 0) + 1,
        watchedBy: Array.from(new Set([...(selectedVideo.watchedBy || []), studentLabel])),
        studentComments: commentClean
          ? [
            {
              id: `CMT-${Date.now()}`,
              studentName: userFullName,
              comment: commentClean,
              createdAt: new Date().toISOString()
            },
            ...(selectedVideo.studentComments || [])
          ]
          : selectedVideo.studentComments || []
      };
      const updatedList = videos.map((v) => (v.id === updatedVid.id ? updatedVid : v));
      setVideos(updatedList);
      setSelectedVideo(updatedVid);
      localStorage.setItem("gbs_class_topic_videos", JSON.stringify(updatedList));
      window.dispatchEvent(new Event("gbs_topic_videos_updated"));
    }

    setSubmittingWatch(false);
    setStudentCommentText("");
    setStatusMessage({
      type: "success",
      text: commentClean
        ? `✓ Topic video marked as watched and your question/feedback was sent to ${selectedVideo.teacherName}!`
        : `✓ Topic video "${selectedVideo.title}" marked as watched! Your attendance for this topic has been recorded for ${selectedVideo.teacherName}.`
    });
  };

  const handleDeleteVideo = async (videoId) => {
    const updated = videos.filter((v) => v.id !== videoId);
    setVideos(updated);
    localStorage.setItem("gbs_class_topic_videos", JSON.stringify(updated));
    if (selectedVideo?.id === videoId) {
      setSelectedVideo(updated[0] || null);
    }
    try {
      await apiClient.delete(`/topic-videos/${videoId}`);
    } catch { }
    setStatusMessage({ type: "success", text: "Topic video removed from class platform." });
  };

  const handlePlaybackSpeed = (rate) => {
    setPlaybackRate(rate);
    if (mainPlayerRef.current) {
      mainPlayerRef.current.playbackRate = rate;
    }
  };

  const filteredVideos = videos.filter((v) => {
    const matchesClass =
      filterClass === "ALL" ||
      (v.className && v.className.toLowerCase().includes(filterClass.toLowerCase())) ||
      (v.subject && v.subject.toLowerCase().includes(filterClass.toLowerCase()));
    const matchesQuery =
      !searchQuery.trim() ||
      (v.title && v.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (v.subject && v.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (v.teacherName && v.teacherName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesClass && matchesQuery;
  });

  return (
    <div
      style={{
        background: "linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.92))",
        border: "1.5px solid rgba(56, 189, 248, 0.35)",
        borderRadius: "18px",
        padding: "22px",
        marginBottom: "24px",
        color: "#f8fafc",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.45)"
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "14px",
          borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
          paddingBottom: "16px",
          marginBottom: "20px"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span
              style={{
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                color: "#000",
                fontWeight: 900,
                fontSize: "0.72rem",
                padding: "4px 10px",
                borderRadius: "999px",
                letterSpacing: "0.6px"
              }}
            >
              🎬 CLASS TOPIC VIDEO PLATFORM • TEACHER ABSENCE CONTINUITY
            </span>
            <span
              style={{
                background: "rgba(16, 185, 129, 0.18)",
                color: "#34d399",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                fontSize: "0.72rem",
                fontWeight: 800,
                padding: "3px 10px",
                borderRadius: "999px"
              }}
            >
              ● {videos.length} Topic Video{videos.length === 1 ? "" : "s"} Available
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 900, color: "#f8fafc" }}>
            {isTeacher
              ? "📹 Upload & Record Topic Videos for Class Playback (In Teacher's Absence)"
              : "🎬 Watch Teacher Topic Introduction Videos (Uploaded for Class Study)"}
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: "0.84rem", color: "#cbd5e1", lineHeight: 1.5 }}>
            {isTeacher
              ? "Upload a pre-recorded topic video or record a live lesson introduction onto the class platform so every student can play, watch, and study the topic you are supposed to teach even in your absence."
              : "Play and watch topic videos uploaded by your teachers to introduce and teach class topics when the teacher is absent or preparing you ahead of class."}
          </p>
        </div>
      </div>

      {/* Feedback Banner */}
      {statusMessage && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            marginBottom: "18px",
            background:
              statusMessage.type === "error"
                ? "rgba(239, 68, 68, 0.18)"
                : "rgba(16, 185, 129, 0.18)",
            border:
              statusMessage.type === "error"
                ? "1px solid rgba(239, 68, 68, 0.5)"
                : "1px solid rgba(16, 185, 129, 0.5)",
            color: statusMessage.type === "error" ? "#fca5a5" : "#6ee7b7",
            fontSize: "0.84rem",
            fontWeight: 700,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            style={{ background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer", fontSize: "1rem" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* TEACHER UPLOAD & RECORD STUDIO */}
      {isTeacher && (
        <form
          onSubmit={handlePublishTopicVideo}
          style={{
            background: "rgba(2, 6, 23, 0.72)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            borderRadius: "14px",
            padding: "18px",
            marginBottom: "24px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", color: "#fbbf24", fontWeight: 800 }}>
              📤 Publish New Topic Video onto Class Platform
            </h3>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {[
                { id: "FILE", label: "📁 Upload Video File" },
                { id: "RECORD", label: "🎥 Record Topic Live" },
                { id: "URL", label: "🔗 Video Stream Link" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setUploadMethod(tab.id);
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: 800,
                    fontSize: "0.78rem",
                    border: uploadMethod === tab.id ? "1.5px solid #fbbf24" : "1px solid rgba(148,163,184,0.25)",
                    background: uploadMethod === tab.id ? "rgba(245, 158, 11, 0.2)" : "rgba(15, 23, 42, 0.8)",
                    color: uploadMethod === tab.id ? "#fde68a" : "#cbd5e1"
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.76rem", color: "#cbd5e1", fontWeight: 700, marginBottom: "4px" }}>
                Topic Title to Teach / Introduce *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Introduction to Newton's Laws of Motion"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #334155",
                  background: "#0f172a",
                  color: "#fff",
                  fontSize: "0.85rem",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.76rem", color: "#cbd5e1", fontWeight: 700, marginBottom: "4px" }}>
                Subject / Academic Course *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Core Mathematics / Integrated Science"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #334155",
                  background: "#0f172a",
                  color: "#fff",
                  fontSize: "0.85rem",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.76rem", color: "#cbd5e1", fontWeight: 700, marginBottom: "4px" }}>
                Target Class / Cohort *
              </label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #334155",
                  background: "#0f172a",
                  color: "#38bdf8",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  boxSizing: "border-box"
                }}
              >
                <option value="All Classes">All Classes (General Topic Broadcast)</option>
                <option value="Primary 4 - Primary 6">Upper Primary (Primary 4 - 6)</option>
                <option value="JHS 1 (Grade 7)">JHS 1 (Grade 7)</option>
                <option value="JHS 2 (Grade 8)">JHS 2 (Grade 8)</option>
                <option value="JHS 3 / SHS 1">JHS 3 / SHS 1</option>
                <option value="SHS 1 Science & General Arts">SHS 1 Science &amp; General Arts</option>
                <option value="SHS 2 Science">SHS 2 Science</option>
                <option value="SHS 3 WASSCE Candidates">SHS 3 WASSCE Candidates</option>
                <option value="University Level 100 - 400">University Undergraduate Cohort</option>
              </select>
            </div>
          </div>

          {/* Video Source Input Area */}
          {uploadMethod === "FILE" && (
            <div
              style={{
                padding: "14px",
                borderRadius: "10px",
                border: "1.5px dashed rgba(56, 189, 248, 0.5)",
                background: "rgba(15, 23, 42, 0.75)",
                marginBottom: "12px"
              }}
            >
              <label style={{ display: "block", fontSize: "0.82rem", color: "#38bdf8", fontWeight: 800, marginBottom: "6px" }}>
                📁 Select Video File Made by Teacher (MP4, WebM, MOV):
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoFileChange}
                style={{ color: "#cbd5e1", fontSize: "0.82rem" }}
              />
              {videoFileName && (
                <div style={{ marginTop: "6px", fontSize: "0.78rem", color: "#34d399", fontWeight: 700 }}>
                  ✓ Attached: {videoFileName} ({durationLabel})
                </div>
              )}
            </div>
          )}

          {uploadMethod === "RECORD" && (
            <div
              style={{
                padding: "14px",
                borderRadius: "10px",
                border: "1.5px solid rgba(239, 68, 68, 0.5)",
                background: "rgba(15, 23, 42, 0.85)",
                marginBottom: "12px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "10px" }}>
                <div>
                  <strong style={{ color: "#f87171", fontSize: "0.85rem" }}>🎥 Live Teacher Topic Video Recorder</strong>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    Record yourself introducing the topic right from your webcam &amp; microphone for students to watch in your absence.
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      style={{
                        background: "linear-gradient(135deg, #ef4444, #dc2626)",
                        color: "#fff",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        fontWeight: 800,
                        fontSize: "0.8rem",
                        cursor: "pointer"
                      }}
                    >
                      ⏺️ Start Recording Topic Video
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      style={{
                        background: "#f59e0b",
                        color: "#000",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        fontWeight: 900,
                        fontSize: "0.8rem",
                        cursor: "pointer"
                      }}
                    >
                      ⏹️ Stop &amp; Save Recording ({recordingSeconds}s)
                    </button>
                  )}
                </div>
              </div>
              <video
                ref={liveCamVideoRef}
                muted
                playsInline
                style={{
                  width: "100%",
                  maxHeight: "220px",
                  background: "#000",
                  borderRadius: "8px",
                  display: isRecording ? "block" : "none"
                }}
              />
            </div>
          )}

          {uploadMethod === "URL" && (
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "0.78rem", color: "#38bdf8", fontWeight: 700, marginBottom: "4px" }}>
                🔗 Direct Topic Video URL (MP4 / WebM Stream):
              </label>
              <input
                type="url"
                placeholder="https://example.com/teacher-topic-lesson.mp4"
                value={customVideoUrl}
                onChange={(e) => setCustomVideoUrl(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #334155",
                  background: "#0f172a",
                  color: "#fff",
                  fontSize: "0.85rem",
                  boxSizing: "border-box"
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "0.76rem", color: "#cbd5e1", fontWeight: 700, marginBottom: "4px" }}>
              Teacher's Topic Introduction &amp; Instructions for Students (In Teacher's Absence) *
            </label>
            <textarea
              rows={2}
              required
              value={absenceNote}
              onChange={(e) => setAbsenceNote(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #334155",
                background: "#0f172a",
                color: "#fff",
                fontSize: "0.83rem",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={uploading}
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#fff",
                border: "none",
                padding: "11px 24px",
                borderRadius: "10px",
                fontWeight: 900,
                fontSize: "0.86rem",
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(16, 185, 129, 0.35)"
              }}
            >
              {uploading ? "⏳ Publishing Topic Video..." : "🚀 Upload & Publish Topic Video to Class Platform"}
            </button>
          </div>
        </form>
      )}

      {/* MAIN VIDEO PLAYER THEATER & CLASS PLAYLIST */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        {/* Left / Main Column: Active Topic Video Player */}
        {selectedVideo && (
          <div
            style={{
              background: "rgba(2, 6, 23, 0.85)",
              border: "1.5px solid rgba(56, 189, 248, 0.4)",
              borderRadius: "14px",
              padding: "16px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
              <span
                style={{
                  background: "rgba(56, 189, 248, 0.18)",
                  color: "#38bdf8",
                  padding: "3px 10px",
                  borderRadius: "6px",
                  fontSize: "0.74rem",
                  fontWeight: 800
                }}
              >
                📚 {selectedVideo.subject} • {selectedVideo.className}
              </span>
              <span style={{ fontSize: "0.74rem", color: "#34d399", fontWeight: 700 }}>
                👁️ {selectedVideo.viewsCount || 0} Class Views • {(selectedVideo.watchedBy || []).length} Students Watched
              </span>
            </div>

            <h3 style={{ margin: "0 0 10px", fontSize: "1.1rem", color: "#f8fafc", fontWeight: 900 }}>
              ▶️ {selectedVideo.title}
            </h3>

            {/* HTML5 Video Player */}
            <div style={{ borderRadius: "12px", overflow: "hidden", background: "#000", border: "1px solid #334155", marginBottom: "12px" }}>
              <video
                ref={mainPlayerRef}
                key={selectedVideo.videoUrl}
                src={selectedVideo.videoUrl}
                controls
                playsInline
                preload="metadata"
                style={{ width: "100%", maxHeight: "340px", display: "block" }}
              />
            </div>

            {/* Playback Speed & Teacher Info Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: "12px",
                padding: "8px 12px",
                background: "rgba(15, 23, 42, 0.8)",
                borderRadius: "8px"
              }}
            >
              <div style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
                👨‍🏫 Uploaded by: <strong style={{ color: "#fbbf24" }}>{selectedVideo.teacherName}</strong>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Speed:</span>
                {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => handlePlaybackSpeed(spd)}
                    style={{
                      padding: "2px 7px",
                      borderRadius: "4px",
                      border: playbackRate === spd ? "1px solid #38bdf8" : "1px solid #334155",
                      background: playbackRate === spd ? "rgba(56, 189, 248, 0.25)" : "transparent",
                      color: "#f8fafc",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Teacher Absence / Topic Study Note */}
            <div
              style={{
                padding: "12px",
                borderRadius: "10px",
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                marginBottom: "14px"
              }}
            >
              <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "#fbbf24", marginBottom: "4px" }}>
                📝 Teacher's Topic Introduction &amp; Class Study Guidance (In Teacher's Absence):
              </div>
              <div style={{ fontSize: "0.82rem", color: "#e2e8f0", lineHeight: 1.5 }}>
                {selectedVideo.absenceNote}
              </div>
            </div>

            {/* Student Action: Mark Video Watched & Send Question/Feedback to Teacher */}
            <form onSubmit={handleMarkWatchedAndComment} style={{ marginTop: "10px" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder={
                    isTeacher
                      ? "Add a follow-up teacher note or clarification for students..."
                      : "Ask a question or write what you learned from this topic video..."
                  }
                  value={studentCommentText}
                  onChange={(e) => setStudentCommentText(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: "200px",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #334155",
                    background: "#0f172a",
                    color: "#fff",
                    fontSize: "0.82rem"
                  }}
                />
                <button
                  type="submit"
                  disabled={submittingWatch}
                  style={{
                    background: "linear-gradient(135deg, #0284c7, #0369a1)",
                    color: "#fff",
                    border: "none",
                    padding: "9px 16px",
                    borderRadius: "8px",
                    fontWeight: 800,
                    fontSize: "0.8rem",
                    cursor: "pointer"
                  }}
                >
                  {isTeacher ? "💬 Post Teacher Note" : "✅ Mark Topic Watched & Send Feedback"}
                </button>
              </div>
            </form>

            {/* Student Watch List & Comments */}
            {((selectedVideo.watchedBy && selectedVideo.watchedBy.length > 0) ||
              (selectedVideo.studentComments && selectedVideo.studentComments.length > 0)) && (
                <div style={{ marginTop: "14px", borderTop: "1px solid rgba(148,163,184,0.18)", paddingTop: "10px" }}>
                  {selectedVideo.watchedBy && selectedVideo.watchedBy.length > 0 && (
                    <div style={{ fontSize: "0.74rem", color: "#34d399", marginBottom: "8px" }}>
                      <strong>✓ Watched by Students:</strong> {selectedVideo.watchedBy.join(", ")}
                    </div>
                  )}
                  {selectedVideo.studentComments && selectedVideo.studentComments.length > 0 && (
                    <div style={{ maxHeight: "120px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                      {selectedVideo.studentComments.map((cmt) => (
                        <div
                          key={cmt.id}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            background: "rgba(15, 23, 42, 0.9)",
                            border: "1px solid rgba(56, 189, 248, 0.2)",
                            fontSize: "0.76rem"
                          }}
                        >
                          <strong style={{ color: "#38bdf8" }}>{cmt.studentName}:</strong>{" "}
                          <span style={{ color: "#e2e8f0" }}>{cmt.comment}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
          </div>
        )}

        {/* Right Column: Class Topic Video Playlist */}
        <div
          style={{
            background: "rgba(2, 6, 23, 0.75)",
            border: "1px solid rgba(148, 163, 184, 0.25)",
            borderRadius: "14px",
            padding: "16px",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#38bdf8", fontWeight: 800 }}>
              🎞️ Class Platform Topic Videos ({filteredVideos.length})
            </h4>
            <input
              type="text"
              placeholder="Search topic or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #334155",
                background: "#0f172a",
                color: "#fff",
                fontSize: "0.76rem"
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "520px", overflowY: "auto" }}>
            {filteredVideos.map((vid) => {
              const isSelected = selectedVideo?.id === vid.id;
              return (
                <div
                  key={vid.id}
                  onClick={() => setSelectedVideo(vid)}
                  style={{
                    padding: "12px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    border: isSelected ? "2px solid #38bdf8" : "1px solid rgba(148, 163, 184, 0.2)",
                    background: isSelected ? "rgba(56, 189, 248, 0.14)" : "rgba(15, 23, 42, 0.75)",
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        color: "#fbbf24",
                        background: "rgba(245, 158, 11, 0.15)",
                        padding: "2px 8px",
                        borderRadius: "4px"
                      }}
                    >
                      {vid.subject} • {vid.className}
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{vid.durationLabel || "12 mins"}</span>
                  </div>

                  <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#f8fafc", marginBottom: "4px" }}>
                    ▶️ {vid.title}
                  </div>

                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "8px" }}>
                    👨‍🏫 {vid.teacherName} • 👁️ {vid.viewsCount || 0} views
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setSelectedVideo(vid);
                      }}
                      style={{
                        background: isSelected ? "#10b981" : "#0284c7",
                        color: "#fff",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        cursor: "pointer"
                      }}
                    >
                      {isSelected ? "🔊 Now Playing in Theater" : "▶️ Play & Watch Topic Video"}
                    </button>

                    {isTeacher && (
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          handleDeleteVideo(vid.id);
                        }}
                        style={{
                          background: "rgba(239, 68, 68, 0.2)",
                          color: "#fca5a5",
                          border: "1px solid rgba(239, 68, 68, 0.4)",
                          padding: "5px 10px",
                          borderRadius: "6px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        🗑️ Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
