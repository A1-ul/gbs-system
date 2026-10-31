const prisma = require('../../core/database/prisma.client');
const { AppError } = require('../../middleware/error.middleware');

/**
 * 1. CLASSES MANAGEMENT
 */
const getClasses = async (tenantId) => {
  let list = await prisma.class.findMany({
    where: { tenantId: parseInt(tenantId, 10) },
    include: {
      subjects: {
        orderBy: { name: 'asc' }
      },
      exams: {
        orderBy: { examDate: 'desc' }
      }
    },
    orderBy: { gradeLevel: 'asc' }
  });

  if (list.length === 0) {
    list = await seedCurriculum(tenantId, null);
  }

  return list;
};

const getClassById = async (tenantId, classId) => {
  const targetClass = await prisma.class.findFirst({
    where: {
      id: parseInt(classId, 10),
      tenantId: parseInt(tenantId, 10)
    },
    include: {
      subjects: true,
      exams: true
    }
  });

  if (!targetClass) {
    throw new AppError('Class not found or does not belong to your institution.', 404);
  }

  return targetClass;
};

const createClass = async (tenantId, data, operatorUser) => {
  if (!data.name || !data.code) {
    throw new AppError('Class name and unique code are required.', 400);
  }

  const existingClass = await prisma.class.findFirst({
    where: {
      tenantId: parseInt(tenantId, 10),
      code: data.code.toUpperCase().trim()
    }
  });

  if (existingClass) {
    throw new AppError(`Class code '${data.code.toUpperCase()}' already exists in your institution.`, 400);
  }

  const newClass = await prisma.class.create({
    data: {
      tenantId: parseInt(tenantId, 10),
      name: data.name.trim(),
      code: data.code.toUpperCase().trim(),
      gradeLevel: parseInt(data.gradeLevel || 1, 10)
    },
    include: {
      subjects: true
    }
  });

  // Assign subjects/courses with their codes to the class if provided
  if (Array.isArray(data.subjects) && data.subjects.length > 0) {
    for (const sub of data.subjects) {
      if (sub.name && sub.code) {
        try {
          await prisma.subject.create({
            data: {
              tenantId: parseInt(tenantId, 10),
              classId: newClass.id,
              name: sub.name.trim(),
              code: sub.code.toUpperCase().trim()
            }
          });
        } catch (subErr) {
          console.warn("Could not insert subject:", subErr.message);
        }
      }
    }
  }

  // Refetch class with created subjects
  const classWithSubjects = await prisma.class.findUnique({
    where: { id: newClass.id },
    include: { subjects: true, exams: true }
  });

  // Record audit log
  if (operatorUser) {
    await prisma.auditLog.create({
      data: {
        tenantId: parseInt(tenantId, 10),
        userId: operatorUser.id,
        action: 'CLASS_CREATED',
        module: 'ACADEMIC',
        details: `Created new academic class '${newClass.name}' (${newClass.code}) at Grade Level ${newClass.gradeLevel} with ${data.subjects?.length || 0} assigned course(s).`
      }
    });
  }

  return classWithSubjects || newClass;
};

const updateClass = async (tenantId, classId, data, operatorUser) => {
  const targetClass = await prisma.class.findFirst({
    where: {
      id: parseInt(classId, 10),
      tenantId: parseInt(tenantId, 10)
    }
  });

  if (!targetClass) {
    throw new AppError('Class not found or unauthorized.', 404);
  }

  const updateData = {};
  if (data.name) updateData.name = data.name.trim();
  if (data.code) updateData.code = data.code.toUpperCase().trim();
  if (data.gradeLevel !== undefined) updateData.gradeLevel = parseInt(data.gradeLevel, 10);

  const updatedClass = await prisma.class.update({
    where: { id: targetClass.id },
    data: updateData,
    include: {
      subjects: true,
      exams: true
    }
  });

  // Record audit log
  if (operatorUser) {
    await prisma.auditLog.create({
      data: {
        tenantId: parseInt(tenantId, 10),
        userId: operatorUser.id,
        action: 'CLASS_UPDATED',
        module: 'ACADEMIC',
        details: `Updated academic class ID ${targetClass.id} (${updatedClass.name} - ${updatedClass.code}).`
      }
    });
  }

  return updatedClass;
};

const deleteClass = async (tenantId, classId, operatorUser) => {
  const targetClass = await prisma.class.findFirst({
    where: {
      id: parseInt(classId, 10),
      tenantId: parseInt(tenantId, 10)
    }
  });

  if (!targetClass) {
    throw new AppError('Class not found or unauthorized.', 404);
  }

  await prisma.class.delete({
    where: { id: targetClass.id }
  });

  // Record audit log
  if (operatorUser) {
    await prisma.auditLog.create({
      data: {
        tenantId: parseInt(tenantId, 10),
        userId: operatorUser.id,
        action: 'CLASS_DELETED',
        module: 'ACADEMIC',
        details: `Deleted academic class '${targetClass.name}' (${targetClass.code}) and associated records.`
      }
    });
  }

  return { message: `Class '${targetClass.name}' deleted successfully.` };
};

/**
 * 2. STANDARD CURRICULUM SEEDER
 * Populates institutional grade levels and standard subjects for the tenant.
 */
