'use strict';

const prisma = require('../../core/database/prisma.client');
const logger = require('../../utils/logger') || console;

function success(data = null, message = null) {
  return {
    success: true,
    message,
    data
  };
}

function failure(message) {
  return {
    success: false,
    message,
    data: null
  };
}

async function getBooks(tenantId = 1, search = '') {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    let query = 'SELECT * FROM library_books WHERE tenant_id = $1';
    const params = [tid];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (title ILIKE $2 OR author ILIKE $2 OR isbn ILIKE $2 OR category ILIKE $2 OR class_level ILIKE $2 OR subject_name ILIKE $2)`;
    }
    query += ' ORDER BY id DESC';

    const books = await prisma.$queryRawUnsafe(query, ...params);
    return success({
      count: books.length,
      records: books
    });
  } catch (error) {
    if (logger.error) logger.error('LIBRARY_GET_BOOKS_ERROR', { error: error.message });
    return failure('Failed to retrieve books from database');
  }
}

async function getBookById(id, tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const bid = parseInt(id, 10);
    const books = await prisma.$queryRawUnsafe(
      'SELECT * FROM library_books WHERE id = $1 AND tenant_id = $2',
      bid,
      tid
    );

    if (!books || books.length === 0) {
      return failure('Book not found');
    }
    return success(books[0]);
  } catch (error) {
    if (logger.error) logger.error('LIBRARY_GET_BOOK_BY_ID_ERROR', { error: error.message });
    return failure('Failed to retrieve book');
  }
}

async function createBook(payload, tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const { isbn, title, author, category, shelfLocation, totalCopies, classLevel, subjectName, ebookUrl } = payload;

    if (!title || !author || !isbn) {
      return failure('ISBN, Title, and Author are required.');
    }

    const copies = parseInt(totalCopies, 10) || 1;
    const cat = category || 'GENERAL';
    const shelf = shelfLocation || 'Section A-1';

    const result = await prisma.$queryRawUnsafe(`
      INSERT INTO library_books (tenant_id, isbn, title, author, category, shelf_location, total_copies, available_copies, class_level, subject_name, ebook_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10)
      RETURNING *;
    `, tid, isbn, title, author, cat, shelf, copies, classLevel || 'General', subjectName || 'General Studies', ebookUrl || null);

    return success(result[0], 'Book registered successfully into library catalog');
  } catch (error) {
    if (logger.error) logger.error('LIBRARY_CREATE_BOOK_ERROR', { error: error.message });
    return failure(error.message.includes('unique') ? 'Book with this ISBN already exists' : 'Failed to create book');
  }
}

async function updateBook(id, payload, tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const bid = parseInt(id, 10);
    const { title, author, category, shelfLocation, totalCopies } = payload;

    const existing = await prisma.$queryRawUnsafe(
      'SELECT * FROM library_books WHERE id = $1 AND tenant_id = $2',
      bid,
      tid
    );

    if (!existing || existing.length === 0) {
      return failure('Book not found');
    }

    const updated = await prisma.$queryRawUnsafe(`
      UPDATE library_books
      SET title = COALESCE($1, title),
          author = COALESCE($2, author),
          category = COALESCE($3, category),
          shelf_location = COALESCE($4, shelf_location),
          total_copies = COALESCE($5, total_copies),
          updated_at = NOW()
      WHERE id = $6 AND tenant_id = $7
      RETURNING *;
    `, title || null, author || null, category || null, shelfLocation || null, totalCopies ? parseInt(totalCopies, 10) : null, bid, tid);

    return success(updated[0], 'Book updated successfully');
  } catch (error) {
    if (logger.error) logger.error('LIBRARY_UPDATE_BOOK_ERROR', { error: error.message });
    return failure('Failed to update book');
  }
}

async function deleteBook(id, tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const bid = parseInt(id, 10);
    await prisma.$queryRawUnsafe(
      'DELETE FROM library_books WHERE id = $1 AND tenant_id = $2',
      bid,
      tid
    );
    return success({ id: bid }, 'Book removed from catalog');
  } catch (error) {
    if (logger.error) logger.error('LIBRARY_DELETE_BOOK_ERROR', { error: error.message });
    return failure('Failed to delete book');
  }
}

async function borrowBook(payload, tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const { bookId, borrowerId, borrowerName, borrowerRole, dueDays, studentIdCode, classLevel, contactPhone } = payload;

    const bid = parseInt(bookId, 10);
    const uid = parseInt(borrowerId, 10) || 1;
    const days = parseInt(dueDays, 10) || 14;

    const books = await prisma.$queryRawUnsafe(
      'SELECT * FROM library_books WHERE id = $1 AND tenant_id = $2',
      bid,
      tid
    );

    if (!books || books.length === 0) {
      return failure('Book not found in catalog');
    }

    const book = books[0];
    if (book.available_copies <= 0) {
      return failure('No copies currently available for borrow');
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);

    const loan = await prisma.$queryRawUnsafe(`
      INSERT INTO library_loans (tenant_id, book_id, borrower_id, borrower_name, borrower_role, due_date, status, student_id_code, class_level, contact_phone)
      VALUES ($1, $2, $3, $4, $5, $6, 'BORROWED', $7, $8, $9)
      RETURNING *;
    `, tid, bid, uid, borrowerName || 'Student Borrower', borrowerRole || 'STUDENT', dueDate, studentIdCode || `GBS-STU-${uid}`, classLevel || 'General', contactPhone || '+1 (555) 019-2834');

    await prisma.$executeRawUnsafe(
      'UPDATE library_books SET available_copies = available_copies - 1, updated_at = NOW() WHERE id = $1',
      bid
    );

    return success(loan[0], 'Book checked out successfully');
  } catch (error) {
    if (logger.error) logger.error('LIBRARY_BORROW_BOOK_ERROR', { error: error.message });
    return failure('Failed to process book checkout');
  }
}

async function returnBook(loanId, tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const lid = parseInt(loanId, 10);

    const loans = await prisma.$queryRawUnsafe(
      'SELECT * FROM library_loans WHERE id = $1 AND tenant_id = $2',
      lid,
      tid
    );

    if (!loans || loans.length === 0) {
      return failure('Loan record not found');
    }

    const loan = loans[0];
    if (loan.status === 'RETURNED') {
      return failure('Book has already been returned');
    }

    const now = new Date();
    const dueDate = new Date(loan.due_date);
    let fine = 0;
    if (now > dueDate) {
      const overdueDays = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
      fine = overdueDays * 1.50; // $1.50 per overdue day
    }

    const updated = await prisma.$queryRawUnsafe(`
      UPDATE library_loans
      SET status = 'RETURNED',
          returned_at = NOW(),
          fine_amount = $1
      WHERE id = $2 AND tenant_id = $3
      RETURNING *;
    `, fine, lid, tid);

    await prisma.$executeRawUnsafe(
      'UPDATE library_books SET available_copies = available_copies + 1, updated_at = NOW() WHERE id = $1',
      loan.book_id
    );

    return success(updated[0], fine > 0 ? `Book returned. Overdue fine calculated: $${fine.toFixed(2)}` : 'Book returned successfully with zero fines');
  } catch (error) {
    if (logger.error) logger.error('LIBRARY_RETURN_BOOK_ERROR', { error: error.message });
    return failure('Failed to process return');
  }
}

async function getLoans(tenantId = 1, status = '') {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    let query = `
      SELECT l.*, b.title as book_title, b.isbn, b.author, b.class_level as book_class_level, b.subject_name as book_subject
      FROM library_loans l
      JOIN library_books b ON l.book_id = b.id
      WHERE l.tenant_id = $1
    `;
    const params = [tid];

    if (status && status.trim()) {
      params.push(status.trim().toUpperCase());
      query += ' AND l.status = $2';
    }
    query += ' ORDER BY l.id DESC';

    const loans = await prisma.$queryRawUnsafe(query, ...params);
    return success({
      count: loans.length,
      records: loans
    });
  } catch (error) {
    if (logger.error) logger.error('LIBRARY_GET_LOANS_ERROR', { error: error.message });
    return failure('Failed to retrieve loans');
  }
}

async function getStats(tenantId = 1) {
  try {
    const tid = parseInt(tenantId, 10) || 1;
    const bookStats = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(*)::int as total_titles,
        COALESCE(SUM(total_copies), 0)::int as total_inventory,
        COALESCE(SUM(available_copies), 0)::int as available_inventory
      FROM library_books
      WHERE tenant_id = $1;
    `, tid);

    const loanStats = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(*)::int as active_loans,
        COUNT(CASE WHEN due_date < NOW() THEN 1 END)::int as overdue_loans,
        COALESCE(SUM(fine_amount), 0)::float as total_fines
      FROM library_loans
      WHERE tenant_id = $1 AND status = 'BORROWED';
    `, tid);

    return success({
      totalTitles: bookStats[0]?.total_titles || 0,
      totalInventory: bookStats[0]?.total_inventory || 0,
      availableInventory: bookStats[0]?.available_inventory || 0,
      borrowedCount: (bookStats[0]?.total_inventory || 0) - (bookStats[0]?.available_inventory || 0),
      activeLoans: loanStats[0]?.active_loans || 0,
      overdueLoans: loanStats[0]?.overdue_loans || 0,
      totalFines: loanStats[0]?.total_fines || 0
    });
  } catch (error) {
    if (logger.error) logger.error('LIBRARY_STATS_ERROR', { error: error.message });
    return failure('Failed to retrieve library statistics');
  }
}

module.exports = {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  borrowBook,
  returnBook,
  getLoans,
  getStats
};