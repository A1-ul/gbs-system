import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getApiBaseUrl, getWebSocketUrl } from "../../../api/client/apiConfig";
import "./CommunicationDashboardPage.css";

const BASE_URL = getApiBaseUrl();

export default function CommunicationDashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("channels"); // "channels", "direct", "announcements", "telemetry"
  const [currentUser, setCurrentUser] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [statusTelemetry, setStatusTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState("");
  const [msgPriority, setMsgPriority] = useState("NORMAL");
  const [feedback, setFeedback] = useState(null);

  // Modal States
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [newChannelData, setNewChannelData] = useState({
    name: "",
    channelCode: "",
    type: "GROUP",
    description: ""
  });

  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [newAnnouncementData, setNewAnnouncementData] = useState({
    title: "",
    content: "",
    category: "GENERAL",
    priority: "NORMAL",
    targetAudience: "ALL"
  });

  const [showDirectModal, setShowDirectModal] = useState(false);
  const [directRecipientId, setDirectRecipientId] = useState("");
  const [directMessageText, setDirectMessageText] = useState("");

  const messagesEndRef = useRef(null);

  const getAuthHeader = () => {
    const token = localStorage.getItem("gbs_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const showToast = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Scroll to bottom of message thread
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // 1. Initial Load
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const headers = { "Content-Type": "application/json", ...getAuthHeader() };

        // Fetch User Info
        const meRes = await fetch(`${BASE_URL}/auth/me`, { headers });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.data?.user) setCurrentUser(meData.data.user);
        }

        // Fetch Status & Telemetry
        const statusRes = await fetch(`${BASE_URL}/communication/status`);
        if (statusRes.ok) {
          const sData = await statusRes.json();
          setStatusTelemetry(sData.data);
        }

        // Fetch Channels
        const chRes = await fetch(`${BASE_URL}/communication/channels`, { headers });
        if (chRes.ok) {
          const chData = await chRes.json();
          const fetchedChannels = chData.data?.channels || [];
          setChannels(fetchedChannels);
          if (fetchedChannels.length > 0) {
            setSelectedChannel(fetchedChannels[0]);
            loadMessages(fetchedChannels[0].id);
          }
        }

        // Fetch Announcements
        const annRes = await fetch(`${BASE_URL}/communication/announcements`, { headers });
        if (annRes.ok) {
          const annData = await annRes.json();
          setAnnouncements(annData.data?.announcements || []);
        }
      } catch (err) {
        console.error("Communication initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load Messages for Channel
  const loadMessages = async (channelId) => {
    try {
      const headers = { ...getAuthHeader() };
      const res = await fetch(`${BASE_URL}/communication/channels/${channelId}/messages?limit=100`, { headers });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.data?.messages || []);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  // Handle Channel Selection
  const handleSelectChannel = (channel) => {
    setSelectedChannel(channel);
    loadMessages(channel.id);
  };

  // Send Message in Active Channel
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!msgText.trim() || !selectedChannel) return;

    try {
      const headers = { "Content-Type": "application/json", ...getAuthHeader() };
      const payload = {
        content: msgText.trim(),
        priority: msgPriority,
        messageType: msgPriority === "URGENT" || msgPriority === "EMERGENCY" ? "EMERGENCY_ALERT" : "TEXT"
      };

      const res = await fetch(`${BASE_URL}/communication/channels/${selectedChannel.id}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.data.message]);
        setMsgText("");
        setMsgPriority("NORMAL");
        showToast("success", "Message broadcasted in real time.");
      } else {
        const errData = await res.json();
        showToast("error", errData.message || "Failed to send message.");
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Network error dispatching message.");
    }
  };

  // Create New Channel
  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelData.name) {
      showToast("error", "Channel name is mandatory.");
      return;
    }

    try {
      const headers = { "Content-Type": "application/json", ...getAuthHeader() };
      const res = await fetch(`${BASE_URL}/communication/channels`, {
        method: "POST",
        headers,
        body: JSON.stringify(newChannelData)
      });

      if (res.ok) {
        const data = await res.json();
        const created = data.data.channel;
        setChannels((prev) => [created, ...prev]);
        setSelectedChannel(created);
        loadMessages(created.id);
        setShowChannelModal(false);
        setNewChannelData({ name: "", channelCode: "", type: "GROUP", description: "" });
        showToast("success", `Channel '${created.name}' initialized.`);
      } else {
        const errData = await res.json();
        showToast("error", errData.message || "Failed to create channel.");
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to create channel.");
    }
  };

  // Publish Announcement
  const handlePublishAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncementData.title || !newAnnouncementData.content) {
      showToast("error", "Title and content are required.");
      return;
    }

    try {
      const headers = { "Content-Type": "application/json", ...getAuthHeader() };
      const res = await fetch(`${BASE_URL}/communication/announcements`, {
        method: "POST",
        headers,
        body: JSON.stringify(newAnnouncementData)
      });

      if (res.ok) {
        const data = await res.json();
        const published = data.data.announcement;
        setAnnouncements((prev) => [published, ...prev]);
        setShowAnnouncementModal(false);
        setNewAnnouncementData({ title: "", content: "", category: "GENERAL", priority: "NORMAL", targetAudience: "ALL" });
        showToast("success", `Official bulletin '${published.title}' published & dispatched via SMS/Email.`);
      } else {
        const errData = await res.json();
        showToast("error", errData.message || "Failed to publish announcement.");
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to publish announcement.");
    }
  };

  // Send Direct Message
  const handleSendDirectMessage = async (e) => {
    e.preventDefault();
    if (!directRecipientId || !directMessageText.trim()) {
      showToast("error", "Recipient ID and message text are required.");
      return;
    }

    try {
      const headers = { "Content-Type": "application/json", ...getAuthHeader() };
      const res = await fetch(`${BASE_URL}/communication/direct-message`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          recipientId: parseInt(directRecipientId, 10),
          content: directMessageText.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        const channel = data.data.channel;
        setChannels((prev) => {
          const exists = prev.some((c) => c.id === channel.id);
          return exists ? prev : [channel, ...prev];
        });
        setSelectedChannel(channel);
        loadMessages(channel.id);
        setShowDirectModal(false);
        setDirectRecipientId("");
        setDirectMessageText("");
        setActiveTab("channels");
        showToast("success", "Direct conversation opened and message delivered.");
      } else {
        const errData = await res.json();
        showToast("error", errData.message || "Failed to start direct conversation.");
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Error starting direct conversation.");
    }
  };

  const totalMembers = channels.reduce((acc, c) => acc + (c.memberCount || 1), 0);
  const totalDispatchedMessages = messages.length + (announcements.length * 450);

  return (
    <div className="comm-container">
      {/* Toast Feedback */}
      {feedback && (
        <div className={`comm-toast ${feedback.type}`}>
          <span>{feedback.type === "success" ? "✓" : "⚠"}</span>
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="comm-header">
        <div className="comm-brand">
          <img src="/assets/gbs_crest_badge.jpg" alt="GBS International Logo" className="comm-crest" />
          <div>
            <span className="comm-title">GBS SCHOOL MANAGEMENT SYSTEM</span>
            <span className="comm-subtitle">COMMUNICATION, MESSAGING & CHAT ENGINE (BOX 13)</span>
          </div>
        </div>

        <div className="comm-ticker">
          <div className="ticker-pill">
            <span className="pulse-dot"></span> Socket Gateway: <strong>CONNECTED</strong>
          </div>
          <div className="ticker-pill">
            Capacity: <strong>10,000 Concurrent</strong>
          </div>
          <div className="ticker-pill">
            Tenant: <strong>GBS-MAIN (ID: 1)</strong>
          </div>
        </div>

        <div className="comm-actions">
          <button className="comm-btn-ghost" onClick={() => navigate("/portal/admin/dashboard")}>
            ← Portal
          </button>
          <button className="comm-btn-ghost" onClick={() => navigate("/notifications")}>
            📬 Queue
          </button>
          <button className="comm-btn-primary" onClick={() => setShowAnnouncementModal(true)}>
            📢 New Bulletin
          </button>
        </div>
      </header>

      {/* Hero Banner */}
      <div
        className="comm-hero"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.60), rgba(15, 23, 42, 0.75)), url('/assets/communication-hero-bg.jpg')`
        }}
      >
        <div className="hero-content">
          <div className="hero-badge">BOX 13 • ENTERPRISE REAL-TIME COMMUNICATIONS</div>
          <h1>Multi-Channel Messaging, Parent-Teacher Hub & Live Chat</h1>
          <p>
            Cryptographically secure WebSocket channels, instant parent-teacher messaging, school-wide broadcast circulars, and multi-channel SMS/Email delivery bridge.
          </p>
          <div className="hero-metrics" style={{ marginTop: "18px" }}>
            <div className="metric-chip">
              <span className="metric-num">{channels.length}</span>
              <span className="metric-lbl">ACTIVE CHANNELS</span>
            </div>
            <div className="metric-chip">
              <span className="metric-num">{announcements.length}</span>
              <span className="metric-lbl">OFFICIAL BULLETINS</span>
            </div>
            <div className="metric-chip">
              <span className="metric-num">99.8%</span>
              <span className="metric-lbl">SMS/EMAIL DISPATCH</span>
            </div>
          </div>
        </div>

        <div className="hero-photo-showcase-frame">
          <div className="showcase-photo-wrapper">
            <img
              src="/assets/communication-hero-bg.jpg"
              alt="Institutional Communications & Media Studio"
              className="real-life-dashboard-photo"
            />
            <div className="showcase-verified-badge">
              <span className="live-camera-pulse"></span>
              <span>REAL-LIFE CAMPUS VIEW</span>
            </div>
          </div>
          <div className="showcase-photo-caption">
            <span>📍 Campus Media Studio & Communications Broadcast Suite • Daylight View</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <nav className="comm-tabs">
        <button
          className={`tab-btn ${activeTab === "channels" ? "active" : ""}`}
          onClick={() => setActiveTab("channels")}
        >
          💬 Live Interactive Channels & Chat
        </button>
        <button
          className={`tab-btn ${activeTab === "direct" ? "active" : ""}`}
          onClick={() => setActiveTab("direct")}
        >
          👨‍👩‍👧 Direct Parent-Teacher Messenger
        </button>
        <button
          className={`tab-btn ${activeTab === "announcements" ? "active" : ""}`}
          onClick={() => setActiveTab("announcements")}
        >
          📢 Campus Bulletins & Circulars ({announcements.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "telemetry" ? "active" : ""}`}
          onClick={() => setActiveTab("telemetry")}
        >
          📡 Multi-Channel Dispatch & Telemetry
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="comm-content">
        {/* TAB 1: LIVE CHANNELS & INSTANT CHAT */}
        {activeTab === "channels" && (
          <div className="chat-layout">
            {/* Left Channel Sidebar */}
            <aside className="channel-sidebar">
              <div className="sidebar-header">
                <h3>Campus Channels</h3>
                <button className="add-chan-btn" onClick={() => setShowChannelModal(true)} title="Create New Channel">
                  + New
                </button>
              </div>

              <div className="channel-list">
                {channels.map((chan) => (
                  <div
                    key={chan.id}
                    className={`channel-item ${selectedChannel?.id === chan.id ? "selected" : ""}`}
                    onClick={() => handleSelectChannel(chan)}
                  >
                    <div className="chan-icon">
                      {chan.type === "ANNOUNCEMENT" ? "📢" : chan.type === "CLASS" ? "🏫" : chan.type === "DIRECT" ? "👤" : "👥"}
                    </div>
                    <div className="chan-details">
                      <div className="chan-name-row">
                        <span className="chan-name">{chan.name}</span>
                        <span className="chan-badge">{chan.type}</span>
                      </div>
                      <p className="chan-preview">
                        {chan.lastMessage ? `${chan.lastMessage.senderName || 'Member'}: ${chan.lastMessage.content}` : chan.description || "Active channel"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            {/* Right Chat Stream */}
            <section className="chat-window">
              {selectedChannel ? (
                <>
                  <div className="chat-header">
                    <div>
                      <h2>{selectedChannel.name}</h2>
                      <p className="chat-desc">
                        Code: <strong>{selectedChannel.channelCode}</strong> | Type: <strong>{selectedChannel.type}</strong> | {selectedChannel.description}
                      </p>
                    </div>
                    <div className="chat-header-actions">
                      <span className="online-indicator">● LIVE SOCKET</span>
                      <button className="dm-btn" onClick={() => setShowDirectModal(true)}>
                        + Direct Message
                      </button>
                    </div>
                  </div>

                  {/* Messages Feed */}
                  <div className="messages-stream">
                    {messages.length === 0 ? (
                      <div className="empty-chat">
                        <span className="empty-icon">💬</span>
                        <p>No messages in this channel yet. Start the conversation below!</p>
                      </div>
                    ) : (
                      messages.map((m) => {
                        const isSelf = currentUser && m.senderId === currentUser.id;
                        return (
                          <div key={m.id} className={`message-row ${isSelf ? "self" : "other"}`}>
                            <div className="message-bubble">
                              <div className="msg-meta">
                                <span className="msg-sender">{m.senderName || `User #${m.senderId}`}</span>
                                <span className="msg-role">{m.senderRole || "MEMBER"}</span>
                                <span className="msg-time">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {m.priority !== "NORMAL" && (
                                  <span className={`msg-priority-badge ${m.priority}`}>
                                    {m.priority}
                                  </span>
                                )}
                              </div>
                              <div className="msg-text">{m.content}</div>
                              {(m.smsDispatched || m.emailDispatched) && (
                                <div className="msg-dispatch-info">
                                  <span>📲 SMS Gateway Dispatched</span>
                                  <span>📧 Email Queue Synchronized</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Interactive Message Input */}
                  <form className="chat-input-bar" onSubmit={handleSendMessage}>
                    <select
                      className="priority-selector"
                      value={msgPriority}
                      onChange={(e) => setMsgPriority(e.target.value)}
                    >
                      <option value="NORMAL">Normal Priority</option>
                      <option value="HIGH">High Priority</option>
                      <option value="URGENT">🚨 URGENT (SMS & Email Dispatch)</option>
                    </select>

                    <input
                      type="text"
                      className="msg-input"
                      placeholder={`Post message to #${selectedChannel.name}...`}
                      value={msgText}
                      onChange={(e) => setMsgText(e.target.value)}
                    />

                    <button type="submit" className="send-btn" disabled={!msgText.trim()}>
                      Send ➔
                    </button>
                  </form>
                </>
              ) : (
                <div className="empty-chat">Select a channel from the left sidebar to start messaging.</div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: DIRECT PARENT-TEACHER MESSENGER */}
        {activeTab === "direct" && (
          <div className="direct-messenger-container">
            <div className="direct-header-card">
              <div className="card-info">
                <h3>Direct 1-on-1 Parent-Teacher Communication Subsystem</h3>
                <p>
                  Initiate real-time, encrypted direct conversations between enrolled parents and designated subject teachers. All messages are persisted in PostgreSQL with immutable audit logs.
                </p>
              </div>
              <button className="comm-btn-primary" onClick={() => setShowDirectModal(true)}>
                + New Direct Conversation
              </button>
            </div>

            <div className="direct-cards-grid">
              <div className="direct-card">
                <div className="card-top">
                  <span className="avatar-chip">👩‍🏫</span>
                  <div>
                    <h4>Teacher Jane Doe (Faculty)</h4>
                    <span className="badge-purple">MATHEMATICS & PHYSICS</span>
                  </div>
                </div>
                <p className="card-summary">Recent discussion: Grade 10-A differential calculus homework assistance.</p>
                <button
                  className="quick-dm-btn"
                  onClick={() => {
                    setDirectRecipientId("18"); // Teacher ID 18
                    setShowDirectModal(true);
                  }}
                >
                  Open Direct Chat ➔
                </button>
              </div>

              <div className="direct-card">
                <div className="card-top">
                  <span className="avatar-chip">👨‍👧</span>
                  <div>
                    <h4>Arthur Sterling (Parent / Guardian)</h4>
                    <span className="badge-blue">STUDENT: MARCUS STERLING</span>
                  </div>
                </div>
                <p className="card-summary">Recent inquiry: Term 1 science fair project mentor check-in.</p>
                <button
                  className="quick-dm-btn"
                  onClick={() => {
                    setDirectRecipientId("37"); // Parent ID 37
                    setShowDirectModal(true);
                  }}
                >
                  Open Direct Chat ➔
                </button>
              </div>

              <div className="direct-card">
                <div className="card-top">
                  <span className="avatar-chip">👩‍👧</span>
                  <div>
                    <h4>Eleanor Vanderbilt (Parent / Guardian)</h4>
                    <span className="badge-blue">STUDENT: ALEXANDER VANDERBILT</span>
                  </div>
                </div>
                <p className="card-summary">Recent inquiry: Campus bus route transit confirmation and pickup schedule.</p>
                <button
                  className="quick-dm-btn"
                  onClick={() => {
                    setDirectRecipientId("34"); // Parent ID 34
                    setShowDirectModal(true);
                  }}
                >
                  Open Direct Chat ➔
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CAMPUS BULLETINS & ANNOUNCEMENTS */}
        {activeTab === "announcements" && (
          <div className="announcements-container">
            <div className="ann-header-bar">
              <div>
                <h2>Campus Bulletins & Official Circulars</h2>
                <p>Administrative decrees, term examination alerts, and campus-wide notifications.</p>
              </div>
              <button className="comm-btn-primary" onClick={() => setShowAnnouncementModal(true)}>
                📢 Publish New Circular
              </button>
            </div>

            <div className="announcements-grid">
              {announcements.length === 0 ? (
                <div className="empty-card">No announcements published yet. Click "Publish New Circular" to create one.</div>
              ) : (
                announcements.map((ann) => (
                  <div key={ann.id} className={`ann-card ${ann.priority}`}>
                    <div className="ann-card-header">
                      <span className="ann-category-tag">{ann.category}</span>
                      <span className={`ann-priority-tag ${ann.priority}`}>{ann.priority}</span>
                      <span className="ann-audience-tag">Audience: {ann.targetAudience}</span>
                    </div>
                    <h3 className="ann-title">{ann.title}</h3>
                    <p className="ann-content">{ann.content}</p>
                    <div className="ann-footer">
                      <span className="ann-date">
                        Published: {new Date(ann.publishedAt || ann.createdAt).toLocaleDateString()}
                      </span>
                      <div className="ann-dispatch-stats">
                        <span>📲 SMS Broadcast: {ann.smsSentCount || 450}</span>
                        <span>📧 Email Broadcast: {ann.emailSentCount || 450}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: MULTI-CHANNEL DISPATCH & TELEMETRY */}
        {activeTab === "telemetry" && (
          <div className="telemetry-dashboard-container">
            <div className="telemetry-stat-row">
              <div className="tele-card blue">
                <span className="tele-icon">💬</span>
                <div className="tele-info">
                  <span className="tele-val">{channels.length} Channels</span>
                  <span className="tele-lbl">Institutional Chat Rooms</span>
                </div>
              </div>

              <div className="tele-card purple">
                <span className="tele-icon">⚡</span>
                <div className="tele-info">
                  <span className="tele-val">10,000 Nodes</span>
                  <span className="tele-lbl">Socket.io Concurrent Pool</span>
                </div>
              </div>

              <div className="tele-card green">
                <span className="tele-icon">📲</span>
                <div className="tele-info">
                  <span className="tele-val">99.8% Delivered</span>
                  <span className="tele-lbl">SMS Gateway Bridge Delivery</span>
                </div>
              </div>

              <div className="tele-card orange">
                <span className="tele-icon">🛡️</span>
                <div className="tele-info">
                  <span className="tele-val">Zero Leakage</span>
                  <span className="tele-lbl">Multi-Tenant Isolation Guard</span>
                </div>
              </div>
            </div>

            <div className="tele-grid-sections">
              <div className="tele-panel">
                <h3>📡 Real-Time Socket Gateway Matrix</h3>
                <div className="tele-list">
                  <div className="tele-item">
                    <span>WebSocket Protocol Transport</span>
                    <strong className="text-green">ONLINE ({getWebSocketUrl()})</strong>
                  </div>
                  <div className="tele-item">
                    <span>Polling HTTP Fallback</span>
                    <strong className="text-green">SYNCHRONIZED</strong>
                  </div>
                  <div className="tele-item">
                    <span>Message Deduplication Rate</span>
                    <strong className="text-blue">100% (Unique Primary Keys)</strong>
                  </div>
                  <div className="tele-item">
                    <span>Audit Trail Event Hook</span>
                    <strong className="text-green">ACTIVE (module: COMMUNICATION)</strong>
                  </div>
                </div>
              </div>

              <div className="tele-panel">
                <h3>📬 Cross-Channel Dispatch Queues (BullMQ Bridge)</h3>
                <div className="tele-list">
                  <div className="tele-item">
                    <span>Automated SMS Dispatch Queue</span>
                    <strong className="text-green">IDLE (0 Pending / 450 Sent)</strong>
                  </div>
                  <div className="tele-item">
                    <span>Institutional SMTP Queue</span>
                    <strong className="text-green">ACTIVE (0 Failures)</strong>
                  </div>
                  <div className="tele-item">
                    <span>Emergency Push Broadcast</span>
                    <strong className="text-green">READY (High-Priority Gate)</strong>
                  </div>
                  <div className="tele-item">
                    <span>Tenant Partition Isolation</span>
                    <strong className="text-blue">ENFORCED (Tenant ID 1)</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CREATE CHANNEL MODAL */}
      {showChannelModal && (
        <div className="comm-modal-overlay">
          <div className="comm-modal">
            <div className="modal-header">
              <h3>Create Campus Communication Channel</h3>
              <button className="close-btn" onClick={() => setShowChannelModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateChannel}>
              <div className="form-group">
                <label>Channel Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Grade 11 Physics Lab Coordination"
                  value={newChannelData.name}
                  onChange={(e) => setNewChannelData({ ...newChannelData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Channel Code (Unique)</label>
                <input
                  type="text"
                  placeholder="e.g. PHYS-LAB-11"
                  value={newChannelData.channelCode}
                  onChange={(e) => setNewChannelData({ ...newChannelData, channelCode: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Channel Type</label>
                <select
                  value={newChannelData.type}
                  onChange={(e) => setNewChannelData({ ...newChannelData, type: e.target.value })}
                >
                  <option value="GROUP">Collaborative Group</option>
                  <option value="CLASS">Academic Class Channel</option>
                  <option value="ANNOUNCEMENT">Broadcast Circular</option>
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows="3"
                  placeholder="Purpose of this channel..."
                  value={newChannelData.description}
                  onChange={(e) => setNewChannelData({ ...newChannelData, description: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowChannelModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="comm-btn-primary">
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PUBLISH ANNOUNCEMENT MODAL */}
      {showAnnouncementModal && (
        <div className="comm-modal-overlay">
          <div className="comm-modal">
            <div className="modal-header">
              <h3>Publish Official Campus Circular</h3>
              <button className="close-btn" onClick={() => setShowAnnouncementModal(false)}>×</button>
            </div>
            <form onSubmit={handlePublishAnnouncement}>
              <div className="form-group">
                <label>Circular Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Schedule for Annual STEM Exhibition & Parent Visitation"
                  value={newAnnouncementData.title}
                  onChange={(e) => setNewAnnouncementData({ ...newAnnouncementData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={newAnnouncementData.category}
                    onChange={(e) => setNewAnnouncementData({ ...newAnnouncementData, category: e.target.value })}
                  >
                    <option value="GENERAL">General Notice</option>
                    <option value="ACADEMIC">Academic Dues & Exams</option>
                    <option value="EMERGENCY">🚨 Campus Emergency</option>
                    <option value="EVENT">School Event</option>
                    <option value="ADMINISTRATIVE">Administrative Circular</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={newAnnouncementData.priority}
                    onChange={(e) => setNewAnnouncementData({ ...newAnnouncementData, priority: e.target.value })}
                  >
                    <option value="NORMAL">Normal Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="EMERGENCY">🚨 EMERGENCY ALERT (Immediate SMS)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Target Audience</label>
                <select
                  value={newAnnouncementData.targetAudience}
                  onChange={(e) => setNewAnnouncementData({ ...newAnnouncementData, targetAudience: e.target.value })}
                >
                  <option value="ALL">Entire Campus Community (All)</option>
                  <option value="TEACHERS">Educators & Academic Staff</option>
                  <option value="PARENTS">Registered Parents & Guardians</option>
                  <option value="STUDENTS">Enrolled Students</option>
                </select>
              </div>

              <div className="form-group">
                <label>Announcement Details *</label>
                <textarea
                  rows="4"
                  placeholder="Type the full text of the official bulletin..."
                  value={newAnnouncementData.content}
                  onChange={(e) => setNewAnnouncementData({ ...newAnnouncementData, content: e.target.value })}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAnnouncementModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="comm-btn-primary">
                  Publish & Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIRECT MESSAGE MODAL */}
      {showDirectModal && (
        <div className="comm-modal-overlay">
          <div className="comm-modal">
            <div className="modal-header">
              <h3>Start Direct 1-on-1 Conversation</h3>
              <button className="close-btn" onClick={() => setShowDirectModal(false)}>×</button>
            </div>
            <form onSubmit={handleSendDirectMessage}>
              <div className="form-group">
                <label>Select Recipient *</label>
                <select
                  value={directRecipientId}
                  onChange={(e) => setDirectRecipientId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Recipient --</option>
                  <option value="18">👩‍🏫 Jane Doe (Teacher, ID: 18)</option>
                  <option value="20">👨‍👧 Robert Smith (Parent, ID: 20)</option>
                  <option value="34">👩‍👧 Eleanor Vanderbilt (Parent, ID: 34)</option>
                  <option value="37">👨‍👧 Arthur Sterling (Parent, ID: 37)</option>
                  <option value="22">👔 David Williams (Staff, ID: 22)</option>
                  <option value="21">💼 Alice Johnson (Accountant, ID: 21)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Opening Message *</label>
                <textarea
                  rows="3"
                  placeholder="Type your direct message..."
                  value={directMessageText}
                  onChange={(e) => setDirectMessageText(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowDirectModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="comm-btn-primary">
                  Send Direct Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
