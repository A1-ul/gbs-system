import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import WindowControlsBar from "../../../components/common/WindowControlsBar";
import TopCenterSystemBanner from "../../../components/common/TopCenterSystemBanner";
import "./GlobalEducationalNewsPage.css";

const EDUCATIONAL_NEWS_DATA = [
  {
    id: "NEWS-001",
    title: "Ghana Education Service & WAEC Announce Universal Digital Exam Center Rollout",
    subtitle: "Over 500 secondary schools transition to secure computer-based testing, instant OMR grading, and digital transcripts.",
    region: "Africa",
    country: "Ghana",
    flag: "🇬🇭",
    category: "Policy & Examinations",
    categoryColor: "#38bdf8",
    publishedAt: "November 16, 2026",
    author: "GES Academic Policy Directorate",
    readTime: "4 min read",
    videoDuration: "03:15",
    videoUrl: "/videos/video1_headmaster_role_guide.mp4",
    posterImage: "/assets/real/headmaster_desk.jpg",
    summary: "The Ministry of Education in partnership with regional examination councils has unveiled the 2026/2027 Digital Examination Transformation Initiative. The framework eliminates paper leakages through encrypted terminal scripts, automated bubble verification, and immediate publication of school-branded results.",
    fullContent: `ACCRA, GHANA — The Ghana Education Service (GES), alongside international examination partners, has announced a nationwide transition toward automated digital examination and computer-based evaluation across secondary and basic schools.

Key Highlights of the Initiative:
1. Automated Bubble & OMR Paper Scanning: Schools equipped with GBS AI OMR scanner technology can now grade terminal examination papers in 1.2 seconds, removing weekend marking delays and publishing instant reports.
2. Direct Parent & Scholar Notifications: Examination scores, subject breakdowns, and class rankings are synchronized directly to parent and student portals within minutes of teacher verification.
3. Anti-Tamper Cryptographic Credentials: Every report card and academic transcript issued carries a unique verification code and official institutional letterhead, verifiable by employers and universities worldwide.
4. Equitable Access for Rural Campuses: Offline-first synchronization ensures that schools with intermittent internet connectivity maintain full examination schedules locally without interruption.

Proprietors, Headmasters, and education directors across all regions are encouraged to integrate their examination desks into approved digital management systems.`
  },
  {
    id: "NEWS-002",
    title: "Kenya's Competency-Based Curriculum (CBC) Integrates Hands-On Coding & Robotics in Primary Schools",
    subtitle: "Young scholars in Nairobi and Mombasa demonstrate autonomous solar-powered weather stations and interactive learning apps.",
    region: "Africa",
    country: "Kenya",
    flag: "🇰🇪",
    category: "STEM & Robotics",
    categoryColor: "#10b981",
    publishedAt: "November 14, 2026",
    author: "East African Educational Innovation Forum",
    readTime: "5 min read",
    videoDuration: "02:45",
    videoUrl: "/videos/video3_student_learning_guide.mp4",
    posterImage: "/assets/real_scene3_student_elearning.jpg",
    summary: "Primary and secondary schools across Kenya are achieving outstanding milestones under the Competency-Based Curriculum. Students collaborate in interactive coding clubs, pair programming workshops, and peer-to-peer study conferences to build real-world digital tools.",
    fullContent: `NAIROBI, KENYA — In a landmark educational showcase at the Kenya Institute of Curriculum Development (KICD), young scholars from public and private institutions presented innovative computing solutions created during peer study circles.

Curricular Advances Highlighted:
1. Early Computational Thinking: Grade 4 to Grade 8 learners are introduced to block-based programming, Python fundamentals, and logic flowcharts.
2. Peer Cooperative Learning: Students use student conference lounges to break down mathematics problems, critique code, and prepare team presentations.
3. Community-Centered Engineering: Projects included IoT irrigation sensors for school gardens and mobile SMS emergency hubs connecting teachers and parents.
4. Teacher Facilitation: Instructors utilize recorded topic videos and synchronized audio notes to guide practical experiments while allowing students to learn at their own pace.

The showcase proves that cooperative digital learning environments foster creativity, problem-solving confidence, and technological fluency from early childhood.`
  },
  {
    id: "NEWS-003",
    title: "Finland's Phenomenon-Based Learning Model: Why Holistic Inquiry Leads Global Literacy Rankings",
    subtitle: "Breaking traditional subject barriers: Students study climate change through chemistry, geography, economics, and literature simultaneously.",
    region: "Europe",
    country: "Finland",
    flag: "🇫🇮",
    category: "Pedagogy & Teaching",
    categoryColor: "#a855f7",
    publishedAt: "November 12, 2026",
    author: "Nordic Education Research Council",
    readTime: "6 min read",
    videoDuration: "04:10",
    videoUrl: "/videos/video2_teacher_role_guide.mp4",
    posterImage: "/assets/real/teacher_scanner.jpg",
    summary: "Finnish classrooms continue to set global benchmarks by replacing rigid isolated subject hours with multidisciplinary phenomenon units where students conduct real-life research, debate ethics, and collaborate across age cohorts.",
    fullContent: `HELSINKI, FINLAND — Education researchers from across 40 countries gathered in Helsinki to review the longitudinal impact of Phenomenon-Based Learning (PhenoBL). The model integrates science, arts, and humanities into unified thematic investigations.

Key Educational Principles:
1. Real-World Relevance: Instead of studying physics formulas in isolation, students examine 'Clean Energy in Urban Transport', applying physics, mathematics, public policy, and persuasive essay writing.
2. Cooperative Student Ownership: Scholars work in small collaborative groups, managing shared research scratchpads, interviewing local experts, and presenting multimedia reports.
3. Teacher as Pedagogical Architect: Educators collaborate across departments, co-designing curricula and providing continuous formative feedback rather than high-stakes standardized drills.
4. Well-Being & Equity: A balanced school timetable with regular outdoor breaks ensures mental wellness and sustained academic enthusiasm.

Educational institutions worldwide are adopting these principles through modern modular timetable engines and interdisciplinary student forums.`
  },
  {
    id: "NEWS-004",
    title: "Global STEM Scholarships & International University Admissions: 2026/2027 Application Window",
    subtitle: "Top global institutions open fully-funded scholarship grants for outstanding international secondary school scholars.",
    region: "Americas",
    country: "United States",
    flag: "🇺🇸",
    category: "Higher Ed & Scholarships",
    categoryColor: "#f59e0b",
    publishedAt: "November 10, 2026",
    author: "International University Admissions Board",
    readTime: "5 min read",
    videoDuration: "03:40",
    videoUrl: "/videos/gbs_complete_system_roles_master_guide.mp4",
    posterImage: "/assets/real_scene5_accountant_finance.jpg",
    summary: "International university consortia have launched the 2026/2027 scholarship portal. Applicants with verified cryptographic transcripts, strong continuous assessment averages, and verified community contributions are eligible for 100% tuition, boarding, and research grants.",
    fullContent: `CAMBRIDGE, MA — The International Higher Education Consortium has officially opened nominations for the 2026/2027 Global Scholar Scholarships. Over 1,200 full scholarships are designated for students from Africa, Asia, and Latin America entering STEM and leadership programs.

Candidate Selection Metrics:
1. Verified Academic Transcripts: Applications must include official termly transcripts carrying the registered school crest and cryptographic verification code.
2. Continuous Assessment Records: Admissions committees evaluate multi-year performance trends, teacher recommendations, and standardized test percentiles.
3. Cooperative Leadership: Evidence of peer tutoring, student council involvement, or participation in school cooperative study networks strengthens applicant ranking.
4. Application Timelines: Early action deadlines close on December 15, 2026, with regular decision notifications dispatched by March 2027.

Secondary school headmasters and guidance counselors can generate official authenticated transcripts directly through their institutional management portal.`
  },
  {
    id: "NEWS-005",
    title: "Moral Education & Autonomous Classroom Stewardship in Tokyo Secondary Schools",
    subtitle: "Scholars participate in daily campus care, peer conflict resolution, and technological ethics workshops.",
    region: "Asia-Pacific",
    country: "Japan",
    flag: "🇯🇵",
    category: "Student Life & Ethics",
    categoryColor: "#ec4899",
    publishedAt: "November 08, 2026",
    author: "Asia-Pacific Child Development Society",
    readTime: "4 min read",
    videoDuration: "02:50",
    videoUrl: "/videos/video6_staff_hr_role_guide.mp4",
    posterImage: "/assets/real/staff_gate_turnstile.jpg",
    summary: "Japanese schools emphasize holistic character development (Tokkatsu). Students take responsibility for cleaning classrooms, serving nutritious lunches, and facilitating democratic class council discussions to resolve peer challenges cooperatively.",
    fullContent: `TOKYO, JAPAN — In Japanese primary and secondary education, academic excellence is anchored in communal respect, personal responsibility, and daily civic routines known as Tokkatsu.

Core Cultural Practices:
1. Classroom Stewardship (Oji): Students spend 15 minutes daily cleaning their classrooms and common corridors, instilling equality, humility, and pride in school facilities.
2. Communal Lunch Service (Kyushoku): Scholars rotate serving balanced meals to classmates, practicing hospitality, portion control, and nutritional mindfulness.
3. Democratic Class Meetings: Weekly homeroom forums allow students to voice opinions, organize cultural festivals, and agree on shared study goals cooperatively.
4. Digital Ethics: Modern modules educate scholars on responsible social media use, online privacy protection, and mutual respect in virtual communication spaces.`
  },
  {
    id: "NEWS-006",
    title: "UNESCO Global Education Report: Bridging the Digital Divide with Multi-Language Educational Portals",
    subtitle: "Emphasizing mother-tongue education (Twi, Ga, Ewe, Hausa, French, Spanish) alongside international curricula.",
    region: "Global",
    country: "UNESCO",
    flag: "🌐",
    category: "Languages & Inclusion",
    categoryColor: "#06b6d4",
    publishedAt: "November 05, 2026",
    author: "UNESCO Institute for Lifelong Learning",
    readTime: "6 min read",
    videoDuration: "03:20",
    videoUrl: "/videos/video4_parent_role_guide.mp4",
    posterImage: "/assets/real/parent_mobile.jpg",
    summary: "UNESCO's landmark report confirms that children grasp abstract mathematical and scientific foundations significantly faster when learning materials, teacher notes, and parent communications are available in their local mother tongues alongside English.",
    fullContent: `PARIS, FRANCE — The United Nations Educational, Scientific and Cultural Organization (UNESCO) has released its comprehensive 2026 Global Education Monitoring Report, urging education systems to integrate mother-tongue language engines into primary and secondary software portals.

Key Findings of the Report:
1. Cognitive Comprehension: Primary students taught basic STEM concepts in their home language (such as Twi, Ga, Ewe, Hausa, or Swahili) achieve up to 34% higher retention in advanced secondary mathematics.
2. Parent Engagement: When schools dispatch attendance alerts, fee receipts, and teacher messages translated into parents' native languages, parental involvement increases by over 60%.
3. Cultural Dignity: Integrating local dialects with international curricula builds pride, prevents linguistic marginalization, and fosters cross-cultural empathy.
4. Two-Mode Digital Translators: Modern software enabling real-time phrase translation and grammatical explanations represents a vital bridge for bilingual education globally.`
  }
];

