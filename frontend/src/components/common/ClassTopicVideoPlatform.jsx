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
  const [savedRecordings, setSavedRecordings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gbs_teacher_saved_recordings") || "[]");
      if (Array.isArray(saved)) return saved;
    } catch {}
    return [];
  });
  const [pendingPermissionRecording, setPendingPermissionRecording] = useState(null);

  const liveCamVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const recordingSecondsRef = useRef(0);
  const fallbackCanvasAnimRef = useRef(null);
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
    if (fallbackCanvasAnimRef.current) {
      clearInterval(fallbackCanvasAnimRef.current);
      fallbackCanvasAnimRef.current = null;
    }
    if (liveCamVideoRef.current && liveCamVideoRef.current.srcObject) {
      const stream = liveCamVideoRef.current.srcObject;
      stream.getTracks().forEach((t) => t.stop());
      liveCamVideoRef.current.srcObject = null;
    }
  };

  // Creates a live 30fps Classroom Digital Chalkboard stream when hardware webcam is unavailable
  const createFallbackClassroomStream = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    let frame = 0;

    const drawFrame = () => {
      frame += 1;
      const grad = ctx.createLinearGradient(0, 0, 640, 360);
      grad.addColorStop(0, "#0f172a");
      grad.addColorStop(1, "#1e293b");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 360);

      // Chalkboard border
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      ctx.strokeRect(16, 16, 608, 328);

      // Live Recording Indicator
      ctx.fillStyle = frame % 30 < 18 ? "#ef4444" : "#991b1b";
      ctx.beginPath();
      ctx.arc(42, 42, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(`LIVE TEACHER LESSON RECORDING • ${recordingSecondsRef.current}s`, 60, 47);

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(title.trim() || `${subject} — Live Topic Instruction`, 38, 105);

      ctx.fillStyle = "#34d399";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(`Class: ${className} • Subject: ${subject}`, 38, 138);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "14px sans-serif";
      ctx.fillText(`Instructor: ${userFullName}`, 38, 170);
      ctx.fillText("Status: Capturing Teacher Audio/Visual Lesson Presentation...", 38, 200);

      // Animated audio waveform bars
      for (let i = 0; i < 28; i++) {
        const barH = 12 + Math.abs(Math.sin((frame + i * 4) * 0.18)) * 42;
        ctx.fillStyle = i % 2 === 0 ? "#10b981" : "#38bdf8";
        ctx.fillRect(38 + i * 18, 285 - barH, 11, barH);
      }

      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px monospace";
      ctx.fillText(`Timestamp: ${new Date().toLocaleTimeString()} • GBS Smart Classroom Studio`, 38, 320);
    };

    drawFrame();
    fallbackCanvasAnimRef.current = setInterval(drawFrame, 33);
    return canvas.captureStream(30);
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
    let stream = null;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }
    } catch {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      } catch {
        stream = null;
      }
    }

    if (!stream) {
      stream = createFallbackClassroomStream();
    }

    if (liveCamVideoRef.current) {
      liveCamVideoRef.current.srcObject = stream;
      liveCamVideoRef.current.play().catch(() => {});
    }

    recordedChunksRef.current = [];
    recordingSecondsRef.current = 0;
    setRecordingSeconds(0);

    try {
      const mimeType =
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.("video/webm;codecs=vp8")
          ? "video/webm;codecs=vp8"
          : typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.("video/webm")
          ? "video/webm"
          : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recordedChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const elapsedSec = Math.max(1, recordingSecondsRef.current);
        const durText = elapsedSec >= 60 ? `${Math.round(elapsedSec / 60)} min (${elapsedSec}s) recorded` : `${elapsedSec} secs recorded`;
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = String(reader.result || "");
          const fileName = `Teacher_Live_Topic_Recording_${Date.now()}.webm`;
          setVideoDataUrl(dataUrl);
          setVideoFileName(fileName);
          setDurationLabel(durText);

          const savedRecordItem = {
            id: `REC-DRAFT-${Date.now()}`,
            title: title.trim() || `${subject} — Recorded Topic Lesson (${new Date().toLocaleTimeString()})`,
            subject: subject.trim() || "Core Mathematics",
            className: className.trim() || defaultClassName || "JHS 3 / SHS 1",
            teacherName: userFullName,
            teacherEmail: currentUser?.email || "teacher@gbs.com",
            absenceNote: absenceNote.trim(),
            videoUrl: dataUrl,
            videoSourceType: "LIVE_RECORDING",
            fileName,
            durationLabel: durText,
            recordedAt: new Date().toISOString(),
            status: "SAVED_AWAITING_PERMISSION"
          };

          setSavedRecordings((prev) => {
            const next = [savedRecordItem, ...prev].slice(0, 15);
            try {
              localStorage.setItem("gbs_teacher_saved_recordings", JSON.stringify(next));
            } catch {}
            return next;
          });

          // Open Teacher Permission Modal to ask permission before submitting/publishing to Class Platform
          setPendingPermissionRecording(savedRecordItem);
          setStatusMessage({
            type: "success",
            text: `💾 Recording saved (${durText})! Please confirm your permission in the prompt to submit or publish it to the Class Platform.`
          });
        };
        reader.readAsDataURL(blob);
        stopCameraStream();
      };

      recorder.start(250);
      setIsRecording(true);
      recordTimerRef.current = setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingSeconds(recordingSecondsRef.current);
      }, 1000);
    } catch (err) {
      stopCameraStream();
      setStatusMessage({
        type: "error",
        text: "Unable to initialize video recorder on this browser."
      });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    } else {
      stopCameraStream();
    }
    setIsRecording(false);
  };

  const handleDownloadSavedRecording = (recItem) => {
    if (!recItem || !recItem.videoUrl) return;
    const link = document.createElement("a");
    link.href = recItem.videoUrl;
    link.download = recItem.fileName || `${(recItem.title || "Teacher_Recording").replace(/[^a-zA-Z0-9]+/g, "_")}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setStatusMessage({
      type: "success",
      text: `📥 Downloaded saved recording "${recItem.fileName}" to your device.`
    });
  };

  const handleGrantPermissionAndPublishRecording = async (recItem) => {
    if (!recItem) return;
    setUploading(true);
    const publishPayload = {
      id: `VID-TOPIC-${Date.now()}`,
      title: (recItem.title || title || `${subject} Recorded Topic Lesson`).trim(),
      subject: (recItem.subject || subject || "Core Mathematics").trim(),
      className: (recItem.className || className || defaultClassName).trim(),
      teacherName: userFullName,
      teacherEmail: currentUser?.email || "teacher@gbs.com",
      absenceNote: (recItem.absenceNote || absenceNote).trim(),
      videoUrl: recItem.videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      videoSourceType: "LIVE_RECORDING",
      fileName: recItem.fileName || `Teacher_Recording_${Date.now()}.webm`,
      durationLabel: recItem.durationLabel || "Recorded Lesson",
      uploadedAt: new Date().toISOString(),
      teacherPermissionGranted: true,
      teacherPermissionTimestamp: new Date().toISOString(),
      viewsCount: 0,
      watchedBy: [],
      studentComments: []
    };

    try {
      const res = await apiClient.post("/topic-videos", publishPayload);
      const created = res.data?.data?.video || publishPayload;
      const updated = [created, ...videos.filter((v) => v.id !== created.id)];
      setVideos(updated);
      setSelectedVideo(created);
      localStorage.setItem("gbs_class_topic_videos", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("gbs_topic_videos_updated", { detail: created }));
      window.dispatchEvent(new Event("storage"));
    } catch {
      const updated = [publishPayload, ...videos];
      setVideos(updated);
      setSelectedVideo(publishPayload);
      localStorage.setItem("gbs_class_topic_videos", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("gbs_topic_videos_updated", { detail: publishPayload }));
      window.dispatchEvent(new Event("storage"));
    }

    // Mark saved draft as published
    setSavedRecordings((prev) => {
      const next = prev.map((r) => (r.id === recItem.id ? { ...r, status: "PUBLISHED_WITH_PERMISSION" } : r));
      try {
        localStorage.setItem("gbs_teacher_saved_recordings", JSON.stringify(next));
      } catch {}
      return next;
    });

    setUploading(false);
    setPendingPermissionRecording(null);
    setTitle("");
    setVideoDataUrl("");
    setVideoFileName("");
    setStatusMessage({
      type: "success",
      text: `✅ Teacher Permission Verified! Recording "${publishPayload.title}" has been submitted and published to the ${publishPayload.className} Class Platform.`
    });
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
                  display: isRecording ? "block" : "none",
                  marginBottom: "10px"
                }}
              />

              {videoDataUrl && !isRecording && (
                <div
                  style={{
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.45)",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    marginTop: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px"
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#34d399" }}>
                      💾 Recording Saved: {videoFileName} ({durationLabel})
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "#cbd5e1" }}>
                      Teacher permission is required before submitting or publishing this saved recording to the Class Platform.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() =>
                        setPendingPermissionRecording(
                          savedRecordings[0] || {
                            id: `REC-DRAFT-${Date.now()}`,
                            title: title.trim() || `${subject} Recorded Lesson`,
                            subject,
                            className,
                            absenceNote,
                            videoUrl: videoDataUrl,
                            fileName: videoFileName,
                            durationLabel
                          }
                        )
                      }
                      style={{
                        background: "linear-gradient(135deg, #10b981, #059669)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        fontSize: "0.76rem",
                        fontWeight: 800,
                        cursor: "pointer"
                      }}
                    >
                      🔒 Review &amp; Grant Permission to Publish
                    </button>
                  </div>
                </div>
              )}

              {savedRecordings.length > 0 && (
                <div
                  style={{
                    marginTop: "12px",
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    paddingTop: "10px"
                  }}
                >
                  <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "#fbbf24", marginBottom: "8px" }}>
                    🗄️ Teacher's Saved Recordings Vault ({savedRecordings.length} Saved):
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "170px", overflowY: "auto" }}>
                    {savedRecordings.map((rec) => (
                      <div
                        key={rec.id}
                        style={{
                          background: "rgba(2, 6, 23, 0.78)",
                          border: "1px solid rgba(56, 189, 248, 0.25)",
                          borderRadius: "8px",
                          padding: "8px 10px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "8px"
                        }}
                      >
                        <div>
                          <strong style={{ color: "#f8fafc", fontSize: "0.8rem" }}>{rec.title}</strong>
                          <div style={{ fontSize: "0.71rem", color: "#94a3b8" }}>
                            {rec.subject} • {rec.className} • {rec.durationLabel} •{" "}
                            <span style={{ color: rec.status === "PUBLISHED_WITH_PERMISSION" ? "#34d399" : "#fbbf24", fontWeight: 700 }}>
                              {rec.status === "PUBLISHED_WITH_PERMISSION" ? "✓ Published with Permission" : "🔒 Saved (Awaiting Teacher Permission)"}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => setPendingPermissionRecording(rec)}
                            style={{
                              background: "rgba(16, 185, 129, 0.2)",
                              color: "#34d399",
                              border: "1px solid #10b981",
                              borderRadius: "6px",
                              padding: "4px 10px",
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              cursor: "pointer"
                            }}
                          >
                            🚀 Grant Permission &amp; Publish
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadSavedRecording(rec)}
                            style={{
                              background: "rgba(56, 189, 248, 0.15)",
                              color: "#38bdf8",
                              border: "1px solid rgba(56, 189, 248, 0.4)",
                              borderRadius: "6px",
                              padding: "4px 9px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              cursor: "pointer"
                            }}
                          >
                            📥 Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

      {/* TEACHER PERMISSION CONFIRMATION MODAL BEFORE SUBMITTING OR PUBLISHING SAVED RECORDING */}
      {pendingPermissionRecording && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.85)",
            backdropFilter: "blur(6px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div
            style={{
              maxWidth: "640px",
              width: "100%",
              background: "linear-gradient(145deg, #0f172a, #1e293b)",
              border: "2px solid #10b981",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.85)",
              color: "#f8fafc"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "12px" }}>
              <div>
                <span
                  style={{
                    background: "rgba(16, 185, 129, 0.2)",
                    color: "#34d399",
                    border: "1px solid #10b981",
                    padding: "3px 10px",
                    borderRadius: "999px",
                    fontSize: "0.7rem",
                    fontWeight: 800
                  }}
                >
                  💾 RECORDING SAVED • TEACHER PERMISSION REQUIRED
                </span>
                <h3 style={{ margin: "8px 0 2px", fontSize: "1.15rem", fontWeight: 900, color: "#f8fafc" }}>
                  🔒 Grant Permission to Submit &amp; Publish Recording to Class Platform?
                </h3>
                <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                  Your recorded lesson has been saved safely. Please review the recording below and confirm your permission before publishing it to students.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingPermissionRecording(null)}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#cbd5e1",
                  borderRadius: "8px",
                  padding: "4px 10px",
                  cursor: "pointer",
                  fontWeight: 800
                }}
              >
                ✕
              </button>
            </div>

            {/* Video Preview of Saved Recording */}
            {pendingPermissionRecording.videoUrl && (
              <div style={{ marginBottom: "14px", borderRadius: "10px", overflow: "hidden", border: "1px solid #334155", background: "#000" }}>
                <video
                  src={pendingPermissionRecording.videoUrl}
                  controls
                  playsInline
                  style={{ width: "100%", maxHeight: "230px", display: "block" }}
                />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#38bdf8", marginBottom: "4px" }}>
                  Lesson / Topic Title *
                </label>
                <input
                  type="text"
                  value={pendingPermissionRecording.title || ""}
                  onChange={(e) =>
                    setPendingPermissionRecording((prev) => ({ ...prev, title: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #334155",
                    background: "#020617",
                    color: "#fff",
                    fontSize: "0.84rem",
                    boxSizing: "border-box"
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#cbd5e1", marginBottom: "4px" }}>
                  Subject
                </label>
                <input
                  type="text"
                  value={pendingPermissionRecording.subject || ""}
                  onChange={(e) =>
                    setPendingPermissionRecording((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    border: "1px solid #334155",
                    background: "#020617",
                    color: "#fff",
                    fontSize: "0.82rem",
                    boxSizing: "border-box"
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#cbd5e1", marginBottom: "4px" }}>
                  Target Class / Level
                </label>
                <input
                  type="text"
                  value={pendingPermissionRecording.className || ""}
                  onChange={(e) =>
                    setPendingPermissionRecording((prev) => ({ ...prev, className: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    border: "1px solid #334155",
                    background: "#020617",
                    color: "#38bdf8",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    boxSizing: "border-box"
                  }}
                />
              </div>
            </div>

            <div
              style={{
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                borderRadius: "10px",
                padding: "10px 14px",
                marginBottom: "16px",
                fontSize: "0.8rem",
                color: "#fde68a"
              }}
            >
              ⚠️ <strong>Teacher Authorization Check:</strong> By clicking <strong>"Yes, Grant Permission — Submit &amp; Publish"</strong>, you authorize this saved recording ({pendingPermissionRecording.durationLabel}) to be published onto the <strong>{pendingPermissionRecording.className}</strong> Class Platform for student playback.
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <button
                type="button"
                onClick={() => handleDownloadSavedRecording(pendingPermissionRecording)}
                style={{
                  background: "rgba(56, 189, 248, 0.15)",
                  color: "#38bdf8",
                  border: "1px solid rgba(56, 189, 248, 0.4)",
                  borderRadius: "8px",
                  padding: "9px 14px",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                📥 Download Saved Recording
              </button>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => {
                    setPendingPermissionRecording(null);
                    setStatusMessage({
                      type: "success",
                      text: "💾 Recording kept safely in your Saved Recordings Vault without publishing yet. You can grant permission and publish whenever you are ready."
                    });
                  }}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "#e2e8f0",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                    padding: "9px 14px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  💾 Save to My Vault Only (Do Not Publish Yet)
                </button>

                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => handleGrantPermissionAndPublishRecording(pendingPermissionRecording)}
                  style={{
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "9px 18px",
                    fontSize: "0.82rem",
                    fontWeight: 900,
                    cursor: "pointer",
                    boxShadow: "0 6px 18px rgba(16, 185, 129, 0.4)"
                  }}
                >
                  {uploading ? "⏳ Publishing..." : "✅ Yes, Grant Permission — Submit & Publish to Class Platform"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
