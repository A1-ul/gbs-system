import React, { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import apiClient from "../../api/client/apiClient";

const STATUS_BADGE_MAP = {
  LIVE: { label: "● LIVE LOCATION", bg: "rgba(16, 185, 129, 0.22)", border: "#10b981", color: "#6ee7b7" },
  LAST_KNOWN: { label: "◐ LAST KNOWN LOCATION", bg: "rgba(245, 158, 11, 0.22)", border: "#f59e0b", color: "#fde68a" },
  STALE: { label: "⏱️ STALE LOCATION (DELAYED)", bg: "rgba(234, 88, 12, 0.22)", border: "#f97316", color: "#fdba74" },
  OFFLINE: { label: "○ OFFLINE DEVICE", bg: "rgba(100, 116, 139, 0.28)", border: "#94a3b8", color: "#cbd5e1" },
  PERMISSION_DISABLED: { label: "🔒 LOCATION PERMISSION DISABLED", bg: "rgba(239, 68, 68, 0.22)", border: "#ef4444", color: "#fca5a5" },
  PERMISSION_DENIED: { label: "🚫 PERMISSION DENIED", bg: "rgba(239, 68, 68, 0.22)", border: "#ef4444", color: "#fca5a5" },
  GPS_UNAVAILABLE: { label: "📡 GPS SIGNAL UNAVAILABLE", bg: "rgba(245, 158, 11, 0.22)", border: "#f59e0b", color: "#fde68a" },
  UNAVAILABLE: { label: "⚠️ LOCATION UNAVAILABLE", bg: "rgba(239, 68, 68, 0.22)", border: "#ef4444", color: "#fca5a5" }
};

const ROLE_GRANT_OPTIONS = [
  { value: "ADMIN", label: "Headmaster / Principal (Admin)" },
  { value: "TEACHER", label: "Teachers / Faculty" },
  { value: "PARENT", label: "Parents / Guardians" },
  { value: "STAFF", label: "Campus Security / Transport Staff" },
  { value: "HR", label: "HR Officer" },
  { value: "ACCOUNTANT", label: "Accountant / Bursar" },
  { value: "SECRETARY", label: "School Secretary" },
  { value: "DEVELOPER", label: "System Developer (Support)" }
];

function resolveSocketBaseUrl() {
  try {
    const base = String(apiClient.defaults?.baseURL || "");
    if (base.startsWith("http")) {
      return base.replace(/\/api\/v1\/?$/, "");
    }
  } catch { }
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/**
 * GBSLiveMapMobileTracker
 * Reusable, consent-based, multi-tenant Authorized Mobile Number Location Tracking & Owner Sharing Manager
 * for ALL GBS systems containing GBS LIVE MAP.
 * - Never fabricates GPS coordinates.
 * - Strictly requires explicit owner consent and role/user authorization.
 * - Supports Ghanaian (+233 / 0-prefixed) & international E.164 mobile numbers.
 * - Streams real-time location updates via Socket.IO & distinguishes Live / Last Known / Stale / Offline / Disabled.
 */
export default function GBSLiveMapMobileTracker({
  systemContext = "GBS School Management System",
  compact = false,
  onLocationSelected = null
}) {
  const [activeSubTab, setActiveSubTab] = useState("SEARCH"); // "SEARCH" | "MY_SHARING"
  const [phoneQuery, setPhoneQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [mapMode, setMapMode] = useState("roadmap"); // "roadmap" | "satellite"
  const [mapZoom, setMapZoom] = useState(16);

  // Owner Location-Sharing Management state
  const [myStatus, setMyStatus] = useState(null);
  const [myPhoneInput, setMyPhoneInput] = useState("");
  const [myDeviceLabel, setMyDeviceLabel] = useState("My Mobile / Browser Device");
  const [intervalSec, setIntervalSec] = useState(15);
  const [durationHours, setDurationHours] = useState(8);
  const [grantRole, setGrantRole] = useState("ADMIN");
  const [grantEmail, setGrantEmail] = useState("");
  const [ownerBusy, setOwnerBusy] = useState(false);
  const [ownerNotice, setOwnerNotice] = useState(null);
  const [gpsWatchError, setGpsWatchError] = useState(null);
  const [gpsActivelySending, setGpsActivelySending] = useState(false);

  const socketRef = useRef(null);
  const watchedDeviceRef = useRef(null);
  const geoWatchIdRef = useRef(null);
  const lastGeoPushMsRef = useRef(0);

  const loadMySharingStatus = useCallback(async () => {
    try {
      const res = await apiClient.get("/tracking/mobile-location/sharing/status");
      const data = res?.data?.data || null;
      setMyStatus(data);
      if (data?.device) {
        if (!myPhoneInput && data.device.mobileNumber) setMyPhoneInput(data.device.mobileNumber);
        if (data.device.deviceLabel) setMyDeviceLabel(data.device.deviceLabel);
        if (data.device.updateIntervalSec) setIntervalSec(data.device.updateIntervalSec);
      }
    } catch { }
  }, []);

  useEffect(() => {
    loadMySharingStatus();
  }, [loadMySharingStatus]);

  // Socket.IO connection for real-time authorized location updates
  useEffect(() => {
    const baseUrl = resolveSocketBaseUrl();
    if (!baseUrl) return undefined;
    let sock = null;
    try {
      sock = io(baseUrl, {
        transports: ["websocket", "polling"],
        withCredentials: true,
        reconnectionAttempts: 5
      });
      socketRef.current = sock;

      sock.on("mobile_location_update", (payload) => {
        if (!payload?.deviceId) return;
        setSearchResult((prev) => {
          if (!prev || String(prev.deviceId) !== String(payload.deviceId)) return prev;
          const next = {
            ...prev,
            status: payload.freshness?.status || "LIVE",
            statusLabel: payload.freshness?.label || "Live Location",
            sharingStatus: {
              ...(prev.sharingStatus || {}),
              isOnline: Boolean(payload.freshness?.isOnline),
              isLive: Boolean(payload.freshness?.isLive),
              isStale: Boolean(payload.freshness?.isStale),
              ageSeconds: payload.freshness?.ageSeconds ?? 0
            },
            location: payload.location
          };
          if (typeof onLocationSelected === "function" && payload.location) {
            onLocationSelected(next);
          }
          return next;
        });
      });

      sock.on("mobile_location_status", (payload) => {
        if (!payload?.deviceId) return;
        setSearchResult((prev) => {
          if (!prev || String(prev.deviceId) !== String(payload.deviceId)) return prev;
          if (payload.status === "PERMISSION_DISABLED" || payload.status === "PERMISSION_REVOKED") {
            return {
              ...prev,
              authorized: false,
              status: "PERMISSION_DISABLED",
              statusLabel: "Location Permission Disabled",
              message: "Location unavailable. The device owner must enable and authorize location sharing.",
              location: null
            };
          }
          return {
            ...prev,
            status: payload.isOnline ? prev.status : "OFFLINE",
            statusLabel: payload.isOnline ? prev.statusLabel : "Offline Device (Last Known)",
            sharingStatus: {
              ...(prev.sharingStatus || {}),
              isOnline: Boolean(payload.isOnline),
              isLive: Boolean(payload.isOnline) && prev.sharingStatus?.isLive
            }
          };
        });
      });
    } catch { }

    return () => {
      if (sock) {
        try { sock.disconnect(); } catch { }
      }
      socketRef.current = null;
    };
  }, [onLocationSelected]);

  // Subscribe/unsubscribe Socket.IO room when viewing an authorized device
  useEffect(() => {
    const sock = socketRef.current;
    const prevWatch = watchedDeviceRef.current;
    if (sock && prevWatch) {
      sock.emit("leave_mobile_location_watch", prevWatch);
      watchedDeviceRef.current = null;
    }
    if (sock && searchResult?.authorized && searchResult?.deviceId) {
      let tid = 1;
      try {
        const u = JSON.parse(localStorage.getItem("gbs_user") || "{}");
        tid = parseInt(u.tenantId || localStorage.getItem("gbs_tenant_id") || "1", 10) || 1;
      } catch { }
      const watchPayload = { tenantId: tid, deviceId: searchResult.deviceId };
      sock.emit("join_mobile_location_watch", watchPayload);
      watchedDeviceRef.current = watchPayload;
    }
  }, [searchResult?.authorized, searchResult?.deviceId]);

  // Active browser GPS transmitter when owner has enabled sharing
  useEffect(() => {
    const sharingOn = Boolean(myStatus?.device?.sharingEnabled);
    if (!sharingOn) {
      if (geoWatchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
        geoWatchIdRef.current = null;
      }
      setGpsActivelySending(false);
      return undefined;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsWatchError("This browser/device does not support HTML5 Geolocation API.");
      setGpsActivelySending(false);
      return undefined;
    }

    setGpsWatchError(null);
    const minMs = Math.max(5000, Number(myStatus?.device?.updateIntervalSec || intervalSec || 15) * 1000);

    const pushPosition = async (pos) => {
      const now = Date.now();
      if (now - lastGeoPushMsRef.current < minMs) return;
      lastGeoPushMsRef.current = now;
      try {
        await apiClient.post("/tracking/mobile-location/update", {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          source: "BROWSER_GPS"
        });
        setGpsActivelySending(true);
        setGpsWatchError(null);
        loadMySharingStatus();
      } catch (err) {
        setGpsWatchError(err?.response?.data?.message || "Failed to send GPS update to server.");
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        pushPosition(pos);
      },
      (err) => {
        setGpsActivelySending(false);
        if (err.code === 1) {
          setGpsWatchError("GPS permission denied in browser/device settings. Enable location permission to share.");
        } else if (err.code === 2) {
          setGpsWatchError("GPS signal unavailable on this device right now.");
        } else {
          setGpsWatchError("Location update timed out. Waiting for next GPS fix.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    geoWatchIdRef.current = watchId;

    return () => {
      if (geoWatchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
        geoWatchIdRef.current = null;
      }
    };
  }, [myStatus?.device?.sharingEnabled, myStatus?.device?.updateIntervalSec, intervalSec, loadMySharingStatus]);

  const handleSearchMobile = async (e, overrideQuery = null) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    const target = String(overrideQuery ?? phoneQuery).trim();
    if (!target) {
      setSearchError("Enter a registered Ghanaian (e.g. 024XXXXXXX or +233XXXXXXXXX) or international mobile number.");
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const res = await apiClient.get("/tracking/mobile-location/search", {
        params: { phone: target }
      });
      const data = res?.data?.data || null;
      setSearchResult(data);
      if (data?.authorized && data?.location && typeof onLocationSelected === "function") {
        onLocationSelected(data);
      }
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        (status === 401
          ? "Unauthorized access. Please sign in to search authorized mobile locations."
          : status === 429
            ? "Rate limit reached. Please wait a few minutes before searching again."
            : "Server connection failure while searching mobile location.");
      setSearchError(msg);
      setSearchResult(null);
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setPhoneQuery("");
    setSearchResult(null);
    setSearchError(null);
  };

  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    setOwnerBusy(true);
    setOwnerNotice(null);
    try {
      await apiClient.post("/tracking/mobile-location/device/register", {
        mobileNumber: myPhoneInput,
        deviceLabel: myDeviceLabel,
        platform: /Android|iPhone|iPad/i.test(navigator.userAgent || "") ? "MOBILE_BROWSER" : "DESKTOP_BROWSER",
        updateIntervalSec: Number(intervalSec) || 15
      });
      setOwnerNotice({ type: "success", text: "Mobile number & device registered securely for location sharing." });
      await loadMySharingStatus();
    } catch (err) {
      setOwnerNotice({ type: "error", text: err?.response?.data?.message || "Failed to register mobile number." });
    } finally {
      setOwnerBusy(false);
    }
  };

  const handleToggleSharing = async (enable) => {
    setOwnerBusy(true);
    setOwnerNotice(null);
    try {
      await apiClient.post("/tracking/mobile-location/sharing/toggle", {
        enabled: enable,
        durationHours: Number(durationHours) || 8,
        updateIntervalSec: Number(intervalSec) || 15
      });
      lastGeoPushMsRef.current = 0;
      setOwnerNotice({
        type: "success",
        text: enable
          ? `Real-time GPS location sharing enabled for ${durationHours} hour(s).`
          : "Location sharing disabled immediately. Your GPS coordinates are no longer shared."
      });
      await loadMySharingStatus();
    } catch (err) {
      setOwnerNotice({ type: "error", text: err?.response?.data?.message || "Failed to update location sharing setting." });
    } finally {
      setOwnerBusy(false);
    }
  };

  const handleGrantPermission = async (e) => {
    e.preventDefault();
    setOwnerBusy(true);
    setOwnerNotice(null);
    try {
      await apiClient.post("/tracking/mobile-location/sharing/permissions", {
        granteeRole: grantEmail.trim() ? null : grantRole,
        granteeEmail: grantEmail.trim() || null,
        granteeLabel: grantEmail.trim() || (ROLE_GRANT_OPTIONS.find((r) => r.value === grantRole)?.label || grantRole),
        durationHours: 24
      });
      setGrantEmail("");
      setOwnerNotice({ type: "success", text: "Authorized location-viewing permission granted." });
      await loadMySharingStatus();
    } catch (err) {
      setOwnerNotice({ type: "error", text: err?.response?.data?.message || "Failed to grant location permission." });
    } finally {
      setOwnerBusy(false);
    }
  };

  const handleRevokePermission = async (permissionId) => {
    setOwnerBusy(true);
    setOwnerNotice(null);
    try {
      await apiClient.delete(`/tracking/mobile-location/sharing/permissions/${encodeURIComponent(permissionId)}`);
      setOwnerNotice({ type: "success", text: "Permission revoked immediately." });
      await loadMySharingStatus();
    } catch (err) {
      setOwnerNotice({ type: "error", text: err?.response?.data?.message || "Failed to revoke permission." });
    } finally {
      setOwnerBusy(false);
    }
  };

  const badge = STATUS_BADGE_MAP[searchResult?.status] || STATUS_BADGE_MAP.UNAVAILABLE;
  const hasRealMapCoords = Boolean(
    searchResult?.authorized &&
    searchResult?.location &&
    Number.isFinite(Number(searchResult.location.latitude)) &&
    Number.isFinite(Number(searchResult.location.longitude))
  );

  return (
    <div
      data-testid="gbs-live-map-mobile-tracker"
      style={{
        background: "linear-gradient(135deg, rgba(8, 20, 40, 0.96) 0%, rgba(15, 23, 42, 0.96) 100%)",
        border: "1.5px solid rgba(56, 189, 248, 0.45)",
        borderRadius: "16px",
        padding: compact ? "1rem" : "1.35rem",
        marginBottom: "1.25rem",
        color: "#f8fafc",
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)"
      }}
    >
      {/* Header & Mode Switch */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.7px" }}>
            🛰️ GBS LIVE MAP • AUTHORIZED MOBILE NUMBER LOCATION TRACKING ({systemContext})
          </div>
          <h3 style={{ margin: "3px 0 0", fontSize: compact ? "1.02rem" : "1.18rem", fontWeight: 900, color: "#ffffff" }}>
            Consent-Based Real-Time Mobile Location Search &amp; Sharing Console
          </h3>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            data-testid="live-map-tab-search"
            onClick={() => setActiveSubTab("SEARCH")}
            style={{
              background: activeSubTab === "SEARCH" ? "#0284c7" : "rgba(30, 41, 59, 0.85)",
              border: "1px solid #38bdf8",
              color: "#ffffff",
              borderRadius: "8px",
              padding: "7px 14px",
              fontWeight: 800,
              fontSize: "0.8rem",
              cursor: "pointer"
            }}
          >
            🔍 Mobile Number Search
          </button>
          <button
            type="button"
            data-testid="live-map-tab-my-sharing"
            onClick={() => {
              setActiveSubTab("MY_SHARING");
              loadMySharingStatus();
            }}
            style={{
              background: activeSubTab === "MY_SHARING" ? "#059669" : "rgba(30, 41, 59, 0.85)",
              border: "1px solid #10b981",
              color: "#ffffff",
              borderRadius: "8px",
              padding: "7px 14px",
              fontWeight: 800,
              fontSize: "0.8rem",
              cursor: "pointer"
            }}
          >
            🛡️ My Location-Sharing Settings {myStatus?.device?.sharingEnabled ? "● ON" : "○ OFF"}
          </button>
        </div>
      </div>

      {activeSubTab === "SEARCH" ? (
        <div>
          {/* Mobile Number Search Form */}
          <form onSubmit={handleSearchMobile} style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
            <input
              type="text"
              data-testid="live-map-mobile-search-input"
              value={phoneQuery}
              onChange={(e) => setPhoneQuery(e.target.value)}
              placeholder="Enter registered mobile number (e.g. 0241234567, +233241234567, or +44...)"
              style={{
                flex: "1 1 280px",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1.5px solid rgba(56, 189, 248, 0.45)",
                background: "rgba(2, 6, 23, 0.85)",
                color: "#f8fafc",
                fontSize: "0.9rem",
                fontWeight: 700
              }}
            />
            <button
              type="submit"
              disabled={searching}
              data-testid="live-map-mobile-search-btn"
              style={{
                background: "linear-gradient(135deg, #0284c7, #2563eb)",
                color: "#ffffff",
                border: "1px solid #38bdf8",
                borderRadius: "10px",
                padding: "10px 18px",
                fontWeight: 900,
                fontSize: "0.84rem",
                cursor: "pointer"
              }}
            >
              {searching ? "Verifying..." : "📍 Locate Authorized Mobile"}
            </button>
            {searchResult && (
              <button
                type="button"
                onClick={() => handleSearchMobile(null, phoneQuery)}
                disabled={searching}
                style={{
                  background: "rgba(16, 185, 129, 0.2)",
                  color: "#6ee7b7",
                  border: "1px solid #10b981",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontWeight: 800,
                  fontSize: "0.82rem",
                  cursor: "pointer"
                }}
              >
                🔄 Refresh Location
              </button>
            )}
            {(phoneQuery || searchResult || searchError) && (
              <button
                type="button"
                onClick={handleClearSearch}
                style={{
                  background: "rgba(148, 163, 184, 0.16)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(148, 163, 184, 0.4)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontWeight: 800,
                  fontSize: "0.82rem",
                  cursor: "pointer"
                }}
              >
                ✕ Clear Search
              </button>
            )}
          </form>

          {searchError && (
            <div style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid #ef4444", color: "#fecaca", borderRadius: "10px", padding: "10px 14px", fontSize: "0.84rem", fontWeight: 700, marginBottom: "10px" }}>
              ⚠️ {searchError}
            </div>
          )}

          {searchResult && (
            <div style={{ background: "rgba(2, 6, 23, 0.72)", border: `1.5px solid ${badge.border}`, borderRadius: "12px", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
                <span style={{ background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color, borderRadius: "999px", padding: "4px 12px", fontSize: "0.75rem", fontWeight: 900 }}>
                  {badge.label}
                </span>
                <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontFamily: "monospace" }}>
                  Normalized: <strong style={{ color: "#e2e8f0" }}>{searchResult.normalizedNumber}</strong>
                </span>
              </div>

              {!searchResult.authorized ? (
                <div data-testid="live-map-unauthorized-notice" style={{ color: "#fecaca", fontSize: "0.9rem", fontWeight: 800, lineHeight: 1.5 }}>
                  <div>🔒 {searchResult.message}</div>
                  {searchResult.detail && (
                    <div style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: 600, marginTop: "4px" }}>
                      {searchResult.detail}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "12px", fontSize: "0.82rem" }}>
                    <div style={{ background: "rgba(15, 23, 42, 0.85)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ color: "#94a3b8", fontSize: "0.7rem", fontWeight: 800 }}>AUTHORIZED OWNER</div>
                      <strong style={{ color: "#f8fafc", display: "block", marginTop: "2px" }}>{searchResult.owner?.name}</strong>
                      <span style={{ color: "#38bdf8", fontSize: "0.74rem" }}>{searchResult.owner?.role} • {searchResult.deviceLabel}</span>
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.85)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ color: "#94a3b8", fontSize: "0.7rem", fontWeight: 800 }}>GPS COORDINATES &amp; ACCURACY</div>
                      <strong style={{ color: "#34d399", display: "block", marginTop: "2px", fontFamily: "monospace" }}>
                        {hasRealMapCoords ? `${searchResult.location.latitude}, ${searchResult.location.longitude}` : "Waiting for GPS fix"}
                      </strong>
                      <span style={{ color: "#cbd5e1", fontSize: "0.74rem" }}>
                        {searchResult.location?.accuracyMeters != null ? `Accuracy: ±${searchResult.location.accuracyMeters}m` : "Accuracy: Pending"}
                      </span>
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.85)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ color: "#94a3b8", fontSize: "0.7rem", fontWeight: 800 }}>CONNECTION &amp; LAST UPDATED</div>
                      <strong style={{ color: searchResult.sharingStatus?.isOnline ? "#34d399" : "#f87171", display: "block", marginTop: "2px" }}>
                        {searchResult.sharingStatus?.isOnline ? "● ONLINE" : "○ OFFLINE"} ({searchResult.statusLabel})
                      </strong>
                      <span style={{ color: "#cbd5e1", fontSize: "0.74rem" }}>
                        {searchResult.location?.updatedAt ? new Date(searchResult.location.updatedAt).toLocaleString() : "No GPS timestamp yet"}
                      </span>
                    </div>
                  </div>

                  {hasRealMapCoords ? (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => setMapMode("roadmap")}
                            style={{ background: mapMode === "roadmap" ? "#0284c7" : "#1e293b", color: "#fff", border: "1px solid #38bdf8", borderRadius: "6px", padding: "5px 10px", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer" }}
                          >
                            🗺️ Road Map
                          </button>
                          <button
                            type="button"
                            onClick={() => setMapMode("satellite")}
                            style={{ background: mapMode === "satellite" ? "#0284c7" : "#1e293b", color: "#fff", border: "1px solid #38bdf8", borderRadius: "6px", padding: "5px 10px", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer" }}
                          >
                            🛰️ Satellite
                          </button>
                          <button
                            type="button"
                            onClick={() => setMapZoom((z) => Math.min(20, z + 1))}
                            style={{ background: "#1e293b", color: "#e2e8f0", border: "1px solid #475569", borderRadius: "6px", padding: "5px 10px", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer" }}
                          >
                            ＋ Zoom In
                          </button>
                          <button
                            type="button"
                            onClick={() => setMapZoom((z) => Math.max(5, z - 1))}
                            style={{ background: "#1e293b", color: "#e2e8f0", border: "1px solid #475569", borderRadius: "6px", padding: "5px 10px", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer" }}
                          >
                            － Zoom Out
                          </button>
                        </div>
                        <a
                          href={`https://maps.google.com/?q=${searchResult.location.latitude},${searchResult.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#38bdf8", fontSize: "0.78rem", fontWeight: 800, textDecoration: "underline" }}
                        >
                          ↗ Open Pin in Google Maps
                        </a>
                      </div>
                      <iframe
                        src={`https://maps.google.com/maps?q=${searchResult.location.latitude},${searchResult.location.longitude}&t=${mapMode === "satellite" ? "k" : "m"}&hl=en&z=${mapZoom}&output=embed`}
                        width="100%"
                        height={compact ? "280" : "360"}
                        style={{ border: "1px solid rgba(56, 189, 248, 0.45)", borderRadius: "10px", display: "block" }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        aria-label="Authorized Mobile Device Live Map"
                      />
                    </div>
                  ) : (
                    <div style={{ padding: "12px", background: "rgba(245, 158, 11, 0.14)", border: "1px solid rgba(245, 158, 11, 0.45)", borderRadius: "8px", color: "#fde68a", fontSize: "0.84rem", fontWeight: 700 }}>
                      📡 {searchResult.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* OWNER LOCATION-SHARING MANAGEMENT INTERFACE */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "14px" }}>
          <div style={{ background: "rgba(2, 6, 23, 0.72)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "12px", padding: "14px" }}>
            <h4 style={{ margin: "0 0 10px", color: "#38bdf8", fontSize: "0.92rem" }}>1. Register My Mobile Number &amp; Control Sharing</h4>
            <form onSubmit={handleRegisterDevice} style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
              <input
                type="text"
                required
                value={myPhoneInput}
                onChange={(e) => setMyPhoneInput(e.target.value)}
                placeholder="Your Mobile Number (e.g. 0241234567 or +233...)"
                style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "#fff", fontSize: "0.85rem" }}
              />
              <input
                type="text"
                value={myDeviceLabel}
                onChange={(e) => setMyDeviceLabel(e.target.value)}
                placeholder="Device Label (e.g. Android Phone / Laptop)"
                style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "#fff", fontSize: "0.85rem" }}
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <select
                  value={intervalSec}
                  onChange={(e) => setIntervalSec(Number(e.target.value))}
                  style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "#fff", fontSize: "0.8rem" }}
                >
                  <option value={10}>Update every 10s</option>
                  <option value={15}>Update every 15s</option>
                  <option value={30}>Update every 30s</option>
                  <option value={60}>Update every 60s</option>
                </select>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "#fff", fontSize: "0.8rem" }}
                >
                  <option value={1}>Session: 1 Hour</option>
                  <option value={4}>Session: 4 Hours</option>
                  <option value={8}>Session: 8 Hours</option>
                  <option value={24}>Session: 24 Hours</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={ownerBusy}
                style={{ background: "#0284c7", color: "#fff", border: "none", borderRadius: "8px", padding: "9px", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer" }}
              >
                💾 Save Mobile &amp; Device Registration
              </button>
            </form>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
              <button
                type="button"
                disabled={ownerBusy || !myStatus?.device}
                onClick={() => handleToggleSharing(true)}
                style={{ flex: 1, background: myStatus?.device?.sharingEnabled ? "#059669" : "rgba(16, 185, 129, 0.25)", color: "#fff", border: "1px solid #10b981", borderRadius: "8px", padding: "9px 12px", fontWeight: 900, fontSize: "0.8rem", cursor: "pointer" }}
              >
                ✅ Enable Location Sharing
              </button>
              <button
                type="button"
                disabled={ownerBusy || !myStatus?.device}
                onClick={() => handleToggleSharing(false)}
                style={{ flex: 1, background: !myStatus?.device?.sharingEnabled ? "#b91c1c" : "rgba(239, 68, 68, 0.22)", color: "#fff", border: "1px solid #ef4444", borderRadius: "8px", padding: "9px 12px", fontWeight: 900, fontSize: "0.8rem", cursor: "pointer" }}
              >
                🛑 Disable Sharing
              </button>
            </div>

            {gpsActivelySending && (
              <div style={{ color: "#6ee7b7", fontSize: "0.78rem", fontWeight: 800, marginBottom: "6px" }}>
                ● GPS Active: Streaming real coordinates to GBS backend (every {intervalSec}s).
              </div>
            )}
            {gpsWatchError && (
              <div style={{ color: "#fca5a5", fontSize: "0.78rem", fontWeight: 700, marginBottom: "6px" }}>
                ⚠️ {gpsWatchError}
              </div>
            )}
            <div style={{ color: "#94a3b8", fontSize: "0.73rem", lineHeight: 1.45 }}>
              ℹ️ Browser/OS Privacy Notice: Location sharing requires your explicit browser/device GPS permission. Mobile &amp; desktop browsers may pause background GPS updates when the screen is locked or the tab is backgrounded.
            </div>
          </div>

          <div style={{ background: "rgba(2, 6, 23, 0.72)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "12px", padding: "14px" }}>
            <h4 style={{ margin: "0 0 10px", color: "#34d399", fontSize: "0.92rem" }}>2. Authorize Specific Users or Roles</h4>
            <form onSubmit={handleGrantPermission} style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
              <select
                value={grantRole}
                onChange={(e) => setGrantRole(e.target.value)}
                style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "#fff", fontSize: "0.82rem" }}
              >
                {ROLE_GRANT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <input
                type="email"
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
                placeholder="Or enter a specific user's email (optional — overrides role)"
                style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid #334155", background: "#0f172a", color: "#fff", fontSize: "0.82rem" }}
              />
              <button
                type="submit"
                disabled={ownerBusy || !myStatus?.device}
                style={{ background: "#059669", color: "#fff", border: "none", borderRadius: "8px", padding: "9px", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer" }}
              >
                ➕ Grant Location Access
              </button>
            </form>

            <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "#cbd5e1", marginBottom: "6px" }}>
              Active Authorized Accounts / Roles ({myStatus?.activePermissions?.length || 0})
            </div>
            {(myStatus?.activePermissions || []).length === 0 ? (
              <div style={{ color: "#94a3b8", fontSize: "0.78rem" }}>
                No external accounts authorized yet. Only you can view your location until you grant access.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "160px", overflowY: "auto" }}>
                {myStatus.activePermissions.map((p) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", background: "rgba(15, 23, 42, 0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "7px 10px", fontSize: "0.78rem" }}>
                    <div>
                      <strong style={{ color: "#f8fafc" }}>{p.granteeLabel || p.granteeEmail || p.granteeRole}</strong>
                      <div style={{ color: "#94a3b8", fontSize: "0.7rem" }}>
                        Expires: {p.expiresAt ? new Date(p.expiresAt).toLocaleString() : "Manual revoke"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevokePermission(p.id)}
                      style={{ background: "rgba(239, 68, 68, 0.2)", color: "#fca5a5", border: "1px solid #ef4444", borderRadius: "6px", padding: "4px 9px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}

            {ownerNotice && (
              <div style={{ marginTop: "10px", padding: "8px 10px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 700, background: ownerNotice.type === "success" ? "rgba(16, 185, 129, 0.18)" : "rgba(239, 68, 68, 0.2)", color: ownerNotice.type === "success" ? "#6ee7b7" : "#fecaca", border: `1px solid ${ownerNotice.type === "success" ? "#10b981" : "#ef4444"}` }}>
                {ownerNotice.text}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
