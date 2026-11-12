import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../api/client/apiClient';
import { getActiveSchoolName } from '../../../utils/schoolBranding';
import './LibraryManagement.css';

const ALL_CLASS_LEVELS = [
  'Lower Primary 1',
  'Lower Primary 2',
  'Lower Primary 3',
  'Upper Primary 4',
  'Upper Primary 5',
  'Upper Primary 6',
  'JHS 1',
  'JHS 2',
  'JHS 3',
  'SHS 1',
  'SHS 2',
  'SHS 3',
  'University Level 100',
  'University Level 200',
  'University Level 300',
  'University Level 400'
];

const SUBJECT_OPTIONS = [
  'Mathematics',
  'English Language',
  'Integrated Science',
  'Computing / IT',
  'Physics',
  'Chemistry',
  'Biology',
  'Elective Mathematics',
  'Social Studies',
  'General Reference'
];

export default function LibraryManagementPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog', 'elibrary', 'loans', 'register', 'uploadEbook'
  const [books, setBooks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [stats, setStats] = useState({
    totalTitles: 0,
    totalInventory: 0,
    availableInventory: 0,
    borrowedCount: 0,
    activeLoans: 0,
    overdueLoans: 0,
    totalFines: 0
  });

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassLevel, setSelectedClassLevel] = useState('ALL');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // New Physical Book Form
  const [newBook, setNewBook] = useState({
    isbn: '',
    title: '',
    author: '',
    category: 'COMPUTER_SCIENCE',
    classLevel: 'Lower Primary 1',
    subjectName: 'Mathematics',
    shelfLocation: 'Bay P1-Math',
    totalCopies: 5,
    ebookUrl: ''
  });

  // New E-Book Upload Form
  const [newEbook, setNewEbook] = useState({
    title: '',
    author: '',
    isbn: '',
    classLevel: 'SHS 1',
    subjectName: 'Physics',
    category: 'SCIENCE',
    ebookUrl: 'https://openstax.org',
    fileSummary: 'Uploaded PDF e-Textbook with full index and interactive problem sets'
  });

  // Reader Modal State
  const [readerModalOpen, setReaderModalOpen] = useState(false);
  const [readingBook, setReadingBook] = useState(null);

  // Borrow Modal State with Student Details
  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [selectedBookForBorrow, setSelectedBookForBorrow] = useState(null);
  const [borrowForm, setBorrowForm] = useState({
    borrowerId: '101',
    borrowerName: 'Ethan Vance',
    studentIdCode: 'GBS-STU-2026-089',
    classLevel: 'Lower Primary 3',
    contactPhone: '+233 24 555 0192',
    borrowerRole: 'STUDENT',
    dueDays: 14,
    notes: 'Good condition, original jacket'
  });

  const showToast = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    navigate('/login');
  };

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/library/stats');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.warn('Could not fetch library stats:', err.message);
    }
  };

  const fetchBooks = async (query = '') => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/library/books${query ? `?search=${encodeURIComponent(query)}` : ''}`);
      if (res.data?.success) {
        setBooks(res.data.data.records || []);
      }
    } catch (err) {
      showToast('Error connecting to Library catalog API', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoans = async () => {
    try {
      const res = await apiClient.get('/library/loans');
      if (res.data?.success) {
        setLoans(res.data.data.records || []);
      }
    } catch (err) {
      console.warn('Error fetching loans:', err.message);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchBooks();
    fetchLoans();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBooks(searchQuery);
  };

  // Filter books by Class Level and Subject
  const filteredBooks = books.filter((b) => {
    const matchClass = selectedClassLevel === 'ALL' || (b.class_level && b.class_level.toLowerCase().includes(selectedClassLevel.toLowerCase()));
    const matchSubject = selectedSubject === 'ALL' || (b.subject_name && b.subject_name.toLowerCase().includes(selectedSubject.toLowerCase())) || (b.category && b.category.toLowerCase().includes(selectedSubject.toLowerCase()));
    return matchClass && matchSubject;
  });

  // Digital E-books
  const digitalBooks = books.filter((b) => Boolean(b.ebook_url));

  const handleRegisterBook = async (e) => {
    e.preventDefault();
    if (!newBook.title || !newBook.isbn || !newBook.author) {
      showToast('Please fill out all required fields', 'error');
      return;
    }

    try {
      const res = await apiClient.post('/library/books', newBook);
      if (res.data?.success) {
        showToast(`Book '${newBook.title}' registered successfully!`, 'success');
        setNewBook({
          isbn: '',
          title: '',
          author: '',
          category: 'COMPUTER_SCIENCE',
          classLevel: 'Lower Primary 1',
          subjectName: 'Mathematics',
          shelfLocation: 'Bay P1-Math',
          totalCopies: 5,
          ebookUrl: ''
        });
        setActiveTab('catalog');
        fetchBooks();
        fetchStats();
      } else {
        showToast(res.data?.message || 'Failed to register book', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error creating book record', 'error');
    }
  };

  const handleUploadEbook = async (e) => {
    e.preventDefault();
    if (!newEbook.title || !newEbook.author || !newEbook.ebookUrl) {
      showToast('Please provide Title, Author, and E-Book File Link', 'error');
      return;
    }

    const payload = {
      isbn: newEbook.isbn || `EBOOK-${Date.now().toString().slice(-8)}`,
      title: newEbook.title,
      author: newEbook.author,
      category: newEbook.category,
      classLevel: newEbook.classLevel,
      subjectName: newEbook.subjectName,
      shelfLocation: 'Digital Cloud Repository',
      totalCopies: 999,
      ebookUrl: newEbook.ebookUrl
    };

    try {
      const res = await apiClient.post('/library/books', payload);
      if (res.data?.success) {
        showToast(`Digital E-Book '${newEbook.title}' uploaded successfully! Students can read online.`, 'success');
        setActiveTab('elibrary');
        fetchBooks();
        fetchStats();
      } else {
        showToast(res.data?.message || 'Failed to upload e-book', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error uploading e-book record', 'error');
    }
  };

  const openBorrowModal = (book) => {
    setSelectedBookForBorrow(book);
    setBorrowForm({
      borrowerId: '101',
      borrowerName: 'Ethan Vance',
      studentIdCode: 'GBS-STU-2026-089',
      classLevel: book.class_level || 'Lower Primary 3',
      contactPhone: '+233 24 555 0192',
      borrowerRole: 'STUDENT',
      dueDays: 14,
      notes: 'Clean condition, original library stamp'
    });
    setBorrowModalOpen(true);
  };

  const handleProcessBorrow = async (e) => {
    e.preventDefault();
    if (!selectedBookForBorrow) return;

    try {
      const res = await apiClient.post('/library/borrow', {
        bookId: selectedBookForBorrow.id,
        borrowerId: borrowForm.borrowerId,
        borrowerName: borrowForm.borrowerName,
        borrowerRole: borrowForm.borrowerRole,
        studentIdCode: borrowForm.studentIdCode,
        classLevel: borrowForm.classLevel,
        contactPhone: borrowForm.contactPhone,
        dueDays: borrowForm.dueDays
      });

      if (res.data?.success) {
        showToast(`Book checked out to ${borrowForm.borrowerName} (${borrowForm.studentIdCode})!`, 'success');
        setBorrowModalOpen(false);
        fetchBooks();
        fetchLoans();
        fetchStats();
      } else {
        showToast(res.data?.message || 'Borrow failed', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error processing checkout', 'error');
    }
  };

  const handleProcessReturn = async (loanId) => {
    try {
      const res = await apiClient.post(`/library/return/${loanId}`);
      if (res.data?.success) {
        showToast(res.data.message || 'Book returned successfully', 'success');
        fetchLoans();
        fetchBooks();
        fetchStats();
      } else {
        showToast(res.data?.message || 'Failed to process return', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error returning book', 'error');
    }
  };

  const openReader = (book) => {
    setReadingBook(book);
    setReaderModalOpen(true);
  };

  return (
    <div className="library-management-container">
      {/* Top Header with Back and Sign Out */}
      <header className="library-top-nav">
        <div className="nav-brand">
          <span className="nav-brand-badge">LIBRARY</span>
          <span>{getActiveSchoolName()} • Resource &amp; Media Center</span>
        </div>
        <div className="nav-actions" style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-secondary"
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            ← Return / Back
          </button>
          <button
            onClick={handleSignOut}
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
        </div>
      </header>

      {/* Hero Banner with authentic imagery */}
      <section
        className="library-hero-section"
        style={{
          backgroundImage: `linear-gradient(rgba(11, 17, 32, 0.88), rgba(11, 17, 32, 0.95)), url('https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1600&q=80')`
        }}
      >
        <div className="library-hero-content">
          <span className="pill-badge">LEVEL-ORGANIZED CURRICULUM REPOSITORY</span>
          <h1 className="library-hero-title">Library Catalog & Student Digital E-Library</h1>
          <p className="library-hero-desc">
            Organized from Lower Primary 1 to University Level 400 across registered subjects.
            Upload digital e-books for student reading, track physical shelf circulation, and record student borrower information.
          </p>
        </div>
      </section>

      {/* Telemetry Stats Bar */}
      <div className="library-stats-grid">
        <div className="stat-card">
          <span className="stat-label">Unique Titles</span>
          <span className="stat-value">{stats.totalTitles}</span>
          <span className="stat-desc">Cataloged across all levels</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Physical Inventory</span>
          <span className="stat-value">{stats.totalInventory}</span>
          <span className="stat-desc">Shelf copies available</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Ready on Shelf</span>
          <span className="stat-value" style={{ color: '#34d399' }}>{stats.availableInventory}</span>
          <span className="stat-desc">Ready for immediate issue</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Digital E-Books</span>
          <span className="stat-value" style={{ color: '#60a5fa' }}>{digitalBooks.length}</span>
          <span className="stat-desc">Ready for online student reading</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active Loans</span>
          <span className="stat-value" style={{ color: '#fbbf24' }}>{stats.activeLoans}</span>
          <span className="stat-desc">Currently in student circulation</span>
        </div>
      </div>

      {/* Main Content Workspace */}
      <div className="workspace-container" style={{ padding: '0 32px' }}>
        {feedback && (
          <div className={`feedback-toast feedback-${feedback.type}`}>
            {feedback.message}
          </div>
        )}

        <div className="tab-nav" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '24px' }}>
          <button
            className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalog')}
          >
            📚 Physical Catalog ({filteredBooks.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'elibrary' ? 'active' : ''}`}
            onClick={() => setActiveTab('elibrary')}
          >
            📖 Digital E-Library & Reading ({digitalBooks.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'loans' ? 'active' : ''}`}
            onClick={() => setActiveTab('loans')}
          >
            🔄 Student Loans & Circulation ({loans.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            ➕ Register Physical Book
          </button>
          <button
            className={`tab-btn ${activeTab === 'uploadEbook' ? 'active' : ''}`}
            onClick={() => setActiveTab('uploadEbook')}
          >
            📤 Upload Digital E-Book
          </button>
        </div>

        {/* Tab 1: Book Catalog */}
        {activeTab === 'catalog' && (
          <div>
            <div className="controls-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px' }}>
              <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: '240px' }}>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  placeholder="Search by Title, Author, ISBN, Subject or Class Level..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>

              {/* Class Level Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Class Level:</label>
                <select
                  value={selectedClassLevel}
                  onChange={(e) => setSelectedClassLevel(e.target.value)}
                  style={{ padding: '9px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.85rem' }}
                >
                  <option value="ALL">All Class Levels (Primary 1 to Uni 400)</option>
                  {ALL_CLASS_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>

              {/* Subject Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Subject:</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  style={{ padding: '9px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.85rem' }}
                >
                  <option value="ALL">All Registered Subjects</option>
                  {SUBJECT_OPTIONS.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <button className="btn-primary" onClick={() => fetchBooks(searchQuery)}>
                {loading ? 'Searching...' : '🔍 Search'}
              </button>
            </div>

            <div className="table-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ISBN</th>
                    <th>Title & Author</th>
                    <th>Class Level</th>
                    <th>Subject</th>
                    <th>Shelf Location</th>
                    <th>Available / Total</th>
                    <th>Status</th>
                    <th>Circulation Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                        No books found matching the selected class level or subject filters.
                      </td>
                    </tr>
                  ) : (
                    filteredBooks.map((b) => (
                      <tr key={b.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.85rem' }}>{b.isbn}</td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#ffffff' }}>{b.title}</div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>by {b.author}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            {b.class_level || 'General'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                            {b.subject_name || b.category}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{b.shelf_location || 'General Stacks'}</td>
                        <td style={{ fontWeight: 700 }}>
                          <span style={{ color: b.available_copies > 0 ? '#34d399' : '#f87171' }}>
                            {b.available_copies}
                          </span>
                          {' / '}
                          <span>{b.total_copies}</span>
                        </td>
                        <td>
                          <span className={`status-badge ${b.available_copies > 0 ? 'status-available' : 'status-overdue'}`}>
                            {b.available_copies > 0 ? 'IN STOCK' : 'CHECKED OUT'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="action-btn-sm"
                              disabled={b.available_copies <= 0}
                              style={{ opacity: b.available_copies <= 0 ? 0.5 : 1 }}
                              onClick={() => openBorrowModal(b)}
                            >
                              📖 Issue to Student
                            </button>
                            {b.ebook_url && (
                              <button
                                className="action-btn-sm"
                                style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6' }}
                                onClick={() => openReader(b)}
                              >
                                👓 Read
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Digital E-Library for Students */}
        {activeTab === 'elibrary' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#ffffff' }}>Digital E-Books for Students</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                  Students can read uploaded curriculum textbooks directly online from any device.
                </p>
              </div>
              <button className="btn-primary" onClick={() => setActiveTab('uploadEbook')}>
                📤 Upload New E-Book
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {digitalBooks.map((b) => (
                <div
                  key={b.id}
                  style={{
                    background: '#131d33',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                        {b.class_level || 'General Level'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>● Instant Digital Access</span>
                    </div>
                    <h4 style={{ margin: '0 0 6px 0', color: '#ffffff', fontSize: '1.05rem' }}>{b.title}</h4>
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#94a3b8' }}>Author: {b.author}</p>
                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '16px' }}>
                      <strong>Subject:</strong> {b.subject_name || b.category}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className="btn-primary"
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                      onClick={() => openReader(b)}
                    >
                      📖 Read Online Now
                    </button>
                    <a
                      href={b.ebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', fontSize: '0.85rem' }}
                    >
                      🔗 External Link
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Loans & Returns Ledger with Student Details */}
        {activeTab === 'loans' && (
          <div className="table-card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ margin: 0, color: '#ffffff' }}>Student Circulation & Borrowing Log</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                Full records of students who borrow books including Name, ID, Class Level, Contact, and Return Due Dates.
              </p>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Book Title</th>
                  <th>Student Name</th>
                  <th>Student ID</th>
                  <th>Class / Level</th>
                  <th>Contact Phone</th>
                  <th>Borrowed On</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Fine</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loans.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                      No active circulation loans recorded yet.
                    </td>
                  </tr>
                ) : (
                  loans.map((loan) => (
                    <tr key={loan.id}>
                      <td style={{ fontFamily: 'monospace' }}>#LN-{loan.id}</td>
                      <td style={{ fontWeight: 600 }}>{loan.book_title || `Book #${loan.book_id}`}</td>
                      <td style={{ fontWeight: 700, color: '#ffffff' }}>{loan.borrower_name}</td>
                      <td style={{ fontFamily: 'monospace', color: '#93c5fd' }}>{loan.student_id_code || `STU-${loan.borrower_id}`}</td>
                      <td>
                        <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                          {loan.class_level || loan.book_class_level || 'General'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{loan.contact_phone || '+233 24 555 0192'}</td>
                      <td>{new Date(loan.borrowed_at).toLocaleDateString()}</td>
                      <td>{new Date(loan.due_date).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-badge ${loan.status === 'BORROWED' ? 'status-borrowed' : (loan.status === 'RETURNED' ? 'status-available' : 'status-overdue')}`}>
                          {loan.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: parseFloat(loan.fine_amount) > 0 ? '#f87171' : '#94a3b8' }}>
                        ${parseFloat(loan.fine_amount || 0).toFixed(2)}
                      </td>
                      <td>
                        {loan.status === 'BORROWED' ? (
                          <button className="action-btn-sm" onClick={() => handleProcessReturn(loan.id)}>
                            📥 Process Return
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#10b981' }}>✓ Returned</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Register Physical Book */}
        {activeTab === 'register' && (
          <div className="form-card" style={{ maxWidth: '800px', margin: '0 auto', background: '#131d33', padding: '28px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#ffffff' }}>Register Physical Book into Library Collection</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '0.85rem', color: '#94a3b8' }}>
              Assign the textbook to its specific class level (Lower Primary 1 to University Level 400) and registered subject.
            </p>
            <form onSubmit={handleRegisterBook}>
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group full-width" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>Book Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Essential Mathematics for Junior High Schools"
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>Author / Editor *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Prof. J. K. Anane"
                    value={newBook.author}
                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>ISBN Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 978-0198431010"
                    value={newBook.isbn}
                    onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>Class Level *</label>
                  <select
                    className="form-control"
                    value={newBook.classLevel}
                    onChange={(e) => setNewBook({ ...newBook, classLevel: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  >
                    {ALL_CLASS_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>Registered Subject *</label>
                  <select
                    className="form-control"
                    value={newBook.subjectName}
                    onChange={(e) => setNewBook({ ...newBook, subjectName: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  >
                    {SUBJECT_OPTIONS.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>Shelf Location</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Stacks Bay JHS1-Math"
                    value={newBook.shelfLocation}
                    onChange={(e) => setNewBook({ ...newBook, shelfLocation: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>Number of Physical Shelf Copies</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={newBook.totalCopies}
                    onChange={(e) => setNewBook({ ...newBook, totalCopies: parseInt(e.target.value, 10) || 1 })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-primary">
                  💾 Confirm Catalog Ingestion
                </button>
                <button type="button" className="btn-secondary" onClick={() => setActiveTab('catalog')}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 5: Upload Digital E-Book */}
        {activeTab === 'uploadEbook' && (
          <div className="form-card" style={{ maxWidth: '800px', margin: '0 auto', background: '#131d33', padding: '28px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#ffffff' }}>Upload E-Book to Library for Student Reading</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '0.85rem', color: '#94a3b8' }}>
              Upload e-textbooks (PDF, ePub or Web Link) mapped to class levels so students can read them directly from their portals.
            </p>
            <form onSubmit={handleUploadEbook}>
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group full-width" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>E-Book Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Principles of Physics: Mechanics & Heat SHS 1"
                    value={newEbook.title}
                    onChange={(e) => setNewEbook({ ...newEbook, title: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>Author / Publisher *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Dr. Raymond Hall"
                    value={newEbook.author}
                    onChange={(e) => setNewEbook({ ...newEbook, author: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>Class Level *</label>
                  <select
                    className="form-control"
                    value={newEbook.classLevel}
                    onChange={(e) => setNewEbook({ ...newEbook, classLevel: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  >
                    {ALL_CLASS_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>Subject *</label>
                  <select
                    className="form-control"
                    value={newEbook.subjectName}
                    onChange={(e) => setNewEbook({ ...newEbook, subjectName: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  >
                    {SUBJECT_OPTIONS.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>Digital URL / Document Link *</label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://openstax.org/details/books/physics"
                    value={newEbook.ebookUrl}
                    onChange={(e) => setNewEbook({ ...newEbook, ebookUrl: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  />
                </div>
                <div className="form-group full-width" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>File Upload / Reader Notes</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Open Access Textbook (PDF/ePub format with chapter exercises)"
                    value={newEbook.fileSummary}
                    onChange={(e) => setNewEbook({ ...newEbook, fileSummary: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-primary">
                  📤 Publish & Upload E-Book to Library
                </button>
                <button type="button" className="btn-secondary" onClick={() => setActiveTab('elibrary')}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Online Book Reader Modal */}
      {readerModalOpen && readingBook && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#111827', width: '100%', maxWidth: '900px', maxHeight: '90vh', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700 }}>GBS DIGITAL READER — {readingBook.class_level || 'STUDENT EDITION'}</span>
                <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.2rem' }}>{readingBook.title}</h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>by {readingBook.author} | Subject: {readingBook.subject_name || readingBook.category}</span>
              </div>
              <button
                onClick={() => setReaderModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: '#0b1120', color: '#e2e8f0' }}>
              <div style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #3b82f6' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  📖 <strong>Student Online E-Reader Preview:</strong> You are reading the verified curriculum textbook for <strong>{readingBook.class_level || 'this class'}</strong>.
                </p>
              </div>

              <div style={{ lineHeight: 1.8, fontSize: '0.95rem' }}>
                <h4 style={{ color: '#38bdf8', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                  Chapter 1: Foundational Principles & Core Concepts
                </h4>
                <p>
                  Welcome to the official study syllabus for {readingBook.subject_name || 'this course'} at <strong>{getActiveSchoolName()}</strong>. This curriculum edition has been standardized for institutional excellence. Review each core module, practice sample problems, and consult your designated course instructor for grading checkpoints.
                </p>
                <h5 style={{ color: '#ffffff', marginTop: '16px' }}>Section 1.1 — Learning Objectives</h5>
                <ul style={{ paddingLeft: '20px', color: '#cbd5e1' }}>
                  <li>Understand key vocabulary, theorems, and definitions essential to {readingBook.title}.</li>
                  <li>Complete the assigned weekly homework and term assessments.</li>
                  <li>Synthesize practical real-world applications within the subject domain.</li>
                </ul>
                <h5 style={{ color: '#ffffff', marginTop: '16px' }}>Section 1.2 — Guided Syllabus Overview</h5>
                <p>
                  Detailed study topics include comprehensive analytical methodologies, structured problem breakdowns, and self-review quizzes aligned with national and international standard examination benchmarks.
                </p>
              </div>
            </div>

            <div style={{ padding: '16px 24px', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>ISBN: {readingBook.isbn}</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <a
                  href={readingBook.ebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  🔗 Open Full Interactive Book
                </a>
                <button className="btn-secondary" onClick={() => setReaderModalOpen(false)}>
                  Close Reader
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Borrow / Checkout Modal with Student Information */}
      {borrowModalOpen && selectedBookForBorrow && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="modal-content" style={{ background: '#111827', width: '100%', maxWidth: '600px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.15)', padding: '28px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 className="modal-title" style={{ margin: 0, color: '#ffffff' }}>Student Library Checkout Desk</h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Book: {selectedBookForBorrow.title} (Available: {selectedBookForBorrow.available_copies})</span>
              </div>
              <button className="close-btn" onClick={() => setBorrowModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleProcessBorrow}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>Student Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={borrowForm.borrowerName}
                    onChange={(e) => setBorrowForm({ ...borrowForm, borrowerName: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>Student ID / Reg Code *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={borrowForm.studentIdCode}
                    onChange={(e) => setBorrowForm({ ...borrowForm, studentIdCode: e.target.value })}
                    required
                    placeholder="e.g. GBS-STU-2026-089"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>Class / Level *</label>
                  <select
                    className="form-control"
                    value={borrowForm.classLevel}
                    onChange={(e) => setBorrowForm({ ...borrowForm, classLevel: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  >
                    {ALL_CLASS_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>Parent / Student Phone *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={borrowForm.contactPhone}
                    onChange={(e) => setBorrowForm({ ...borrowForm, contactPhone: e.target.value })}
                    required
                    placeholder="e.g. +233 24 555 0192"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>Loan Duration</label>
                  <select
                    className="form-control"
                    value={borrowForm.dueDays}
                    onChange={(e) => setBorrowForm({ ...borrowForm, dueDays: parseInt(e.target.value, 10) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                  >
                    <option value={7}>7 Days (1 Week)</option>
                    <option value={14}>14 Days (2 Weeks Standard)</option>
                    <option value={30}>30 Days (1 Month Extended)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Confirm Student Borrow & Issue Book
                </button>
                <button type="button" className="btn-secondary" onClick={() => setBorrowModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
