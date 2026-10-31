import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/client/axios";
import "./AcademicManagementPage.css";

export default function AcademicManagementPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("classes"); // "classes" or "subjects"
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("ALL");

  // Modal State for Class
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [classForm, setClassForm] = useState({ name: "", code: "", gradeLevel: 10 });

  // Modal State for Subject
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "", classId: "" });

  // Seeding State
  const [seeding, setSeeding] = useState(false);

  const fetchAcademicData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [classRes, subRes] = await Promise.all([
        axiosInstance.get("/academics/classes"),
        axiosInstance.get("/academics/subjects")
      ]);

      if (classRes.data?.status === "success") {
        setClasses(classRes.data.data.classes || []);
      }
      if (subRes.data?.status === "success") {
        setSubjects(subRes.data.data.subjects || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load academic records from PostgreSQL.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicData();
  }, []);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // 1. CLASS HANDLERS
  const handleOpenCreateClass = () => {
    setEditingClass(null);
    setClassForm({ name: "", code: "", gradeLevel: 10 });
    setShowClassModal(true);
  };

  const handleOpenEditClass = (cls) => {
    setEditingClass(cls);
    setClassForm({ name: cls.name, code: cls.code, gradeLevel: cls.gradeLevel });
    setShowClassModal(true);
  };

  const handleSaveClass = async (e) => {
    e.preventDefault();
    try {
      if (editingClass) {
        const res = await axiosInstance.put(`/academics/classes/${editingClass.id}`, classForm);
        showNotification(res.data?.message || "Class updated successfully.");
      } else {
        const res = await axiosInstance.post("/academics/classes", classForm);
        showNotification(res.data?.message || "New class created successfully.");
      }
      setShowClassModal(false);
      await fetchAcademicData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save class.");
    }
  };

  const handleDeleteClass = async (cls) => {
    if (!window.confirm(`Are you sure you want to delete class '${cls.name}' (${cls.code})? All associated subjects will also be deleted.`)) {
      return;
    }
    try {
      const res = await axiosInstance.delete(`/academics/classes/${cls.id}`);
      showNotification(res.data?.message || "Class deleted successfully.");
      await fetchAcademicData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete class.");
    }
  };

  const handleSeedCurriculum = async () => {
    if (!window.confirm("Seed standard enterprise academic curriculum (Grade 9 to 12 with STEM and Humanities foundation)?")) {
      return;
    }
    try {
      setSeeding(true);
      const res = await axiosInstance.post("/academics/classes/seed-curriculum");
      showNotification(res.data?.message || "Standard curriculum seeded successfully!");
      await fetchAcademicData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to seed curriculum.");
    } finally {
      setSeeding(false);
    }
  };

  // 2. SUBJECT HANDLERS
  const handleOpenCreateSubject = (defaultClassId = "") => {
    setEditingSubject(null);
    setSubjectForm({
      name: "",
      code: "",
      classId: defaultClassId || (classes[0] ? String(classes[0].id) : "")
    });
    setShowSubjectModal(true);
  };

  const handleOpenEditSubject = (sub) => {
    setEditingSubject(sub);
    setSubjectForm({
      name: sub.name,
      code: sub.code,
      classId: String(sub.classId)
    });
    setShowSubjectModal(true);
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    try {
      if (editingSubject) {
        const res = await axiosInstance.put(`/academics/subjects/${editingSubject.id}`, subjectForm);
        showNotification(res.data?.message || "Subject updated successfully.");
      } else {
        const res = await axiosInstance.post("/academics/subjects", subjectForm);
        showNotification(res.data?.message || "Subject assigned to class successfully.");
      }
      setShowSubjectModal(false);
      await fetchAcademicData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save subject.");
    }
  };

  const handleDeleteSubject = async (sub) => {
    if (!window.confirm(`Delete subject '${sub.name}' (${sub.code})?`)) return;
    try {
      const res = await axiosInstance.delete(`/academics/subjects/${sub.id}`);
      showNotification(res.data?.message || "Subject deleted successfully.");
      await fetchAcademicData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete subject.");
    }
  };

  // Filtered views
  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass =
      selectedClassFilter === "ALL" || String(s.classId) === String(selectedClassFilter);
    return matchesSearch && matchesClass;
  });

  const totalClassesCount = classes.length;
  const totalSubjectsCount = subjects.length;
  const totalExamsCount = classes.reduce((sum, c) => sum + (c.exams?.length || 0), 0);

  return (
    <div className="academic-management-page">
      {/* Top Header */}
      <header className="academic-header-bar">
        <div className="nav-brand-container">
          <img src="/assets/gbs_crest_badge.jpg" alt="GBS Logo" className="nav-crest-img" />
          <div>
            <h1 className="nav-brand-title">GBS ACADEMIC DOMAIN SYSTEM</h1>
            <span className="nav-sub-title">CORE CURRICULUM, GRADE LEVELS, CLASSES & SUBJECTS</span>
          </div>
        </div>
        <div className="nav-actions">
          <button className="nav-back-btn" onClick={() => navigate("/portal/admin/dashboard")}>
            ← Back to Admin Portal
          </button>
        </div>
      </header>

      <main className="academic-main-content">
        {/* Photographic Hero Banner */}
        <section
          className="academic-hero-banner"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.75)), url('/assets/academic-records-bg.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="hero-text-block">
            <div className="hero-pill-badge">ACADEMIC EXCELLENCE • DAYTIME CAMPUS FACILITY</div>
            <h2>Classes, Grade Levels & Curriculum Subjects</h2>
            <p>
              Autonomous academic structuring, grade level allocation, subjects repository, and
              teacher syllabus mapping running on real PostgreSQL relational tables.
            </p>
          </div>
          <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", width: "240px", height: "135px", borderRadius: "14px", overflow: "hidden", border: "2px solid rgba(255, 255, 255, 0.25)", boxShadow: "0 10px 25px rgba(0, 0, 0, 0.6)" }}>
              <img src="/assets/virtual-classroom-bg.jpg" alt="Active Classroom Lab" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(15, 23, 42, 0.90)", padding: "4px 8px", fontSize: "0.7rem", fontWeight: 700, color: "#38bdf8", display: "flex", justifyContent: "space-between" }}>
                <span>📍 Active Science Hall</span>
                <span style={{ color: "#4ade80" }}>● Real Photo</span>
              </div>
            </div>
            <div className="hero-actions-block">
              <button
                className="seed-curriculum-btn"
                disabled={seeding}
                onClick={handleSeedCurriculum}
                title="Auto-generate standard Cambridge / AP grade levels and subjects"
              >
                {seeding ? "⚡ Seeding Curriculum..." : "⚡ Seed Standard STEM Curriculum"}
              </button>
              <button className="create-class-btn" onClick={handleOpenCreateClass}>
                + Create New Class
              </button>
            </div>
          </div>
        </section>

        {/* System Metric KPI Cards */}
        <div className="academic-kpi-grid">
          <div className="kpi-card blue">
            <span className="kpi-icon">🏫</span>
            <div>
              <div className="kpi-value">{totalClassesCount}</div>
              <div className="kpi-label">Active Classes / Cohorts</div>
            </div>
          </div>
          <div className="kpi-card green">
            <span className="kpi-icon">📚</span>
            <div>
              <div className="kpi-value">{totalSubjectsCount}</div>
              <div className="kpi-label">Curriculum Subjects</div>
            </div>
          </div>
          <div className="kpi-card purple">
            <span className="kpi-icon">📝</span>
            <div>
              <div className="kpi-value">{totalExamsCount}</div>
              <div className="kpi-label">Scheduled Exams</div>
            </div>
          </div>
          <div className="kpi-card orange">
            <span className="kpi-icon">🎓</span>
            <div>
              <div className="kpi-value">
                {classes.length > 0 ? `Grades ${Math.min(...classes.map(c => c.gradeLevel))} - ${Math.max(...classes.map(c => c.gradeLevel))}` : "Unconfigured"}
              </div>
              <div className="kpi-label">Academic Grade Span</div>
            </div>
          </div>
        </div>

        {/* Global Notifications Banner */}
        {successMsg && <div className="academic-success-banner">✅ {successMsg}</div>}
        {error && <div className="academic-error-banner">⚠️ {error}</div>}

        {/* Tabs & Controls Toolbar */}
        <div className="academic-tabs-bar">
          <div className="tabs-buttons-group">
            <button
              className={`tab-btn ${activeTab === "classes" ? "active" : ""}`}
              onClick={() => setActiveTab("classes")}
            >
              🏫 Classes & Cohorts ({classes.length})
            </button>
            <button
              className={`tab-btn ${activeTab === "subjects" ? "active" : ""}`}
              onClick={() => setActiveTab("subjects")}
            >
              📚 Curriculum Subjects ({subjects.length})
            </button>
          </div>

          <div className="search-filter-box">
            <input
              type="text"
              placeholder={activeTab === "classes" ? "Search classes by name or code..." : "Search subjects by name or code..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="academic-search-input"
            />
            {activeTab === "subjects" && (
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="class-filter-select"
              >
                <option value="ALL">All Classes / Grades</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* TAB 1: CLASSES VIEW */}
        {activeTab === "classes" && (
          <div className="classes-grid-container">
            {loading ? (
              <div className="loading-state">
                <span className="spinner-dot"></span> Loading live academic classes from PostgreSQL...
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🏫</span>
                <h3>No classes configured yet</h3>
                <p>Click "Seed Standard STEM Curriculum" or "+ Create New Class" to establish institutional grade streams.</p>
              </div>
            ) : (
              <div className="class-cards-grid">
                {filteredClasses.map((cls) => (
                  <div key={cls.id} className="class-card">
                    <div className="class-card-header">
                      <div>
                        <span className="grade-level-pill">Grade {cls.gradeLevel}</span>
                        <h3 className="class-name">{cls.name}</h3>
                      </div>
                      <span className="class-code-badge">{cls.code}</span>
                    </div>

                    <div className="class-card-stats">
                      <div className="stat-pill">
                        <span className="stat-num">{cls.subjects?.length || 0}</span>
                        <span className="stat-txt">Subjects</span>
                      </div>
                      <div className="stat-pill">
                        <span className="stat-num">{cls.exams?.length || 0}</span>
                        <span className="stat-txt">Exams</span>
                      </div>
                    </div>

                    <div className="class-subjects-preview">
                      <span className="preview-label">Curriculum Subjects:</span>
                      {cls.subjects && cls.subjects.length > 0 ? (
                        <div className="subject-tags-list">
                          {cls.subjects.map((sub) => (
                            <span key={sub.id} className="subject-tag">
                              {sub.name} <code className="sub-code">({sub.code})</code>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="no-subjects-text">No subjects assigned yet.</p>
                      )}
                    </div>

                    <div className="class-card-actions">
                      <button
                        className="add-sub-btn"
                        onClick={() => handleOpenCreateSubject(String(cls.id))}
                      >
                        + Add Subject
                      </button>
                      <button
                        className="edit-btn"
                        onClick={() => handleOpenEditClass(cls)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteClass(cls)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SUBJECTS VIEW */}
        {activeTab === "subjects" && (
          <div className="subjects-table-container">
            <div className="table-top-actions">
              <h3>All Curriculum Subjects Directory</h3>
              <button
                className="create-class-btn"
                onClick={() => handleOpenCreateSubject()}
                disabled={classes.length === 0}
              >
                + Create Subject
              </button>
            </div>

            {loading ? (
              <div className="loading-state">
                <span className="spinner-dot"></span> Loading subjects from PostgreSQL...
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📚</span>
                <h3>No subjects found</h3>
                <p>Create a subject or seed standard curriculum to populate.</p>
              </div>
            ) : (
              <table className="enterprise-academic-table">
                <thead>
                  <tr>
                    <th>Subject Name</th>
                    <th>Subject Code</th>
                    <th>Assigned Class</th>
                    <th>Grade Level</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubjects.map((sub) => (
                    <tr key={sub.id}>
                      <td>
                        <strong className="sub-table-name">{sub.name}</strong>
                      </td>
                      <td>
                        <code className="sub-code-cell">{sub.code}</code>
                      </td>
                      <td>
                        <span className="class-cell-badge">
                          {sub.class?.name || "Unassigned"} ({sub.class?.code})
                        </span>
                      </td>
                      <td>
                        <span className="grade-level-pill sm">
                          Grade {sub.class?.gradeLevel || "N/A"}
                        </span>
                      </td>
                      <td>
                        <span className="date-cell">
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td>
                        <div className="table-row-actions">
                          <button
                            className="edit-btn sm"
                            onClick={() => handleOpenEditSubject(sub)}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="delete-btn sm"
                            onClick={() => handleDeleteSubject(sub)}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: Create / Edit Class */}
      {showClassModal && (
        <div className="modal-backdrop" onClick={() => setShowClassModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingClass ? "✏️ Edit Academic Class" : "🏫 Create New Academic Class"}</h3>
              <button className="close-btn" onClick={() => setShowClassModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveClass} className="modal-form">
              <div className="form-group">
                <label>Class Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Grade 10 - Science & Technology"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Class Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. G10-SCI"
                    value={classForm.code}
                    onChange={(e) => setClassForm({ ...classForm, code: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group flex-1">
                  <label>Grade Level (1 to 12) *</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={classForm.gradeLevel}
                    onChange={(e) => setClassForm({ ...classForm, gradeLevel: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowClassModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  {editingClass ? "Save Changes" : "Create Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create / Edit Subject */}
      {showSubjectModal && (
        <div className="modal-backdrop" onClick={() => setShowSubjectModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingSubject ? "✏️ Edit Curriculum Subject" : "📚 Create & Assign Subject"}</h3>
              <button className="close-btn" onClick={() => setShowSubjectModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveSubject} className="modal-form">
              <div className="form-group">
                <label>Assigned Class / Cohort *</label>
                <select
                  value={subjectForm.classId}
                  onChange={(e) => setSubjectForm({ ...subjectForm, classId: e.target.value })}
                  required
                >
                  <option value="">Select Target Class...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code}) — Grade {c.gradeLevel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Subject Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Advanced Placement Physics C"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Subject Code *</label>
                <input
                  type="text"
                  placeholder="e.g. PHY-301"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowSubjectModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  {editingSubject ? "Save Subject" : "Assign Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
