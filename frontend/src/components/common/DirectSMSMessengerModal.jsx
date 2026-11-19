import React, { useState, useEffect } from "react";
import apiClient from "../../api/client/apiClient";
import "./DirectSMSMessengerModal.css";
import DirectSMSInboxPanel from "./DirectSMSInboxPanel";

const PRESET_SCHOOL_CONTACTS = [
  { id: "HM-01", name: "Dr. Kwabena Frimpong", role: "HEADMASTER", phone: "+233-54-329-4615", department: "Executive Directorate" },
  { id: "TCH-02", name: "Mrs. Victoria Osei", role: "TEACHER", phone: "+233-24-411-8920", department: "Mathematics & STEM" },
  { id: "TCH-03", name: "Mr. Emmanuel Mensah", role: "TEACHER", phone: "+233-20-819-3341", department: "English Literature" },
  { id: "PRN-04", name: "Hajia Amina Bello", role: "PARENT", phone: "+233-55-901-2244", department: "Parent Association" },
  { id: "PRN-05", name: "Mr. David Darko", role: "PARENT", phone: "+233-24-389-1052", department: "PTA Chairman" },
  { id: "ACC-06", name: "Mr. Francis Addo", role: "ACCOUNTANT", phone: "+233-27-740-9921", department: "Finance & Accounts" },
  { id: "STF-07", name: "Officer Joseph Appiah", role: "STAFF", phone: "+233-50-612-4418", department: "Campus Security & Gates" },
  { id: "STU-08", name: "Alex Mensah", role: "STUDENT", phone: "+233-54-118-9042", department: "Grade 11 Science" }
];

const CARRIER_NETWORKS = [
  { id: "AUTO", label: "Auto-Detect Mobile Network", prefix: "All" },
  { id: "MTN_GH", label: "MTN Ghana (+233)", prefix: "024, 054, 055, 059" },
  { id: "TELECEL_GH", label: "Telecel Ghana (+233)", prefix: "020, 050" },
  { id: "AT_GH", label: "AirtelTigo Ghana (+233)", prefix: "027, 057, 026" },
  { id: "SAFARICOM", label: "Safaricom Kenya (+254)", prefix: "+254" },
  { id: "MTN_NG", label: "MTN / Airtel Nigeria (+234)", prefix: "+234" },
  { id: "GLOBAL", label: "Global International Gateway", prefix: "Worldwide" }
];

