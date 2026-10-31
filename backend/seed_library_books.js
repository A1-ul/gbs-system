const prisma = require('./src/core/database/prisma.client');

const initialBooks = [
  // Primary 1
  { isbn: '978-0198421011', title: 'Foundations of Numbers: Primary 1', author: 'Dr. Kwame Mensah', category: 'MATHEMATICS', class_level: 'Lower Primary 1', subject_name: 'Mathematics', shelf_location: 'Bay P1-Math', total_copies: 15, ebook_url: 'https://openstax.org' },
  { isbn: '978-0198421028', title: 'Phonics & Early Reading Adventures', author: 'Sarah Jenkins', category: 'LITERATURE', class_level: 'Lower Primary 1', subject_name: 'English Language', shelf_location: 'Bay P1-Eng', total_copies: 12, ebook_url: 'https://openstax.org' },
  { isbn: '978-0198421035', title: 'Our Living World & Nature P1', author: 'David Attah', category: 'SCIENCE', class_level: 'Lower Primary 1', subject_name: 'Integrated Science', shelf_location: 'Bay P1-Sci', total_copies: 10, ebook_url: 'https://openstax.org' },

  // Primary 2
  { isbn: '978-0198422018', title: 'Basic Arithmetic, Money & Shapes P2', author: 'Dr. Kwame Mensah', category: 'MATHEMATICS', class_level: 'Lower Primary 2', subject_name: 'Mathematics', shelf_location: 'Bay P2-Math', total_copies: 14, ebook_url: 'https://openstax.org' },
  { isbn: '978-0198422025', title: 'Story Comprehension & Vocabulary P2', author: 'Sarah Jenkins', category: 'LITERATURE', class_level: 'Lower Primary 2', subject_name: 'English Language', shelf_location: 'Bay P2-Eng', total_copies: 15, ebook_url: 'https://openstax.org' },

  // Primary 3
  { isbn: '978-0198423015', title: 'Multiplication & Word Problems P3', author: 'Abena Osei', category: 'MATHEMATICS', class_level: 'Lower Primary 3', subject_name: 'Mathematics', shelf_location: 'Bay P3-Math', total_copies: 12, ebook_url: 'https://openstax.org' },
  { isbn: '978-0198423022', title: 'Earth, Weather and Matter P3', author: 'David Attah', category: 'SCIENCE', class_level: 'Lower Primary 3', subject_name: 'Integrated Science', shelf_location: 'Bay P3-Sci', total_copies: 10, ebook_url: 'https://openstax.org' },

  // Upper Primary 4-6
  { isbn: '978-0198424012', title: 'Fractions, Decimals & Geometry P4', author: 'Abena Osei', category: 'MATHEMATICS', class_level: 'Upper Primary 4', subject_name: 'Mathematics', shelf_location: 'Bay P4-Math', total_copies: 10, ebook_url: 'https://openstax.org' },
  { isbn: '978-0198424029', title: 'Digital Literacy & Keyboard Skills P4', author: 'Kofi Boateng', category: 'COMPUTER_SCIENCE', class_level: 'Upper Primary 4', subject_name: 'Computing / IT', shelf_location: 'Bay P4-CS', total_copies: 8, ebook_url: 'https://openstax.org' },
  { isbn: '978-0198425019', title: 'Comprehensive Science & Ecosystems P5', author: 'Dr. Grace Addo', category: 'SCIENCE', class_level: 'Upper Primary 5', subject_name: 'Integrated Science', shelf_location: 'Bay P5-Sci', total_copies: 12, ebook_url: 'https://openstax.org' },
  { isbn: '978-0198426016', title: 'Pre-Algebra & Problem Solving P6', author: 'Abena Osei', category: 'MATHEMATICS', class_level: 'Upper Primary 6', subject_name: 'Mathematics', shelf_location: 'Bay P6-Math', total_copies: 14, ebook_url: 'https://openstax.org' },

  // JHS 1-3
  { isbn: '978-0198431010', title: 'Essential Mathematics for JHS 1', author: 'Prof. J. K. Anane', category: 'MATHEMATICS', class_level: 'JHS 1', subject_name: 'Mathematics', shelf_location: 'Bay JHS1-Math', total_copies: 20, ebook_url: 'https://openstax.org' },
  { isbn: '978-0198431027', title: 'Integrated Science for Junior High 1', author: 'Dr. Grace Addo', category: 'SCIENCE', class_level: 'JHS 1', subject_name: 'Integrated Science', shelf_location: 'Bay JHS1-Sci', total_copies: 18, ebook_url: 'https://openstax.org' },
  { isbn: '978-0198432017', title: 'English Literature & Composition JHS 2', author: 'E. A. Armah', category: 'LITERATURE', class_level: 'JHS 2', subject_name: 'English Language', shelf_location: 'Bay JHS2-Eng', total_copies: 16, ebook_url: 'https://openstax.org' },
  { isbn: '978-0198433014', title: 'BECE Complete Revision & Practice JHS 3', author: 'Prof. J. K. Anane', category: 'MATHEMATICS', class_level: 'JHS 3', subject_name: 'Mathematics', shelf_location: 'Bay JHS3-Rev', total_copies: 25, ebook_url: 'https://openstax.org' },

  // SHS 1-3
  { isbn: '978-0198441019', title: 'Core Mathematics for Senior High Schools SHS 1', author: 'N. K. Baah & Sons', category: 'MATHEMATICS', class_level: 'SHS 1', subject_name: 'Core Mathematics', shelf_location: 'Bay SHS1-Math', total_copies: 22, ebook_url: 'https://openstax.org' },
  { isbn: '978-0198441026', title: 'Principles of Physics: Mechanics & Heat SHS 1', author: 'Dr. Raymond Hall', category: 'SCIENCE', class_level: 'SHS 1', subject_name: 'Physics', shelf_location: 'Bay SHS1-Phys', total_copies: 15, ebook_url: 'https://openstax.org' },
  { isbn: '978-0198442016', title: 'Elective Mathematics: Pure Math & Vectors SHS 2', author: 'N. K. Baah & Sons', category: 'MATHEMATICS', class_level: 'SHS 2', subject_name: 'Elective Mathematics', shelf_location: 'Bay SHS2-EMath', total_copies: 18, ebook_url: 'https://openstax.org' },
  { isbn: '978-0198442023', title: 'Inorganic & Organic Chemistry SHS 2', author: 'Dr. Clara Bruce', category: 'SCIENCE', class_level: 'SHS 2', subject_name: 'Chemistry', shelf_location: 'Bay SHS2-Chem', total_copies: 16, ebook_url: 'https://openstax.org' },
  { isbn: '978-0198443013', title: 'WASSCE Biology Comprehensive Guide SHS 3', author: 'Prof. Eric Quaye', category: 'SCIENCE', class_level: 'SHS 3', subject_name: 'Biology', shelf_location: 'Bay SHS3-Bio', total_copies: 20, ebook_url: 'https://openstax.org' },

  // University Level 100 - 400
  { isbn: '978-0131103627', title: 'CS101: Introduction to Programming with Python & C', author: 'Brian W. Kernighan', category: 'COMPUTER_SCIENCE', class_level: 'University Level 100', subject_name: 'CS101 - Intro to Programming', shelf_location: 'Stacks Uni-100', total_copies: 25, ebook_url: 'https://openstax.org/details/books/introduction-python' },
  { isbn: '978-0134093413', title: 'MATH101: Single Variable Calculus & Analytic Geometry', author: 'James Stewart', category: 'MATHEMATICS', class_level: 'University Level 100', subject_name: 'MATH101 - Calculus I', shelf_location: 'Stacks Uni-100', total_copies: 20, ebook_url: 'https://openstax.org/details/books/calculus-volume-1' },
  { isbn: '978-0262033848', title: 'CS201: Introduction to Algorithms (CLRS 3rd Ed)', author: 'Thomas H. Cormen et al.', category: 'COMPUTER_SCIENCE', class_level: 'University Level 200', subject_name: 'CS201 - Data Structures & Algorithms', shelf_location: 'Stacks Uni-200', total_copies: 18, ebook_url: 'https://mitpress.mit.edu/books/introduction-algorithms' },
  { isbn: '978-0321573513', title: 'CS301: Database System Concepts (Silberschatz)', author: 'Abraham Silberschatz', category: 'COMPUTER_SCIENCE', class_level: 'University Level 300', subject_name: 'CS301 - Database Systems & SQL', shelf_location: 'Stacks Uni-300', total_copies: 15, ebook_url: 'https://openstax.org' },
  { isbn: '978-1491950357', title: 'CS401: Designing Data-Intensive Applications', author: 'Martin Kleppmann', category: 'COMPUTER_SCIENCE', class_level: 'University Level 400', subject_name: 'CS401 - Distributed Systems & Cloud', shelf_location: 'Stacks Uni-400', total_copies: 14, ebook_url: 'https://dataintensive.net' },
  { isbn: '978-0262035613', title: 'AI401: Deep Learning & Neural Computation', author: 'Ian Goodfellow & Yoshua Bengio', category: 'COMPUTER_SCIENCE', class_level: 'University Level 400', subject_name: 'AI401 - Machine Learning & AI', shelf_location: 'Stacks Uni-400', total_copies: 12, ebook_url: 'https://www.deeplearningbook.org' }
];

async function seed() {
  for (const b of initialBooks) {
    const existing = await prisma.$queryRawUnsafe('SELECT id FROM library_books WHERE isbn = $1', b.isbn);
    if (existing && existing.length > 0) {
      await prisma.$executeRawUnsafe(`
        UPDATE library_books
        SET title = $1, author = $2, category = $3, class_level = $4, subject_name = $5, shelf_location = $6, total_copies = $7, available_copies = $7, ebook_url = $8
        WHERE isbn = $9
      `, b.title, b.author, b.category, b.class_level, b.subject_name, b.shelf_location, b.total_copies, b.ebook_url, b.isbn);
    } else {
      await prisma.$executeRawUnsafe(`
        INSERT INTO library_books (tenant_id, isbn, title, author, category, class_level, subject_name, shelf_location, total_copies, available_copies, ebook_url)
        VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $8, $9)
      `, b.isbn, b.title, b.author, b.category, b.class_level, b.subject_name, b.shelf_location, b.total_copies, b.ebook_url);
    }
  }
  console.log('SEEDED BOOKS SUCCESSFULLY FOR ALL LEVELS INTO POSTGRESQL!');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
