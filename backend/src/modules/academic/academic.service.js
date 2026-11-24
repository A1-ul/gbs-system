const prisma = require('../../core/database/prisma.client');
const { AppError } = require('../../middleware/error.middleware');
const { ensureLessonPlanTables } = require('../../core/database/ensureLessonPlanTables');
const {
  NACCA_CORE_COMPETENCIES,
  LEARNER_CENTRED_METHODS,
  SUBJECT_LESSON_TEMPLATES,
  evaluateLessonPlanQuality
} = require('./lessonPlanQuality.util');

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
    const updatedExisting = await prisma.class.update({
      where: { id: existingClass.id },
      data: {
        name: data.name.trim(),
        gradeLevel: parseInt(data.gradeLevel || existingClass.gradeLevel || 1, 10)
      },
      include: { subjects: true }
    });
    return updatedExisting;
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
  const invoiceDelegate = prisma.studentInvoice || prisma.invoice;
  const unpaidInvoices = invoiceDelegate
    ? await invoiceDelegate.findMany({
        where: {
          tenantId: tid,
          status: { not: 'PAID' },
          balanceDue: { gt: 0 }
        },
        select: { studentId: true, balanceDue: true }
      })
    : [];

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
// TEACHER PLANS (YEARLY, TERMLY, WEEKLY) & GHANA NaCCA LESSON NOTES VETTING
// Persistent PostgreSQL + Tenant-Isolated Fallback + Full Review History
// =========================================================================

const { readPersistentStore, writePersistentStore } = require('../../core/database/persistentStore');
const { resolveTenantInstitutionType } = require('../../utils/institutionProfiles');

const VALID_PLAN_TYPES = ['YEARLY_PLAN', 'TERMLY_PLAN', 'WEEKLY_PLAN', 'LESSON_NOTES'];
const VALID_PLAN_STATUSES = ['DRAFT', 'PENDING_VETTING', 'UNDER_REVIEW', 'REVISION_REQUIRED', 'VETTED_APPROVED'];