const seedCurriculum = async (tenantId, operatorUser) => {
  const tid = parseInt(tenantId, 10);

  const standardCurriculum = [
    // EARLY CHILDHOOD: NURSERY & KINDERGARTEN
    {
      name: 'Nursery 1 (Early Years Foundation)',
      code: 'NUR-01',
      gradeLevel: -3,
      subjects: [
        { name: 'Early Language, Rhymes & Sounds', code: 'ENG-N1' },
        { name: 'Number Exploration & Shapes', code: 'MTH-N1' },
        { name: 'Sensory Play & Discovery', code: 'SCI-N1' },
        { name: 'Creative Arts & Movement', code: 'ART-N1' }
      ]
    },
    {
      name: 'Nursery 2 (Early Learners)',
      code: 'NUR-02',
      gradeLevel: -2,
      subjects: [
        { name: 'Phonics & Letter Tracing', code: 'ENG-N2' },
        { name: 'Counting & Sorting Basics', code: 'MTH-N2' },
        { name: 'Environmental Awareness', code: 'SCI-N2' },
        { name: 'Social Habits & Etiquette', code: 'SOC-N2' }
      ]
    },
    {
      name: 'Kindergarten 1 (KG 1 - Pre-School)',
      code: 'KG-01',
      gradeLevel: -1,
      subjects: [
        { name: 'Early Reading & Phonics', code: 'ENG-KG1' },
        { name: 'Foundational Numeracy & Addition', code: 'MTH-KG1' },
        { name: 'Science & Nature Explorations', code: 'SCI-KG1' },
        { name: 'Creative Expression & Drawing', code: 'ART-KG1' }
      ]
    },
    {
      name: 'Kindergarten 2 (KG 2 - Pre-Primary)',
      code: 'KG-02',
      gradeLevel: 0,
      subjects: [
        { name: 'Reading Fluency & Sight Words', code: 'ENG-KG2' },
        { name: 'Mathematical Operations & Logic', code: 'MTH-KG2' },
        { name: 'Our World & Living Things', code: 'SCI-KG2' },
        { name: 'Computing Discovery & Basic Skills', code: 'ICT-KG2' }
      ]
    },
    // LOWER PRIMARY
    {
      name: 'Primary 1 (Lower Primary)',
      code: 'PRI-01',
      gradeLevel: 1,
      subjects: [
        { name: 'English & Early Reading', code: 'ENG-P1' },
        { name: 'Numeracy & Basic Math', code: 'MTH-P1' },
        { name: 'Natural Science & Environment', code: 'SCI-P1' },
        { name: 'Creative Arts & Expression', code: 'ART-P1' }
      ]
    },
    {
      name: 'Primary 2 (Lower Primary)',
      code: 'PRI-02',
      gradeLevel: 2,
      subjects: [
        { name: 'English Reading & Phonics', code: 'ENG-P2' },
        { name: 'Elementary Mathematics', code: 'MTH-P2' },
        { name: 'Integrated Science Basics', code: 'SCI-P2' },
        { name: 'Moral Education & Civics', code: 'CIV-P2' }
      ]
    },
    {
      name: 'Primary 3 (Lower Primary)',
      code: 'PRI-03',
      gradeLevel: 3,
      subjects: [
        { name: 'English Grammar & Composition', code: 'ENG-P3' },
        { name: 'Mathematics & Problem Solving', code: 'MTH-P3' },
        { name: 'Environmental Studies', code: 'ENV-P3' },
        { name: 'Basic Computing & Tech', code: 'ICT-P3' }
      ]
    },
    // UPPER PRIMARY
    {
      name: 'Primary 4 (Upper Primary)',
      code: 'PRI-04',
      gradeLevel: 4,
      subjects: [
        { name: 'English Comprehension', code: 'ENG-P4' },
        { name: 'Mathematics & Geometry', code: 'MTH-P4' },
        { name: 'Integrated Science', code: 'SCI-P4' },
        { name: 'Information Technology (ICT)', code: 'ICT-P4' },
        { name: 'Social Studies & Culture', code: 'SOC-P4' }
      ]
    },
    {
      name: 'Primary 5 (Upper Primary)',
      code: 'PRI-05',
      gradeLevel: 5,
      subjects: [
        { name: 'English Writing & Literature', code: 'ENG-P5' },
        { name: 'Fractions & Applied Math', code: 'MTH-P5' },
        { name: 'Science & Health Education', code: 'SCI-P5' },
        { name: 'History & Citizenship', code: 'SOC-P5' }
      ]
    },
    {
      name: 'Primary 6 (Upper Primary Graduation)',
      code: 'PRI-06',
      gradeLevel: 6,
      subjects: [
        { name: 'English Proficiency & Composition', code: 'ENG-P6' },
        { name: 'Standard Primary Mathematics', code: 'MTH-P6' },
        { name: 'Physical & Life Sciences', code: 'SCI-P6' },
        { name: 'Computer Applications', code: 'ICT-P6' }
      ]
    },
    // JUNIOR HIGH SCHOOL (JHS)
    {
      name: 'JHS 1 (Junior High - Grade 7)',
      code: 'JHS-01',
      gradeLevel: 7,
      subjects: [
        { name: 'English Language & Grammar', code: 'ENG-J1' },
        { name: 'Core Mathematics', code: 'MTH-J1' },
        { name: 'Integrated Science', code: 'SCI-J1' },
        { name: 'Social Studies', code: 'SOC-J1' },
        { name: 'Information & Communications Tech', code: 'ICT-J1' }
      ]
    },
    {
      name: 'JHS 2 (Junior High - Grade 8)',
      code: 'JHS-02',
      gradeLevel: 8,
      subjects: [
        { name: 'English Literature', code: 'ENG-J2' },
        { name: 'Algebra & Statistics', code: 'MTH-J2' },
        { name: 'Introductory Physics & Chemistry', code: 'SCI-J2' },
        { name: 'Basic Design & Technology (BDT)', code: 'BDT-J2' }
      ]
    },
    {
      name: 'JHS 3 (BECE Candidates - Grade 9)',
      code: 'JHS-03',
      gradeLevel: 9,
      subjects: [
        { name: 'BECE English Language', code: 'ENG-J3' },
        { name: 'BECE Core Mathematics', code: 'MTH-J3' },
        { name: 'BECE Integrated Science', code: 'SCI-J3' },
        { name: 'BECE Social Studies', code: 'SOC-J3' },
        { name: 'ICT & Computing Fundamentals', code: 'ICT-J3' }
      ]
    },
    // SENIOR HIGH SCHOOL (SHS)
    {
      name: 'SHS 1 / Grade 10 - STEM & Arts',
      code: 'SHS-01',
      gradeLevel: 10,
      subjects: [
        { name: 'Core Mathematics & Geometry', code: 'MTH-S1' },
        { name: 'English Language & Rhetoric', code: 'ENG-S1' },
        { name: 'Elective Physics I', code: 'PHY-S1' },
        { name: 'Elective Chemistry I', code: 'CHM-S1' },
        { name: 'Elective Biology I', code: 'BIO-S1' },
        { name: 'Computer Programming Foundations', code: 'CS-S1' }
      ]
    },
    {
      name: 'SHS 2 / Grade 11 - Advanced Secondary',
      code: 'SHS-02',
      gradeLevel: 11,
      subjects: [
        { name: 'Elective Mathematics (Pre-Calculus)', code: 'EMTH-S2' },
        { name: 'Physics: Mechanics & Waves', code: 'PHY-S2' },
        { name: 'Chemistry: Organic & Analytical', code: 'CHM-S2' },
        { name: 'Literature in English', code: 'LIT-S2' },
        { name: 'Data Structures & Web Design', code: 'CS-S2' }
      ]
    },
    {
      name: 'SHS 3 / Grade 12 - Senior Baccalaureate & WASSCE',
      code: 'SHS-03',
      gradeLevel: 12,
      subjects: [
        { name: 'Calculus, Vectors & Mechanics', code: 'CALC-S3' },
        { name: 'Advanced Physics: Electromagnetism', code: 'PHY-S3' },
        { name: 'Biochemistry & Genetics', code: 'BIO-S3' },
        { name: 'Economics & Financial Accounting', code: 'ACC-S3' },
        { name: 'Software Engineering & Databases', code: 'CS-S3' }
      ]
    },
    // TERTIARY / UNIVERSITY LEVEL
    {
      name: 'Level 100 - Freshman Undergraduate (Semesters 1 & 2)',
      code: 'LVL-100',
      gradeLevel: 13,
      subjects: [
        { name: 'CS101: Introduction to Computer Science & Python', code: 'CS-101' },
        { name: 'MATH101: College Calculus & Linear Algebra', code: 'MATH-101' },
        { name: 'ENG101: Academic Communication & Research Writing', code: 'ENG-101' },
        { name: 'PHYS101: University Physics for Engineers', code: 'PHYS-101' }
      ]
    },
    {
      name: 'Level 200 - Sophomore Year (Semesters 1 & 2)',
      code: 'LVL-200',
      gradeLevel: 14,
      subjects: [
        { name: 'CS201: Data Structures, Algorithms & Analysis', code: 'CS-201' },
        { name: 'CS202: Object-Oriented Software Design in Java/C++', code: 'CS-202' },
        { name: 'MATH201: Discrete Mathematics & Probability', code: 'MATH-201' },
        { name: 'ENG201: Computer Architecture & Digital Logic', code: 'ENG-201' }
      ]
    },
    {
      name: 'Level 300 - Junior Year (Semesters 1 & 2)',
      code: 'LVL-300',
      gradeLevel: 15,
      subjects: [
        { name: 'CS301: Relational Database Systems & SQL Optimization', code: 'CS-301' },
        { name: 'CS302: Operating Systems & Systems Programming', code: 'CS-302' },
        { name: 'CS303: Distributed Systems & Cloud Microservices', code: 'CS-303' },
        { name: 'SE301: Agile Software Engineering & DevOps CI/CD', code: 'SE-301' }
      ]
    },
    {
      name: 'Level 400 - Senior Year & Thesis (Semesters 1 & 2)',
      code: 'LVL-400',
      gradeLevel: 16,
      subjects: [
        { name: 'CS401: Artificial Intelligence & Deep Learning', code: 'CS-401' },
        { name: 'CS402: Information Security, Cryptography & Network Defense', code: 'CS-402' },
        { name: 'CS403: Capstone Senior Project, Engineering Thesis & Defense', code: 'CS-403' },
        { name: 'MGT401: Technology Entrepreneurship & Venture Capital', code: 'MGT-401' }
      ]
    }
  ];

  const seededClasses = [];

  for (const c of standardCurriculum) {
    let cls = await prisma.class.findFirst({
      where: { tenantId: tid, code: c.code }
    });

    if (!cls) {
      cls = await prisma.class.create({
        data: {
          tenantId: tid,
          name: c.name,
          code: c.code,
          gradeLevel: c.gradeLevel
        }
      });
    }

    for (const sub of c.subjects) {
      const existingSub = await prisma.subject.findFirst({
        where: { classId: cls.id, code: sub.code }
      });

      if (!existingSub) {
        await prisma.subject.create({
          data: {
            classId: cls.id,
            name: sub.name,
            code: sub.code
          }
        });
      }
    }

    seededClasses.push(cls);
  }

  // Record audit log
  if (operatorUser) {
    await prisma.auditLog.create({
      data: {
        tenantId: tid,
        userId: operatorUser.id,
        action: 'CURRICULUM_SEEDED',
        module: 'ACADEMIC',
        details: `Seeded standard enterprise academic curriculum (Grade 9-12 with 23 foundational STEM & Humanities subjects).`
      }
    });
  }

  return getClasses(tid);
};