export default function DirectSMSMessengerModal({ isOpen, onClose, defaultRecipient = null }) {
  const currentUser = (() => {
    try {
      const stored = localStorage.getItem("gbs_user");
      if (stored) return JSON.parse(stored);
    } catch {}
    return { firstName: "System", lastName: "User", role: "STAFF", phone: "+233-54-329-4615" };
  })();

  const [recipientMode, setRecipientMode] = useState("DIRECTORY"); // "DIRECTORY" | "CUSTOM"
  const [selectedContactId, setSelectedContactId] = useState(defaultRecipient?.id || PRESET_SCHOOL_CONTACTS[1].id);
  const [customPhone, setCustomPhone] = useState(defaultRecipient?.phone || "");
  const [customName, setCustomName] = useState(defaultRecipient?.name || "");
  const [customRole, setCustomRole] = useState("CONTACT");
  const [selectedCarrier, setSelectedCarrier] = useState("AUTO");
  const [detectedCarrier, setDetectedCarrier] = useState("MTN Ghana (+233)");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [sentNotice, setSentNotice] = useState(null);
  const [activeTab, setActiveTab] = useState("COMPOSE"); // "COMPOSE" | "HISTORY"
  const [smsHistory, setSmsHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("gbs_user_direct_sms_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Carrier auto-detection on phone change
  useEffect(() => {
    const target = recipientMode === "DIRECTORY"
      ? (PRESET_SCHOOL_CONTACTS.find((c) => c.id === selectedContactId)?.phone || "")
      : customPhone;

    const clean = String(target || "").replace(/\D/g, "");
    if (clean.startsWith("23320") || clean.startsWith("23350") || clean.startsWith("020") || clean.startsWith("050")) {
      setDetectedCarrier("Telecel Ghana (+233)");
    } else if (clean.startsWith("23327") || clean.startsWith("23357") || clean.startsWith("23326") || clean.startsWith("027") || clean.startsWith("057") || clean.startsWith("026")) {
      setDetectedCarrier("AirtelTigo Ghana (+233)");
    } else if (clean.startsWith("233") || clean.startsWith("024") || clean.startsWith("054") || clean.startsWith("055") || clean.startsWith("059")) {
      setDetectedCarrier("MTN Ghana (+233)");
    } else if (clean.startsWith("254")) {
      setDetectedCarrier("Safaricom Kenya (+254)");
    } else if (clean.startsWith("234")) {
      setDetectedCarrier("MTN / Airtel Nigeria (+234)");
    } else if (clean.length > 5) {
      setDetectedCarrier("Global International Telecom Gateway");
    }
  }, [recipientMode, selectedContactId, customPhone]);

  if (!isOpen) return null;

  const currentRecipient = recipientMode === "DIRECTORY"
    ? PRESET_SCHOOL_CONTACTS.find((c) => c.id === selectedContactId) || PRESET_SCHOOL_CONTACTS[0]
    : { name: customName || "External Contact", phone: customPhone, role: customRole, department: "Custom Mobile" };

  const handleApplyTemplate = (txt) => {
    setMessageText(txt);
  };

  const handleSendDirectSMS = async (e) => {
    e.preventDefault();
    const finalPhone = recipientMode === "DIRECTORY" ? currentRecipient.phone : customPhone.trim();
    if (!finalPhone) {
      alert("Please specify a valid recipient mobile phone number.");
      return;
    }
    if (!messageText.trim()) {
      alert("Please enter your SMS message content.");
      return;
    }

    setSending(true);
    setSentNotice(null);

    const payload = {
      senderId: currentUser.id || "USR-2026",
      senderName: `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || currentUser.email || "System User",
      senderRole: currentUser.role || "STAFF",
      senderPhone: currentUser.phone || "+233-54-329-4615",
      recipientPhone: finalPhone,
      recipientName: currentRecipient.name,
      recipientRole: currentRecipient.role,
      message: messageText.trim(),
      carrierNetwork: selectedCarrier === "AUTO" ? detectedCarrier : selectedCarrier,
      tenantId: currentUser.tenantId || 1,
      schoolName: localStorage.getItem("gbs_tenant_name") || "GBS INTERNATIONAL SCHOOL"
    };

    try {
      const res = await apiClient.post("/sms/direct-send", payload);
      const data = res.data?.data || payload;

      const record = {
        id: data.messageId || `SMS-${Date.now()}`,
        recipientName: currentRecipient.name,
        recipientPhone: finalPhone,
        recipientRole: currentRecipient.role,
        message: messageText.trim(),
        carrierNetwork: data.carrierNetwork || detectedCarrier,
        status: "DELIVERED",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        date: new Date().toLocaleDateString()
      };

      const updatedHistory = [record, ...smsHistory];
      setSmsHistory(updatedHistory);
      try {
        localStorage.setItem("gbs_user_direct_sms_history", JSON.stringify(updatedHistory));
      } catch {}

      setSentNotice({
        status: "success",
        text: `SMS Dispatched via ${record.carrierNetwork}! Message ID: ${record.id} • Status: DELIVERED`
      });
      setMessageText("");
    } catch (err) {
      // Resilient fallback
      const fallbackRecord = {
        id: `SMS-${Date.now()}`,
        recipientName: currentRecipient.name,
        recipientPhone: finalPhone,
        recipientRole: currentRecipient.role,
        message: messageText.trim(),
        carrierNetwork: detectedCarrier,
        carrierStatus: "DISPATCH_FAILED",
        status: "FAILED (SERVER UNREACHABLE)",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        date: new Date().toLocaleDateString()
      };
      const updatedHistory = [fallbackRecord, ...smsHistory];
      setSmsHistory(updatedHistory);
      try {
        localStorage.setItem("gbs_user_direct_sms_history", JSON.stringify(updatedHistory));
      } catch {}

      const cleanTarget = String(recipientMode === "CUSTOM" ? customPhone : "").replace(/[^+\d]/g, "");
      const handoffUri = cleanTarget
        ? `sms:${cleanTarget}?body=${encodeURIComponent(messageText.trim())}`
        : null;

      setSentNotice({
        status: "error",
        text: "Server SMS gateway could not be reached. Do not mark as sent — retry or send directly from your device SMS app.",
        deviceSmsUri: handoffUri
      });
    } finally {
      setSending(false);
    }
  };

  const charCount = messageText.length;
  const segments = Math.ceil(charCount / 160) || 1;

  return (
    <div className="gbs-sms-modal-overlay" onClick={onClose}>
      <div className="gbs-sms-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="gbs-sms-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.8rem" }}>📱</span>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#38bdf8" }}>
                DIRECT MOBILE SMS MESSENGER GATEWAY
              </h3>
              <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                Send SMS directly between school users & external mobile network contacts • Carrier Linked
              </span>
            </div>
          </div>
          <button type="button" className="gbs-sms-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Navigation Tabs */}
        <div className="gbs-sms-tab-row">
          <button
            type="button"
            className={`gbs-sms-tab-btn ${activeTab === "COMPOSE" ? "active" : ""}`}
            onClick={() => setActiveTab("COMPOSE")}
          >
            ✍️ Compose Direct SMS
          </button>
          <button
            type="button"
            className={`gbs-sms-tab-btn ${activeTab === "INBOX" ? "active" : ""}`}
            onClick={() => setActiveTab("INBOX")}
          >
            📥 Received Inbox
          </button>
          <button
            type="button"
            className={`gbs-sms-tab-btn ${activeTab === "HISTORY" ? "active" : ""}`}
            onClick={() => setActiveTab("HISTORY")}
          >
            📋 Sent SMS History ({smsHistory.length})
          </button>
        </div>

        {activeTab === "INBOX" ? (
          <DirectSMSInboxPanel
            currentUser={currentUser}
            onReplyToSender={(item) => {
              setRecipientMode("CUSTOM");
              setCustomName(item.senderName || "");
              setCustomPhone(item.senderPhone || "");
              setActiveTab("COMPOSE");
            }}
          />
        ) : activeTab === "COMPOSE" ? (
          <form onSubmit={handleSendDirectSMS} className="gbs-sms-form">
            {/* Sender Badge */}
            <div className="gbs-sms-sender-banner">
              <span>Authorized Sender: <strong>{currentUser.firstName} {currentUser.lastName}</strong> ({currentUser.role})</span>
              <span className="gbs-sms-carrier-badge">● Active Mobile Gateway</span>
            </div>

            {/* Recipient Source Toggle */}
            <div className="gbs-sms-toggle-group">
              <label>Select Recipient Source:</label>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className={`gbs-sms-chip-btn ${recipientMode === "DIRECTORY" ? "active" : ""}`}
                  onClick={() => setRecipientMode("DIRECTORY")}
                >
                  🏫 Registered School User Directory
                </button>
                <button
                  type="button"
                  className={`gbs-sms-chip-btn ${recipientMode === "CUSTOM" ? "active" : ""}`}
                  onClick={() => setRecipientMode("CUSTOM")}
                >
                  📞 Any External Mobile Number
                </button>
              </div>
            </div>

            {/* Recipient Input Mode */}
            {recipientMode === "DIRECTORY" ? (
              <div className="gbs-sms-field">
                <label>Select School Contact (Headmaster, Teacher, Parent, Student, Staff):</label>
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="gbs-sms-select"
                >
                  {PRESET_SCHOOL_CONTACTS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.role} ({c.phone}) • {c.department}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="gbs-sms-field">
                  <label>Recipient Full Name:</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Mrs. Grace Addo (Parent)"
                    className="gbs-sms-input"
                  />
                </div>
                <div className="gbs-sms-field">
                  <label>Mobile Contact Number (Worldwide):</label>
                  <input
                    type="text"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="+233 54 329 4615 or 0244118920"
                    className="gbs-sms-input"
                    required
                  />
                </div>
              </div>
            )}

            {/* Carrier Network Linkage Indicator */}
            <div className="gbs-sms-network-banner">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.2rem" }}>📶</span>
                <div>
                  <strong style={{ color: "#34d399", fontSize: "0.85rem" }}>
                    Detected Mobile Contact Network: {detectedCarrier}
                  </strong>
                  <span style={{ display: "block", fontSize: "0.72rem", color: "#94a3b8" }}>
                    Direct cellular delivery acknowledgment enabled
                  </span>
                </div>
              </div>
              <select
                value={selectedCarrier}
                onChange={(e) => setSelectedCarrier(e.target.value)}
                className="gbs-sms-carrier-select"
              >
                {CARRIER_NETWORKS.map((net) => (
                  <option key={net.id} value={net.id}>{net.label}</option>
                ))}
              </select>
            </div>

            {/* Quick Templates */}
            <div className="gbs-sms-templates-row">
              <span style={{ fontSize: "0.74rem", color: "#94a3b8", fontWeight: 700 }}>Quick Templates:</span>
              <button
                type="button"
                className="gbs-sms-tpl-btn"
                onClick={() => handleApplyTemplate("Notice: Please be informed that today's afternoon academic classes and study circle commence at 2:00 PM.")}
              >
                📢 Class Time Notice
              </button>
              <button
                type="button"
                className="gbs-sms-tpl-btn"
                onClick={() => handleApplyTemplate("Gentle reminder: Please review and sign off on your ward's weekly homework assignment on the GBS Portal.")}
              >
                📚 Homework Alert
              </button>
              <button
                type="button"
                className="gbs-sms-tpl-btn"
                onClick={() => handleApplyTemplate("Emergency campus notice: Please contact the school administration or visit the Headmaster portal immediately.")}
              >
                🚨 Urgent Alert
              </button>
            </div>

            {/* Message Body */}
            <div className="gbs-sms-field">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <label>SMS Message Body Content:</label>
                <span style={{ fontSize: "0.72rem", color: charCount > 160 ? "#fbbf24" : "#94a3b8" }}>
                  {charCount} characters • {segments} SMS segment(s)
                </span>
              </div>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your SMS message directly to this contact..."
                rows={4}
                className="gbs-sms-textarea"
                required
              />
            </div>

            {/* Feedback Alert */}
            {sentNotice && (
              <div className={`gbs-sms-notice ${sentNotice.status}`} style={{ flexWrap: "wrap", gap: "8px" }}>
                <span>{sentNotice.text}</span>
                {sentNotice.deviceSmsUri && (
                  <a
                    href={sentNotice.deviceSmsUri}
                    style={{
                      background: "rgba(56, 189, 248, 0.25)",
                      border: "1px solid #38bdf8",
                      color: "#38bdf8",
                      padding: "3px 10px",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      textDecoration: "none"
                    }}
                  >
                    📲 Send via Phone SMS App
                  </a>
                )}
                <button type="button" onClick={() => setSentNotice(null)}>✕</button>
              </div>
            )}

            {/* Actions */}
            <div className="gbs-sms-footer-actions">
              <button type="button" className="gbs-sms-btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="gbs-sms-btn-send" disabled={sending}>
                {sending ? "⏳ Dispatching to Mobile Network..." : "📤 Dispatch Direct Mobile SMS"}
              </button>
            </div>
          </form>
        ) : (
          /* History View */
          <div className="gbs-sms-history-container">
            {smsHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#94a3b8" }}>
                <span style={{ fontSize: "2rem" }}>📭</span>
                <p>No SMS messages dispatched yet in this session.</p>
              </div>
            ) : (
              <div className="gbs-sms-history-list">
                {smsHistory.map((item) => (
                  <div key={item.id} className="gbs-sms-history-item">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <strong style={{ color: "#f8fafc" }}>{item.recipientName} ({item.recipientPhone})</strong>
                      <span className="gbs-sms-tag-delivered">● {item.status}</span>
                    </div>
                    <p style={{ margin: "2px 0 6px", fontSize: "0.82rem", color: "#cbd5e1" }}>
                      "{item.message}"
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#94a3b8", flexWrap: "wrap", gap: "6px" }}>
                      <span>Network: {item.carrierNetwork}</span>
                      <span>{item.date} • {item.timestamp} • ID: {item.id}</span>
                    </div>
                    {item.deviceSmsUri && (
                      <div style={{ marginTop: "6px" }}>
                        <a
                          href={item.deviceSmsUri}
                          style={{ color: "#38bdf8", fontSize: "0.74rem", fontWeight: 700, textDecoration: "underline" }}
                        >
                          📲 Send via Phone SMS App
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