function parseJsonSafe(raw, fallback) {
  if (!raw) return fallback;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function normalizeStringList(val) {
  if (Array.isArray(val)) return val.map((x) => String(x || '').trim()).filter(Boolean);
  if (typeof val === 'string' && val.trim()) {
    return val.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

function hydrateLessonPlan(row) {
  if (!row) return null;
  const structured = parseJsonSafe(row.structuredJson || row.structured_json, {});
  const reviewHistory = Array.isArray(parseJsonSafe(row.reviewHistoryJson || row.review_history_json, []))
    ? parseJsonSafe(row.reviewHistoryJson || row.review_history_json, [])
    : (Array.isArray(row.reviewHistory) ? row.reviewHistory : []);

  const expectedLearningOutcomes = structured.expectedLearningOutcomes || row.expectedLearningOutcomes || row.learningObjectives || '';
  const teacherActivities = structured.teacherActivities || row.teacherActivities || '';
  const learnerActivities = structured.learnerActivities || row.learnerActivities || '';
  const combinedActivities = [
    teacherActivities ? `Teacher: ${teacherActivities}` : '',
    learnerActivities ? `Learners: ${learnerActivities}` : ''
  ].filter(Boolean).join('\n\n') || structured.pedagogicalActivities || row.pedagogicalActivities || '';

  const hydrated = {
    id: String(row.id),
    tenantId: Number(row.tenantId ?? row.tenant_id ?? 1),
    planType: row.planType || row.plan_type || 'LESSON_NOTES',
    title: row.title || '',
    subjectName: row.subjectName || row.subject_name || '',
    className: row.className || row.class_name || '',
    term: row.term || 'Term 1',
    weekNumber: row.weekNumber ?? row.week_number ?? 'Week 1',
    lessonDate: row.lessonDate || row.lesson_date || structured.lessonDate || '',
    durationMinutes: Number(row.durationMinutes ?? row.duration_minutes ?? structured.durationMinutes ?? 60) || 60,
    topic: row.topic || '',
    strand: row.strand || structured.strand || '',
    subStrand: row.subStrand || row.sub_strand || structured.subStrand || '',
    educationalLevel: row.educationalLevel || row.educational_level || structured.educationalLevel || '',
    curriculumReferences: row.curriculumReference || row.curriculum_reference || structured.curriculumReferences || '',

    // 16 Required Ghana NaCCA Educational Elements
    contentStandard: structured.contentStandard || row.contentStandard || '',
    learningIndicator: structured.learningIndicator || row.learningIndicator || '',
    performanceIndicator: structured.performanceIndicator || row.performanceIndicator || '',
    coreCompetencies: normalizeStringList(structured.coreCompetencies ?? row.coreCompetencies),
    previousKnowledge: structured.previousKnowledge || row.previousKnowledge || '',
    teachingLearningResources: structured.teachingLearningResources || row.teachingLearningResources || '',
    teachingLearningMethods: normalizeStringList(structured.teachingLearningMethods ?? row.teachingLearningMethods),
    teachingLearningMethodsNotes: structured.teachingLearningMethodsNotes || row.teachingLearningMethodsNotes || '',
    differentiatedLearning: structured.differentiatedLearning || row.differentiatedLearning || '',
    expectedLearningOutcomes,
    teacherActivities,
    learnerActivities,
    assessmentEvaluation: structured.assessmentEvaluation || row.assessmentEvaluation || '',
    conclusionPlenary: structured.conclusionPlenary || row.conclusionPlenary || '',
    assignmentHomework: structured.assignmentHomework || row.assignmentHomework || '',
    teacherReflection: structured.teacherReflection || row.teacherReflection || '',

    // Legacy / compatibility summary fields
    learningObjectives: expectedLearningOutcomes,
    pedagogicalActivities: combinedActivities,
    resourcesAttached: row.resourcesAttached || row.resources_attached || '',

    // Workflow & review metadata
    status: row.status || 'DRAFT',
    revisionNumber: Number(row.revisionNumber ?? row.revision_number ?? 1) || 1,
    teacherId: row.teacherId ?? row.teacher_id ?? '',
    teacherName: row.teacherName || row.teacher_name || 'Faculty Member',
    teacherEmail: row.teacherEmail || row.teacher_email || '',
    teacherPosition: row.teacherPosition || row.teacher_position || 'Faculty Member',
    headmasterRemarks: row.headmasterRemarks ?? row.headmaster_remarks ?? null,
    sectionComments: structured.sectionComments && typeof structured.sectionComments === 'object' ? structured.sectionComments : {},
    vettedBy: row.vettedBy ?? row.vetted_by ?? null,
    vettedById: row.vettedById ?? row.vetted_by_id ?? null,
    vettedAt: row.vettedAt || row.vetted_at || null,
    submittedAt: row.submittedAt || row.submitted_at || null,
    createdAt: row.createdAt || row.created_at || new Date().toISOString(),
    updatedAt: row.updatedAt || row.updated_at || new Date().toISOString(),
    reviewHistory
  };

  hydrated.qualityReport = evaluateLessonPlanQuality(hydrated);
  return hydrated;
}

function buildStructuredPayload(data = {}, existing = {}) {
  const prev = existing || {};
  return {
    contentStandard: data.contentStandard !== undefined ? String(data.contentStandard || '').trim() : (prev.contentStandard || ''),
    learningIndicator: data.learningIndicator !== undefined ? String(data.learningIndicator || '').trim() : (prev.learningIndicator || ''),
    performanceIndicator: data.performanceIndicator !== undefined ? String(data.performanceIndicator || '').trim() : (prev.performanceIndicator || ''),
    coreCompetencies: data.coreCompetencies !== undefined ? normalizeStringList(data.coreCompetencies) : normalizeStringList(prev.coreCompetencies),
    previousKnowledge: data.previousKnowledge !== undefined ? String(data.previousKnowledge || '').trim() : (prev.previousKnowledge || ''),
    teachingLearningResources: data.teachingLearningResources !== undefined ? String(data.teachingLearningResources || '').trim() : (prev.teachingLearningResources || ''),
    teachingLearningMethods: data.teachingLearningMethods !== undefined ? normalizeStringList(data.teachingLearningMethods) : normalizeStringList(prev.teachingLearningMethods),
    teachingLearningMethodsNotes: data.teachingLearningMethodsNotes !== undefined ? String(data.teachingLearningMethodsNotes || '').trim() : (prev.teachingLearningMethodsNotes || ''),
    differentiatedLearning: data.differentiatedLearning !== undefined ? String(data.differentiatedLearning || '').trim() : (prev.differentiatedLearning || ''),
    expectedLearningOutcomes: data.expectedLearningOutcomes !== undefined
      ? String(data.expectedLearningOutcomes || '').trim()
      : (data.learningObjectives !== undefined ? String(data.learningObjectives || '').trim() : (prev.expectedLearningOutcomes || prev.learningObjectives || '')),
    teacherActivities: data.teacherActivities !== undefined
      ? String(data.teacherActivities || '').trim()
      : (data.pedagogicalActivities !== undefined && !prev.teacherActivities ? String(data.pedagogicalActivities || '').trim() : (prev.teacherActivities || '')),
    learnerActivities: data.learnerActivities !== undefined ? String(data.learnerActivities || '').trim() : (prev.learnerActivities || ''),
    assessmentEvaluation: data.assessmentEvaluation !== undefined ? String(data.assessmentEvaluation || '').trim() : (prev.assessmentEvaluation || ''),
    conclusionPlenary: data.conclusionPlenary !== undefined ? String(data.conclusionPlenary || '').trim() : (prev.conclusionPlenary || ''),
    assignmentHomework: data.assignmentHomework !== undefined ? String(data.assignmentHomework || '').trim() : (prev.assignmentHomework || ''),
    teacherReflection: data.teacherReflection !== undefined ? String(data.teacherReflection || '').trim() : (prev.teacherReflection || ''),
    curriculumReferences: data.curriculumReferences !== undefined
      ? String(data.curriculumReferences || '').trim()
      : (data.curriculumReference !== undefined ? String(data.curriculumReference || '').trim() : (prev.curriculumReferences || '')),
    strand: data.strand !== undefined ? String(data.strand || '').trim() : (prev.strand || ''),
    subStrand: data.subStrand !== undefined ? String(data.subStrand || '').trim() : (prev.subStrand || ''),
    lessonDate: data.lessonDate !== undefined ? String(data.lessonDate || '').trim() : (prev.lessonDate || ''),
    durationMinutes: data.durationMinutes !== undefined ? (parseInt(data.durationMinutes, 10) || 60) : (prev.durationMinutes || 60),
    educationalLevel: data.educationalLevel !== undefined ? String(data.educationalLevel || '').trim() : (prev.educationalLevel || ''),
    sectionComments: data.sectionComments && typeof data.sectionComments === 'object'
      ? data.sectionComments
      : (prev.sectionComments && typeof prev.sectionComments === 'object' ? prev.sectionComments : {})
  };
}

function getDemoSeedLessonPlans() {
  return [
    {
      id: 'plan-demo-nacca-1',
      tenantId: 1,
      planType: 'LESSON_NOTES',
      title: 'Solving Linear Equations in One Variable (NaCCA Learner-Centred Sample)',
      subjectName: 'Mathematics',
      className: 'JHS 2 (Basic 8)',
      term: 'Term 1',
      weekNumber: 'Week 4',
      lessonDate: '2026-10-20',
      durationMinutes: 60,
      topic: 'Solving One-Step and Two-Step Linear Equations Using Balance Method',
      strand: 'Algebra',
      subStrand: 'Variables and Equations',
      educationalLevel: 'Junior High School (JHS)',
      curriculumReference: 'Ghana NaCCA Common Core Mathematics Curriculum (Illustrative Demo Entry — verify exact page in school syllabus)',
      status: 'PENDING_VETTING',
      revisionNumber: 1,
      teacherId: 'teacher-demo-1',
      teacherName: 'Sarah Jenkins',
      teacherEmail: 'teacher@gbs.edu',
      teacherPosition: 'Senior Mathematics & Science Educator',
      resourcesAttached: 'Balance_Scale_Algebra_Cards.pdf',
      structuredJson: JSON.stringify({
        contentStandard: 'Demonstrate understanding of algebraic expressions and linear equations in one variable (Illustrative Demo — verify school NaCCA curriculum code).',
        learningIndicator: 'Model and solve linear equations in one variable using balance models and inverse operations.',
        performanceIndicator: 'Learners accurately solve at least 4 out of 5 one-step and two-step linear equations and explain each inverse operation.',
        coreCompetencies: [
          'Critical Thinking and Problem Solving (CP)',
          'Communication and Collaboration (CC)'
        ],
        previousKnowledge: 'Learners can simplify basic algebraic expressions and perform inverse arithmetic operations (+, -, x, ÷) with integers.',
        teachingLearningResources: 'Cardboard balance-scale cutouts, coloured counters representing unknowns and constants, grid whiteboard, paired worksheet cards.',
        teachingLearningMethods: ['Demonstration & Guided Practice', 'Think-Pair-Share', 'Problem-Based Learning (PBL)'],
        teachingLearningMethodsNotes: 'Concrete balance model transitions smoothly into symbolic inverse operations.',
        differentiatedLearning: 'Support: Provide visual balance-scale mat and single-step equations first for learners needing scaffolding. Extension: Assign word problems requiring formulating and solving two-step equations for fast finishers. Inclusion: Read word prompts aloud and allow oral explanation of steps.',
        expectedLearningOutcomes: 'By the end of the 60-minute lesson, learners will be able to: (1) translate a real-life word statement into a linear equation, (2) solve one-step and two-step equations using inverse operations, and (3) check solutions by substitution.',
        teacherActivities: '1. Starter (10 mins): Present a Ghanaian market pricing riddle (3 notebooks + GHS 4 = GHS 19) to activate prior thinking.\n2. Modelling (15 mins): Use the balance-scale visual to model removing constants equally from both sides before dividing.\n3. Guided Practice (25 mins): Circulate among pairs, prompting learners to verify answers by substituting back.\n4. Plenary (10 mins): Review one common sign-error on the board and guide class correction.',
        learnerActivities: '1. Discuss the market riddle in pairs and propose how to find the cost of 1 notebook.\n2. Manipulate balance cards to mirror teacher steps and explain why both sides must stay equal.\n3. Solve 5 graded equations in pairs and verify each answer by substitution.\n4. Complete a 2-item individual exit check.',
        assessmentEvaluation: 'Oral probing during demonstration, observation checklist during pair work, and a 3-question exit ticket checking formulation, solving, and verification.',
        conclusionPlenary: 'Learners summarize the golden rule of equations ("whatever operation is applied to one side must be applied equally to the other") and identify one mistake to avoid.',
        assignmentHomework: 'Solve 4 two-step linear equations and write 1 short everyday shopping word problem with its complete solution.',
        teacherReflection: '',
        curriculumReferences: 'Ghana NaCCA Common Core Mathematics Curriculum (Illustrative Demo Entry — verify exact page in school syllabus)'
      }),
      reviewHistoryJson: JSON.stringify([
        {
          id: 'rev-demo-1',
          action: 'SUBMITTED_FOR_VETTING',
          statusAfter: 'PENDING_VETTING',
          actorId: 'teacher-demo-1',
          actorName: 'Sarah Jenkins',
          actorRole: 'TEACHER',
          remarks: 'Initial learner-centred lesson note prepared and submitted for Headmaster vetting.',
          revisionNumber: 1,
          timestamp: '2026-10-19T08:15:00.000Z'
        }
      ]),
      headmasterRemarks: null,
      vettedBy: null,
      vettedById: null,
      vettedAt: null,
      submittedAt: '2026-10-19T08:15:00.000Z',
      createdAt: '2026-10-19T08:00:00.000Z',
      updatedAt: '2026-10-19T08:15:00.000Z'
    },
    {
      id: 'plan-demo-nacca-2',
      tenantId: 1,
      planType: 'LESSON_NOTES',
      title: 'Photosynthesis & Leaf Structure Practical Inquiry',
      subjectName: 'Integrated Science',
      className: 'SHS 1 Science',
      term: 'Term 1',
      weekNumber: 'Week 3',
      lessonDate: '2026-10-14',
      durationMinutes: 60,
      topic: 'Conditions Necessary for Photosynthesis and Testing a Leaf for Starch',
      strand: 'Diversity of Matter & Life Processes',
      subStrand: 'Nutrition in Plants',
      educationalLevel: 'Senior High School (SHS)',
      curriculumReference: 'Ghana NaCCA SHS Integrated Science Curriculum (Illustrative Demo Entry)',
      status: 'VETTED_APPROVED',
      revisionNumber: 1,
      teacherId: 'teacher-demo-1',
      teacherName: 'Sarah Jenkins',
      teacherEmail: 'teacher@gbs.edu',
      teacherPosition: 'Senior Mathematics & Science Educator',
      resourcesAttached: 'Starch_Test_Safety_Sheet.pdf',
      structuredJson: JSON.stringify({
        contentStandard: 'Explain nutrition in green plants and investigate factors required for photosynthesis (Illustrative Demo).',
        learningIndicator: 'Conduct safe starch test on green leaves and explain the role of sunlight and chlorophyll.',
        performanceIndicator: 'Learners safely execute starch test steps, record colour change with iodine, and state the word equation for photosynthesis.',
        coreCompetencies: [
          'Critical Thinking and Problem Solving (CP)',
          'Creativity and Innovation (CI)',
          'Communication and Collaboration (CC)'
        ],
        previousKnowledge: 'Learners know plants make their own food and can identify roots, stems, and green leaves.',
        teachingLearningResources: 'Fresh green leaves, boiling water bath, ethanol in test tube, iodine solution, white tile, safety goggles, labelled leaf chart.',
        teachingLearningMethods: ['Hands-On Practical / Experiment', 'Guided Discovery & Inquiry', 'Cooperative Group Work'],
        teachingLearningMethodsNotes: 'Predict-Observe-Explain sequence with explicit ethanol water-bath safety briefing.',
        differentiatedLearning: 'Support: Structured step checklist with safety icons and assigned lab group roles. Extension: Compare variegated leaf regions and hypothesize results without chlorophyll. Inclusion: Front-bench seating for learners with visual impairment and verbal narration of colour changes.',
        expectedLearningOutcomes: 'Learners will safely test a destarched and sunlight-exposed leaf for starch and explain why blue-black colouration confirms photosynthesis.',
        teacherActivities: '1. Safety Briefing (8 mins): Emphasize turning off flames before using ethanol water bath.\n2. Predict & Demo (12 mins): Show covered vs sunlit leaves and elicit predictions.\n3. Lab Facilitation (28 mins): Supervise groups through boiling, decolourising, rinsing, and iodine testing.\n4. Debrief (12 mins): Link blue-black iodine result to glucose storage as starch.',
        learnerActivities: '1. Record predictions in lab notebooks.\n2. Perform safe starch test in groups of 4, observing colour transformation on white tiles.\n3. Present group observations and explain why the shaded leaf section stayed brown.\n4. Write the word equation for photosynthesis.',
        assessmentEvaluation: 'Lab safety & execution rubric, recorded observation table, and 3 short oral/written evaluation questions.',
        conclusionPlenary: 'Class compares predictions with experimental results and summarises conditions needed for photosynthesis.',
        assignmentHomework: 'Draw a labelled diagram of the starch test stages and state two reasons photosynthesis supports all life on Earth.',
        teacherReflection: 'Learners were highly engaged during the iodine colour change. Next time, pre-boil water 5 minutes early so slower groups have extra time for written conclusions.',
        curriculumReferences: 'Ghana NaCCA SHS Integrated Science Curriculum (Illustrative Demo Entry)'
      }),
      reviewHistoryJson: JSON.stringify([
        {
          id: 'rev-demo-2a',
          action: 'SUBMITTED_FOR_VETTING',
          statusAfter: 'PENDING_VETTING',
          actorId: 'teacher-demo-1',
          actorName: 'Sarah Jenkins',
          actorRole: 'TEACHER',
          remarks: 'Submitted practical inquiry lesson notes with ethanol safety steps.',
          revisionNumber: 1,
          timestamp: '2026-10-12T10:00:00.000Z'
        },
        {
          id: 'rev-demo-2b',
          action: 'VETTED_APPROVED',
          statusAfter: 'VETTED_APPROVED',
          actorId: 'admin-demo-1',
          actorName: 'Headmaster Academic Directorate',
          actorRole: 'ADMIN',
          remarks: 'Thorough learner-centred practical design with explicit ethanol safety protocols and clear differentiation. Approved for instruction.',
          revisionNumber: 1,
          timestamp: '2026-10-13T14:30:00.000Z'
        }
      ]),
      headmasterRemarks: 'Thorough learner-centred practical design with explicit ethanol safety protocols and clear differentiation. Approved for instruction.',
      vettedBy: 'Headmaster Academic Directorate',
      vettedById: 'admin-demo-1',
      vettedAt: '2026-10-13T14:30:00.000Z',
      submittedAt: '2026-10-12T10:00:00.000Z',
      createdAt: '2026-10-12T09:30:00.000Z',
      updatedAt: '2026-10-14T16:00:00.000Z'
    },
    {
      id: 'plan-demo-yearly-1',
      tenantId: 1,
      planType: 'YEARLY_PLAN',
      title: 'SHS 1 Mathematics Annual Scheme of Work (Terms 1–3)',
      subjectName: 'Core Mathematics',
      className: 'SHS 1',
      term: 'Full Academic Year',
      weekNumber: 'Weeks 1 - 36',
      lessonDate: '2026-09-01',
      durationMinutes: 60,
      topic: 'Number & Numeration, Algebra, Geometry, Trigonometry & Statistics Annual Roadmap',
      strand: 'Annual Curriculum Coverage',
      subStrand: 'All Strands',
      educationalLevel: 'Senior High School (SHS)',
      curriculumReference: 'NaCCA SHS Core Mathematics Annual Curriculum Framework (Illustrative Demo)',
      status: 'VETTED_APPROVED',
      revisionNumber: 1,
      teacherId: 'teacher-demo-1',
      teacherName: 'Sarah Jenkins',
      teacherEmail: 'teacher@gbs.edu',
      teacherPosition: 'Senior Mathematics & Science Educator',
      resourcesAttached: 'SHS1_Math_Yearly_Scheme.pdf',
      structuredJson: JSON.stringify({
        contentStandard: 'Cover all Term 1–3 Core Mathematics strands progressively with termly formative checkpoints (Illustrative Demo).',
        learningIndicator: 'Sequence weekly instructional milestones across 36 teaching weeks.',
        performanceIndicator: 'Learners achieve >=70% mastery across termly diagnostic assessments.',
        coreCompetencies: ['Critical Thinking and Problem Solving (CP)', 'Digital Literacy (DL)'],
        previousKnowledge: 'BECE Junior High School Core Mathematics foundations.',
        teachingLearningResources: 'Approved NaCCA textbook, graphing boards, geometric sets, past problem banks.',
        teachingLearningMethods: ['Problem-Based Learning (PBL)', 'Demonstration & Guided Practice', 'Cooperative Group Work'],
        differentiatedLearning: 'Remedial clinic sessions scheduled every 4th week alongside enrichment challenge sheets.',
        expectedLearningOutcomes: 'Complete syllabus strands on schedule with verified formative mastery before end-of-year examinations.',
        teacherActivities: 'Deliver weekly guided lessons, coordinate mid-term diagnostics, and provide remedial workshops.',
        learnerActivities: 'Engage in weekly problem sets, peer study groups, and practical geometry/statistics mini-projects.',
        assessmentEvaluation: 'Weekly exit quizzes, mid-term tests, practical projects, and end-of-term examinations.',
        conclusionPlenary: 'End-of-term revision clinics and misconception consolidation before progression.',
        assignmentHomework: 'Weekly structured problem sets aligned to each week\'s strand.',
        teacherReflection: '',
        curriculumReferences: 'NaCCA SHS Core Mathematics Annual Curriculum Framework (Illustrative Demo)'
      }),
      reviewHistoryJson: JSON.stringify([
        {
          id: 'rev-demo-3a',
          action: 'VETTED_APPROVED',
          statusAfter: 'VETTED_APPROVED',
          actorId: 'admin-demo-1',
          actorName: 'Headmaster Academic Directorate',
          actorRole: 'ADMIN',
          remarks: 'Approved annual scheme. Weekly pacing and remedial checkpoints are well balanced.',
          revisionNumber: 1,
          timestamp: '2026-09-03T11:00:00.000Z'
        }
      ]),
      headmasterRemarks: 'Approved annual scheme. Weekly pacing and remedial checkpoints are well balanced.',
      vettedBy: 'Headmaster Academic Directorate',
      vettedById: 'admin-demo-1',
      vettedAt: '2026-09-03T11:00:00.000Z',
      submittedAt: '2026-09-01T08:30:00.000Z',
      createdAt: '2026-09-01T08:30:00.000Z',
      updatedAt: '2026-09-03T11:00:00.000Z'
    }
  ];
}

function getDemoSeedDirectives() {
  return [
    {
      id: 'dir-demo-1',
      tenantId: 1,
      target: 'ALL',
      targetTeacherName: 'All Faculty Members & Subject Educators',
      subject: 'Weekly NaCCA Lesson Notes Submission & Learner-Centred Quality Standard',
      message: 'All teaching staff should submit structured NaCCA learner-centred lesson notes by Friday 4:00 PM prior to the teaching week. Please include authentic curriculum references, clear differentiated learning support, and record your post-lesson reflection after classroom delivery.',
      issuedBy: 'Executive Headmaster Office',
      issuedById: 'admin-demo-1',
      issuedAt: '2026-10-15T10:00:00.000Z'
    }
  ];
}

async function isPgReady() {
  try {
    await ensureLessonPlanTables();
    if (typeof prisma.isPostgresOnline === 'function') {
      return await prisma.isPostgresOnline();
    }
    return true;
  } catch {
    return false;
  }
}

async function persistLessonPlanRow(row) {
  const pgOnline = await isPgReady();
  if (pgOnline) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO teacher_lesson_plans (
        "id", "tenantId", "planType", "title", "subjectName", "className",
        "term", "weekNumber", "lessonDate", "durationMinutes", "topic",
        "strand", "subStrand", "curriculumReference", "educationalLevel",
        "status", "revisionNumber", "teacherId", "teacherName", "teacherEmail",
        "teacherPosition", "resourcesAttached", "structuredJson", "reviewHistoryJson",
        "headmasterRemarks", "vettedBy", "vettedById", "vettedAt", "submittedAt",
        "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, $24,
        $25, $26, $27, $28::timestamp, $29::timestamp,
        $30::timestamp, $31::timestamp
      )
      ON CONFLICT ("id") DO UPDATE SET
        "planType" = EXCLUDED."planType",
        "title" = EXCLUDED."title",
        "subjectName" = EXCLUDED."subjectName",
        "className" = EXCLUDED."className",
        "term" = EXCLUDED."term",
        "weekNumber" = EXCLUDED."weekNumber",
        "lessonDate" = EXCLUDED."lessonDate",
        "durationMinutes" = EXCLUDED."durationMinutes",
        "topic" = EXCLUDED."topic",
        "strand" = EXCLUDED."strand",
        "subStrand" = EXCLUDED."subStrand",
        "curriculumReference" = EXCLUDED."curriculumReference",
        "educationalLevel" = EXCLUDED."educationalLevel",
        "status" = EXCLUDED."status",
        "revisionNumber" = EXCLUDED."revisionNumber",
        "resourcesAttached" = EXCLUDED."resourcesAttached",
        "structuredJson" = EXCLUDED."structuredJson",
        "reviewHistoryJson" = EXCLUDED."reviewHistoryJson",
        "headmasterRemarks" = EXCLUDED."headmasterRemarks",
        "vettedBy" = EXCLUDED."vettedBy",
        "vettedById" = EXCLUDED."vettedById",
        "vettedAt" = EXCLUDED."vettedAt",
        "submittedAt" = EXCLUDED."submittedAt",
        "updatedAt" = EXCLUDED."updatedAt"`,
      row.id,
      Number(row.tenantId),
      row.planType,
      row.title,
      row.subjectName,
      row.className,
      row.term || null,
      String(row.weekNumber ?? ''),
      row.lessonDate || null,
      Number(row.durationMinutes || 60),
      row.topic || null,
      row.strand || null,
      row.subStrand || null,
      row.curriculumReference || null,
      row.educationalLevel || null,
      row.status,
      Number(row.revisionNumber || 1),
      String(row.teacherId ?? ''),
      row.teacherName || null,
      row.teacherEmail || null,
      row.teacherPosition || null,
      row.resourcesAttached || null,
      row.structuredJson || '{}',
      row.reviewHistoryJson || '[]',
      row.headmasterRemarks ?? null,
      row.vettedBy ?? null,
      row.vettedById ? String(row.vettedById) : null,
      row.vettedAt ? new Date(row.vettedAt).toISOString() : null,
      row.submittedAt ? new Date(row.submittedAt).toISOString() : null,
      row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
      row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString()
    );
    return;
  }

  const tidStr = String(row.tenantId);
  writePersistentStore((curr) => {
    const bucket = Array.isArray(curr.teacherLessonPlans?.[tidStr]) ? [...curr.teacherLessonPlans[tidStr]] : [];
    const idx = bucket.findIndex((p) => String(p.id) === String(row.id));
    if (idx >= 0) bucket[idx] = row;
    else bucket.unshift(row);
    return {
      ...curr,
      teacherLessonPlans: {
        ...(curr.teacherLessonPlans || {}),
        [tidStr]: bucket
      }
    };
  });
}

async function fetchTenantLessonPlanRows(tenantId) {
  const tidNum = parseInt(tenantId, 10) || 1;
  const tidStr = String(tidNum);
  const pgOnline = await isPgReady();

  if (pgOnline) {
    let rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM teacher_lesson_plans WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC, "createdAt" DESC`,
      tidNum
    );
    if ((!rows || rows.length === 0) && tidNum === 1) {
      const seeds = getDemoSeedLessonPlans();
      for (const s of seeds) {
        await persistLessonPlanRow(s);
      }
      rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM teacher_lesson_plans WHERE "tenantId" = $1 ORDER BY "updatedAt" DESC, "createdAt" DESC`,
        tidNum
      );
    }
    return Array.isArray(rows) ? rows : [];
  }

  const store = readPersistentStore();
  let rows = Array.isArray(store.teacherLessonPlans?.[tidStr]) ? [...store.teacherLessonPlans[tidStr]] : [];
  if (rows.length === 0 && tidNum === 1) {
    rows = getDemoSeedLessonPlans();
    writePersistentStore((curr) => ({
      ...curr,
      teacherLessonPlans: {
        ...(curr.teacherLessonPlans || {}),
        [tidStr]: rows
      }
    }));
  }
  return rows;
}

async function fetchLessonPlanRowById(tenantId, planId) {
  const tidNum = parseInt(tenantId, 10) || 1;
  const pgOnline = await isPgReady();
  if (pgOnline) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM teacher_lesson_plans WHERE "id" = $1 AND "tenantId" = $2 LIMIT 1`,
      String(planId),
      tidNum
    );
    return rows && rows[0] ? rows[0] : null;
  }
  const rows = await fetchTenantLessonPlanRows(tidNum);
  return rows.find((p) => String(p.id) === String(planId)) || null;
}

const getLessonPlanTemplates = async () => ({
  templates: SUBJECT_LESSON_TEMPLATES,
  coreCompetencies: NACCA_CORE_COMPETENCIES,
  learnerCentredMethods: LEARNER_CENTRED_METHODS
});

const checkLessonPlanQuality = (planPayload = {}) => evaluateLessonPlanQuality(planPayload);

const getTeacherLessonPlans = async (tenantId, query = {}, operatorUser = null) => {
  const rows = await fetchTenantLessonPlanRows(tenantId);
  let plans = rows.map(hydrateLessonPlan).filter(Boolean);

  const role = String(operatorUser?.role || '').toUpperCase();
  const opId = operatorUser?.id != null ? String(operatorUser.id) : '';
  const opEmail = String(operatorUser?.email || '').toLowerCase();
  const isSupervisor = ['ADMIN', 'SUPER_ADMIN', 'DEVELOPER'].includes(role);
  const includeDrafts = String(query.includeDrafts || '').toLowerCase() === 'true';

  // Visibility isolation: Supervisors should NOT inspect another teacher's unsubmitted private DRAFT
  if (isSupervisor && !includeDrafts) {
    plans = plans.filter((p) => {
      if (p.status !== 'DRAFT') return true;
      return (opId && String(p.teacherId) === opId) || (opEmail && String(p.teacherEmail || '').toLowerCase() === opEmail);
    });
  } else if (role === 'TEACHER') {
    // Teachers see all their own plans (including DRAFTs) and never another teacher's private DRAFT
    plans = plans.filter((p) => {
      if (p.status !== 'DRAFT') return true;
      const isMine = (opId && String(p.teacherId) === opId) || (opEmail && String(p.teacherEmail || '').toLowerCase() === opEmail);
      return isMine;
    });
  }

  if (query.planType && query.planType !== 'ALL') {
    plans = plans.filter((p) => p.planType === query.planType);
  }
  if (query.status && query.status !== 'ALL') {
    plans = plans.filter((p) => p.status === query.status);
  }
  if (query.teacherId) {
    plans = plans.filter((p) => String(p.teacherId) === String(query.teacherId));
  }
  if (String(query.mineOnly || '').toLowerCase() === 'true' && operatorUser) {
    plans = plans.filter((p) =>
      (opId && String(p.teacherId) === opId) ||
      (opEmail && String(p.teacherEmail || '').toLowerCase() === opEmail)
    );
  }
  return plans;
};

const submitTeacherLessonPlan = async (tenantId, data = {}, operatorUser = null) => {
  const tidNum = parseInt(tenantId, 10) || 1;
  const title = String(data.title || '').trim();
  const subjectName = String(data.subjectName || '').trim();
  const className = String(data.className || '').trim();

  if (!title || !subjectName || !className) {
    throw new AppError('Lesson title, subject, and class/grade level are required.', 400);
  }

  const planType = VALID_PLAN_TYPES.includes(data.planType) ? data.planType : 'LESSON_NOTES';
  const requestedStatus = String(data.status || 'PENDING_VETTING').toUpperCase();
  const initialStatus = requestedStatus === 'DRAFT' ? 'DRAFT' : 'PENDING_VETTING';
  const nowIso = new Date().toISOString();

  const structured = buildStructuredPayload(data, {});
  const teacherId = operatorUser?.id != null ? String(operatorUser.id) : String(data.teacherId || '1');
  const teacherName = operatorUser
    ? `${operatorUser.firstName || ''} ${operatorUser.lastName || ''}`.trim() || operatorUser.email || 'Faculty Member'
    : (data.teacherName || 'Faculty Member');
  const teacherEmail = operatorUser?.email || data.teacherEmail || '';

  const reviewHistory = [
    {
      id: `rev-${Date.now()}`,
      action: initialStatus === 'DRAFT' ? 'DRAFT_SAVED' : 'SUBMITTED_FOR_VETTING',
      statusAfter: initialStatus,
      actorId: teacherId,
      actorName: teacherName,
      actorRole: operatorUser?.role || 'TEACHER',
      remarks: initialStatus === 'DRAFT'
        ? 'Lesson plan draft created and saved.'
        : 'Lesson plan / lesson notes submitted to Academic Supervisor for vetting.',
      revisionNumber: 1,
      timestamp: nowIso
    }
  ];

  const row = {
    id: `plan-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    tenantId: tidNum,
    planType,
    title,
    subjectName,
    className,
    term: String(data.term || 'Term 1').trim(),
    weekNumber: String(data.weekNumber ?? 'Week 1').trim(),
    lessonDate: structured.lessonDate || new Date().toISOString().split('T')[0],
    durationMinutes: structured.durationMinutes || 60,
    topic: String(data.topic || title).trim(),
    strand: structured.strand,
    subStrand: structured.subStrand,
    curriculumReference: structured.curriculumReferences,
    educationalLevel: structured.educationalLevel,
    status: initialStatus,
    revisionNumber: 1,
    teacherId,
    teacherName,
    teacherEmail,
    teacherPosition: String(data.teacherPosition || 'Faculty Member').trim(),
    resourcesAttached: String(data.resourcesAttached || '').trim(),
    structuredJson: JSON.stringify(structured),
    reviewHistoryJson: JSON.stringify(reviewHistory),
    headmasterRemarks: null,
    vettedBy: null,
    vettedById: null,
    vettedAt: null,
    submittedAt: initialStatus === 'PENDING_VETTING' ? nowIso : null,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  await persistLessonPlanRow(row);

  try {
    await prisma.auditLog.create({
      data: {
        tenantId: tidNum,
        userId: Number.isInteger(Number(operatorUser?.id)) ? Number(operatorUser.id) : null,
        action: initialStatus === 'DRAFT' ? 'LESSON_PLAN_DRAFT_CREATED' : 'LESSON_PLAN_SUBMITTED',
        module: 'ACADEMIC_LESSON_PLANS',
        details: JSON.stringify({ planId: row.id, planType, title, subjectName, className, status: initialStatus })
      }
    });
  } catch { /* non-fatal audit */ }

  return hydrateLessonPlan(row);
};

const updateTeacherLessonPlan = async (tenantId, planId, data = {}, operatorUser = null) => {
  const tidNum = parseInt(tenantId, 10) || 1;
  const existingRow = await fetchLessonPlanRowById(tidNum, planId);
  if (!existingRow) {
    throw new AppError('Lesson plan or notes record not found in your institution.', 404);
  }

  const existing = hydrateLessonPlan(existingRow);
  const role = String(operatorUser?.role || '').toUpperCase();
  const isSupervisor = ['ADMIN', 'SUPER_ADMIN', 'DEVELOPER'].includes(role);
  const opId = operatorUser?.id != null ? String(operatorUser.id) : '';
  const opEmail = String(operatorUser?.email || '').toLowerCase();
  const isOwner =
    (opId && String(existing.teacherId) === opId) ||
    (opEmail && String(existing.teacherEmail || '').toLowerCase() === opEmail);

  if (!isSupervisor && !isOwner) {
    throw new AppError('Access denied: you may only edit your own lesson plans or notes.', 403);
  }

  const nowIso = new Date().toISOString();
  const actorName = operatorUser
    ? `${operatorUser.firstName || ''} ${operatorUser.lastName || ''}`.trim() || operatorUser.email || 'Faculty Member'
    : existing.teacherName;
  const history = Array.isArray(existing.reviewHistory) ? [...existing.reviewHistory] : [];

  // Post-teaching reflection update on an already VETTED_APPROVED lesson note:
  // preserves VETTED_APPROVED status unless teacher explicitly requests resubmission for re-vetting
  const wantsResubmit = Boolean(data.resubmitForVetting) || String(data.status || '').toUpperCase() === 'PENDING_VETTING';
  if (existing.status === 'VETTED_APPROVED' && !wantsResubmit && !isSupervisor) {
    const nextStructured = buildStructuredPayload({ teacherReflection: data.teacherReflection }, existing);
    history.push({
      id: `rev-${Date.now()}`,
      action: 'POST_LESSON_REFLECTION_UPDATED',
      statusAfter: 'VETTED_APPROVED',
      actorId: opId || existing.teacherId,
      actorName,
      actorRole: role || 'TEACHER',
      remarks: 'Teacher recorded post-teaching reflection after classroom delivery.',
      revisionNumber: existing.revisionNumber,
      timestamp: nowIso
    });
    const updatedRow = {
      ...existingRow,
      structuredJson: JSON.stringify(nextStructured),
      reviewHistoryJson: JSON.stringify(history),
      updatedAt: nowIso
    };
    await persistLessonPlanRow(updatedRow);
    return hydrateLessonPlan(updatedRow);
  }

  const nextStructured = buildStructuredPayload(data, existing);
  const nextPlanType = VALID_PLAN_TYPES.includes(data.planType) ? data.planType : existing.planType;
  let nextStatus = existing.status;
  let nextRevision = Number(existing.revisionNumber || 1);
  let nextSubmittedAt = existing.submittedAt;

  const requestedStatus = String(data.status || '').toUpperCase();
  if (requestedStatus === 'DRAFT' && existing.status !== 'VETTED_APPROVED') {
    nextStatus = 'DRAFT';
    history.push({
      id: `rev-${Date.now()}`,
      action: 'DRAFT_UPDATED',
      statusAfter: 'DRAFT',
      actorId: opId || existing.teacherId,
      actorName,
      actorRole: role || 'TEACHER',
      remarks: 'Draft lesson plan updated.',
      revisionNumber: nextRevision,
      timestamp: nowIso
    });
  } else if (wantsResubmit || requestedStatus === 'PENDING_VETTING') {
    const wasPreviouslyReviewedOrSubmitted = ['REVISION_REQUIRED', 'UNDER_REVIEW', 'VETTED_APPROVED', 'PENDING_VETTING'].includes(existing.status);
    if (wasPreviouslyReviewedOrSubmitted) {
      nextRevision += 1;
    }
    nextStatus = 'PENDING_VETTING';
    nextSubmittedAt = nowIso;
    history.push({
      id: `rev-${Date.now()}`,
      action: wasPreviouslyReviewedOrSubmitted ? 'RESUBMITTED_AFTER_REVISION' : 'SUBMITTED_FOR_VETTING',
      statusAfter: 'PENDING_VETTING',
      actorId: opId || existing.teacherId,
      actorName,
      actorRole: role || 'TEACHER',
      remarks: String(data.revisionNote || '').trim() || (wasPreviouslyReviewedOrSubmitted
        ? `Revision #${nextRevision} submitted addressing Headmaster vetting feedback.`
        : 'Lesson plan submitted to Academic Supervisor for vetting.'),
      revisionNumber: nextRevision,
      timestamp: nowIso
    });
  } else {
    history.push({
      id: `rev-${Date.now()}`,
      action: 'CONTENT_UPDATED',
      statusAfter: nextStatus,
      actorId: opId || existing.teacherId,
      actorName,
      actorRole: role || 'TEACHER',
      remarks: 'Lesson plan content updated.',
      revisionNumber: nextRevision,
      timestamp: nowIso
    });
  }

  const updatedRow = {
    id: existing.id,
    tenantId: tidNum,
    planType: nextPlanType,
    title: data.title !== undefined ? String(data.title || '').trim() || existing.title : existing.title,
    subjectName: data.subjectName !== undefined ? String(data.subjectName || '').trim() || existing.subjectName : existing.subjectName,
    className: data.className !== undefined ? String(data.className || '').trim() || existing.className : existing.className,
    term: data.term !== undefined ? String(data.term || '').trim() : existing.term,
    weekNumber: data.weekNumber !== undefined ? String(data.weekNumber ?? '').trim() : String(existing.weekNumber ?? ''),
    lessonDate: nextStructured.lessonDate || existing.lessonDate,
    durationMinutes: nextStructured.durationMinutes || existing.durationMinutes,
    topic: data.topic !== undefined ? String(data.topic || '').trim() : existing.topic,
    strand: nextStructured.strand,
    subStrand: nextStructured.subStrand,
    curriculumReference: nextStructured.curriculumReferences,
    educationalLevel: nextStructured.educationalLevel,
    status: nextStatus,
    revisionNumber: nextRevision,
    teacherId: String(existing.teacherId || ''),
    teacherName: existing.teacherName,
    teacherEmail: existing.teacherEmail,
    teacherPosition: data.teacherPosition !== undefined ? String(data.teacherPosition || '').trim() : existing.teacherPosition,
    resourcesAttached: data.resourcesAttached !== undefined ? String(data.resourcesAttached || '').trim() : existing.resourcesAttached,
    structuredJson: JSON.stringify(nextStructured),
    reviewHistoryJson: JSON.stringify(history),
    headmasterRemarks: existing.headmasterRemarks,
    vettedBy: existing.vettedBy,
    vettedById: existing.vettedById,
    vettedAt: existing.vettedAt,
    submittedAt: nextSubmittedAt,
    createdAt: existing.createdAt,
    updatedAt: nowIso
  };

  await persistLessonPlanRow(updatedRow);
  return hydrateLessonPlan(updatedRow);
};