/**
 * 3. SUBJECTS MANAGEMENT
 */
const getSubjects = async (tenantId, classId) => {
  const whereClause = {};

  if (classId) {
    // Verify class belongs to tenant
    const targetClass = await prisma.class.findFirst({
      where: { id: parseInt(classId, 10), tenantId: parseInt(tenantId, 10) }
    });
    if (!targetClass) {
      throw new AppError('Specified class not found in this institution.', 404);
    }
    whereClause.classId = targetClass.id;
  } else {
    // Filter subjects where class.tenantId = tenantId
    whereClause.class = {
      tenantId: parseInt(tenantId, 10)
    };
  }

  return await prisma.subject.findMany({
    where: whereClause,
    include: {
      class: {
        select: { id: true, name: true, code: true, gradeLevel: true }
      }
    },
    orderBy: [
      { classId: 'asc' },
      { name: 'asc' }
    ]
  });
};

const getSubjectById = async (tenantId, subjectId) => {
  const subject = await prisma.subject.findFirst({
    where: {
      id: parseInt(subjectId, 10),
      class: {
        tenantId: parseInt(tenantId, 10)
      }
    },
    include: {
      class: true
    }
  });

  if (!subject) {
    throw new AppError('Subject not found or unauthorized.', 404);
  }

  return subject;
};

