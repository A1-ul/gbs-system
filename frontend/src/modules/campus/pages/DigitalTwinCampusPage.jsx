import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../../api/client/apiClient";
import "./DigitalTwinCampus.css";

export default function DigitalTwinCampusPage() {
  const navigate = useNavigate();
  const [zones, setZones] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [actionMessage, setActionMessage] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const zonesRes = await apiClient.get("/digital-twin/zones?tenantId=1");
      if (zonesRes.data?.success) {
        setZones(zonesRes.data.data);
        if (!selectedZone && zonesRes.data.data.length > 0) {
          setSelectedZone(zonesRes.data.data[0]);
        }
      }
      const sumRes = await apiClient.get("/digital-twin/summary?tenantId=1");
      if (sumRes.data?.success) {
        setSummary(sumRes.data.data);
      }
    } catch (err) {
      console.error("Failed to load digital twin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedZone?.id) {
      apiClient
        .get(`/digital-twin/telemetry/${selectedZone.id}?limit=10`)
        .then((res) => {
          if (res.data?.success) {
            setTelemetryHistory(res.data.data);
          }
        })
        .catch(() => {});
    }
  }, [selectedZone]);

  const handleToggleLockStatus = async (zoneId, currentStatus) => {
    try {
      const nextStatus = currentStatus === "LOCKDOWN" ? "SECURE" : "LOCKDOWN";
      const res = await apiClient.patch(`/digital-twin/zones/${zoneId}/lock-status`, {
        tenantId: 1,
        lockStatus: nextStatus
      });
      if (res.data?.success) {
        setActionMessage(`Zone lock status set to ${nextStatus}.`);
        fetchData();
        if (selectedZone?.id === zoneId) {
          setSelectedZone(res.data.data);
        }
        setTimeout(() => setActionMessage(""), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleSimulateTelemetry = async (zoneId) => {
    try {
      const metrics = [
        { type: "TEMPERATURE", val: (21.0 + Math.random() * 3).toFixed(1), unit: "°C" },
        { type: "POWER_LOAD", val: (15.0 + Math.random() * 20).toFixed(1), unit: "kW" },
        { type: "HUMIDITY", val: (40 + Math.random() * 15).toFixed(0), unit: "%" }
      ];
      const pick = metrics[Math.floor(Math.random() * metrics.length)];
      await apiClient.post("/digital-twin/telemetry", {
        zoneId,
        metricType: pick.type,
        metricValue: pick.val,
        unit: pick.unit
      });
      setActionMessage(`IoT sensor pulse logged: ${pick.type} = ${pick.val}${pick.unit}`);
      // Refresh telemetry history
      const hist = await apiClient.get(`/digital-twin/telemetry/${zoneId}?limit=10`);
      if (hist.data?.success) setTelemetryHistory(hist.data.data);
      setTimeout(() => setActionMessage(""), 4000);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="twin-container">
      {/* Top Header */}
      <header className="twin-header">
        <div>
          <div className="twin-badge">SMART CAMPUS IOT & DIGITAL TWIN</div>
          <h1>Digital Twin Campus Telemetry Hub</h1>
          <p>Real-time physical spatial monitoring, building automation, environmental sensors, and perimeter security telemetry.</p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button className="btn-secondary" onClick={() => navigate(-1)} style={{ borderColor: "#38bdf8", color: "#38bdf8", fontWeight: "700" }}>
            ⬅ Return / Back
          </button>
          <button className="btn-secondary" onClick={() => navigate("/developer-control-center/dashboard")} style={{ borderColor: "#a855f7", color: "#c084fc", fontWeight: "700" }}>
            ⚙️ Developer Mission Control
          </button>
          <button className="btn-secondary" onClick={fetchData}>
            🔄 Refresh Sensors
          </button>
        </div>
      </header>

      {/* Hero Banner with Daylight Aerial Campus Photograph */}
      <section
        className="twin-hero-banner"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.85)), url('/assets/digital-twin-bg.jpg')`
        }}
      >
        <div className="hero-text-block">
          <div className="hero-pill-badge">IOT INFRASTRUCTURE SENSORS</div>
          <h2>Interactive Campus Telemetry Radar</h2>
          <p>
            Connected to 48 spatial environmental monitors, occupancy turnstiles, and smart energy meters across the 42-acre academic enclave.
          </p>
        </div>

        <div className="hero-photo-showcase-frame">
          <div className="showcase-photo-wrapper">
            <img
              src="/assets/digital-twin-bg.jpg"
              alt="Daylight aerial view of international school smart campus"
              className="real-life-dashboard-photo"
            />
            <div className="showcase-verified-badge">
              <span className="live-camera-pulse"></span>
              <span>LIVE AERIAL CAMPUS VIEW</span>
            </div>
          </div>
          <div className="showcase-photo-caption">
            <span>📍 Royal Oak Academic Quadrangle & Innovation Pavilion • Verified Daylight View</span>
          </div>
        </div>
      </section>

      {actionMessage && <div className="twin-alert-banner">{actionMessage}</div>}

      {/* Campus Aggregate HUD */}
      <section className="twin-hud-grid">
        <div className="hud-card">
          <span className="hud-icon">👥</span>
          <div className="hud-info">
            <span className="hud-val">{summary?.total_campus_occupancy ?? 0}</span>
            <span className="hud-label">Live Campus Occupancy</span>
            <span className="hud-sub">Capacity: {summary?.total_campus_capacity ?? 0}</span>
          </div>
        </div>

        <div className="hud-card power">
          <span className="hud-icon">⚡</span>
          <div className="hud-info">
            <span className="hud-val">{Number(summary?.total_power_load_kw || 0).toFixed(1)} kW</span>
            <span className="hud-label">Power Consumption</span>
            <span className="hud-sub">Solar & Grid Combined</span>
          </div>
        </div>

        <div className="hud-card climate">
          <span className="hud-icon">🌡️</span>
          <div className="hud-info">
            <span className="hud-val">{Number(summary?.avg_temperature || 0).toFixed(1)}°C</span>
            <span className="hud-label">Avg Zone Climate</span>
            <span className="hud-sub">Humidity: {Number(summary?.avg_humidity || 0).toFixed(0)}%</span>
          </div>
        </div>

        <div className="hud-card lock">
          <span className="hud-icon">🛡️</span>
          <div className="hud-info">
            <span className="hud-val">
              {summary?.active_lockdowns > 0 ? `${summary.active_lockdowns} LOCKDOWN` : "ALL SECURE"}
            </span>
            <span className="hud-label">Access Control Status</span>
            <span className="hud-sub">{summary?.total_zones ?? 0} Monitored Zones</span>
          </div>
        </div>
      </section>

      {/* Main Dual-Column Spatial View */}
      <div className="twin-main-grid">
        {/* Left Column: Campus Spatial Zones List */}
        <section className="twin-zones-card">
          <div className="card-header">
            <h3>Monitored Campus Zones ({zones.length})</h3>
            <span className="badge-live">LIVE TELEMETRY</span>
          </div>

          {loading ? (
            <div className="twin-loading">Querying campus spatial zones in PostgreSQL...</div>
          ) : (
            <div className="zones-list">
              {zones.map((z) => {
                const occPercent = Math.round((z.current_occupancy / (z.max_capacity || 100)) * 100);
                const isSelected = selectedZone?.id === z.id;
                return (
                  <div
                    key={z.id}
                    className={`zone-item ${isSelected ? "selected" : ""} ${z.lock_status.toLowerCase()}`}
                    onClick={() => setSelectedZone(z)}
                  >
                    <div className="zone-item-top">
                      <div>
                        <span className="zone-code">{z.zone_code}</span>
                        <h4>{z.zone_name}</h4>
                        <span className="zone-bldg">🏢 {z.building} • {z.floor_level}</span>
                      </div>
                      <span className={`lock-badge ${z.lock_status.toLowerCase()}`}>
                        {z.lock_status}
                      </span>
                    </div>

                    <div className="occupancy-bar-block">
                      <div className="bar-labels">
                        <span>Occupancy: {z.current_occupancy} / {z.max_capacity}</span>
                        <span>{occPercent}%</span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min(occPercent, 100)}%`,
                            backgroundColor: occPercent > 85 ? "#ef4444" : occPercent > 60 ? "#f59e0b" : "#10b981"
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="zone-metrics-row">
                      <span>⚡ {z.power_consumption_kw} kW</span>
                      <span>🌡️ {z.temperature_celsius}°C</span>
                      <span>💧 {z.humidity_percent}%</span>
                      <span>🍃 AQI {z.air_quality_index}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Column: Zone Detailed Telemetry Radar & Controls */}
        <section className="twin-detail-card">
          {selectedZone ? (
            <div>
              <div className="detail-header">
                <div>
                  <span className="zone-code">{selectedZone.zone_code}</span>
                  <h2>{selectedZone.zone_name}</h2>
                  <p>📍 {selectedZone.building} — {selectedZone.floor_level}</p>
                </div>
                <div className="detail-actions">
                  <button
                    className={`btn-lock ${selectedZone.lock_status === "LOCKDOWN" ? "unlock" : "lock"}`}
                    onClick={() => handleToggleLockStatus(selectedZone.id, selectedZone.lock_status)}
                  >
                    {selectedZone.lock_status === "LOCKDOWN" ? "🔓 End Lockdown" : "🔒 Trigger Zone Lockdown"}
                  </button>
                  <button
                    className="btn-pulse"
                    onClick={() => handleSimulateTelemetry(selectedZone.id)}
                  >
                    📡 Pulse Sensor
                  </button>
                </div>
              </div>

              {/* Environmental Radial Gauges */}
              <div className="gauges-grid">
                <div className="gauge-box">
                  <span className="gauge-num">{selectedZone.temperature_celsius}°C</span>
                  <span className="gauge-label">Ambient Temperature</span>
                  <span className="gauge-stat">Target: 22.0°C (HVAC Optimal)</span>
                </div>
                <div className="gauge-box">
                  <span className="gauge-num">{selectedZone.humidity_percent}%</span>
                  <span className="gauge-label">Relative Humidity</span>
                  <span className="gauge-stat">Comfort Range: 40-50%</span>
                </div>
                <div className="gauge-box">
                  <span className="gauge-num">{selectedZone.power_consumption_kw} kW</span>
                  <span className="gauge-label">Active Power Load</span>
                  <span className="gauge-stat">Substation Bus Feed #2</span>
                </div>
                <div className="gauge-box">
                  <span className="gauge-num">AQI {selectedZone.air_quality_index}</span>
                  <span className="gauge-label">Indoor Air Quality</span>
                  <span className="gauge-stat">Grade: Excellent (HEPA Filtration)</span>
                </div>
              </div>

              {/* Real-Time IoT Event Log for Selected Zone */}
              <div className="telemetry-log-section">
                <h3>Live Sensor Telemetry Ledger ({telemetryHistory.length})</h3>
                {telemetryHistory.length === 0 ? (
                  <p className="no-telemetry">Click "Pulse Sensor" to log instant telemetry pulses to PostgreSQL.</p>
                ) : (
                  <div className="log-table-wrapper">
                    <table className="log-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Sensor Metric</th>
                          <th>Recorded Value</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {telemetryHistory.map((h) => (
                          <tr key={h.id}>
                            <td>{new Date(h.recorded_at).toLocaleTimeString()}</td>
                            <td><strong>{h.metric_type}</strong></td>
                            <td>{h.metric_value} {h.unit}</td>
                            <td><span className="status-ok">NORMAL</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="no-selection">Select a campus zone to inspect live environmental metrics.</div>
          )}
        </section>
      </div>
    </div>
  );
}