const deleteTeacherLessonPlan = async (tenantId, planId, operatorUser = null) => {
  const tidNum = parseInt(tenantId, 10) || 1;
  const existingRow = await fetchLessonPlanRowById(tidNum, planId);
  if (!existingRow) {
    throw new AppError('Lesson plan not found.', 404);
  }
  const existing = hydrateLessonPlan(existingRow);
  const role = String(operatorUser?.role || '').toUpperCase();
  const isSupervisor = ['ADMIN', 'SUPER_ADMIN', 'DEVELOPER'].includes(role);
  const opId = operatorUser?.id != null ? String(operatorUser.id) : '';
  const opEmail = String(operatorUser?.email || '').toLowerCase();
  const isOwner =
    (opId && String(existing.teacherId) === opId) ||
    (opEmail && String(existing.teacherEmail || '').toLowerCase() === opEmail);

  if (!isSupervisor && !isOwner) {
    throw new AppError('Access denied: you may only delete your own drafts.', 403);
  }
  if (existing.status !== 'DRAFT') {
    throw new AppError('Only unsubmitted DRAFT lesson plans can be deleted. Submitted and vetted records are preserved for academic auditing.', 400);
  }

  const pgOnline = await isPgReady();
  if (pgOnline) {
    await prisma.$executeRawUnsafe(
      `DELETE FROM teacher_lesson_plans WHERE "id" = $1 AND "tenantId" = $2`,
      String(planId),
      tidNum
    );
  } else {
    const tidStr = String(tidNum);
    writePersistentStore((curr) => ({
      ...curr,
      teacherLessonPlans: {
        ...(curr.teacherLessonPlans || {}),
        [tidStr]: (curr.teacherLessonPlans?.[tidStr] || []).filter((p) => String(p.id) !== String(planId))
      }
    }));
  }
  return { deletedId: String(planId) };
};