const createSubject = async (tenantId, data, operatorUser) => {
  if (!data.name || !data.code || !data.classId) {
    throw new AppError('Subject name, subject code, and target class ID are required.', 400);
  }

  // Verify target class belongs to tenant
  const targetClass = await prisma.class.findFirst({
    where: {
      id: parseInt(data.classId, 10),
      tenantId: parseInt(tenantId, 10)
    }
  });

  if (!targetClass) {
    throw new AppError('Target class does not exist in your institution.', 404);
  }

  const existingSubject = await prisma.subject.findFirst({
    where: {
      classId: targetClass.id,
      code: data.code.toUpperCase().trim()
    }
  });

  if (existingSubject) {
    throw new AppError(`Subject with code '${data.code.toUpperCase()}' already exists in class '${targetClass.name}'.`, 400);
  }

  const subject = await prisma.subject.create({
    data: {
      classId: targetClass.id,
      name: data.name.trim(),
      code: data.code.toUpperCase().trim()
    },
    include: {
      class: true
    }
  });

  // Record audit log
  if (operatorUser) {
    await prisma.auditLog.create({
      data: {
        tenantId: parseInt(tenantId, 10),
        userId: operatorUser.id,
        action: 'SUBJECT_CREATED',
        module: 'ACADEMIC',
        details: `Created subject '${subject.name}' (${subject.code}) assigned to class '${targetClass.name}'.`
      }
    });
  }

  return subject;
};

const updateSubject = async (tenantId, subjectId, data, operatorUser) => {
  const targetSubject = await prisma.subject.findFirst({
    where: {
      id: parseInt(subjectId, 10),
      class: {
        tenantId: parseInt(tenantId, 10)
      }
    },
    include: { class: true }
  });

  if (!targetSubject) {
    throw new AppError('Subject not found or unauthorized.', 404);
  }

  const updateData = {};
  if (data.name) updateData.name = data.name.trim();
  if (data.code) updateData.code = data.code.toUpperCase().trim();
  if (data.classId) {
    // Verify new class belongs to tenant
    const newClass = await prisma.class.findFirst({
      where: { id: parseInt(data.classId, 10), tenantId: parseInt(tenantId, 10) }
    });
    if (!newClass) throw new AppError('New class target not found in this institution.', 404);
    updateData.classId = newClass.id;
  }

  const updatedSubject = await prisma.subject.update({
    where: { id: targetSubject.id },
    data: updateData,
    include: { class: true }
  });

  // Record audit log
  if (operatorUser) {
    await prisma.auditLog.create({
      data: {
        tenantId: parseInt(tenantId, 10),
        userId: operatorUser.id,
        action: 'SUBJECT_UPDATED',
        module: 'ACADEMIC',
        details: `Updated subject ID ${targetSubject.id} (${updatedSubject.name} - ${updatedSubject.code}).`
      }
    });
  }

  return updatedSubject;
};

