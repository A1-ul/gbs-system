import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/client/axios";
import "./TimetableDashboard.css";

const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const PERIOD_TIMES = [
  { start: "08:30", end: "09:30", label: "Period 1 (08:30 - 09:30)" },
  { start: "09:45", end: "10:45", label: "Period 2 (09:45 - 10:45)" },
  { start: "11:00", end: "12:00", label: "Period 3 (11:00 - 12:00)" },
  { start: "13:00", end: "14:00", label: "Period 4 (13:00 - 14:00)" },
  { start: "14:15", end: "15:15", label: "Period 5 (14:15 - 15:15)" }
];

export default function TimetableDashboard() {
  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [slots, setSlots] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal State for Slot
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [slotForm, setSlotForm] = useState({
    classId: "",
    subjectId: "",
    teacherId: "",
    dayOfWeek: "MONDAY",
    startTime: "08:30",
    endTime: "09:30",
    roomNumber: "Room 101",
    overrideConflict: false
  });

  // Real-time conflict feedback
  const [conflictReport, setConflictReport] = useState({ hasConflict: false, conflicts: [] });
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);
  const [seedingWeekly, setSeedingWeekly] = useState(false);

  // Load classes and teachers
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [clsRes, userRes] = await Promise.all([
          axiosInstance.get("/academics/classes"),
          axiosInstance.get("/users?role=TEACHER")
        ]);

        const fetchedClasses = clsRes.data?.data?.classes || [];
        setClasses(fetchedClasses);
        setTeachers(userRes.data?.data?.users || []);

        if (fetchedClasses.length > 0) {
          const firstClassId = String(fetchedClasses[0].id);
          setSelectedClassId(firstClassId);
          await fetchSlotsForClass(firstClassId);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to initialize timetable resources.");
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  const fetchSlotsForClass = async (classId) => {
    try {
      const res = await axiosInstance.get(`/timetables/slots?classId=${classId}`);
      if (res.data?.status === "success") {
        setSlots(res.data.data.slots || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load class schedule slots.");
    }
  };

  const handleClassChange = async (e) => {
    const cid = e.target.value;
    setSelectedClassId(cid);
    await fetchSlotsForClass(cid);
  };

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Pre-check conflict dynamically
  useEffect(() => {
    if (!showSlotModal || !slotForm.classId || !slotForm.startTime || !slotForm.endTime) {
      return;
    }

    const checkTimer = setTimeout(async () => {
      try {
        setCheckingConflict(true);
        const excludeParam = editingSlot ? `?excludeSlotId=${editingSlot.id}` : "";
        const res = await axiosInstance.post(`/timetables/check-conflicts${excludeParam}`, slotForm);
        if (res.data?.status === "success") {
          setConflictReport(res.data.data || { hasConflict: false, conflicts: [] });
        }
      } catch {
        // silent fail on draft pre-check
      } finally {
        setCheckingConflict(false);
      }
    }, 300);

    return () => clearTimeout(checkTimer);
  }, [
    showSlotModal,
    slotForm.classId,
    slotForm.teacherId,
    slotForm.roomNumber,
    slotForm.dayOfWeek,
    slotForm.startTime,
    slotForm.endTime,
    editingSlot
  ]);

  const handleOpenCreateSlot = (day = "MONDAY", startTime = "08:30", endTime = "09:30") => {
    setEditingSlot(null);
    const selectedClass = classes.find((c) => String(c.id) === String(selectedClassId));
    const firstSubjectId = selectedClass?.subjects?.[0] ? String(selectedClass.subjects[0].id) : "";

    setSlotForm({
      classId: selectedClassId,
      subjectId: firstSubjectId,
      teacherId: teachers[0] ? String(teachers[0].id) : "",
      dayOfWeek: day,
      startTime,
      endTime,
      roomNumber: "Room 101",
      overrideConflict: false
    });
    setConflictReport({ hasConflict: false, conflicts: [] });
    setShowSlotModal(true);
  };

  const handleOpenEditSlot = (slot) => {
    setEditingSlot(slot);
    setSlotForm({
      classId: String(slot.classId),
      subjectId: String(slot.subjectId),
      teacherId: slot.teacherId ? String(slot.teacherId) : "",
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      roomNumber: slot.roomNumber,
      overrideConflict: false
    });
    setConflictReport({ hasConflict: false, conflicts: [] });
    setShowSlotModal(true);
  };

  const handleSaveSlot = async (e) => {
    e.preventDefault();
    try {
      setSavingSlot(true);
      if (editingSlot) {
        const res = await axiosInstance.put(`/timetables/slots/${editingSlot.id}`, slotForm);
        showNotification(res.data?.message || "Slot updated successfully.");
      } else {
        const res = await axiosInstance.post("/timetables/slots", slotForm);
        showNotification(res.data?.message || "Class timetable slot scheduled successfully.");
      }
      setShowSlotModal(false);
      await fetchSlotsForClass(selectedClassId);
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.conflicts) {
        setConflictReport({
          hasConflict: true,
          conflicts: err.response.data.conflicts
        });
      } else {
        alert(err.response?.data?.message || "Failed to schedule slot.");
      }
    } finally {
      setSavingSlot(false);
    }
  };

  const handleDeleteSlot = async (slot) => {
    if (!window.confirm(`Delete timetable slot on ${slot.dayOfWeek} (${slot.startTime}-${slot.endTime})?`)) return;
    try {
      const res = await axiosInstance.delete(`/timetables/slots/${slot.id}`);
      showNotification(res.data?.message || "Timetable slot deleted.");
      await fetchSlotsForClass(selectedClassId);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete slot.");
    }
  };

  const handleSeedWeekly = async () => {
    if (!selectedClassId) return;
    const selectedClass = classes.find((c) => String(c.id) === String(selectedClassId));
    if (!window.confirm(`Auto-generate weekly collision-free timetable for '${selectedClass?.name}' using institutional curriculum?`)) {
      return;
    }
    try {
      setSeedingWeekly(true);
      const res = await axiosInstance.post(`/timetables/seed-weekly/${selectedClassId}`);
      showNotification(res.data?.message || "Weekly timetable generated successfully!");
      await fetchSlotsForClass(selectedClassId);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to auto-generate weekly timetable.");
    } finally {
      setSeedingWeekly(false);
    }
  };

  // Find slot for a specific day and time period
  const getSlotForPeriod = (day, period) => {
    return slots.find(
      (s) =>
        s.dayOfWeek === day &&
        s.startTime === period.start
    );
  };

  const currentClass = classes.find((c) => String(c.id) === String(selectedClassId));
  const availableSubjects = currentClass?.subjects || [];

  return (
    <div className="timetable-dashboard-page">
      {/* Top Header */}
      <header className="timetable-header-bar">
        <div className="nav-brand-container">
          <img src="/assets/gbs_crest_badge.jpg" alt="GBS Logo" className="nav-crest-img" />
          <div>
            <h1 className="nav-brand-title">GBS TIMETABLE & SCHEDULING ENGINE</h1>
            <span className="nav-sub-title">DYNAMIC CONFLICT DETECTION & WEEKLY MASTER SCHEDULE</span>
          </div>
        </div>
        <div className="nav-actions">
          <button className="nav-back-btn" onClick={() => navigate("/academic/classes")}>
            🏫 Classes & Subjects
          </button>
          <button className="nav-back-btn" onClick={() => navigate("/portal/admin/dashboard")}>
            ← Admin Portal
          </button>
        </div>
      </header>

      <main className="timetable-main-content">
        {/* Photographic Real-Life Hero Banner */}
        <section
          className="timetable-hero-banner"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.60), rgba(15, 23, 42, 0.75)), url('/assets/virtual-classroom-bg.jpg')`
          }}
        >
          <div className="hero-text-block">
            <div className="hero-pill-badge">TIMETABLE SCHEDULER</div>
            <h2>Weekly Academic Schedule & Collision Engine</h2>
            <p>
              Mathematical overlap detection for Teacher Collisions, Classroom/Lab double-bookings,
              and Cohort schedule overlaps running live on PostgreSQL.
            </p>
            <div className="hero-actions-block" style={{ marginTop: "16px" }}>
              <button
                className="seed-weekly-btn"
                disabled={seedingWeekly || !selectedClassId}
                onClick={handleSeedWeekly}
                title="Automatically populate a collision-free Monday-Friday schedule"
              >
                {seedingWeekly ? "⚡ Generating Schedule..." : "⚡ Auto-Generate Weekly Timetable"}
              </button>
              <button
                className="add-slot-launch-btn"
                disabled={!selectedClassId}
                onClick={() => handleOpenCreateSlot()}
              >
                + Schedule Period Slot
              </button>
            </div>
          </div>
          
          <div className="hero-photo-showcase-frame">
            <div className="showcase-photo-wrapper">
              <img
                src="/assets/virtual-classroom-bg.jpg"
                alt="Active Academic Lecture Hall"
                className="real-life-dashboard-photo"
              />
              <div className="showcase-verified-badge">
                <span className="live-camera-pulse"></span>
                <span>REAL-LIFE CAMPUS VIEW</span>
              </div>
            </div>
            <div className="showcase-photo-caption">
              <span>📍 Academic Lecture Hall & STEM Laboratories • Verified Daylight View</span>
            </div>
          </div>
        </section>

        {/* System Metric KPI Cards */}
        <div className="timetable-kpi-grid">
          <div className="kpi-card blue">
            <span className="kpi-icon">⏱️</span>
            <div>
              <div className="kpi-value">{slots.length} Periods</div>
              <div className="kpi-label">Scheduled This Week</div>
            </div>
          </div>
          <div className="kpi-card green">
            <span className="kpi-icon">🏫</span>
            <div>
              <div className="kpi-value">{classes.length} Cohorts</div>
              <div className="kpi-label">Active Academic Classes</div>
            </div>
          </div>
          <div className="kpi-card purple">
            <span className="kpi-icon">👨‍🏫</span>
            <div>
              <div className="kpi-value">{teachers.length} Teachers</div>
              <div className="kpi-label">Faculty Resource Pool</div>
            </div>
          </div>
          <div className="kpi-card orange">
            <span className="kpi-icon">🛡️</span>
            <div>
              <div className="kpi-value">Active Guard</div>
              <div className="kpi-label">Zero-Collision Detection</div>
            </div>
          </div>
        </div>

        {/* Global Notifications */}
        {successMsg && <div className="timetable-success-banner">✅ {successMsg}</div>}
        {error && <div className="timetable-error-banner">⚠️ {error}</div>}

        {/* Class Selection & Filter Toolbar */}
        <div className="timetable-controls-bar">
          <div className="cohort-select-group">
            <label className="control-label">Active Academic Cohort:</label>
            <select
              value={selectedClassId}
              onChange={handleClassChange}
              className="cohort-select-input"
            >
              {classes.length === 0 ? (
                <option value="">No classes configured yet</option>
              ) : (
                classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) — Grade {c.gradeLevel}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="timetable-cohort-badge">
            <span className="badge-label">Active Stream:</span>
            <strong className="badge-value">{currentClass?.name || "Select Cohort"}</strong>
            <span className="badge-code">({currentClass?.code || "N/A"})</span>
          </div>
        </div>

        {/* Interactive Master Weekly Timetable Grid */}
        <div className="timetable-grid-wrapper">
          {loading ? (
            <div className="timetable-loading">
              <span className="spinner-dot"></span> Loading real-time weekly schedule from PostgreSQL...
            </div>
          ) : classes.length === 0 ? (
            <div className="timetable-empty">
              <span className="empty-icon">🏫</span>
              <h3>No Academic Classes Found</h3>
              <p>Please establish institutional classes in the Academic Domain module first.</p>
              <button
                className="add-slot-launch-btn"
                onClick={() => navigate("/academic/classes")}
              >
                Go to Academic Classes
              </button>
            </div>
          ) : (
            <table className="master-timetable-table">
              <thead>
                <tr>
                  <th className="period-time-header">Time / Period</th>
                  {DAYS_OF_WEEK.map((day) => (
                    <th key={day} className="day-header">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIOD_TIMES.map((period, pIdx) => (
                  <tr key={pIdx}>
                    <td className="period-label-cell">
                      <strong className="period-time-range">{period.start} - {period.end}</strong>
                      <span className="period-name">Period {pIdx + 1}</span>
                    </td>

                    {DAYS_OF_WEEK.map((day) => {
                      const slot = getSlotForPeriod(day, period);
                      return (
                        <td key={day} className="slot-grid-cell">
                          {slot ? (
                            <div className="active-slot-card">
                              <div className="slot-card-top">
                                <span className="slot-subject-code">{slot.subject?.code}</span>
                                <span className="slot-room-badge">{slot.roomNumber}</span>
                              </div>
                              <h4 className="slot-subject-name">{slot.subject?.name}</h4>
                              <div className="slot-teacher-info">
                                👨‍🏫 {slot.teacher ? `${slot.teacher.firstName} ${slot.teacher.lastName}` : "Faculty Assigned"}
                              </div>
                              <div className="slot-card-actions">
                                <button
                                  className="slot-edit-btn"
                                  onClick={() => handleOpenEditSlot(slot)}
                                  title="Edit Slot"
                                >
                                  ✏️
                                </button>
                                <button
                                  className="slot-delete-btn"
                                  onClick={() => handleDeleteSlot(slot)}
                                  title="Delete Slot"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              className="empty-slot-placeholder"
                              onClick={() => handleOpenCreateSlot(day, period.start, period.end)}
                              title={`Schedule on ${day} at ${period.start}`}
                            >
                              + Schedule
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* MODAL: Schedule / Edit Timetable Period Slot */}
      {showSlotModal && (
        <div className="modal-backdrop" onClick={() => !savingSlot && setShowSlotModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingSlot ? "✏️ Edit Timetable Period" : "⏱️ Schedule Timetable Period"}</h3>
              <button
                className="close-btn"
                disabled={savingSlot}
                onClick={() => setShowSlotModal(false)}
              >
                ✕
              </button>
            </div>

            {/* LIVE CONFLICT DETECTION BANNER */}
            {conflictReport.hasConflict && (
              <div className="conflict-alert-banner">
                <div className="conflict-banner-header">
                  <span className="alert-icon">🚨</span>
                  <h4>COLLISION DETECTED ({conflictReport.conflictCount})</h4>
                </div>
                <div className="conflict-items-list">
                  {conflictReport.conflicts.map((c, i) => (
                    <div key={i} className="conflict-item">
                      <strong>[{c.type}]</strong> {c.message}
                    </div>
                  ))}
                </div>
                <label className="override-checkbox-label">
                  <input
                    type="checkbox"
                    checked={slotForm.overrideConflict}
                    onChange={(e) =>
                      setSlotForm({ ...slotForm, overrideConflict: e.target.checked })
                    }
                  />
                  <span>Administrator Override: Force book despite detected conflict</span>
                </label>
              </div>
            )}

            <form onSubmit={handleSaveSlot} className="modal-form">
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Academic Class / Cohort *</label>
                  <select
                    value={slotForm.classId}
                    onChange={(e) =>
                      setSlotForm({ ...slotForm, classId: e.target.value })
                    }
                    required
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label>Curriculum Subject *</label>
                  <select
                    value={slotForm.subjectId}
                    onChange={(e) =>
                      setSlotForm({ ...slotForm, subjectId: e.target.value })
                    }
                    required
                  >
                    <option value="">Select Subject...</option>
                    {availableSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Assigned Faculty / Teacher</label>
                  <select
                    value={slotForm.teacherId}
                    onChange={(e) =>
                      setSlotForm({ ...slotForm, teacherId: e.target.value })
                    }
                  >
                    <option value="">Select Faculty Member...</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.firstName} {t.lastName} ({t.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label>Classroom / Lab Location *</label>
                  <input
                    type="text"
                    placeholder="e.g. Science Lab 2, Room 301"
                    value={slotForm.roomNumber}
                    onChange={(e) =>
                      setSlotForm({ ...slotForm, roomNumber: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Day of Week *</label>
                  <select
                    value={slotForm.dayOfWeek}
                    onChange={(e) =>
                      setSlotForm({ ...slotForm, dayOfWeek: e.target.value })
                    }
                    required
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label>Start Time (HH:MM) *</label>
                  <input
                    type="time"
                    value={slotForm.startTime}
                    onChange={(e) =>
                      setSlotForm({ ...slotForm, startTime: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group flex-1">
                  <label>End Time (HH:MM) *</label>
                  <input
                    type="time"
                    value={slotForm.endTime}
                    onChange={(e) =>
                      setSlotForm({ ...slotForm, endTime: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              {checkingConflict && (
                <div className="conflict-checking-indicator">
                  <span className="spinner-dot"></span> Checking mathematical time overlap collisions...
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  disabled={savingSlot}
                  onClick={() => setShowSlotModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="save-btn"
                  disabled={
                    savingSlot ||
                    (conflictReport.hasConflict && !slotForm.overrideConflict)
                  }
                >
                  {savingSlot ? "Saving Slot..." : editingSlot ? "Save Changes" : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