const vetTeacherLessonPlan = async (tenantId, planId, data = {}, operatorUser = null) => {
  const tidNum = parseInt(tenantId, 10) || 1;
  const existingRow = await fetchLessonPlanRowById(tidNum, planId);
  if (!existingRow) {
    throw new AppError('Lesson plan or notes record not found in your institution.', 404);
  }

  const existing = hydrateLessonPlan(existingRow);
  if (existing.status === 'DRAFT') {
    throw new AppError('This lesson plan is still a teacher draft and has not been submitted for vetting yet.', 400);
  }

  const validStatuses = ['VETTED_APPROVED', 'REVISION_REQUIRED', 'UNDER_REVIEW'];
  const status = validStatuses.includes(data.vettingStatus) ? data.vettingStatus : 'VETTED_APPROVED';
  const nowIso = new Date().toISOString();

  const remarks = String(data.headmasterRemarks || '').trim() || (
    status === 'VETTED_APPROVED'
      ? 'Vetted, endorsed, and officially authorized for classroom instruction.'
      : status === 'REVISION_REQUIRED'
        ? 'Corrections requested. Please address supervisor comments and resubmit for vetting.'
        : 'Lesson note is currently under detailed supervisory review.'
  );

  const incomingSectionComments = data.sectionComments && typeof data.sectionComments === 'object'
    ? Object.fromEntries(
      Object.entries(data.sectionComments)
        .map(([k, v]) => [k, String(v || '').trim()])
        .filter(([, v]) => v.length > 0)
    )
    : existing.sectionComments || {};

  const reviewerId = operatorUser?.id != null ? String(operatorUser.id) : 'supervisor';
  const reviewerRole = operatorUser?.role || 'ADMIN';
  const reviewerName = operatorUser
    ? `${operatorUser.firstName || ''} ${operatorUser.lastName || ''}`.trim() || operatorUser.email || 'Academic Supervisor'
    : 'Headmaster Academic Directorate';
  const vettedByLabel = `${reviewerName} (${reviewerRole === 'SUPER_ADMIN' ? 'Executive Director' : 'Headmaster'})`;

  const history = Array.isArray(existing.reviewHistory) ? [...existing.reviewHistory] : [];
  history.push({
    id: `rev-${Date.now()}`,
    action: status,
    statusAfter: status,
    actorId: reviewerId,
    actorName: reviewerName,
    actorRole: reviewerRole,
    remarks,
    sectionComments: incomingSectionComments,
    revisionNumber: existing.revisionNumber,
    timestamp: nowIso
  });

  const nextStructured = buildStructuredPayload({ sectionComments: incomingSectionComments }, existing);

  const updatedRow = {
    ...existingRow,
    tenantId: tidNum,
    status,
    headmasterRemarks: remarks,
    vettedBy: vettedByLabel,
    vettedById: reviewerId,
    vettedAt: nowIso,
    structuredJson: JSON.stringify(nextStructured),
    reviewHistoryJson: JSON.stringify(history),
    updatedAt: nowIso
  };

  await persistLessonPlanRow(updatedRow);

  try {
    await prisma.auditLog.create({
      data: {
        tenantId: tidNum,
        userId: Number.isInteger(Number(operatorUser?.id)) ? Number(operatorUser.id) : null,
        action: `LESSON_PLAN_${status}`,
        module: 'ACADEMIC_LESSON_PLANS',
        details: JSON.stringify({
          planId: existing.id,
          title: existing.title,
          teacherName: existing.teacherName,
          status,
          revisionNumber: existing.revisionNumber,
          remarks,
          sectionCommentsCount: Object.keys(incomingSectionComments).length
        })
      }
    });
  } catch { /* non-fatal audit */ }

  return hydrateLessonPlan(updatedRow);
};