const deleteSubject = async (tenantId, subjectId, operatorUser) => {
  const targetSubject = await prisma.subject.findFirst({
    where: {
      id: parseInt(subjectId, 10),
      class: {
        tenantId: parseInt(tenantId, 10)
      }
    },
    include: { class: true }
  });

  if (!targetSubject) {
    throw new AppError('Subject not found or unauthorized.', 404);
  }

  await prisma.subject.delete({
    where: { id: targetSubject.id }
  });

  // Record audit log
  if (operatorUser) {
    await prisma.auditLog.create({
      data: {
        tenantId: parseInt(tenantId, 10),
        userId: operatorUser.id,
        action: 'SUBJECT_DELETED',
        module: 'ACADEMIC',
        details: `Deleted subject '${targetSubject.name}' (${targetSubject.code}) from class '${targetSubject.class.name}'.`
      }
    });
  }

  return { message: `Subject '${targetSubject.name}' deleted successfully.` };
};

/**
 * 4. EXAMS CRUD
 */
const getExams = async (tenantId, classId) => {
  const whereClause = {
    class: { tenantId: parseInt(tenantId, 10) }
  };
  if (classId) {
    whereClause.classId = parseInt(classId, 10);
  }

  return await prisma.exam.findMany({
    where: whereClause,
    include: {
      class: { select: { id: true, name: true, code: true } },
      questionBank: true,
      answerSheets: true
    },
    orderBy: { examDate: 'desc' }
  });
};

const createExam = async (tenantId, data, operatorUser) => {
  const targetClass = await prisma.class.findFirst({
    where: { id: parseInt(data.classId, 10), tenantId: parseInt(tenantId, 10) }
  });

  if (!targetClass) {
    throw new AppError('Target class not found for exam creation.', 404);
  }

  const exam = await prisma.exam.create({
    data: {
      classId: targetClass.id,
      title: data.title,
      totalMarks: parseFloat(data.totalMarks || 100),
      passMarks: parseFloat(data.passMarks || 40),
      examDate: new Date(data.examDate || Date.now())
    },
    include: {
      class: true
    }
  });

  if (operatorUser) {
    await prisma.auditLog.create({
      data: {
        tenantId: parseInt(tenantId, 10),
        userId: operatorUser.id,
        action: 'EXAM_CREATED',
        module: 'ACADEMIC',
        details: `Scheduled exam '${exam.title}' for class '${targetClass.name}'.`
      }
    });
  }

  return exam;
};

/**
 * 4. HEADMASTER ACADEMIC YEARLY & TERMLY PLANNER & AUTOMATIC PROMOTION
 */
const academicPlans = new Map();

const getAcademicPlanner = async (tenantId) => {
  const tid = parseInt(tenantId, 10);
  let plan = academicPlans.get(tid);

  if (!plan) {
    plan = {
      tenantId: tid,
      academicYear: "2026-2027",
      systemType: "TERMS", // "TERMS" (3 Terms) or "SEMESTERS" (2 Semesters)
      activeTerm: "Term 1",
      activeTermNumber: 1,
      totalTerms: 3,
      isPromotionalPeriod: false,
      terms: [
        { termNumber: 1, name: "Term 1 (Michaelmas)", startDate: "2026-09-01", endDate: "2026-12-15", isCompleted: true, isPromotional: false },
        { termNumber: 2, name: "Term 2 (Lent)", startDate: "2027-01-08", endDate: "2027-04-10", isCompleted: true, isPromotional: false },
        { termNumber: 3, name: "Term 3 (Trinity Promotional)", startDate: "2027-04-28", endDate: "2027-07-25", isCompleted: false, isPromotional: true }
      ],
      lastPromotionExecutedAt: null,
      promotionSummary: null
    };
    academicPlans.set(tid, plan);
  }

  return plan;
};

const saveAcademicPlan = async (tenantId, planData, operatorUser) => {
  const tid = parseInt(tenantId, 10);
  const current = await getAcademicPlanner(tid);

  const updatedPlan = {
    ...current,
    academicYear: planData.academicYear || current.academicYear,
    systemType: planData.systemType || current.systemType,
    activeTerm: planData.activeTerm || current.activeTerm,
    activeTermNumber: parseInt(planData.activeTermNumber || current.activeTermNumber, 10),
    totalTerms: planData.systemType === "SEMESTERS" ? 2 : 3,
    isPromotionalPeriod: Boolean(planData.isPromotionalPeriod),
    terms: Array.isArray(planData.terms) && planData.terms.length > 0 ? planData.terms : current.terms,
    updatedAt: new Date().toISOString()
  };

  academicPlans.set(tid, updatedPlan);

  if (operatorUser) {
    await prisma.auditLog.create({
      data: {
        tenantId: tid,
        userId: operatorUser.id,
        action: 'ACADEMIC_PLAN_UPDATED',
        module: 'ACADEMIC',
        details: `Headmaster updated Academic Plan for ${updatedPlan.academicYear} (${updatedPlan.systemType}: ${updatedPlan.activeTerm}). Promotional Flag: ${updatedPlan.isPromotionalPeriod}.`
      }
    });
  }

  return updatedPlan;
};

