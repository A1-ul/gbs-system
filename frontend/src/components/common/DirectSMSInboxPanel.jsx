import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../api/client/apiClient";

/**
 * Shared Receiver Inbox & Carrier Gateway Inspector for Direct Mobile SMS & Institutional Dispatches.
 * Queries GET /api/v1/sms/inbox and surfaces complete sender metadata + real carrier/handoff status.
 */
export default function DirectSMSInboxPanel({
  currentUser = {},
  onUnreadCountChange = null,
  onReplyToSender = null
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [carrierInfo, setCarrierInfo] = useState(null);
  const [lookupPhone, setLookupPhone] = useState(() => String(currentUser?.phone || "").trim());
  const [error, setError] = useState(null);

  const loadInboxAndStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const targetPhone = lookupPhone.trim() || currentUser?.phone || "";
      if (targetPhone) params.set("phone", targetPhone);
      if (currentUser?.email) params.set("email", currentUser.email);
      if (currentUser?.id) params.set("userId", String(currentUser.id));
      if (currentUser?.role) params.set("role", String(currentUser.role).toUpperCase());

      const [inboxRes, statusRes] = await Promise.all([
        apiClient.get(`/sms/inbox?${params.toString()}`),
        apiClient.get("/sms/status").catch(() => null)
      ]);

      const list = inboxRes?.data?.data?.messages || [];
      setMessages(list);
      const unread = list.filter((m) => !m.read).length;
      if (typeof onUnreadCountChange === "function") {
        onUnreadCountChange(unread);
      }
      if (statusRes?.data?.data) {
        setCarrierInfo(statusRes.data.data);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Unable to fetch received messages from server.");
    } finally {
      setLoading(false);
    }
  }, [lookupPhone, currentUser?.phone, currentUser?.email, currentUser?.id, currentUser?.role, onUnreadCountChange]);

  useEffect(() => {
    loadInboxAndStatus();
    const onRefresh = () => loadInboxAndStatus();
    window.addEventListener("gbs_direct_sms_updated", onRefresh);
    return () => window.removeEventListener("gbs_direct_sms_updated", onRefresh);
  }, [loadInboxAndStatus]);

  const handleMarkRead = async (msg) => {
    const targetId = msg.messageId || msg.id;
    try {
      await apiClient.patch(`/sms/inbox/${encodeURIComponent(targetId)}/read`);
      setMessages((prev) => {
        const next = prev.map((m) =>
          (m.messageId || m.id) === targetId ? { ...m, read: true, readAt: new Date().toISOString() } : m
        );
        if (typeof onUnreadCountChange === "function") {
          onUnreadCountChange(next.filter((x) => !x.read).length);
        }
        return next;
      });
    } catch { }
  };

  const unreadCount = messages.filter((m) => !m.read).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Honest Carrier Gateway Diagnostics */}
      <div
        style={{
          padding: "10px 12px",
          borderRadius: "10px",
          background: carrierInfo?.carrierConfigured
            ? "rgba(16, 185, 129, 0.12)"
            : "rgba(56, 189, 248, 0.1)",
          border: carrierInfo?.carrierConfigured
            ? "1px solid rgba(16, 185, 129, 0.4)"
            : "1px solid rgba(56, 189, 248, 0.35)",
          fontSize: "0.78rem",
          color: "#cbd5e1"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <strong style={{ color: carrierInfo?.carrierConfigured ? "#34d399" : "#38bdf8" }}>
            {carrierInfo?.carrierConfigured
              ? `📡 Live Telecom SMS Active (${(carrierInfo.configuredProviders || []).join(", ")})`
              : "📥 Live GBS Receiver Inbox + Phone SIM SMS Handoff"}
          </strong>
          <span style={{ color: "#94a3b8", fontSize: "0.72rem" }}>
            {unreadCount} Unread • {messages.length} Total
          </span>
        </div>
        {!carrierInfo?.carrierConfigured && (
          <div style={{ marginTop: "4px", fontSize: "0.72rem", color: "#94a3b8" }}>
            Messages dispatched to an exact mobile number, email, or school role are persisted immediately to the receiver&apos;s inbox with complete sender details. Add <code>ARKESEL_API_KEY</code>, <code>HUBTEL_CLIENT_ID</code>/<code>SECRET</code>, <code>MNOTIFY_API_KEY</code>, or <code>TWILIO_*</code> on the server for automatic cellular SMS relay.
          </div>
        )}
      </div>

      {/* Exact Phone Number Filter / Verification Bar */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          value={lookupPhone}
          onChange={(e) => setLookupPhone(e.target.value)}
          placeholder="Filter by recipient number (e.g. 0543294615 or +233...)"
          className="gbs-sms-input"
          style={{ flex: 1, minWidth: "210px" }}
        />
        <button
          type="button"
          onClick={loadInboxAndStatus}
          disabled={loading}
          style={{
            padding: "8px 14px",
            borderRadius: "8px",
            background: "rgba(56, 189, 248, 0.2)",
            border: "1px solid #38bdf8",
            color: "#38bdf8",
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          {loading ? "⏳ Loading..." : "🔄 Refresh Inbox"}
        </button>
      </div>

      {error && (
        <div style={{ padding: "8px 12px", borderRadius: "8px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#fca5a5", fontSize: "0.8rem" }}>
          {error}
        </div>
      )}

      {/* Received Messages List with Complete Sender Details */}
      {messages.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#94a3b8" }}>
          <div style={{ fontSize: "2rem", marginBottom: "6px" }}>📭</div>
          <div>No dispatched messages received yet for this account or mobile number.</div>
        </div>
      ) : (
        <div className="gbs-sms-history-list">
          {messages.map((item) => (
            <div
              key={item.messageId || item.id}
              className="gbs-sms-history-item"
              style={{
                border: item.read ? "1px solid rgba(148, 163, 184, 0.2)" : "1.5px solid rgba(56, 189, 248, 0.65)",
                background: item.read ? "rgba(15, 23, 42, 0.65)" : "rgba(14, 165, 233, 0.1)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ color: "#f8fafc", fontWeight: 800, fontSize: "0.9rem" }}>
                    From: {item.senderName || "Institutional Sender"}{" "}
                    <span style={{ color: "#38bdf8", fontSize: "0.74rem", fontWeight: 700 }}>
                      ({item.senderRole || "STAFF"})
                    </span>
                  </div>
                  <div style={{ fontSize: "0.73rem", color: "#94a3b8", marginTop: "2px" }}>
                    {item.schoolName && <span>🏫 {item.schoolName} • </span>}
                    {item.senderPhone && <span>📞 {item.senderPhone} • </span>}
                    {item.senderEmail && <span>✉️ {item.senderEmail}</span>}
                  </div>
                </div>
                <span
                  className="gbs-sms-tag-delivered"
                  style={{
                    background:
                      item.carrierStatus === "CARRIER_SMS_SENT"
                        ? "rgba(16, 185, 129, 0.2)"
                        : item.carrierStatus === "CARRIER_SMS_FAILED"
                          ? "rgba(239, 68, 68, 0.2)"
                          : "rgba(56, 189, 248, 0.18)",
                    color:
                      item.carrierStatus === "CARRIER_SMS_SENT"
                        ? "#34d399"
                        : item.carrierStatus === "CARRIER_SMS_FAILED"
                          ? "#fca5a5"
                          : "#38bdf8"
                  }}
                >
                  ● {item.carrierStatus || item.status || "IN_APP_DELIVERED"}
                </span>
              </div>

              {item.subject && (
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fde68a", marginBottom: "4px" }}>
                  {item.subject}
                </div>
              )}

              <p style={{ margin: "2px 0 8px", fontSize: "0.86rem", color: "#e2e8f0", whiteSpace: "pre-wrap" }}>
                {item.rawMessage || item.content}
              </p>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", fontSize: "0.72rem", color: "#94a3b8" }}>
                <span>
                  To: <strong>{item.recipientName || item.recipientPhone}</strong> ({item.recipientPhone}) • {new Date(item.sentAt || item.timestamp).toLocaleString()}
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  {!item.read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(item)}
                      style={{
                        padding: "3px 9px",
                        borderRadius: "6px",
                        background: "rgba(16, 185, 129, 0.2)",
                        border: "1px solid rgba(16, 185, 129, 0.45)",
                        color: "#34d399",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      ✓ Mark Read
                    </button>
                  )}
                  {typeof onReplyToSender === "function" && (item.senderPhone || item.senderName) && (
                    <button
                      type="button"
                      onClick={() => onReplyToSender(item)}
                      style={{
                        padding: "3px 9px",
                        borderRadius: "6px",
                        background: "rgba(56, 189, 248, 0.2)",
                        border: "1px solid rgba(56, 189, 248, 0.45)",
                        color: "#38bdf8",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      ↩️ Reply
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