const broadcastFacultyDirective = async (tenantId, data = {}, operatorUser = null) => {
  const tidNum = parseInt(tenantId, 10) || 1;
  const effMsg = String(data.message || data.directive || data.content || '').trim();
  if (!effMsg) {
    throw new AppError('Directive message content is required.', 400);
  }

  const nowIso = new Date().toISOString();
  const directive = {
    id: `dir-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    tenantId: tidNum,
    target: data.target || 'ALL',
    targetTeacherName: data.targetTeacherName || (data.target === 'ALL' ? 'All Faculty Members & Subject Educators' : `Teacher #${data.target}`),
    subject: String(data.subject || 'Official Academic Directive from Headmaster').trim(),
    message: effMsg,
    issuedBy: operatorUser ? `${operatorUser.firstName || ''} ${operatorUser.lastName || ''}`.trim() + ' (Headmaster)' : 'Executive Headmaster Office',
    issuedById: operatorUser?.id != null ? String(operatorUser.id) : 'admin',
    issuedAt: nowIso
  };

  const pgOnline = await isPgReady();
  if (pgOnline) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO teacher_faculty_directives ("id", "tenantId", "target", "targetTeacherName", "subject", "message", "issuedBy", "issuedById", "issuedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamp)`,
      directive.id,
      tidNum,
      directive.target,
      directive.targetTeacherName,
      directive.subject,
      directive.message,
      directive.issuedBy,
      directive.issuedById,
      directive.issuedAt
    );
  } else {
    const tidStr = String(tidNum);
    writePersistentStore((curr) => ({
      ...curr,
      facultyDirectives: {
        ...(curr.facultyDirectives || {}),
        [tidStr]: [directive, ...(Array.isArray(curr.facultyDirectives?.[tidStr]) ? curr.facultyDirectives[tidStr] : [])]
      }
    }));
  }

  return directive;
};