/**
 * Promote students automatically when the 3 full terms or 2 semesters end
 * Only students in good financial standing (no fee arrears) are promoted.
 * Students who owe are blocked with RESTRICTED_FEE_ARREARS until settled.
 */
const promoteStudents = async (tenantId, options = {}, operatorUser) => {
  const tid = parseInt(tenantId, 10);
  const planner = await getAcademicPlanner(tid);

  // Fetch all active classes in tenant ordered by gradeLevel ascending
  const classes = await prisma.class.findMany({
    where: { tenantId: tid },
    orderBy: { gradeLevel: 'asc' }
  });

  if (classes.length === 0) {
    throw new AppError("No academic classes registered in this institution.", 400);
  }

  // Fetch all active student enrollments
  const enrollments = await prisma.classEnrollment.findMany({
    where: { tenantId: tid, status: 'ACTIVE' },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, email: true } },
      class: { select: { id: true, name: true, code: true, gradeLevel: true } }
    }
  });

  // Query invoices to check for unpaid arrears
  const unpaidInvoices = await prisma.invoice.findMany({
    where: {
      tenantId: tid,
      status: { not: 'PAID' },
      balanceDue: { gt: 0 }
    },
    select: { studentId: true, balanceDue: true }
  });

  const debtorStudentIds = new Set(unpaidInvoices.map(inv => inv.studentId));

  const promotedList = [];
  const restrictedList = [];
  const graduatedList = [];

  for (const enr of enrollments) {
    const studentId = enr.studentId;
    const currentClass = enr.class;

    // Check financial arrears restriction
    if (debtorStudentIds.has(studentId)) {
      restrictedList.push({
        studentId,
        name: `${enr.student.firstName} ${enr.student.lastName}`,
        email: enr.student.email,
        currentClass: currentClass.name,
        reason: "OUTSTANDING_FEE_ARREARS",
        message: "Promotion withheld. Student owes outstanding tuition/hostel fees."
      });
      continue;
    }

    // Determine next class by gradeLevel + 1 or next in hierarchy
    const nextClass = classes.find(c => c.gradeLevel === currentClass.gradeLevel + 1) ||
                      classes.find(c => c.gradeLevel > currentClass.gradeLevel);

    if (!nextClass) {
      // Reached top level (e.g. Level 400 University) -> Graduate
      await prisma.classEnrollment.update({
        where: { id: enr.id },
        data: { status: 'GRADUATED' }
      });

      graduatedList.push({
        studentId,
        name: `${enr.student.firstName} ${enr.student.lastName}`,
        priorClass: currentClass.name,
        status: "GRADUATED_ALUMNI"
      });
    } else {
      // Advance to next class
      await prisma.classEnrollment.update({
        where: { id: enr.id },
        data: {
          classId: nextClass.id,
          enrolledAt: new Date()
        }
      });

      promotedList.push({
        studentId,
        name: `${enr.student.firstName} ${enr.student.lastName}`,
        fromClass: currentClass.name,
        toClass: nextClass.name
      });
    }
  }

  const summary = {
    executedAt: new Date().toISOString(),
    promotedCount: promotedList.length,
    restrictedCount: restrictedList.length,
    graduatedCount: graduatedList.length,
    promotedStudents: promotedList,
    restrictedStudents: restrictedList,
    graduatedStudents: graduatedList
  };

  planner.lastPromotionExecutedAt = summary.executedAt;
  planner.promotionSummary = summary;
  academicPlans.set(tid, planner);

  if (operatorUser) {
    await prisma.auditLog.create({
      data: {
        tenantId: tid,
        userId: operatorUser.id,
        action: 'STUDENTS_AUTOMATIC_PROMOTION_EXECUTED',
        module: 'ACADEMIC',
        details: `Executed student promotion for ${planner.academicYear}. Promoted: ${promotedList.length}, Withheld/Restricted: ${restrictedList.length}, Graduated: ${graduatedList.length}.`
      }
    });
  }

  return summary;
};

/**
 * Headmaster explicitly updates/assigns student to an exact class
 */
const updateStudentClass = async (tenantId, studentId, classId, operatorUser) => {
  const tid = parseInt(tenantId, 10);
  const sid = parseInt(studentId, 10);
  const cid = parseInt(classId, 10);

  const targetClass = await prisma.class.findFirst({
    where: { id: cid, tenantId: tid }
  });
  if (!targetClass) {
    throw new AppError("Class not found in this institution.", 404);
  }

  const student = await prisma.user.findFirst({
    where: { id: sid, tenantId: tid, role: 'STUDENT' }
  });
  if (!student) {
    throw new AppError("Student record not found.", 404);
  }

  const existingEnrollment = await prisma.classEnrollment.findFirst({
    where: { tenantId: tid, studentId: sid }
  });

  let enrollment;
  if (existingEnrollment) {
    enrollment = await prisma.classEnrollment.update({
      where: { id: existingEnrollment.id },
      data: {
        classId: targetClass.id,
        status: 'ACTIVE',
        enrolledAt: new Date()
      },
      include: { class: true }
    });
  } else {
    enrollment = await prisma.classEnrollment.create({
      data: {
        tenantId: tid,
        studentId: sid,
        classId: targetClass.id,
        status: 'ACTIVE'
      },
      include: { class: true }
    });
  }

  if (operatorUser) {
    await prisma.auditLog.create({
      data: {
        tenantId: tid,
        userId: operatorUser.id,
        action: 'HEADMASTER_ASSIGNED_STUDENT_CLASS',
        module: 'ACADEMIC',
        details: `Headmaster assigned student ${student.firstName} ${student.lastName} directly to class '${targetClass.name}' (${targetClass.code}).`
      }
    });
  }

  return {
    student: { id: student.id, name: `${student.firstName} ${student.lastName}` },
    assignedClass: targetClass,
    enrollment
  };
};

