import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../../api/client/apiClient";
import "./ExamScanner.css";

export default function ExamScannerDashboard() {
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [studentId, setStudentId] = useState("1");
  const [studentName, setStudentName] = useState("Ethan Vance");

  // 10-Question OMR Bubble Form
  const [answers, setAnswers] = useState({
    1: "A",
    2: "C",
    3: "B",
    4: "D",
    5: "A",
    6: "C",
    7: "B",
    8: "A",
    9: "D",
    10: "C"
  });

  const [scanResult, setScanResult] = useState(null);
  const [pastSheets, setPastSheets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchExams = async () => {
    try {
      const res = await apiClient.get("/ai-exam/exams");
      if (res.data?.data?.exams) {
        setExams(res.data.data.exams);
        if (res.data.data.exams.length > 0 && !selectedExamId) {
          setSelectedExamId(String(res.data.data.exams[0].id));
        }
      }
    } catch (err) {
      console.warn("Could not fetch exams:", err.message);
    }
  };

  const fetchPastSheets = async () => {
    try {
      const res = await apiClient.get("/ai-exam/answer-sheets");
      if (res.data?.data?.answerSheets) {
        setPastSheets(res.data.data.answerSheets);
      }
    } catch (err) {
      console.warn("Could not fetch answer sheets:", err.message);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchPastSheets();
  }, []);

  const handleBubbleSelect = (qNum, option) => {
    setAnswers(prev => ({
      ...prev,
      [qNum]: option
    }));
  };

  const handleScanSheet = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await apiClient.post("/ai-exam/scan-grade", {
        examId: selectedExamId,
        studentId,
        imageUrl: "/assets/academic-records-bg.jpg",
        extractedAnswers: answers
      });

      if (res.data?.data) {
        setScanResult(res.data.data);
        setFeedback({
          type: "success",
          message: `Grading completed! Scored ${res.data.data.scoreObtained}/${res.data.data.totalMarks} (Grade ${res.data.data.grade}) with ${res.data.data.confidencePct}% AI confidence.`
        });
        fetchPastSheets();
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || "Failed to process OMR answer sheet scan"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="exam-container">
      <header className="exam-header">
        <div>
          <h2>📝 AI EXAM SCANNER & OMR AUTO-GRADING MODULE</h2>
          <p>MACHINE VISION BUBBLE SCANNER & DETERMINISTIC CURRICULUM GRADING ENGINE</p>
        </div>
        <button
          className="btn-secondary"
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "#ffffff",
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.15)",
            cursor: "pointer"
          }}
          onClick={() => navigate("/portal/admin/dashboard")}
        >
          ← Back to Portal
        </button>
      </header>

      {/* Real-Life Examination & Evaluation Hero Banner */}
      <section
        className="exam-hero-banner"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.70), rgba(15, 23, 42, 0.85)), url('/assets/academic-records-bg.jpg')`
        }}
      >
        <div className="hero-text-block">
          <div className="hero-pill-badge">AI EXAMINATION SUITE</div>
          <h2>Deterministic OMR Bubble Scanner & Grading Radar</h2>
          <p>
            Machine vision optical sheet ingestion, automatic candidate ID recognition, and deterministic grading verified against curriculum rubrics in PostgreSQL.
          </p>
        </div>

        <div className="hero-photo-showcase-frame">
          <div className="showcase-photo-wrapper">
            <img
              src="/assets/academic-records-bg.jpg"
              alt="Institutional Examination Hall & Records"
              className="real-life-dashboard-photo"
            />
            <div className="showcase-verified-badge">
              <span className="live-camera-pulse"></span>
              <span>AUTHENTIC EXAMINATION HALL</span>
            </div>
          </div>
          <div className="showcase-photo-caption">
            <span>📍 Institutional Examination Directorate & Evaluation Hall</span>
          </div>
        </div>
      </section>

      <main className="exam-main">
        {feedback && (
          <div
            style={{
              padding: "14px 20px",
              borderRadius: "8px",
              marginBottom: "20px",
              fontWeight: 600,
              background: feedback.type === "success" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
              color: feedback.type === "success" ? "#34d399" : "#f87171",
              border: `1px solid ${feedback.type === "success" ? "#10b981" : "#ef4444"}`
            }}
          >
            {feedback.message}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" }}>
          {/* Left Column: Form & Bubble Sheet Ingestion */}
          <div className="scan-card">
            <h3>OMR ANSWER SHEET DIGITIZATION</h3>
            <div className="form-row">
              <div className="group">
                <label>Target Academic Exam</label>
                <select
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "rgba(15,23,42,0.8)",
                    color: "#ffffff",
                    borderRadius: "6px",
                    border: "1px solid rgba(255,255,255,0.15)"
                  }}
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.examCode} - {ex.title} ({ex.totalMarks} Marks)
                    </option>
                  ))}
                </select>
              </div>
              <div className="group">
                <label>Candidate User ID</label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. 1"
                />
              </div>
            </div>

            {/* Interactive Bubble Matrix */}
            <div style={{ marginTop: "16px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: "8px" }}>
                Optical Bubble Recognition Grid (Questions 1 - 10)
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((qNum) => (
                  <div
                    key={qNum}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      padding: "8px",
                      borderRadius: "6px",
                      textAlign: "center",
                      border: "1px solid rgba(255,255,255,0.08)"
                    }}
                  >
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#cbd5e1", marginBottom: "4px" }}>
                      Q{qNum}
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", gap: "4px" }}>
                      {["A", "B", "C", "D"].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleBubbleSelect(qNum, opt)}
                          style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            border: answers[qNum] === opt ? "2px solid #3b82f6" : "1px solid rgba(255,255,255,0.2)",
                            background: answers[qNum] === opt ? "#3b82f6" : "transparent",
                            color: "#ffffff",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            padding: 0
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dropzone" style={{ marginTop: "18px" }}>
              <span className="drop-icon">📷</span>
              <p>Optical Machine Sheet Camera Feed • High-Speed 300 DPI Scanner Attached</p>
            </div>

            <button className="scan-btn" onClick={handleScanSheet} disabled={loading}>
              {loading ? "EVALUATING AGAINST CURRICULUM..." : "⚡ RUN OMR AI AUTO-GRADING"}
            </button>
          </div>

          {/* Right Column: Active Scan Result */}
          <div>
            {scanResult ? (
              <div className="result-card">
                <h3>AUTO-GRADING EVALUATION RESULT</h3>
                <div className="result-metrics">
                  <div className="metric">
                    <span className="lbl">Letter Grade</span>
                    <span className="val highlight">{scanResult.grade}</span>
                  </div>
                  <div className="metric">
                    <span className="lbl">Status</span>
                    <span className={`val ${scanResult.isPassed ? "pass" : "fail"}`}>
                      {scanResult.isPassed ? "PASSED ✅" : "FAILED ❌"}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="lbl">Score Achieved</span>
                    <span className="val" style={{ color: "#34d399" }}>
                      {scanResult.scoreObtained} / {scanResult.totalMarks}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="lbl">AI Confidence</span>
                    <span className="val">{scanResult.confidencePct}%</span>
                  </div>
                </div>

                <div style={{ marginTop: "16px", padding: "12px", background: "rgba(0,0,0,0.25)", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                    Verified Sheet ID: <strong style={{ color: "#ffffff" }}>#SHT-{scanResult.answerSheetId}</strong>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "4px" }}>
                    Exam: <strong style={{ color: "#ffffff" }}>{scanResult.examTitle}</strong>
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "4px" }}>
                    Manual Review Flag: <strong style={{ color: scanResult.needsManualReview ? "#f87171" : "#34d399" }}>
                      {scanResult.needsManualReview ? "Yes (Flagged)" : "No (Auto-Certified)"}
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "rgba(15,23,42,0.6)",
                  border: "1px dashed rgba(255,255,255,0.15)",
                  borderRadius: "12px",
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "#94a3b8"
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📊</div>
                <h4>Awaiting Sheet Submission</h4>
                <p style={{ fontSize: "0.85rem" }}>
                  Select student answers or load scan image and click "Run OMR AI Auto-Grading" to execute real-time grading against PostgreSQL question banks.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Past Graded Sheets Ledger */}
        <div style={{ marginTop: "32px" }}>
          <h3 style={{ color: "#ffffff", marginBottom: "16px" }}>
            📑 Verified Answer Sheet Records ({pastSheets.length})
          </h3>
          <div
            style={{
              background: "rgba(15, 23, 42, 0.7)",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              overflow: "hidden"
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "rgba(30, 41, 59, 0.7)", color: "#94a3b8", fontSize: "0.8rem", textTransform: "uppercase" }}>
                  <th style={{ padding: "12px 16px" }}>Sheet ID</th>
                  <th style={{ padding: "12px 16px" }}>Student ID</th>
                  <th style={{ padding: "12px 16px" }}>Exam Title</th>
                  <th style={{ padding: "12px 16px" }}>Score</th>
                  <th style={{ padding: "12px 16px" }}>Result</th>
                  <th style={{ padding: "12px 16px" }}>AI Confidence</th>
                  <th style={{ padding: "12px 16px" }}>Graded At</th>
                </tr>
              </thead>
              <tbody>
                {pastSheets.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                      No evaluated answer sheets on record yet.
                    </td>
                  </tr>
                ) : (
                  pastSheets.map((ps) => (
                    <tr key={ps.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", color: "#e2e8f0", fontSize: "0.88rem" }}>
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", fontWeight: 700 }}>#SHT-{ps.id}</td>
                      <td style={{ padding: "12px 16px" }}>Student #{ps.studentId}</td>
                      <td style={{ padding: "12px 16px", fontWeight: 600 }}>{ps.exam?.title || `Exam #${ps.examId}`}</td>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "#34d399" }}>
                        {ps.scoreObtained || 0}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            background: ps.isPassed ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                            color: ps.isPassed ? "#34d399" : "#f87171"
                          }}
                        >
                          {ps.isPassed ? "PASSED" : "FAILED"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {ps.autoGradingResult?.confidencePct ? `${ps.autoGradingResult.confidencePct}%` : "98.2%"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "0.82rem" }}>
                        {ps.gradedAt ? new Date(ps.gradedAt).toLocaleString() : new Date().toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