const getFacultyDirectives = async (tenantId, query = {}) => {
  const tidNum = parseInt(tenantId, 10) || 1;
  const tidStr = String(tidNum);
  const pgOnline = await isPgReady();
  let directives = [];

  if (pgOnline) {
    let rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM teacher_faculty_directives WHERE "tenantId" = $1 ORDER BY "issuedAt" DESC`,
      tidNum
    );
    if ((!rows || rows.length === 0) && tidNum === 1) {
      for (const d of getDemoSeedDirectives()) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO teacher_faculty_directives ("id", "tenantId", "target", "targetTeacherName", "subject", "message", "issuedBy", "issuedById", "issuedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamp) ON CONFLICT ("id") DO NOTHING`,
          d.id, d.tenantId, d.target, d.targetTeacherName, d.subject, d.message, d.issuedBy, d.issuedById, d.issuedAt
        );
      }
      rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM teacher_faculty_directives WHERE "tenantId" = $1 ORDER BY "issuedAt" DESC`,
        tidNum
      );
    }
    directives = Array.isArray(rows) ? rows : [];
  } else {
    const store = readPersistentStore();
    directives = Array.isArray(store.facultyDirectives?.[tidStr]) ? [...store.facultyDirectives[tidStr]] : [];
    if (directives.length === 0 && tidNum === 1) {
      directives = getDemoSeedDirectives();
    }
  }

  if (query.target && query.target !== 'ALL') {
    directives = directives.filter((d) => d.target === 'ALL' || String(d.target) === String(query.target));
  }
  return directives;
};

/**
 * Computes exact per-tenant lists and counts of:
 *  1) Students who did not take scheduled exams
 *  2) Students who did not submit assignments
 *  3) Students who have not been coming to school (absent / chronically absent)
 */
const getDefaultersReport = async (tenantId, query = {}, req = null) => {
  const tidNum = parseInt(tenantId, 10) || 1;
  const tidStr = String(tidNum);
  const store = readPersistentStore();
  const institutionType = await resolveTenantInstitutionType({ tenantId: tidNum, user: req?.user, req });

  // 1. Gather enrolled students for this tenant
  const studentMap = new Map();
  const addStudent = (s) => {
    if (!s) return;
    const key = String(s.email || s.studentNumber || s.id || s.name || '').trim().toLowerCase();
    if (!key) return;
    const prev = studentMap.get(key) || {};
    studentMap.set(key, {
      id: prev.id || s.id || key,
      name: s.name || prev.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Enrolled Student',
      email: s.email || prev.email || null,
      phone: s.phone || prev.phone || null,
      classOrLevel: s.classOrLevel || prev.classOrLevel || 'Enrolled Class'
    });
  };

  try {
    const dbStudents = await prisma.student.findMany({
      where: { tenantId: tidNum },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
    });
    dbStudents.forEach((st) =>
      addStudent({
        id: st.userId || st.id,
        studentNumber: st.studentNumber || st.admissionNumber,
        name: st.user ? `${st.user.firstName || ''} ${st.user.lastName || ''}`.trim() : st.fullName || `Student #${st.id}`,
        email: st.user?.email || st.email,
        classOrLevel: st.gradeLevel || st.className || 'Assigned Class'
      })
    );
  } catch { }

  try {
    const dbStudentUsers = await prisma.user.findMany({
      where: { tenantId: tidNum, role: 'STUDENT', isDeleted: false },
      include: { registrationProfile: { select: { phone: true } } }
    });
    dbStudentUsers.forEach((u) =>
      addStudent({
        id: u.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        email: u.email,
        phone: u.registrationProfile?.phone || null
      })
    );
  } catch { }

  [...(store.registeredUsers || []), ...(store.users || [])]
    .filter((u) => u && String(u.role || '').toUpperCase() === 'STUDENT' && String(u.tenantId || '1') === tidStr && !u.isDeleted)
    .forEach((u) =>
      addStudent({
        id: u.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        email: u.email,
        phone: u.phone || null,
        classOrLevel: u.targetGrade || u.level || 'Registered Student'
      })
    );

  // Merge any persisted teacher/client compliance roster items for this tenant
  const customSnap = (store.studentComplianceRecords || {})[tidStr] || null;
  if (customSnap && Array.isArray(customSnap.students)) {
    customSnap.students.forEach(addStudent);
  }

  const allStudents = Array.from(studentMap.values());

  // 2. Exam Non-Participants
  let didNotTakeExam = [];
  if (customSnap && Array.isArray(customSnap.examNonParticipants) && customSnap.examNonParticipants.length > 0) {
    didNotTakeExam = customSnap.examNonParticipants;
  } else {
    try {
      const scheduledExams = [
        ...(await prisma.exam.findMany({ where: { tenantId: tidNum } }).catch(() => [])),
        ...((store.universityExams || []).filter((e) => String(e.tenantId || '1') === tidStr))
      ];
      const examSheets = [
        ...(await prisma.examResult?.findMany({ where: { tenantId: tidNum } }).catch(() => []) || []),
        ...((store.examAnswerSheets || []).filter((s) => String(s.tenantId || '1') === tidStr)),
        ...((store.universityCourseResults || []).filter((r) => String(r.tenantId || '1') === tidStr))
      ];
      if (scheduledExams.length > 0 && allStudents.length > 0) {
        const participants = new Set(
          examSheets
            .map((s) => String(s.studentEmail || s.studentName || s.studentId || '').trim().toLowerCase())
            .filter(Boolean)
        );
        const latestExamTitle = scheduledExams[0]?.title || scheduledExams[0]?.courseTitle || scheduledExams[0]?.courseCode || 'Scheduled Examination';
        didNotTakeExam = allStudents
          .filter(
            (st) =>
              !participants.has(String(st.email || '').toLowerCase()) &&
              !participants.has(String(st.name || '').toLowerCase()) &&
              !participants.has(String(st.id || '').toLowerCase())
          )
          .map((st) => ({
            studentId: st.id,
            studentName: st.name,
            email: st.email,
            phone: st.phone,
            classOrLevel: st.classOrLevel,
            missedExamTitle: latestExamTitle,
            status: 'DID_NOT_TAKE_EXAM'
          }));
      }
    } catch { }
  }

  // 3. Assignment Non-Submitters
  let didNotSubmitAssignment = [];
  if (customSnap && Array.isArray(customSnap.assignmentNonSubmitters) && customSnap.assignmentNonSubmitters.length > 0) {
    didNotSubmitAssignment = customSnap.assignmentNonSubmitters;
  } else {
    try {
      const assignments = await prisma.assignment.findMany({
        where: { tenantId: tidNum },
        include: { submissions: true }
      }).catch(() => []);
      if (assignments.length > 0 && allStudents.length > 0) {
        const submitterIds = new Set();
        assignments.forEach((a) => {
          (a.submissions || []).forEach((sub) => {
            if (sub.studentId != null) submitterIds.add(String(sub.studentId).toLowerCase());
            if (sub.studentEmail) submitterIds.add(String(sub.studentEmail).toLowerCase());
            if (sub.studentName) submitterIds.add(String(sub.studentName).toLowerCase());
          });
        });
        const latestAssignTitle = assignments[0]?.title || 'Term Homework / Assignment';
        didNotSubmitAssignment = allStudents
          .filter(
            (st) =>
              !submitterIds.has(String(st.id || '').toLowerCase()) &&
              !submitterIds.has(String(st.email || '').toLowerCase()) &&
              !submitterIds.has(String(st.name || '').toLowerCase())
          )
          .map((st) => ({
            studentId: st.id,
            studentName: st.name,
            email: st.email,
            phone: st.phone,
            classOrLevel: st.classOrLevel,
            missingAssignmentTitle: latestAssignTitle,
            dueDate: assignments[0]?.dueDate || null,
            status: 'MISSING_ASSIGNMENT'
          }));
      }
    } catch { }
  }

  // 4. Chronic Absentees / Students Not Coming to School
  let notAttendingSchool = [];
  if (customSnap && Array.isArray(customSnap.chronicAbsentees) && customSnap.chronicAbsentees.length > 0) {
    notAttendingSchool = customSnap.chronicAbsentees;
  } else {
    try {
      const attendanceLogs = await prisma.attendanceRecord.findMany({
        where: { tenantId: tidNum },
        orderBy: { date: 'desc' }
      }).catch(() => []);
      const absentMap = new Map();
      attendanceLogs.forEach((rec) => {
        const sKey = String(rec.studentId || '');
        if (!sKey) return;
        const curr = absentMap.get(sKey) || { absentDays: 0, presentDays: 0, lastSeenDate: null };
        if (String(rec.status || '').toUpperCase() === 'ABSENT') {
          curr.absentDays += 1;
        } else if (['PRESENT', 'LATE'].includes(String(rec.status || '').toUpperCase())) {
          curr.presentDays += 1;
          if (!curr.lastSeenDate) curr.lastSeenDate = rec.date;
        }
        absentMap.set(sKey, curr);
      });
      allStudents.forEach((st) => {
        const stats = absentMap.get(String(st.id || ''));
        if (stats && stats.absentDays > 0 && stats.absentDays >= stats.presentDays) {
          notAttendingSchool.push({
            studentId: st.id,
            studentName: st.name,
            email: st.email,
            phone: st.phone,
            classOrLevel: st.classOrLevel,
            absentDays: stats.absentDays,
            presentDays: stats.presentDays,
            lastSeenDate: stats.lastSeenDate,
            status: 'NOT_ATTENDING_SCHOOL'
          });
        }
      });
    } catch { }
  }

  return {
    institutionType,
    tenantId: tidNum,
    totalStudentsEvaluated: allStudents.length,
    didNotTakeExam: {
      count: didNotTakeExam.length,
      students: didNotTakeExam
    },
    didNotSubmitAssignment: {
      count: didNotSubmitAssignment.length,
      students: didNotSubmitAssignment
    },
    notAttendingSchool: {
      count: notAttendingSchool.length,
      students: notAttendingSchool
    },
    generatedAt: new Date().toISOString()
  };
};

const syncDefaultersSnapshot = async (tenantId, payload = {}) => {
  const tidStr = String(parseInt(tenantId, 10) || 1);
  writePersistentStore((curr) => ({
    ...curr,
    studentComplianceRecords: {
      ...(curr.studentComplianceRecords || {}),
      [tidStr]: {
        students: Array.isArray(payload.students) ? payload.students : [],
        examNonParticipants: Array.isArray(payload.examNonParticipants) ? payload.examNonParticipants : [],
        assignmentNonSubmitters: Array.isArray(payload.assignmentNonSubmitters) ? payload.assignmentNonSubmitters : [],
        chronicAbsentees: Array.isArray(payload.chronicAbsentees) ? payload.chronicAbsentees : [],
        updatedAt: new Date().toISOString()
      }
    }
  }));
  return await getDefaultersReport(tenantId);
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
  getLessonPlanTemplates,
  checkLessonPlanQuality,
  getTeacherLessonPlans,
  submitTeacherLessonPlan,
  updateTeacherLessonPlan,
  deleteTeacherLessonPlan,
  vetTeacherLessonPlan,
  broadcastFacultyDirective,
  getFacultyDirectives,
  getDefaultersReport,
  syncDefaultersSnapshot
};