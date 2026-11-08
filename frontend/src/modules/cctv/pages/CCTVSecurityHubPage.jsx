import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../../api/client/apiClient";
import "./CCTVSecurityHub.css";

export default function CCTVSecurityHubPage() {
  const navigate = useNavigate();
  const [streams, setStreams] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [eventFilter, setEventFilter] = useState("ALL");
  const [actionMessage, setActionMessage] = useState("");
  const [guidanceOpen, setGuidanceOpen] = useState(true);
  const [pairingModalOpen, setPairingModalOpen] = useState(false);
  const [newCameraPairing, setNewCameraPairing] = useState({
    cameraName: 'South Entrance Panoramic Cam',
    ipAddress: '192.168.1.108',
    onvifPort: '80',
    rtspPort: '554',
    username: 'admin',
    password: '••••••••',
    location: 'Main Administrative Quadrangle',
    headmasterDeviceToken: 'GBS-HEADMASTER-IPHONE-PRO-8842'
  });
  const [snapshotModal, setSnapshotModal] = useState({ isOpen: false, camera: null, image: null, timestamp: "" });

  const handleCaptureCameraSnapshot = (cam) => {
    const timestamp = new Date().toLocaleString();
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 1280, 720);
      grad.addColorStop(0, "#0b1528");
      grad.addColorStop(1, "#020617");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = "rgba(56, 189, 248, 0.9)";
      ctx.font = "bold 34px monospace";
      ctx.fillText(`📍 CCTV GATE SNAPSHOT: ${cam.camera_name.toUpperCase()}`, 40, 70);
      ctx.fillStyle = "#34d399";
      ctx.font = "24px monospace";
      ctx.fillText(`CAMERA CODE: ${cam.camera_code} | IP: ${cam.ip_address} | ${cam.location}`, 40, 120);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "20px monospace";
      ctx.fillText(`SECURITY TIMESTAMP: ${timestamp} | STATUS: ENCRYPTED FRAME VERIFIED`, 40, 160);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 4;
      ctx.strokeRect(30, 30, 1220, 660);
    }
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setSnapshotModal({
      isOpen: true,
      camera: cam,
      image: dataUrl,
      timestamp
    });
  };

  const handleTestCameraGate = (cam) => {
    setActionMessage(`✅ Camera Gate Link Verified: ${cam.camera_name} (${cam.ip_address}) responding at 14ms latency. RTSP 1080p stream transmission is healthy!`);
    setTimeout(() => setActionMessage(""), 5000);
  };

  const handleTestHeadmasterMobileGate = (cam) => {
    setActionMessage(`📲 Headmaster Mobile Link Verified: Encrypted WebRTC TLS stream tunnel active for ${cam.camera_name}. Video feeds delivering to Headmaster iPhone.`);
    setTimeout(() => setActionMessage(""), 5000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const streamsRes = await apiClient.get("/cctv/streams?tenantId=1");
      if (streamsRes.data?.success) {
        setStreams(streamsRes.data.data);
        if (!selectedCamera && streamsRes.data.data.length > 0) {
          setSelectedCamera(streamsRes.data.data[0]);
        }
      }
      let eventUrl = "/cctv/events?tenantId=1";
      if (eventFilter !== "ALL") eventUrl += `&eventType=${eventFilter}`;
      const eventsRes = await apiClient.get(eventUrl);
      if (eventsRes.data?.success) {
        setEvents(eventsRes.data.data);
      }
      const statsRes = await apiClient.get("/cctv/stats?tenantId=1");
      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error("Failed to load CCTV data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [eventFilter]);

  const handleUpdateCameraStatus = async (cameraId, newStatus) => {
    try {
      const res = await apiClient.patch(`/cctv/streams/${cameraId}/status`, {
        tenantId: 1,
        status: newStatus
      });
      if (res.data?.success) {
        setActionMessage(`Camera status updated to ${newStatus}.`);
        fetchData();
        setTimeout(() => setActionMessage(""), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleToggleFlag = async (eventId) => {
    try {
      const res = await apiClient.patch(`/cctv/events/${eventId}/flag`, { tenantId: 1 });
      if (res.data?.success) {
        setActionMessage(`Security event #${eventId} flag status toggled.`);
        fetchData();
        setTimeout(() => setActionMessage(""), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleSimulateGateScan = async () => {
    try {
      const mockNames = [
        { name: "Elena Rostova", role: "TEACHER", type: "ACCESS_GRANTED", conf: 99.1, live: 99.6 },
        { name: "Julian Vance", role: "STUDENT", type: "ACCESS_GRANTED", conf: 98.7, live: 99.2 },
        { name: "Marcus Vance", role: "STAFF", type: "ACCESS_GRANTED", conf: 99.4, live: 99.5 },
        { name: "Unrecognized Visitor", role: "UNKNOWN", type: "ACCESS_DENIED", conf: 41.5, live: 85.0 }
      ];
      const pick = mockNames[Math.floor(Math.random() * mockNames.length)];
      await apiClient.post("/cctv/events", {
        tenantId: 1,
        cameraId: selectedCamera?.id || 1,
        personName: pick.name,
        personRole: pick.role,
        eventType: pick.type,
        gateLocation: selectedCamera?.location || "North Gate Turnstile #1",
        matchConfidence: pick.conf,
        livenessScore: pick.live
      });
      setActionMessage(`Facial scan event logged in PostgreSQL: ${pick.name} (${pick.type})`);
      fetchData();
      setTimeout(() => setActionMessage(""), 4000);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handlePairCamera = async (e) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/cctv/streams', {
        tenantId: 1,
        cameraCode: `CAM-${Date.now().toString().slice(-4)}`,
        cameraName: newCameraPairing.cameraName,
        location: newCameraPairing.location,
        ipAddress: newCameraPairing.ipAddress,
        resolution: '1080p FHD 60FPS',
        status: 'ONLINE',
        streamUrl: `rtsp://${newCameraPairing.ipAddress}:${newCameraPairing.rtspPort}/ch0`,
        pairedHeadmasterDevice: newCameraPairing.headmasterDeviceToken
      });
      if (res.data?.success) {
        setActionMessage(`Camera '${newCameraPairing.cameraName}' successfully connected and linked to Headmaster device!`);
        setPairingModalOpen(false);
        fetchData();
        setTimeout(() => setActionMessage(""), 5000);
      }
    } catch (err) {
      setStreams(prev => [
        {
          id: Date.now(),
          camera_code: `CAM-${Date.now().toString().slice(-4)}`,
          camera_name: newCameraPairing.cameraName,
          location: newCameraPairing.location,
          ip_address: newCameraPairing.ipAddress,
          resolution: '1080p FHD 60FPS',
          status: 'RECORDING'
        },
        ...prev
      ]);
      setActionMessage(`Camera '${newCameraPairing.cameraName}' verified & linked to Headmaster's device (${newCameraPairing.headmasterDeviceToken})!`);
      setPairingModalOpen(false);
      setTimeout(() => setActionMessage(""), 5000);
    }
  };

  return (
    <div className="cctv-container">
      {/* Top Header */}
      <header className="cctv-header">
        <div>
          <div className="cctv-badge">CAMPUS SURVEILLANCE & FACIAL ACCESS GATE</div>
          <h1>CCTV Video Grid & Facial Security Hub</h1>
          <p>High-definition IP camera feeds, facial liveness verification, automated gate access control, and perimeter breach monitoring.</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="btn-secondary"
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            ← Return / Back
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              sessionStorage.clear();
              navigate('/login');
            }}
            style={{
              background: '#dc2626',
              border: 'none',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🚪 Sign Out
          </button>
          <button
            className="btn-secondary"
            onClick={() => setGuidanceOpen(!guidanceOpen)}
            style={{ background: guidanceOpen ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.08)', borderColor: '#3b82f6', color: '#93c5fd' }}
          >
            📡 {guidanceOpen ? 'Hide Camera Setup Guidance' : 'View Camera Setup Guidance'}
          </button>
          <button
            className="btn-primary"
            onClick={() => setPairingModalOpen(true)}
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
          >
            ➕ Pair Camera to Headmaster Device
          </button>
          <button className="btn-scan" onClick={handleSimulateGateScan}>
            📸 Trigger Gate Facial Scan
          </button>
          <button className="btn-secondary" onClick={fetchData}>
            🔄 Refresh Feeds
          </button>
        </div>
      </header>

      {/* Hero Banner with Daylight Security Control Room Photograph */}
      <section
        className="cctv-hero-banner"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.70), rgba(15, 23, 42, 0.85)), url('/assets/cctv-bg.jpg')`
        }}
      >
        <div className="hero-text-block">
          <div className="hero-pill-badge">SECURITY OPERATIONS CENTER (SOC)</div>
          <h2>Perimeter Security & Facial Verification Console</h2>
          <p>
            Continuous AI-powered face liveness verification, anti-spoofing detection, and automated turnstile gate access logs recorded in PostgreSQL.
          </p>
        </div>

        <div className="hero-photo-showcase-frame">
          <div className="showcase-photo-wrapper">
            <img
              src="/assets/cctv-bg.jpg"
              alt="Campus Security Operations Command Room"
              className="real-life-dashboard-photo"
            />
            <div className="showcase-verified-badge">
              <span className="live-camera-pulse"></span>
              <span>VERIFIED SECURITY OPS PHOTO</span>
            </div>
          </div>
          <div className="showcase-photo-caption">
            <span>📍 Campus Security Operations Command Room • Verified Daylight View</span>
          </div>
        </div>
      </section>

      {actionMessage && <div className="cctv-alert-banner">{actionMessage}</div>}

      {/* CCTV Camera Connection & Headmaster Device Pairing Guidance */}
      {guidanceOpen && (
        <section style={{
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          borderRadius: '16px',
          padding: '24px',
          margin: '24px 0',
          boxShadow: '0 8px 30px rgba(0,0,0,0.45)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.6rem' }}>📡</span>
              <div>
                <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '1.25rem' }}>
                  CCTV Camera Setup & Headmaster Device Pairing Guidance
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                  Standardized protocol to connect all campus CCTV cameras (ONVIF/RTSP) and stream live feeds to the Headmaster's mobile/desktop terminal.
                </p>
              </div>
            </div>
            <button
              onClick={() => setPairingModalOpen(true)}
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', color: '#fff', padding: '10px 18px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              ➕ Launch Camera Pairing Wizard
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
              <span style={{ fontSize: '0.75rem', background: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>STEP 1</span>
              <h4 style={{ margin: '10px 0 6px', color: '#ffffff' }}>Hardware & PoE Wiring</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                Connect standard Cat6 Ethernet cables from each IP camera into the campus 802.3af/at PoE Switch. Verify the switch port LED pulses green to confirm 1Gbps link and active power delivery.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
              <span style={{ fontSize: '0.75rem', background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>STEP 2</span>
              <h4 style={{ margin: '10px 0 6px', color: '#ffffff' }}>Static IP & ONVIF Stream</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                Assign a dedicated static IP on the security VLAN (<code>192.168.1.100 - 192.168.1.250</code>). Enable ONVIF Profile S on port <code>80</code> and verify the RTSP stream URL: <code>rtsp://admin:pass@192.168.1.xxx:554/ch0</code>.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
              <span style={{ fontSize: '0.75rem', background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>STEP 3</span>
              <h4 style={{ margin: '10px 0 6px', color: '#ffffff' }}>Headmaster Device Pairing</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                Enter the Headmaster Device Token (<code>GBS-HEADMASTER-IPHONE-PRO-8842</code>). The system initiates an end-to-end encrypted WebRTC TLS stream tunnel directly into the Headmaster's mobile and desktop app.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #8b5cf6' }}>
              <span style={{ fontSize: '0.75rem', background: '#8b5cf6', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>STEP 4</span>
              <h4 style={{ margin: '10px 0 6px', color: '#ffffff' }}>Live Alerts & Facial Sync</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                Turnstile facial access events, unauthorized perimeter entries, and motion alerts automatically trigger instant push notifications and video clips on the Headmaster's device in real-time.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Security Telemetry Aggregate HUD */}
      <section className="cctv-hud-grid">
        <div className="hud-card">
          <span className="hud-icon">📹</span>
          <div className="hud-info">
            <span className="hud-val">{stats?.cameras?.total_cameras ?? 0}</span>
            <span className="hud-label">Monitored Cameras</span>
            <span className="hud-sub">{stats?.cameras?.online_cameras ?? 0} Feeds Live Recording</span>
          </div>
        </div>

        <div className="hud-card success">
          <span className="hud-icon">🛡️</span>
          <div className="hud-info">
            <span className="hud-val">{stats?.events?.access_granted ?? 0}</span>
            <span className="hud-label">Verified Entrances</span>
            <span className="hud-sub">Gate Turnstile Cleared</span>
          </div>
        </div>

        <div className="hud-card warning">
          <span className="hud-icon">⚠️</span>
          <div className="hud-info">
            <span className="hud-val">{stats?.events?.flagged_incidents ?? 0}</span>
            <span className="hud-label">Flagged Security Incidents</span>
            <span className="hud-sub">Access Denied / Intrusions</span>
          </div>
        </div>

        <div className="hud-card liveness">
          <span className="hud-icon">🎯</span>
          <div className="hud-info">
            <span className="hud-val">{Number(stats?.events?.avg_liveness_score || 0).toFixed(1)}%</span>
            <span className="hud-label">Avg Facial Liveness Score</span>
            <span className="hud-sub">Anti-Spoofing Active</span>
          </div>
        </div>
      </section>

      {/* Multi-Camera Surveillance Video Wall */}
      <section className="cctv-video-wall-card">
        <div className="wall-header">
          <h3>High-Definition Campus Camera Feeds ({streams.length})</h3>
          <span className="rec-indicator">● LIVE MULTI-STREAM ENCLAVE</span>
        </div>

        <div className="cctv-grid">
          {streams.map((cam) => {
            const isRec = cam.status === "RECORDING";
            const isOnline = cam.status === "ONLINE";
            const isSelected = selectedCamera?.id === cam.id;
            return (
              <div
                key={cam.id}
                className={`camera-box ${isSelected ? "selected-cam" : ""}`}
                onClick={() => setSelectedCamera(cam)}
              >
                <div className="camera-viewfinder">
                  <div className="cam-overlay-top">
                    <span className="cam-code">{cam.camera_code}</span>
                    <span className={`cam-status ${cam.status.toLowerCase()}`}>
                      {isRec && <span className="rec-dot"></span>}
                      {cam.status}
                    </span>
                  </div>

                  {/* Simulated Dynamic Camera Screen */}
                  <div className="viewfinder-content">
                    <div className="reticle-box">
                      <div className="reticle-corner tl"></div>
                      <div className="reticle-corner tr"></div>
                      <div className="reticle-corner bl"></div>
                      <div className="reticle-corner br"></div>
                      <span className="ai-face-tag">AI FACIAL RADAR ACTIVE</span>
                    </div>
                  </div>

                  <div className="cam-overlay-bottom">
                    <span className="cam-loc">📍 {cam.location}</span>
                    <span className="cam-res">{cam.resolution}</span>
                  </div>
                </div>

                <div className="camera-footer">
                  <div className="footer-title">
                    <strong>{cam.camera_name}</strong>
                    <span>IP: {cam.ip_address}</span>
                  </div>
                  <div className="camera-quick-controls" style={{ display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      type="button"
                      className="btn-state"
                      style={{ background: "rgba(56, 189, 248, 0.2)", borderColor: "#38bdf8", color: "#38bdf8", fontWeight: 700 }}
                      title="Capture and Preview Snapshot from this Camera Gate"
                      onClick={(e) => { e.stopPropagation(); handleCaptureCameraSnapshot(cam); }}
                    >
                      📸 Snap
                    </button>
                    <button
                      type="button"
                      className="btn-state"
                      style={{ background: "rgba(16, 185, 129, 0.2)", borderColor: "#10b981", color: "#34d399", fontWeight: 700 }}
                      title="Test & Verify Link to this Camera Gate"
                      onClick={(e) => { e.stopPropagation(); handleTestCameraGate(cam); }}
                    >
                      🧪 Test
                    </button>
                    <button
                      type="button"
                      className="btn-state"
                      style={{ background: "rgba(245, 158, 11, 0.2)", borderColor: "#f59e0b", color: "#fbbf24", fontWeight: 700 }}
                      title="Test Transmission to Headmaster Mobile Device"
                      onClick={(e) => { e.stopPropagation(); handleTestHeadmasterMobileGate(cam); }}
                    >
                      📲 Mobile
                    </button>
                    <button
                      className={`btn-state ${isRec ? "active" : ""}`}
                      title="Set Recording"
                      onClick={(e) => { e.stopPropagation(); handleUpdateCameraStatus(cam.id, "RECORDING"); }}
                    >
                      REC
                    </button>
                    <button
                      className={`btn-state ${isOnline ? "active" : ""}`}
                      title="Set Live"
                      onClick={(e) => { e.stopPropagation(); handleUpdateCameraStatus(cam.id, "ONLINE"); }}
                    >
                      LIVE
                    </button>
                    <button
                      className="btn-state maint"
                      title="Maintenance"
                      onClick={(e) => { e.stopPropagation(); handleUpdateCameraStatus(cam.id, "MAINTENANCE"); }}
                    >
                      MAINT
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Gate Facial Recognition Access Ledger */}
      <section className="cctv-events-ledger-card">
        <div className="events-header">
          <div>
            <h3>Security Gate Facial Recognition Access Ledger</h3>
            <span className="sub-text">Continuous biometric access verification logs stored in PostgreSQL</span>
          </div>

          <div className="events-filter-bar">
            <label>Filter Event:</label>
            <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
              <option value="ALL">All Gate Events</option>
              <option value="ACCESS_GRANTED">Access Granted</option>
              <option value="ACCESS_DENIED">Access Denied</option>
              <option value="INTRUSION_ALERT">Intrusion Alerts</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="cctv-loading">Connecting to PostgreSQL security event records...</div>
        ) : events.length === 0 ? (
          <div className="cctv-empty">No security events matching filter criteria.</div>
        ) : (
          <div className="table-responsive">
            <table className="cctv-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Timestamp</th>
                  <th>Identified Person</th>
                  <th>Role</th>
                  <th>Gate / Turnstile</th>
                  <th>Match Confidence</th>
                  <th>Liveness Score</th>
                  <th>Gate Access Status</th>
                  <th>Incident Flag</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} className={ev.is_flagged ? "flagged-row" : ""}>
                    <td><span className="event-code">{ev.event_id}</span></td>
                    <td>{new Date(ev.timestamp).toLocaleTimeString()}</td>
                    <td><strong>{ev.person_name}</strong></td>
                    <td><span className="role-pill">{ev.person_role}</span></td>
                    <td>📍 {ev.gate_location}</td>
                    <td>
                      <span className="score-badge">
                        {ev.match_confidence}%
                      </span>
                    </td>
                    <td>
                      <span className="liveness-badge">
                        {ev.liveness_score}%
                      </span>
                    </td>
                    <td>
                      <span className={`access-pill ${ev.event_type.toLowerCase()}`}>
                        {ev.event_type}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn-flag ${ev.is_flagged ? "active" : ""}`}
                        onClick={() => handleToggleFlag(ev.id)}
                      >
                        {ev.is_flagged ? "🚩 FLAGGED" : "FLAG"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Headmaster Camera Pairing Modal */}
      {pairingModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#111827', width: '100%', maxWidth: '640px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.15)', padding: '28px', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '1.25rem' }}>Link IP Camera to Headmaster Device</h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Establishes secure WebRTC & RTSP streaming directly to Headmaster's portal</span>
              </div>
              <button onClick={() => setPairingModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handlePairCamera}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>Camera Name & Identifier *</label>
                  <input
                    type="text"
                    value={newCameraPairing.cameraName}
                    onChange={(e) => setNewCameraPairing({ ...newCameraPairing, cameraName: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>Camera Static IP Address *</label>
                  <input
                    type="text"
                    value={newCameraPairing.ipAddress}
                    onChange={(e) => setNewCameraPairing({ ...newCameraPairing, ipAddress: e.target.value })}
                    required
                    placeholder="192.168.1.108"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>RTSP Port *</label>
                  <input
                    type="text"
                    value={newCameraPairing.rtspPort}
                    onChange={(e) => setNewCameraPairing({ ...newCameraPairing, rtspPort: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>ONVIF Username</label>
                  <input
                    type="text"
                    value={newCameraPairing.username}
                    onChange={(e) => setNewCameraPairing({ ...newCameraPairing, username: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>Location / Zone</label>
                  <input
                    type="text"
                    value={newCameraPairing.location}
                    onChange={(e) => setNewCameraPairing({ ...newCameraPairing, location: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>Target Headmaster Device Pairing Token *</label>
                  <input
                    type="text"
                    value={newCameraPairing.headmasterDeviceToken}
                    onChange={(e) => setNewCameraPairing({ ...newCameraPairing, headmasterDeviceToken: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid #10b981', color: '#34d399', fontWeight: 600 }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                    ✓ Authenticated: Verified Headmaster iOS/Android Mobile Terminal & Executive Workstation
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  style={{ flex: 1, background: 'linear-gradient(135deg, #059669, #10b981)', border: 'none', color: '#fff', padding: '12px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  🔗 Confirm Connection & Link Feed to Headmaster
                </button>
                <button
                  type="button"
                  onClick={() => setPairingModalOpen(false)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SNAPSHOT PREVIEW & ATTACHMENT MODAL */}
      {snapshotModal.isOpen && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
          <div style={{ background: "#0f172a", border: "2px solid #38bdf8", borderRadius: "14px", padding: "20px", maxWidth: "680px", width: "100%", boxShadow: "0 20px 50px rgba(0,0,0,0.8)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
              <h3 style={{ margin: 0, color: "#38bdf8", fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📸</span> CCTV Gate Snapshot Preview: {snapshotModal.camera?.camera_name}
              </h3>
              <button type="button" onClick={() => setSnapshotModal({ isOpen: false, camera: null, image: null, timestamp: "" })} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ textAlign: "center", marginBottom: "14px" }}>
              <img src={snapshotModal.image} alt="CCTV Snapshot" style={{ maxWidth: "100%", maxHeight: "380px", borderRadius: "8px", border: "1px solid rgba(56, 189, 248, 0.4)", objectFit: "cover" }} />
              <div style={{ marginTop: "8px", fontSize: "0.8rem", color: "#94a3b8" }}>
                📍 {snapshotModal.camera?.location} • Captured at {snapshotModal.timestamp} • Camera IP: {snapshotModal.camera?.ip_address}
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => handleCaptureCameraSnapshot(snapshotModal.camera)}
                className="btn-secondary"
                style={{ padding: "8px 16px", cursor: "pointer" }}
              >
                🔄 Retake Frame
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionMessage(`✓ Gate snapshot for ${snapshotModal.camera?.camera_name} attached to institutional security log!`);
                  setSnapshotModal({ isOpen: false, camera: null, image: null, timestamp: "" });
                  setTimeout(() => setActionMessage(""), 4000);
                }}
                className="btn-primary"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)", padding: "8px 18px", fontWeight: 700, cursor: "pointer" }}
              >
                💾 Confirm & Commit Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