export default function GlobalEducationalNewsPage() {
  const navigate = useNavigate();
  const [selectedRegion, setSelectedRegion] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNewsForModal, setSelectedNewsForModal] = useState(null);
  const [activeVideoModal, setActiveVideoModal] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const filteredNews = EDUCATIONAL_NEWS_DATA.filter((news) => {
    const matchesRegion = selectedRegion === "ALL" || news.region === selectedRegion;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      news.title.toLowerCase().includes(q) ||
      news.subtitle.toLowerCase().includes(q) ||
      news.country.toLowerCase().includes(q) ||
      news.category.toLowerCase().includes(q);
    return matchesRegion && matchesSearch;
  });

  const handleReadAloud = (text) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

  return (
    <div className="gbs-news-page-root">
      <WindowControlsBar title="Global Educational News & Video Insights" />
      <TopCenterSystemBanner roleTitle="Global Educational News & Video Platform" />

      {/* Hero Banner */}
      <div className="gbs-news-hero">
        <div className="gbs-news-hero-content">
          <div className="gbs-news-hero-tag">
            <span>🌐 WORLDWIDE EDUCATIONAL INTELLIGENCE</span>
          </div>
          <h1>Global Educational News & Video Insights</h1>
          <p>
            Curated international educational reports, curriculum updates, STEM breakthroughs, scholarship opportunities, and pedagogical documentaries from across the world.
          </p>

          {/* Quick Stats Pill Bar */}
          <div className="gbs-news-stats-row">
            <div className="gbs-news-stat-pill">
              <span>🌍 6 Continents Covered</span>
            </div>
            <div className="gbs-news-stat-pill">
              <span>📹 HD Video Presentations</span>
            </div>
            <div className="gbs-news-stat-pill">
              <span>🔊 Speech Readout & Multi-Language Translation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="gbs-news-filter-bar">
        <div className="gbs-news-region-chips">
          {["ALL", "Africa", "Europe", "Americas", "Asia-Pacific", "Global"].map((region) => (
            <button
              key={region}
              type="button"
              className={`gbs-news-chip ${selectedRegion === region ? "active" : ""}`}
              onClick={() => setSelectedRegion(region)}
            >
              {region === "ALL" ? "🌎 All Regions" : region}
            </button>
          ))}
        </div>

        <div className="gbs-news-search-box">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search educational news, countries, STEM, scholarships..."
            className="gbs-news-search-input"
          />
        </div>
      </div>

      {/* Main News Grid */}
      <main className="gbs-news-container">
        <div className="gbs-news-grid">
          {filteredNews.map((news) => (
            <div key={news.id} className="gbs-news-card">
              {/* Media Thumbnail with Video Overlay Button */}
              <div className="gbs-news-card-media">
                <img src={news.posterImage} alt={news.title} className="gbs-news-img" />
                <div className="gbs-news-media-overlay">
                  <span className="gbs-news-flag-badge">
                    {news.flag} {news.country}
                  </span>
                  <button
                    type="button"
                    className="gbs-news-play-btn"
                    onClick={() => setActiveVideoModal(news)}
                    title="Watch Video Presentation"
                  >
                    ▶ Watch Video ({news.videoDuration})
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="gbs-news-card-body">
                <div className="gbs-news-meta-row">
                  <span
                    className="gbs-news-category-badge"
                    style={{ background: `${news.categoryColor}22`, color: news.categoryColor, borderColor: `${news.categoryColor}55` }}
                  >
                    {news.category}
                  </span>
                  <span className="gbs-news-date">{news.publishedAt} • {news.readTime}</span>
                </div>

                <h3 className="gbs-news-title">{news.title}</h3>
                <p className="gbs-news-subtitle">{news.subtitle}</p>
                <p className="gbs-news-summary">{news.summary}</p>

                {/* Card Footer Actions */}
                <div className="gbs-news-card-actions">
                  <button
                    type="button"
                    className="gbs-news-btn-read"
                    onClick={() => setSelectedNewsForModal(news)}
                  >
                    📖 Read Full Article
                  </button>
                  <button
                    type="button"
                    className="gbs-news-btn-video"
                    onClick={() => setActiveVideoModal(news)}
                  >
                    📹 Watch Video
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL 1: VIDEO PRESENTATION PLAYER */}
      {activeVideoModal && (
        <div className="gbs-news-modal-overlay" onClick={() => setActiveVideoModal(null)}>
          <div className="gbs-news-video-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="gbs-news-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1.5rem" }}>📹</span>
                <div>
                  <h3 style={{ margin: 0, color: "#38bdf8", fontSize: "1.1rem", fontWeight: 800 }}>
                    {activeVideoModal.flag} {activeVideoModal.title}
                  </h3>
                  <span style={{ fontSize: "0.76rem", color: "#94a3b8" }}>
                    Source: {activeVideoModal.author} • {activeVideoModal.publishedAt}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="gbs-news-close-btn"
                onClick={() => setActiveVideoModal(null)}
              >
                ✕
              </button>
            </div>

            <div className="gbs-news-video-wrap">
              <video
                src={activeVideoModal.videoUrl}
                poster={activeVideoModal.posterImage}
                controls
                autoPlay
                playsInline
                style={{ width: "100%", maxHeight: "480px", borderRadius: "10px", background: "#000" }}
              />
            </div>

            <div style={{ marginTop: "1rem", color: "#cbd5e1", fontSize: "0.85rem", lineHeight: 1.5 }}>
              <p style={{ margin: "0 0 8px" }}>{activeVideoModal.summary}</p>
              <button
                type="button"
                className="gbs-news-btn-read"
                onClick={() => {
                  setSelectedNewsForModal(activeVideoModal);
                  setActiveVideoModal(null);
                }}
              >
                📖 Open Full Written Educational Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FULL ARTICLE READER MODAL */}
      {selectedNewsForModal && (
        <div className="gbs-news-modal-overlay" onClick={() => setSelectedNewsForModal(null)}>
          <div className="gbs-news-article-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="gbs-news-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1.8rem" }}>{selectedNewsForModal.flag}</span>
                <div>
                  <span style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "2px 8px", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 800 }}>
                    {selectedNewsForModal.category.toUpperCase()} • {selectedNewsForModal.country}
                  </span>
                  <h2 style={{ margin: "4px 0 0", color: "#f8fafc", fontSize: "1.25rem", fontWeight: 900 }}>
                    {selectedNewsForModal.title}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                className="gbs-news-close-btn"
                onClick={() => {
                  if (typeof window !== "undefined" && "speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                  }
                  setIsSpeaking(false);
                  setSelectedNewsForModal(null);
                }}
              >
                ✕
              </button>
            </div>

            {/* Readout & Video Shortcuts */}
            <div style={{ display: "flex", gap: "8px", margin: "1rem 0", flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                className="gbs-news-btn-speech"
                onClick={() => handleReadAloud(`${selectedNewsForModal.title}. ${selectedNewsForModal.fullContent}`)}
              >
                {isSpeaking ? "⏹ Stop Audio Readout" : "🔊 Listen to Report Aloud"}
              </button>
              <button
                type="button"
                className="gbs-news-btn-video"
                onClick={() => {
                  setActiveVideoModal(selectedNewsForModal);
                  setSelectedNewsForModal(null);
                }}
              >
                📹 Watch Video Presentation ({selectedNewsForModal.videoDuration})
              </button>
              <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                Editorial: <strong>{selectedNewsForModal.author}</strong> • {selectedNewsForModal.publishedAt}
              </span>
            </div>

            {/* Article Text Content */}
            <div className="gbs-news-article-body">
              <p className="gbs-news-lead-text">{selectedNewsForModal.subtitle}</p>
              <div className="gbs-news-full-text">
                {selectedNewsForModal.fullContent.split("\n\n").map((para, pIdx) => (
                  <p key={pIdx}>{para}</p>
                ))}
              </div>
            </div>

            <div className="gbs-news-article-footer">
              <button
                type="button"
                className="gbs-news-btn-close-reader"
                onClick={() => setSelectedNewsForModal(null)}
              >
                Close Article Reader
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