// =========================================================================
// TEACHER PLANS (YEARLY, TERMLY, WEEKLY) & LESSON NOTES VETTING SUBSYSTEM
// =========================================================================

let teacherLessonPlansStore = [
  {
    id: 'plan-1',
    tenantId: 1,
    planType: 'YEARLY_PLAN',
    title: 'Senior High 1 & 2 Mathematics Annual Scheme of Work',
    subjectName: 'Advanced Mathematics',
    className: 'Grade 10A (Senior High 1)',
    term: 'All Terms (2026/2027)',
    weekNumber: 'Weeks 1 - 36',
    topic: 'Algebra, Trigonometry, Calculus & Statistics Year Roadmap',
    learningObjectives: 'Comprehensive mastery of secondary algebra and differential calculus aligned with national examination syllabus.',
    pedagogicalActivities: 'Lecture presentations, weekly lab problem sets, group presentations, mid-term formative assessments.',
    resourcesAttached: 'SHS_Math_Yearly_Scheme_2026.pdf',
    teacherId: 1,
    teacherName: 'Dr. Robert Vance',
    submittedAt: '2026-09-01T08:30:00.000Z',
    status: 'VETTED_APPROVED',
    headmasterRemarks: 'Vetted and thoroughly approved. Excellent breakdown of weekly learning milestones and practical assignments.',
    vettedBy: 'Headmaster Academic Directorate',
    vettedAt: '2026-09-03T11:00:00.000Z'
  },
  {
    id: 'plan-2',
    tenantId: 1,
    planType: 'TERMLY_PLAN',
    title: 'Physics & STEM Mechanics Term 1 Curriculum Delivery',
    subjectName: 'Physics & Mechanics',
    className: 'Grade 10A Science',
    term: 'Term 1',
    weekNumber: 'Weeks 1 - 12',
    topic: 'Classical Newtonian Mechanics, Dynamics & Work Energy',
    learningObjectives: 'Enable scholars to conduct laboratory experiments on kinematics and compute friction coefficients.',
    pedagogicalActivities: 'Hands-on lab experiments, digital simulations in PhET, weekly problem sheets.',
    resourcesAttached: 'Term1_Physics_Curriculum_Plan.pdf',
    teacherId: 2,
    teacherName: 'Prof. Eleanor Sterling',
    submittedAt: '2026-09-08T09:15:00.000Z',
    status: 'VETTED_APPROVED',
    headmasterRemarks: 'Approved. Ensure laboratory safety protocol is reviewed with all students in week 1.',
    vettedBy: 'Headmaster Academic Directorate',
    vettedAt: '2026-09-09T14:20:00.000Z'
  },
  {
    id: 'plan-3',
    tenantId: 1,
    planType: 'WEEKLY_PLAN',
    title: 'Week 4 Instructional Framework: Linear Algebra & Matrices',
    subjectName: 'Advanced Mathematics',
    className: 'Grade 10A (Senior High 1)',
    term: 'Term 1',
    weekNumber: 4,
    topic: 'Matrix Determinants, Inverses & Cramer Rule Applications',
    learningObjectives: 'Students will solve 3x3 linear equation systems using determinant reduction.',
    pedagogicalActivities: 'Interactive whiteboard derivation, peer pair calculations, 15-minute speed quiz.',
    resourcesAttached: 'Math_Week4_Instructional_Plan.docx',
    teacherId: 1,
    teacherName: 'Dr. Robert Vance',
    submittedAt: '2026-10-18T16:00:00.000Z',
    status: 'PENDING_VETTING',
    headmasterRemarks: null,
    vettedBy: null,
    vettedAt: null
  },
  {
    id: 'plan-4',
    tenantId: 1,
    planType: 'LESSON_NOTES',
    title: 'Detailed Pedagogical Lesson Notes: Quadratic Roots & Graphing',
    subjectName: 'Advanced Mathematics',
    className: 'Grade 10A (Senior High 1)',
    term: 'Term 1',
    weekNumber: 4,
    topic: 'Completing the Square and Parabolic Vertex Coordinates',
    learningObjectives: 'Identify axis of symmetry, determine max/min points, and sketch parabolas accurately without graphing calculator.',
    pedagogicalActivities: 'Step-by-step board derivation, graphing paper exercises, misconception correction.',
    resourcesAttached: 'LessonNotes_Quadratic_Curves.pdf',
    teacherId: 1,
    teacherName: 'Dr. Robert Vance',
    submittedAt: '2026-10-19T08:00:00.000Z',
    status: 'PENDING_VETTING',
    headmasterRemarks: null,
    vettedBy: null,
    vettedAt: null
  }
];

let facultyDirectivesStore = [
  {
    id: 'dir-1',
    tenantId: 1,
    target: 'ALL',
    targetTeacherName: 'All Faculty Members & Subject Educators',
    subject: 'Submission Deadline for Term 1 Lesson Notes & Schemes of Work',
    message: 'All teaching faculty are reminded that weekly lesson notes must be uploaded for vetting no later than Friday 4:00 PM prior to the instructional week. Ensure that lesson objectives reflect Bloom\'s higher-order thinking skills.',
    issuedBy: 'Executive Headmaster Office',
    issuedAt: '2026-10-15T10:00:00.000Z'
  }
];

const getTeacherLessonPlans = async (tenantId, query = {}) => {
  let plans = [...teacherLessonPlansStore];
  if (query.planType && query.planType !== 'ALL') {
    plans = plans.filter(p => p.planType === query.planType);
  }
  if (query.status && query.status !== 'ALL') {
    plans = plans.filter(p => p.status === query.status);
  }
  if (query.teacherId) {
    plans = plans.filter(p => String(p.teacherId) === String(query.teacherId));
  }
  return plans;
};

const submitTeacherLessonPlan = async (tenantId, data, operatorUser) => {
  if (!data.title || !data.subjectName || !data.className) {
    throw new AppError('Plan title, subject, and class are required.', 400);
  }

  const validTypes = ['YEARLY_PLAN', 'TERMLY_PLAN', 'WEEKLY_PLAN', 'LESSON_NOTES'];
  const planType = validTypes.includes(data.planType) ? data.planType : 'LESSON_NOTES';

  const newPlan = {
    id: `plan-${Date.now()}`,
    tenantId: parseInt(tenantId, 10) || 1,
    planType,
    title: data.title.trim(),
    subjectName: data.subjectName.trim(),
    className: data.className.trim(),
    term: data.term || 'Term 1',
    weekNumber: data.weekNumber || 1,
    topic: data.topic || data.title,
    learningObjectives: data.learningObjectives || 'Comprehensive subject competency acquisition.',
    pedagogicalActivities: data.pedagogicalActivities || 'Direct instruction, interactive student problem solving, and formative review.',
    resourcesAttached: data.resourcesAttached || `${planType.toLowerCase()}_attached.pdf`,
    teacherId: operatorUser?.id || data.teacherId || 1,
    teacherName: operatorUser ? `${operatorUser.firstName} ${operatorUser.lastName}` : (data.teacherName || 'Faculty Member'),
    submittedAt: new Date().toISOString(),
    status: 'PENDING_VETTING',
    headmasterRemarks: null,
    vettedBy: null,
    vettedAt: null
  };

  teacherLessonPlansStore.unshift(newPlan);
  return newPlan;
};

const vetTeacherLessonPlan = async (tenantId, planId, data, operatorUser) => {
  const planIndex = teacherLessonPlansStore.findIndex(p => String(p.id) === String(planId));
  if (planIndex === -1) {
    throw new AppError('Lesson plan or notes record not found.', 404);
  }

  const validStatuses = ['VETTED_APPROVED', 'REVISION_REQUIRED', 'UNDER_REVIEW'];
  const status = validStatuses.includes(data.vettingStatus) ? data.vettingStatus : 'VETTED_APPROVED';

  const vettedRecord = {
    ...teacherLessonPlansStore[planIndex],
    status,
    headmasterRemarks: data.headmasterRemarks || (status === 'VETTED_APPROVED' 
      ? 'Vetted, endorsed, and officially authorized for classroom instruction.' 
      : 'Revisions requested. Please align lesson objectives with practical exercises and resubmit.'),
    vettedBy: operatorUser ? `${operatorUser.firstName} ${operatorUser.lastName} (Headmaster)` : 'Headmaster Academic Directorate',
    vettedAt: new Date().toISOString()
  };

  teacherLessonPlansStore[planIndex] = vettedRecord;
  return vettedRecord;
};

const broadcastFacultyDirective = async (tenantId, data, operatorUser) => {
  if (!data.message || !data.message.trim()) {
    throw new AppError('Directive message content is required.', 400);
  }

  const directive = {
    id: `dir-${Date.now()}`,
    tenantId: parseInt(tenantId, 10) || 1,
    target: data.target || 'ALL',
    targetTeacherName: data.targetTeacherName || (data.target === 'ALL' ? 'All Faculty Members & Subject Educators' : `Teacher #${data.target}`),
    subject: data.subject || 'Official Academic Directive from Headmaster',
    message: data.message.trim(),
    issuedBy: operatorUser ? `${operatorUser.firstName} ${operatorUser.lastName} (Headmaster)` : 'Executive Headmaster Office',
    issuedAt: new Date().toISOString()
  };

  facultyDirectivesStore.unshift(directive);
  return directive;
};

const getFacultyDirectives = async (tenantId, query = {}) => {
  let directives = [...facultyDirectivesStore];
  if (query.target && query.target !== 'ALL') {
    directives = directives.filter(d => d.target === 'ALL' || String(d.target) === String(query.target));
  }
  return directives;
};

module.exports = {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  seedCurriculum,
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  getExams,
  createExam,
  getAcademicPlanner,
  saveAcademicPlan,
  promoteStudents,
  updateStudentClass,
  getTeacherLessonPlans,
  submitTeacherLessonPlan,
  vetTeacherLessonPlan,
  broadcastFacultyDirective,
  getFacultyDirectives
};