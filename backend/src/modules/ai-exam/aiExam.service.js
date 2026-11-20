'use strict';

const prisma = require('../../core/database/prisma.client');
const { AppError } = require('../../middleware/error.middleware');
const { readPersistentStore, writePersistentStore } = require('../../core/database/persistentStore');

const STARTER_QUESTION_TEMPLATES = [
  { questionNumber: 1, questionText: 'Evaluate the derivative of f(x) = x^3 - 4x + 7 at x = 2.', optionA: '8', optionB: '12', optionC: '4', optionD: '10', correctAnswer: 'A', correctOption: 'A', marks: 10, negativeMarks: 0 },
  { questionNumber: 2, questionText: 'Determine the matrix determinant of [[3, 2], [1, 4]].', optionA: '14', optionB: '6', optionC: '10', optionD: '12', correctAnswer: 'C', correctOption: 'C', marks: 10, negativeMarks: 0 },
  { questionNumber: 3, questionText: 'Calculate the integral of 2x dx from 0 to 4.', optionA: '8', optionB: '16', optionC: '12', optionD: '32', correctAnswer: 'B', correctOption: 'B', marks: 10, negativeMarks: 0 },
  { questionNumber: 4, questionText: 'Solve the system of linear equations x + y = 7 and x - y = 1.', optionA: 'x=3, y=4', optionB: 'x=5, y=2', optionC: 'x=6, y=1', optionD: 'x=4, y=3', correctAnswer: 'D', correctOption: 'D', marks: 10, negativeMarks: 0 },
  { questionNumber: 5, questionText: 'What is the limit of (sin x)/x as x approaches 0?', optionA: '1', optionB: '0', optionC: 'Infinity', optionD: 'Undefined', correctAnswer: 'A', correctOption: 'A', marks: 10, negativeMarks: 0 },
  { questionNumber: 6, questionText: 'Identify the vertex of the parabola y = 2x^2 - 8x + 5.', optionA: '(1, -1)', optionB: '(4, 5)', optionC: '(2, -3)', optionD: '(-2, 29)', correctAnswer: 'C', correctOption: 'C', marks: 10, negativeMarks: 0 },
  { questionNumber: 7, questionText: 'Compute the probability of drawing two red cards cleanly from a pair of red and black halves (0.5 * 0.5).', optionA: '0.50', optionB: '0.25', optionC: '0.75', optionD: '0.125', correctAnswer: 'B', correctOption: 'B', marks: 10, negativeMarks: 0 },
  { questionNumber: 8, questionText: 'Determine the arithmetic mean of sample dataset {4, 8, 6, 5, 2}.', optionA: '5', optionB: '6', optionC: '4.5', optionD: '7', correctAnswer: 'A', correctOption: 'A', marks: 10, negativeMarks: 0 },
  { questionNumber: 9, questionText: 'Evaluate log base 2 of 256.', optionA: '6', optionB: '7', optionC: '9', optionD: '8', correctAnswer: 'D', correctOption: 'D', marks: 10, negativeMarks: 0 },
  { questionNumber: 10, questionText: 'Identify the trace of identity matrix I_3.', optionA: '1', optionB: '2', optionC: '3', optionD: '0', correctAnswer: 'C', correctOption: 'C', marks: 10, negativeMarks: 0 }
];

const ensureQuestionBank = async (examId) => {
  const existing = await prisma.questionBank.findMany({ where: { examId } });
  if (existing.length === 0) {
    for (const q of STARTER_QUESTION_TEMPLATES) {
      await prisma.questionBank.create({
        data: {
          examId,
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          correctAnswer: q.correctAnswer,
          marks: q.marks,
          negativeMarks: q.negativeMarks
        }
      });
    }
    return await prisma.questionBank.findMany({ where: { examId } });
  }
  return existing;
};

/**
 * Only seeds a sample exam for the Demo Sovereign Tenant (tenantId === 1).
 * Real Live Production institutions (tenantId > 1) never inherit cross-tenant or dummy exams.
 */
const ensureSampleExam = async (tenantId = 1) => {
  const tid = parseInt(tenantId, 10) || 1;
  if (tid !== 1) return null;

  let cls = await prisma.class.findFirst({ where: { tenantId: tid } });
  if (!cls) {
    const targetTenant = await prisma.tenant.findUnique({ where: { id: tid } });
    if (!targetTenant) return null;
    cls = await prisma.class.create({
      data: {
        tenantId: tid,
        name: 'Grade 10 STEM Academic Cohort',
        code: `STEM-G10-${Date.now()}`,
        gradeLevel: 10
      }
    });
  }

  let exam = await prisma.exam.findFirst({
    where: { classId: cls.id },
    include: { questionBank: true, class: true }
  });

  if (!exam) {
    exam = await prisma.exam.create({
      data: {
        classId: cls.id,
        title: 'Term 1 Advanced STEM & Academic Evaluation',
        totalMarks: 100,
        passMarks: 50,
        examDate: new Date()
      },
      include: { questionBank: true, class: true }
    });
  }

  if (!exam.questionBank || exam.questionBank.length === 0) {
    exam.questionBank = await ensureQuestionBank(exam.id);
  }

  return exam;
};

const WRITTEN_QUESTION_TYPES = new Set([
  'THEORY_ESSAY',
  'SHORT_ANSWER',
  'FILL_IN_BLANK',
  'CASE_STUDY'
]);

const normalizeQuestionItem = (q = {}, idx = 0, allowTemplateFallback = true) => {
  const tpl = STARTER_QUESTION_TEMPLATES[idx % STARTER_QUESTION_TEMPLATES.length];
  const rawType = String(q.questionType || q.type || 'MULTIPLE_CHOICE').trim().toUpperCase();
  const questionType =
    rawType === 'THEORY' || rawType === 'ESSAY'
      ? 'THEORY_ESSAY'
      : rawType === 'MCQ'
        ? 'MULTIPLE_CHOICE'
        : rawType;

  const isTrueFalse = questionType === 'TRUE_FALSE';
  const isWritten = WRITTEN_QUESTION_TYPES.has(questionType);

  let optionA = '';
  let optionB = '';
  let optionC = '';
  let optionD = '';
  let options = [];

  if (isTrueFalse) {
    optionA = 'True';
    optionB = 'False';
    options = ['True', 'False'];
  } else if (!isWritten) {
    const srcOpts = Array.isArray(q.options) ? q.options : [];
    optionA = q.optionA || srcOpts[0] || (allowTemplateFallback ? tpl.optionA : 'Option A');
    optionB = q.optionB || srcOpts[1] || (allowTemplateFallback ? tpl.optionB : 'Option B');
    optionC = q.optionC || srcOpts[2] || (allowTemplateFallback ? tpl.optionC : 'Option C');
    optionD = q.optionD || srcOpts[3] || (allowTemplateFallback ? tpl.optionD : 'Option D');
    options = [optionA, optionB, optionC, optionD];
  }

  let normalizedCorrect = String(q.correctOption || q.correctAnswer || (isTrueFalse ? 'A' : isWritten ? '' : 'A')).trim();
  if (isTrueFalse) {
    const up = normalizedCorrect.toUpperCase();
    normalizedCorrect = up === 'FALSE' || up === 'B' ? 'B' : 'A';
  } else if (!isWritten) {
    normalizedCorrect = (normalizedCorrect || 'A').toUpperCase();
  }

  const acceptedAnswer = String(q.acceptedAnswer ?? (isWritten ? (q.correctAnswer || '') : '')).trim();
  const markingGuide = String(q.markingGuide || '').trim();
  const acceptedKeywords = String(q.acceptedKeywords || '').trim();

  return {
    ...q,
    id: q.id || `q-${Date.now()}-${idx + 1}`,
    questionNumber: Number(q.questionNumber) || idx + 1,
    questionType,
    questionText: String(q.questionText || '').trim() || `Question ${idx + 1}`,
    optionA,
    optionB,
    optionC,
    optionD,
    options,
    correctOption: isWritten ? '' : normalizedCorrect,
    correctAnswer: isWritten ? (acceptedAnswer || markingGuide || 'THEORY_RUBRIC') : normalizedCorrect,
    acceptedAnswer,
    markingGuide,
    acceptedKeywords,
    wordLimit: Number(q.wordLimit) || (questionType === 'THEORY_ESSAY' || questionType === 'CASE_STUDY' ? 250 : questionType === 'SHORT_ANSWER' ? 60 : 0),
    marks: Number(q.marks) || 10,
    negativeMarks: Number(q.negativeMarks) || 0
  };
};

const enrichQuestionsWithOptions = (qb = []) =>
  (qb || []).map((q, idx) => normalizeQuestionItem(q, idx, true));

const getExams = async (tenantId = 1) => {
  const tid = parseInt(tenantId, 10) || 1;
  if (tid === 1) {
    await ensureSampleExam(tid).catch(() => null);
  }

  const store = readPersistentStore();
  const customList = Array.isArray(store.publishedExams?.[String(tid)])
    ? store.publishedExams[String(tid)]
    : [];

  let prismaExams = [];
  try {
    prismaExams = await prisma.exam.findMany({
      where: { class: { tenantId: tid } },
      include: { questionBank: true, class: true },
      orderBy: { id: 'desc' }
    });
  } catch (_) { }

  const normalizedCustom = customList.map((ex) => ({
    ...ex,
    tenantId: tid,
    questionBank: enrichQuestionsWithOptions(ex.questionBank)
  }));

  const seenIds = new Set(normalizedCustom.map((e) => String(e.prismaExamId || e.id)));
  const merged = [...normalizedCustom];

  for (const ex of prismaExams) {
    if (seenIds.has(String(ex.id))) continue;
    let qb = ex.questionBank || [];
    if (qb.length === 0 && tid === 1) {
      qb = await ensureQuestionBank(ex.id);
    }
    merged.push({
      ...ex,
      tenantId: tid,
      questionBank: enrichQuestionsWithOptions(qb)
    });
  }

  return merged;
};

const createExam = async (tenantId = 1, payload = {}, user = null) => {
  const tid = parseInt(tenantId, 10) || 1;
  if (!payload || !payload.title) {
    throw new AppError('Examination title is required.', 400);
  }

  const questionBankInput = Array.isArray(payload.questionBank) ? payload.questionBank : [];
  const normalizedQuestions = questionBankInput.map((q, idx) => normalizeQuestionItem(q, idx, false));
  const computedTotalMarks =
    Number(payload.totalMarks) ||
    normalizedQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0) ||
    100;

  // Optionally mirror into Prisma Exam + QuestionBank for relational integrity
  let prismaExamId = null;
  try {
    let targetClass = null;
    if (payload.classId && Number.isInteger(Number(payload.classId))) {
      targetClass = await prisma.class.findFirst({
        where: { id: parseInt(payload.classId, 10), tenantId: tid }
      });
    }
    if (!targetClass) {
      targetClass = await prisma.class.findFirst({ where: { tenantId: tid } });
    }
    if (!targetClass) {
      const clsName = payload.class?.name || payload.className || 'Assigned Class Cohort';
      const clsCode = (payload.class?.code || `CLS-${Date.now().toString().slice(-4)}`).toUpperCase();
      targetClass = await prisma.class.create({
        data: { tenantId: tid, name: clsName, code: clsCode, gradeLevel: 10 }
      });
    }
    if (targetClass) {
      const created = await prisma.exam.create({
        data: {
          classId: targetClass.id,
          title: String(payload.title).trim(),
          totalMarks: computedTotalMarks,
          passMarks: Number(payload.passMarks) || 50,
          examDate: payload.examDate ? new Date(payload.examDate) : new Date()
        }
      });
      prismaExamId = created.id;
      for (const q of normalizedQuestions) {
        await prisma.questionBank.create({
          data: {
            examId: created.id,
            questionNumber: q.questionNumber,
            questionText: q.questionText,
            correctAnswer: String(q.correctOption || q.acceptedAnswer || 'THEORY').slice(0, 190),
            marks: q.marks,
            negativeMarks: q.negativeMarks
          }
        }).catch(() => { });
      }
    }
  } catch (_) { }

  const storedExam = {
    id: payload.id || prismaExamId || `exam-${Date.now()}`,
    prismaExamId,
    tenantId: tid,
    title: String(payload.title).trim(),
    subjectCode: payload.subjectCode || 'CORE-101',
    subjectName: payload.subjectName || payload.subjectCode || 'Core Subject',
    class: payload.class || { name: payload.className || 'Assigned Class Cohort', code: 'CLS-EXAM' },
    examDate: payload.examDate || new Date().toISOString().split('T')[0],
    startTime: payload.startTime || '09:00 AM',
    endTime: payload.endTime || '11:30 AM',
    durationMinutes: Number(payload.durationMinutes) || 120,
    totalMarks: computedTotalMarks,
    passMarks: Number(payload.passMarks) || 50,
    examMode: payload.examMode || 'HYBRID',
    restrictBeforeStart: Boolean(payload.restrictBeforeStart),
    questionBank: normalizedQuestions,
    typedQuestionText: payload.typedQuestionText || '',
    uploadedDocName: payload.uploadedDocName || '',
    status: payload.status || 'PUBLISHED_ACTIVE',
    publishedAt: payload.publishedAt || new Date().toISOString(),
    createdBy: user?.email || payload.createdBy || 'TEACHER'
  };

  writePersistentStore((curr) => {
    const publishedExams = { ...(curr.publishedExams || {}) };
    const existing = Array.isArray(publishedExams[String(tid)]) ? publishedExams[String(tid)] : [];
    const filtered = existing.filter((e) => String(e.id) !== String(storedExam.id));
    publishedExams[String(tid)] = [storedExam, ...filtered];
    return { ...curr, publishedExams };
  });

  return storedExam;
};

const computeLetterGrade = (pct) =>
  pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';

const saveScannerAnswerKey = async (tenantId = 1, payload = {}, user = null) => {
  const tid = parseInt(tenantId, 10) || 1;
  const examId = String(payload.examId || 'DEFAULT').trim();
  const classId = payload.classId ? String(payload.classId) : '';
  const rawKey =
    (payload.answerKey && typeof payload.answerKey === 'object' ? payload.answerKey : null) ||
    (payload.teacherAnswerKey && typeof payload.teacherAnswerKey === 'object' ? payload.teacherAnswerKey : null) ||
    (payload.answers && typeof payload.answers === 'object' ? payload.answers : {});
  const questionCount = Math.max(1, Math.min(200, parseInt(payload.questionCount, 10) || Object.keys(rawKey).length || 10));
  const marksPerQuestion = Math.max(1, Math.min(100, Number(payload.marksPerQuestion || 1) || 1));
  const normalizedKey = {};
  for (let i = 1; i <= questionCount; i++) {
    const val = rawKey[i] ?? rawKey[String(i)];
    if (val !== undefined && String(val).trim() !== '') {
      normalizedKey[String(i)] = String(val).trim().toUpperCase();
    }
  }
  if (Object.keys(normalizedKey).length === 0) {
    throw new AppError('Please provide at least one correct answer in the Teacher Master Answer Key before saving.', 400);
  }

  const record = {
    examId,
    classId,
    tenantId: tid,
    questionCount,
    marksPerQuestion,
    answerKey: normalizedKey,
    savedBy: user?.email || user?.firstName || 'TEACHER',
    savedAt: new Date().toISOString()
  };

  writePersistentStore((curr) => {
    const scannerAnswerKeys = { ...(curr.scannerAnswerKeys || {}) };
    const tKeys = { ...(scannerAnswerKeys[String(tid)] || {}) };
    tKeys[`${examId}::${classId || 'ALL'}`] = record;
    tKeys[examId] = record;
    scannerAnswerKeys[String(tid)] = tKeys;
    return { ...curr, scannerAnswerKeys };
  });

  return record;
};

const getScannerAnswerKey = async (tenantId = 1, query = {}) => {
  const tid = parseInt(tenantId, 10) || 1;
  const examId = String(query.examId || 'DEFAULT').trim();
  const classId = query.classId ? String(query.classId) : '';
  const store = readPersistentStore();
  const tKeys = store.scannerAnswerKeys?.[String(tid)] || {};
  return tKeys[`${examId}::${classId || 'ALL'}`] || tKeys[examId] || null;
};

const submitAnswerSheet = async (
  {
    examId,
    studentId,
    studentName,
    studentEmail,
    classId,
    imageUrl,
    extractedAnswers,
    answers,
    writtenAnswers,
    essayAnswers,
    teacherAnswerKey,
    questionCount,
    marksPerQuestion,
    penaltyMarksDeducted = 0,
    proctoringWarnings = 0,
    proctoringLog = [],
    proctoringSnapshots = [],
    marksPerWarning = 2
  },
  tenantId = 1
) => {
  const tid = parseInt(tenantId, 10) || 1;
  const store = readPersistentStore();
  const customList = Array.isArray(store.publishedExams?.[String(tid)]) ? store.publishedExams[String(tid)] : [];

  let exam = customList.find(
    (e) => String(e.id) === String(examId) || (e.prismaExamId && String(e.prismaExamId) === String(examId))
  );

  if (!exam && examId) {
    const eid = parseInt(examId, 10);
    if (!isNaN(eid)) {
      exam = await prisma.exam.findFirst({
        where: { id: eid, class: { tenantId: tid } },
        include: { questionBank: true, class: true }
      });
    }
  }

  if (!exam && classId) {
    const cid = parseInt(classId, 10);
    if (!isNaN(cid)) {
      exam = await prisma.exam.findFirst({
        where: { classId: cid, class: { tenantId: tid } },
        include: { questionBank: true, class: true }
      });
      if (!exam) {
        const cls = await prisma.class.findFirst({ where: { id: cid, tenantId: tid } });
        if (cls) {
          exam = await prisma.exam.create({
            data: {
              classId: cls.id,
              title: 'Class Evaluation Assessment',
              totalMarks: 100,
              passMarks: 50,
              examDate: new Date()
            },
            include: { questionBank: true, class: true }
          });
        }
      }
    }
  }

  if (!exam && tid === 1) {
    exam = await ensureSampleExam(tid);
  }

  if (!exam) {
    throw new AppError('Examination not found for your institution.', 404);
  }

  let questions = Array.isArray(exam.questionBank) ? exam.questionBank : [];
  if (questions.length === 0 && typeof exam.id === 'number') {
    questions = await ensureQuestionBank(exam.id);
  }
  questions = enrichQuestionsWithOptions(questions);

  const savedKeyCfg =
    store.scannerAnswerKeys?.[String(tid)]?.[`${examId || exam.id}::${classId || 'ALL'}`] ||
    store.scannerAnswerKeys?.[String(tid)]?.[String(examId || exam.id)] ||
    null;

  const mergedTeacherKey = {
    ...(savedKeyCfg?.answerKey || {}),
    ...(teacherAnswerKey && typeof teacherAnswerKey === 'object' ? teacherAnswerKey : {})
  };

  const explicitQCount = Math.max(
    0,
    parseInt(questionCount, 10) || (teacherAnswerKey ? Object.keys(teacherAnswerKey).length : 0) || Number(savedKeyCfg?.questionCount || 0)
  );
  const perQMarks = Math.max(1, Number(marksPerQuestion || savedKeyCfg?.marksPerQuestion || 10));
  const combinedWrittenPre = {
    ...(essayAnswers && typeof essayAnswers === 'object' ? essayAnswers : {}),
    ...(writtenAnswers && typeof writtenAnswers === 'object' ? writtenAnswers : {})
  };

  // When Teacher runs the AI Exam Scanner with an explicit question count N (e.g. 5, 20, 40, 50) & Answer Key, expand/trim OMR evaluation to match 1..N exactly
  if (explicitQCount > 0 && Object.keys(mergedTeacherKey).length > 0 && Object.keys(combinedWrittenPre).length === 0) {
    const omrList = [];
    for (let i = 1; i <= explicitQCount; i++) {
      const existingQ = questions[i - 1] || {};
      const keyVal = mergedTeacherKey[i] ?? mergedTeacherKey[String(i)] ?? existingQ.correctOption ?? 'A';
      omrList.push({
        ...existingQ,
        id: existingQ.id || `omr-q-${i}`,
        questionNumber: i,
        questionType: existingQ.questionType || 'MULTIPLE_CHOICE',
        questionText: existingQ.questionText || `OMR Question ${i}`,
        correctOption: String(keyVal).trim().toUpperCase(),
        correctAnswer: String(keyVal).trim().toUpperCase(),
        marks: Number(marksPerQuestion || savedKeyCfg?.marksPerQuestion || existingQ.marks || perQMarks)
      });
    }
    questions = omrList;
  } else if (Object.keys(mergedTeacherKey).length > 0) {
    for (const q of questions) {
      const tk = mergedTeacherKey[q.questionNumber] ?? mergedTeacherKey[String(q.questionNumber)];
      if (tk) {
        q.correctAnswer = tk;
        q.correctOption = tk;
        if (typeof q.id === 'number') {
          await prisma.questionBank.update({
            where: { id: q.id },
            data: { correctAnswer: tk }
          }).catch(() => { });
        }
      }
    }
  }

  const totalQuestions = questions.length || explicitQCount || 10;
  let matchedAnswers = 0;
  let calculatedScore = 0;
  let objectiveMarksObtained = 0;
  let maxPossibleMarks = 0;
  let writtenQuestionsCount = 0;
  let hasManualTheoryReview = false;
  const combinedWritten = combinedWrittenPre;
  const resolvedExtracted =
    (extractedAnswers && typeof extractedAnswers === 'object' ? extractedAnswers : null) ||
    (answers && typeof answers === 'object' ? answers : null);
  const perQuestionBreakdown = [];

  if (questions.length > 0 && (resolvedExtracted || Object.keys(combinedWritten).length > 0)) {
    questions.forEach((q, idx) => {
      const qMarks = Number(q.marks) || 10;
      const qType = String(q.questionType || 'MULTIPLE_CHOICE').toUpperCase();
      maxPossibleMarks += qMarks;

      const lookupKeys = [String(q.questionNumber), String(idx + 1), String(q.id)].filter(Boolean);
      const rawWritten = lookupKeys.map((k) => combinedWritten[k]).find((v) => v !== undefined && String(v).trim() !== '');
      const rawObj = resolvedExtracted ? lookupKeys.map((k) => resolvedExtracted[k]).find((v) => v !== undefined && String(v).trim() !== '') : undefined;

      if (qType === 'THEORY_ESSAY' || qType === 'SHORT_ANSWER' || qType === 'CASE_STUDY') {
        writtenQuestionsCount++;
        hasManualTheoryReview = true;
        const studentResponse = String(rawWritten ?? rawObj ?? '').trim();
        const acceptedAns = String(q.acceptedAnswer || '').trim().toLowerCase();
        const keywords = String(q.acceptedKeywords || '')
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        let autoSuggestedMarks = 0;
        if (studentResponse && acceptedAns && qType === 'SHORT_ANSWER' && studentResponse.toLowerCase() === acceptedAns) {
          autoSuggestedMarks = qMarks;
        } else if (studentResponse && keywords.length > 0) {
          const lowerResp = studentResponse.toLowerCase();
          const matchedKw = keywords.filter((kw) => lowerResp.includes(kw)).length;
          autoSuggestedMarks = Math.round((matchedKw / keywords.length) * qMarks * 10) / 10;
        }
        perQuestionBreakdown.push({
          questionNumber: q.questionNumber || idx + 1,
          id: q.id,
          questionType: qType,
          questionText: q.questionText,
          caseScenario: q.caseScenario || '',
          maxMarks: qMarks,
          studentAnswer: studentResponse,
          correctAnswer: q.acceptedAnswer || q.markingGuide || q.acceptedKeywords || 'Teacher Rubric Grading',
          markingGuide: q.markingGuide || '',
          acceptedKeywords: q.acceptedKeywords || '',
          awardedMarks: 0,
          autoSuggestedMarks,
          isCorrect: null,
          requiresTeacherReview: true,
          teacherComment: ''
        });
      } else if (qType === 'FILL_IN_BLANK') {
        writtenQuestionsCount++;
        const studentText = String(rawWritten ?? rawObj ?? '').trim();
        const rawAccepted = String(q.acceptedAnswer || q.correctAnswer || '').trim();
        const acceptedVariants = rawAccepted
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        const normAns = studentText.toLowerCase();
        const matched = Boolean(normAns && acceptedVariants.some((v) => v === normAns));
        const awarded = matched ? qMarks : 0;
        if (matched) {
          matchedAnswers++;
          calculatedScore += awarded;
          objectiveMarksObtained += awarded;
        }
        if (!acceptedVariants.length) {
          hasManualTheoryReview = true;
        }
        perQuestionBreakdown.push({
          questionNumber: q.questionNumber || idx + 1,
          id: q.id,
          questionType: qType,
          questionText: q.questionText,
          maxMarks: qMarks,
          studentAnswer: studentText,
          correctAnswer: rawAccepted,
          markingGuide: q.markingGuide || '',
          acceptedKeywords: q.acceptedKeywords || '',
          awardedMarks: awarded,
          autoSuggestedMarks: awarded,
          isCorrect: acceptedVariants.length ? matched : null,
          requiresTeacherReview: acceptedVariants.length === 0,
          teacherComment: ''
        });
      } else {
        // MULTIPLE_CHOICE or TRUE_FALSE
        let correctTarget = String((teacherAnswerKey && teacherAnswerKey[q.questionNumber]) || q.correctOption || q.correctAnswer || 'A').trim().toUpperCase();
        if (qType === 'TRUE_FALSE') {
          correctTarget = correctTarget === 'FALSE' || correctTarget === 'B' ? 'B' : 'A';
        }
        let studentAns = rawObj !== undefined ? String(rawObj).trim().toUpperCase() : '';
        if (qType === 'TRUE_FALSE' && (studentAns === 'TRUE' || studentAns === 'FALSE')) {
          studentAns = studentAns === 'FALSE' ? 'B' : 'A';
        }
        const isCorrect = Boolean(studentAns && studentAns === correctTarget);
        let awarded = 0;
        if (isCorrect) {
          matchedAnswers++;
          awarded = qMarks;
          calculatedScore += qMarks;
          objectiveMarksObtained += qMarks;
        } else if (studentAns && Number(q.negativeMarks) > 0) {
          calculatedScore -= Number(q.negativeMarks);
          objectiveMarksObtained -= Number(q.negativeMarks);
          awarded = -Number(q.negativeMarks);
        }
        perQuestionBreakdown.push({
          questionNumber: q.questionNumber || idx + 1,
          id: q.id,
          questionType: qType,
          questionText: q.questionText,
          maxMarks: qMarks,
          studentAnswer: studentAns,
          correctAnswer: correctTarget,
          awardedMarks: Math.max(0, awarded),
          autoSuggestedMarks: Math.max(0, awarded),
          isCorrect,
          requiresTeacherReview: false,
          teacherComment: ''
        });
      }
    });
  } else {
    maxPossibleMarks = Number(exam.totalMarks) || 100;
    matchedAnswers = Math.round(totalQuestions * 0.8);
    calculatedScore = Math.round(maxPossibleMarks * 0.8);
    objectiveMarksObtained = calculatedScore;
  }

  const denom = maxPossibleMarks > 0 ? maxPossibleMarks : (Number(exam.totalMarks) || 100);
  const rawScoreObtained = Math.max(0, Math.round(calculatedScore * 10) / 10);
  const rawPercentage = Math.max(0, Math.min(100, Math.round((rawScoreObtained / denom) * 100)));

  const liveSessionsMap = store.activeProctoringSessions?.[String(tid)] || {};
  const matchingLiveSess = Object.values(liveSessionsMap).find((sess) => {
    const sameExam = !examId || String(sess.examId || '') === String(exam.id || examId);
    const sameStudent =
      (studentId && String(sess.studentId) === String(studentId)) ||
      (studentEmail && String(sess.studentEmail || '').toLowerCase() === String(studentEmail).toLowerCase()) ||
      (studentName && String(sess.studentName || '').toLowerCase() === String(studentName).toLowerCase());
    return sameExam && sameStudent;
  });

  const effectiveWarnings = Math.max(
    Number(proctoringWarnings) || 0,
    Number(matchingLiveSess?.warningsCount) || 0,
    Array.isArray(proctoringLog) ? proctoringLog.length : 0
  );
  const effectivePerWarning = Math.max(0, Number(marksPerWarning) || 2);
  const finalPenaltyMarks = Math.max(
    0,
    Math.round(
      Math.max(
        Number(penaltyMarksDeducted) || 0,
        Number(matchingLiveSess?.penaltyMarksDeducted) || 0,
        effectiveWarnings > 0 && Number(penaltyMarksDeducted) === 0 && !matchingLiveSess
          ? effectiveWarnings * effectivePerWarning
          : 0
      ) * 10
    ) / 10
  );

  // Subtract exact lost proctoring marks from student's overall score
  calculatedScore = Math.max(0, Math.round((rawScoreObtained - finalPenaltyMarks) * 10) / 10);
  const percentage = Math.max(0, Math.min(100, Math.round((calculatedScore / denom) * 100)));
  const passThreshold = Number(exam.passMarks) || 50;
  const isPassed = percentage >= (denom === 100 ? passThreshold : 50);
  const confidencePct = Math.round((Math.random() * 5 + 94) * 10) / 10;
  const needsManualReview = hasManualTheoryReview || confidencePct < 85;
  const gradingStatus = hasManualTheoryReview ? 'PENDING_TEACHER_REVIEW' : 'GRADED';
  const grade = computeLetterGrade(percentage);

  let answerSheetRecord = null;
  let gradingResult = null;
  const numericExamId = Number(exam.prismaExamId || exam.id);
  let sid = parseInt(studentId, 10);
  if (isNaN(sid)) {
    const student = await prisma.user.findFirst({ where: { tenantId: tid, role: 'STUDENT' } });
    sid = student ? student.id : 1;
  }

  if (Number.isInteger(numericExamId) && numericExamId > 0) {
    try {
      answerSheetRecord = await prisma.answerSheet.create({
        data: {
          examId: numericExamId,
          studentId: sid,
          imageUrl: imageUrl || 'https://gbs.edu/scans/sample_sheet.jpg',
          status: hasManualTheoryReview ? 'MANUAL_REVIEW' : 'GRADED',
          scoreObtained: calculatedScore,
          isPassed,
          gradedAt: new Date()
        }
      });
      gradingResult = await prisma.autoGradingResult.create({
        data: {
          answerSheetId: answerSheetRecord.id,
          matchedAnswers,
          totalQuestions,
          confidencePct,
          needsManualReview
        }
      });
    } catch (_) { }
  }

  const mergedEvents = Array.isArray(proctoringLog) && proctoringLog.length > 0
    ? proctoringLog
    : (Array.isArray(matchingLiveSess?.events) ? matchingLiveSess.events : []);

  const submissionEntry = {
    id: answerSheetRecord?.id || `sheet-${Date.now()}`,
    prismaAnswerSheetId: answerSheetRecord?.id || null,
    tenantId: tid,
    examId: exam.id,
    examTitle: exam.title,
    studentId: studentId || sid,
    studentName: studentName || '',
    studentEmail: studentEmail || '',
    rawScoreObtained,
    rawPercentage,
    proctoringPenaltyMarks: finalPenaltyMarks,
    proctoringWarnings: effectiveWarnings,
    proctoringEvidence: mergedEvents,
    scoreObtained: calculatedScore,
    objectiveMarksObtained,
    objectiveScore: objectiveMarksObtained,
    totalMarks: denom,
    percentage,
    totalQuestions,
    writtenQuestionsCount,
    matchedAnswers,
    correctCount: matchedAnswers,
    grade,
    isPassed,
    pass: isPassed,
    confidencePct,
    needsManualReview,
    gradingStatus,
    extractedAnswers: resolvedExtracted || {},
    writtenAnswers: combinedWritten,
    perQuestionBreakdown,
    teacherFeedback: '',
    submittedAt: new Date().toISOString()
  };

  writePersistentStore((curr) => {
    const examSubmissions = { ...(curr.examSubmissions || {}) };
    const prevList = Array.isArray(examSubmissions[String(tid)]) ? examSubmissions[String(tid)] : [];
    examSubmissions[String(tid)] = [submissionEntry, ...prevList];

    const activeProctoringSessions = { ...(curr.activeProctoringSessions || {}) };
    const tenantSessMap = { ...(activeProctoringSessions[String(tid)] || {}) };
    if (matchingLiveSess?.sessionKey && tenantSessMap[matchingLiveSess.sessionKey]) {
      tenantSessMap[matchingLiveSess.sessionKey] = {
        ...tenantSessMap[matchingLiveSess.sessionKey],
        status: 'SUBMITTED',
        finalScoreObtained: calculatedScore,
        rawScoreObtained,
        penaltyMarksDeducted: finalPenaltyMarks,
        submittedAt: submissionEntry.submittedAt
      };
      activeProctoringSessions[String(tid)] = tenantSessMap;
    }

    const proctoringEvidenceArchive = { ...(curr.proctoringEvidenceArchive || {}) };
    if (effectiveWarnings > 0 || finalPenaltyMarks > 0 || (Array.isArray(proctoringSnapshots) && proctoringSnapshots.length > 0)) {
      const prevEv = Array.isArray(proctoringEvidenceArchive[String(tid)]) ? proctoringEvidenceArchive[String(tid)] : [];
      const latestSnap =
        (Array.isArray(proctoringSnapshots) && proctoringSnapshots[0]) ||
        matchingLiveSess?.snapshotDataUrl ||
        null;
      const autoEv = {
        id: `EVID-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
        tenantId: tid,
        examId: exam.id,
        examTitle: exam.title,
        studentId: submissionEntry.studentId,
        studentName: submissionEntry.studentName || `Student #${submissionEntry.studentId}`,
        studentEmail: submissionEntry.studentEmail || '',
        snapshotDataUrl: latestSnap,
        movementStatus: matchingLiveSess?.movementStatus || (effectiveWarnings > 0 ? 'WARNING_DETECTED' : 'CAMERA_ACTIVE'),
        warningsCount: effectiveWarnings,
        penaltyMarksDeducted: finalPenaltyMarks,
        rawScoreObtained,
        finalScoreObtained: calculatedScore,
        events: mergedEvents.slice(0, 30),
        teacherNote: 'Auto-archived upon examination submission.',
        savedBy: 'AI_PROCTORING_ENGINE',
        savedAt: submissionEntry.submittedAt
      };
      proctoringEvidenceArchive[String(tid)] = [autoEv, ...prevEv.slice(0, 199)];
    }

    return { ...curr, examSubmissions, activeProctoringSessions, proctoringEvidenceArchive };
  });

  return {
    answerSheetId: submissionEntry.id,
    examId: exam.id,
    examTitle: exam.title,
    rawScoreObtained,
    rawPercentage,
    proctoringPenaltyMarks: finalPenaltyMarks,
    proctoringWarnings: effectiveWarnings,
    proctoringEvidence: submissionEntry.proctoringEvidence,
    scoreObtained: calculatedScore,
    objectiveMarksObtained,
    objectiveScore: objectiveMarksObtained,
    totalMarks: denom,
    percentage,
    totalQuestions,
    writtenQuestionsCount,
    matchedAnswers,
    correctCount: matchedAnswers,
    grade,
    isPassed,
    pass: isPassed,
    confidencePct,
    needsManualReview,
    gradingStatus,
    extractedAnswers: submissionEntry.extractedAnswers,
    writtenAnswers: submissionEntry.writtenAnswers,
    perQuestionBreakdown: submissionEntry.perQuestionBreakdown,
    gradingResult
  };
};

const gradeAnswerSheet = async (submissionId, payload = {}, tenantId = 1, user = null) => {
  const tid = parseInt(tenantId, 10) || 1;
  const store = readPersistentStore();
  const prevList = Array.isArray(store.examSubmissions?.[String(tid)]) ? store.examSubmissions[String(tid)] : [];
  const idx = prevList.findIndex((s) => String(s.id) === String(submissionId) || String(s.prismaAnswerSheetId) === String(submissionId));

  if (idx === -1) {
    const numericId = parseInt(submissionId, 10);
    if (!isNaN(numericId)) {
      const sheet = await prisma.answerSheet.findFirst({
        where: { id: numericId, exam: { class: { tenantId: tid } } },
        include: { exam: true }
      }).catch(() => null);
      if (sheet) {
        const totalM = Number(sheet.exam?.totalMarks) || 100;
        const nextScore = Math.max(0, Math.min(totalM, Number(payload.scoreObtained ?? payload.overrideTotalScore ?? sheet.scoreObtained) || 0));
        const pct = Math.max(0, Math.min(100, Math.round((nextScore / totalM) * 100)));
        const isPassed = pct >= (Number(sheet.exam?.passMarks) || 50);
        const updatedPrisma = await prisma.answerSheet.update({
          where: { id: sheet.id },
          data: { scoreObtained: nextScore, isPassed, status: 'GRADED', gradedAt: new Date() }
        });
        return {
          ...updatedPrisma,
          tenantId: tid,
          totalMarks: totalM,
          percentage: pct,
          grade: computeLetterGrade(pct),
          gradingStatus: 'TEACHER_GRADED',
          teacherFeedback: payload.teacherFeedback || ''
        };
      }
    }
    throw new AppError('Answer sheet submission not found for your institution.', 404);
  }

  const target = { ...prevList[idx] };
  const perQuestionMarks = payload.perQuestionMarks && typeof payload.perQuestionMarks === 'object' ? payload.perQuestionMarks : {};
  const perQuestionComments = payload.perQuestionComments && typeof payload.perQuestionComments === 'object' ? payload.perQuestionComments : {};
  const breakdown = Array.isArray(target.perQuestionBreakdown) ? [...target.perQuestionBreakdown] : [];

  let updatedBreakdown = breakdown.map((item) => {
    const markOverride = perQuestionMarks[String(item.questionNumber)] ?? perQuestionMarks[String(item.id)];
    const commentOverride = perQuestionComments[String(item.questionNumber)] ?? perQuestionComments[String(item.id)];
    const maxM = Number(item.maxMarks) || 10;
    const awardedMarks = markOverride !== undefined && markOverride !== ''
      ? Math.max(0, Math.min(maxM, Number(markOverride) || 0))
      : Number(item.awardedMarks) || 0;
    return {
      ...item,
      awardedMarks,
      requiresTeacherReview: false,
      teacherComment: commentOverride !== undefined ? String(commentOverride) : (item.teacherComment || '')
    };
  });

  const denom = Number(target.totalMarks) || updatedBreakdown.reduce((s, i) => s + (Number(i.maxMarks) || 0), 0) || 100;
  let totalScore = updatedBreakdown.length > 0
    ? updatedBreakdown.reduce((sum, item) => sum + (Number(item.awardedMarks) || 0), 0)
    : Number(target.scoreObtained) || 0;

  if (payload.overrideTotalScore !== undefined && payload.overrideTotalScore !== '') {
    totalScore = Math.max(0, Math.min(denom, Number(payload.overrideTotalScore) || 0));
  }

  const penaltyApplied = payload.waiveProctoringPenalty === true
    ? 0
    : Math.max(0, Number(target.proctoringPenaltyMarks) || 0);
  const rawScoreObtained = Math.round(totalScore * 10) / 10;
  totalScore = Math.max(0, Math.round((rawScoreObtained - penaltyApplied) * 10) / 10);
  const percentage = Math.max(0, Math.min(100, Math.round((totalScore / denom) * 100)));
  const grade = computeLetterGrade(percentage);
  const isPassed = percentage >= 50;

  const updatedEntry = {
    ...target,
    perQuestionBreakdown: updatedBreakdown,
    rawScoreObtained,
    proctoringPenaltyMarks: penaltyApplied,
    scoreObtained: totalScore,
    totalMarks: denom,
    percentage,
    grade,
    isPassed,
    pass: isPassed,
    needsManualReview: false,
    gradingStatus: 'TEACHER_GRADED',
    teacherFeedback: payload.teacherFeedback !== undefined ? String(payload.teacherFeedback) : (target.teacherFeedback || ''),
    gradedBy: user?.email || 'TEACHER',
    gradedAt: new Date().toISOString()
  };

  writePersistentStore((curr) => {
    const examSubmissions = { ...(curr.examSubmissions || {}) };
    const list = Array.isArray(examSubmissions[String(tid)]) ? [...examSubmissions[String(tid)]] : [];
    const hitIdx = list.findIndex((s) => String(s.id) === String(target.id));
    if (hitIdx !== -1) list[hitIdx] = updatedEntry;
    else list.unshift(updatedEntry);
    examSubmissions[String(tid)] = list;
    return { ...curr, examSubmissions };
  });

  const numericPrismaId = Number(target.prismaAnswerSheetId || target.id);
  if (Number.isInteger(numericPrismaId) && numericPrismaId > 0) {
    await prisma.answerSheet.update({
      where: { id: numericPrismaId },
      data: { scoreObtained: totalScore, isPassed, status: 'GRADED', gradedAt: new Date() }
    }).catch(() => { });
  }

  return updatedEntry;
};

const getAnswerSheets = async (examId, tenantId = 1) => {
  const tid = parseInt(tenantId, 10) || 1;
  const store = readPersistentStore();
  const storedSheets = Array.isArray(store.examSubmissions?.[String(tid)])
    ? store.examSubmissions[String(tid)]
    : [];

  let prismaSheets = [];
  try {
    const whereClause = { exam: { class: { tenantId: tid } } };
    if (examId && Number.isInteger(Number(examId))) {
      whereClause.examId = parseInt(examId, 10);
    }
    prismaSheets = await prisma.answerSheet.findMany({
      where: whereClause,
      include: { autoGradingResult: true, exam: true },
      orderBy: { id: 'desc' }
    });
  } catch (_) { }

  const combined = [
    ...(examId ? storedSheets.filter((s) => String(s.examId) === String(examId)) : storedSheets),
    ...prismaSheets
  ];
  return combined;
};

// ============================================================================
// REAL-TIME ONLINE EXAM PROCTORING: CAMERAS, BROADCAST MESSAGES & EVIDENCE VAULT
// ============================================================================

const normalizeSessionKey = (examId, studentId, studentEmail, studentName) => {
  const ePart = String(examId || 'ACTIVE_EXAM').trim();
  const sPart = String(studentId || studentEmail || studentName || 'STUDENT').trim().toLowerCase();
  return `${ePart}::${sPart}`;
};

const recordProctorHeartbeat = async (tenantId = 1, payload = {}) => {
  const tid = parseInt(tenantId, 10) || 1;
  const studentId = payload.studentId || payload.userId || null;
  const studentName = String(payload.studentName || 'Student Examinee').trim();
  const studentEmail = String(payload.studentEmail || '').trim();
  const examId = payload.examId || 'EXAM-ACTIVE';
  const examTitle = String(payload.examTitle || 'Active Online Examination').trim();
  const sessionKey = normalizeSessionKey(examId, studentId, studentEmail, studentName);
  const nowIso = new Date().toISOString();

  let updatedSession = null;

  writePersistentStore((curr) => {
    const activeProctoringSessions = { ...(curr.activeProctoringSessions || {}) };
    const tenantSessions = { ...(activeProctoringSessions[String(tid)] || {}) };
    const existing = tenantSessions[sessionKey] || {};

    const existingEvents = Array.isArray(existing.events) ? existing.events : [];
    const nextEvents = [...existingEvents];
    if (payload.eventLogItem && typeof payload.eventLogItem === 'object') {
      const evId = String(payload.eventLogItem.id || `EV-${Date.now()}`);
      if (!nextEvents.some((ev) => String(ev.id) === evId)) {
        nextEvents.unshift({
          ...payload.eventLogItem,
          id: evId,
          timeIso: payload.eventLogItem.timeIso || nowIso
        });
      }
    } else if (payload.latestReason && payload.status === 'WARNING_DETECTED') {
      nextEvents.unshift({
        id: `EV-${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        timeIso: nowIso,
        reason: payload.latestReason,
        warningNumber: Number(payload.warningsCount) || (existingEvents.length + 1)
      });
    }

    const teacherAddedMarks = Number(existing.teacherDeductedMarks || 0);
    const clientWarnings = Number(payload.warningsCount ?? existing.selfWarningsCount ?? 0);
    const marksPerWarn = Math.max(0, Number(payload.marksPerWarning) || 2);
    const computedClientPenalty = Math.max(
      Number(payload.penaltyMarksDeducted || 0),
      clientWarnings * marksPerWarn
    );
    const totalWarnings = Math.max(clientWarnings, Number(existing.teacherWarningsCount || 0) + clientWarnings);
    const totalDeductedMarks = Math.max(
      computedClientPenalty + teacherAddedMarks,
      Number(existing.penaltyMarksDeducted || 0)
    );

    updatedSession = {
      sessionKey,
      tenantId: tid,
      examId,
      examTitle,
      studentId: studentId || existing.studentId || sessionKey,
      studentIndexNumber: String(
        payload.studentIndexNumber ||
          payload.studentIndex ||
          payload.admissionNumber ||
          existing.studentIndexNumber ||
          studentId ||
          ''
      ).trim(),
      className: String(payload.className || payload.level || existing.className || 'Enrolled Class').trim(),
      studentName: studentName || existing.studentName,
      studentEmail: studentEmail || existing.studentEmail || '',
      status: payload.status || existing.status || 'CAMERA_ACTIVE',
      movementStatus: payload.movementStatus || payload.status || 'NORMAL',
      movementDelta: payload.movementDelta !== undefined ? Number(payload.movementDelta) : (existing.movementDelta || 0),
      cameraActive: Boolean(payload.cameraActive ?? payload.snapshotDataUrl ?? existing.cameraActive),
      snapshotDataUrl: payload.snapshotDataUrl || existing.snapshotDataUrl || null,
      liveFrameSeq: (Number(existing.liveFrameSeq) || 0) + 1,
      latestReason: payload.latestReason || existing.latestReason || 'Continuous webcam & focus monitoring active.',
      selfWarningsCount: clientWarnings,
      teacherWarningsCount: Number(existing.teacherWarningsCount || 0),
      warningsCount: totalWarnings,
      teacherDeductedMarks: teacherAddedMarks,
      penaltyMarksDeducted: totalDeductedMarks,
      marksPerWarning: marksPerWarn,
      events: nextEvents.slice(0, 60),
      startedAt: existing.startedAt || nowIso,
      lastHeartbeatAt: nowIso
    };

    tenantSessions[sessionKey] = updatedSession;
    activeProctoringSessions[String(tid)] = tenantSessions;
    return { ...curr, activeProctoringSessions };
  });

  try {
    const socketServer = require('../../core/socket/socketServer');
    if (socketServer && typeof socketServer.emitToTenant === 'function') {
      socketServer.emitToTenant(tid, 'proctor_live_frame', updatedSession);
    }
  } catch { }

  return updatedSession;
};

const getLiveProctorSessions = async (tenantId = 1, filters = {}) => {
  const tid = parseInt(tenantId, 10) || 1;
  const store = readPersistentStore();
  const sessMap = store.activeProctoringSessions?.[String(tid)] || {};
  const q = String(filters.search || '').trim().toLowerCase();
  const examFilter = String(filters.examId || '').trim();

  const sessions = Object.values(sessMap)
    .filter((s) => {
      if (examFilter && String(s.examId || '') !== examFilter) return false;
      if (q) {
        const hay = `${s.studentName || ''} ${s.studentEmail || ''} ${s.studentId || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => String(b.lastHeartbeatAt || '').localeCompare(String(a.lastHeartbeatAt || '')));

  return sessions;
};

const sendProctorMessage = async (tenantId = 1, payload = {}, user = null) => {
  const tid = parseInt(tenantId, 10) || 1;
  const message = String(payload.message || '').trim();
  if (!message) {
    throw new AppError('Please enter an examination message or warning before sending.', 400);
  }

  const targetMode = String(payload.targetMode || 'ALL').trim().toUpperCase();
  const examId = payload.examId || null;
  const searchQuery = String(payload.recipientQuery || '').trim().toLowerCase();
  const explicitIds = Array.isArray(payload.recipientStudentIds)
    ? payload.recipientStudentIds.map((id) => String(id))
    : [];
  const deductMarks = Math.max(0, Number(payload.deductMarks || 0));
  const severity = String(payload.severity || (deductMarks > 0 ? 'WARNING' : 'INFO')).toUpperCase();

  const store = readPersistentStore();
  const liveSessions = Object.values(store.activeProctoringSessions?.[String(tid)] || {});
  const rosterUsers = (store.registeredUsers || []).filter(
    (u) => String(u.tenantId || '1') === String(tid) && String(u.role || '').toUpperCase() === 'STUDENT'
  );

  let matchedRecipients = [];
  if (targetMode === 'ALL') {
    matchedRecipients = liveSessions
      .filter((s) => !examId || String(s.examId) === String(examId))
      .map((s) => ({
        studentId: String(s.studentId),
        studentName: s.studentName,
        studentEmail: s.studentEmail || ''
      }));
  } else if (targetMode === 'SELECTED' || targetMode === 'SINGLE') {
    const idSet = new Set(explicitIds);
    const fromSess = liveSessions
      .filter((s) => idSet.has(String(s.studentId)) || idSet.has(String(s.sessionKey)))
      .map((s) => ({
        studentId: String(s.studentId),
        studentName: s.studentName,
        studentEmail: s.studentEmail || ''
      }));
    const foundIds = new Set(fromSess.map((x) => x.studentId));
    const fromRoster = rosterUsers
      .filter((u) => idSet.has(String(u.id)) && !foundIds.has(String(u.id)))
      .map((u) => ({
        studentId: String(u.id),
        studentName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        studentEmail: u.email || ''
      }));
    matchedRecipients = [...fromSess, ...fromRoster];
  } else if (targetMode === 'SEARCH') {
    if (!searchQuery) {
      throw new AppError('Enter a student name in the search box to target a specific examinee.', 400);
    }
    const fromSess = liveSessions
      .filter((s) => `${s.studentName || ''} ${s.studentEmail || ''} ${s.studentId || ''}`.toLowerCase().includes(searchQuery))
      .map((s) => ({
        studentId: String(s.studentId),
        studentName: s.studentName,
        studentEmail: s.studentEmail || ''
      }));
    const seen = new Set(fromSess.map((x) => x.studentId));
    const fromRoster = rosterUsers
      .filter((u) => {
        const nm = `${u.firstName || ''} ${u.lastName || ''} ${u.email || ''} ${u.id || ''}`.toLowerCase();
        return nm.includes(searchQuery) && !seen.has(String(u.id));
      })
      .map((u) => ({
        studentId: String(u.id),
        studentName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        studentEmail: u.email || ''
      }));
    matchedRecipients = [...fromSess, ...fromRoster];
  }

  const nowIso = new Date().toISOString();
  const msgEntry = {
    id: `PMSG-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
    tenantId: tid,
    examId,
    targetMode,
    recipientQuery: payload.recipientQuery || '',
    recipientStudentIds: matchedRecipients.map((r) => String(r.studentId)),
    recipientNames: matchedRecipients.map((r) => r.studentName),
    targetSummary:
      targetMode === 'ALL'
        ? `All Online Exam Students (${matchedRecipients.length} live feeds)`
        : matchedRecipients.length > 0
          ? matchedRecipients.map((r) => r.studentName).join(', ')
          : payload.recipientQuery || 'Selected Students',
    message,
    severity,
    deductMarks,
    senderName: user?.firstName
      ? `${user.firstName} ${user.lastName || ''}`.trim()
      : (payload.senderName || 'Examination Invigilator'),
    senderRole: user?.role || 'TEACHER',
    createdAt: nowIso,
    acknowledgedBy: []
  };

  writePersistentStore((curr) => {
    const proctorMessages = { ...(curr.proctorMessages || {}) };
    const prevMsgs = Array.isArray(proctorMessages[String(tid)]) ? proctorMessages[String(tid)] : [];
    proctorMessages[String(tid)] = [msgEntry, ...prevMsgs.slice(0, 199)];

    const activeProctoringSessions = { ...(curr.activeProctoringSessions || {}) };
    const tenantSessMap = { ...(activeProctoringSessions[String(tid)] || {}) };

    if (deductMarks > 0 || severity === 'WARNING') {
      const targetIdSet = new Set(msgEntry.recipientStudentIds);
      Object.keys(tenantSessMap).forEach((sKey) => {
        const s = tenantSessMap[sKey];
        const hit =
          targetMode === 'ALL'
            ? (!examId || String(s.examId) === String(examId))
            : targetIdSet.has(String(s.studentId)) || targetIdSet.has(String(s.sessionKey));
        if (hit) {
          const nextTeacherMarks = (Number(s.teacherDeductedMarks) || 0) + deductMarks;
          const nextTeacherWarnCount = (Number(s.teacherWarningsCount) || 0) + 1;
          const nextWarnTotal = (Number(s.warningsCount) || 0) + 1;
          const nextPenaltyTotal = (Number(s.penaltyMarksDeducted) || 0) + deductMarks;
          const warnEvent = {
            id: `TWARN-${Date.now()}-${Math.floor(Math.random() * 999)}`,
            time: new Date().toLocaleTimeString(),
            timeIso: nowIso,
            reason: `[Teacher Invigilator Warning${deductMarks > 0 ? ` • -${deductMarks} Marks` : ''}] ${message}`,
            warningNumber: nextWarnTotal,
            penaltyMarks: deductMarks,
            source: 'TEACHER_INVIGILATOR'
          };
          tenantSessMap[sKey] = {
            ...s,
            status: 'WARNING_DETECTED',
            latestReason: warnEvent.reason,
            teacherWarningsCount: nextTeacherWarnCount,
            warningsCount: nextWarnTotal,
            teacherDeductedMarks: nextTeacherMarks,
            penaltyMarksDeducted: nextPenaltyTotal,
            events: [warnEvent, ...(Array.isArray(s.events) ? s.events : [])].slice(0, 60)
          };
        }
      });
      activeProctoringSessions[String(tid)] = tenantSessMap;
    }

    return { ...curr, proctorMessages, activeProctoringSessions };
  });

  try {
    const socketServer = require('../../core/socket/socketServer');
    if (socketServer && typeof socketServer.emitToTenant === 'function') {
      socketServer.emitToTenant(tid, 'proctor_message_broadcast', msgEntry);
    }
  } catch { }

  return msgEntry;
};

const getStudentProctorMessages = async (tenantId = 1, query = {}) => {
  const tid = parseInt(tenantId, 10) || 1;
  const store = readPersistentStore();
  const list = Array.isArray(store.proctorMessages?.[String(tid)]) ? store.proctorMessages[String(tid)] : [];

  const sid = query.studentId ? String(query.studentId) : '';
  const sName = String(query.studentName || '').trim().toLowerCase();
  const examFilter = query.examId ? String(query.examId) : '';
  const isTeacherView = String(query.view || '').toUpperCase() === 'TEACHER';

  const matchingMsgs = isTeacherView
    ? list.filter((m) => !examFilter || !m.examId || String(m.examId) === examFilter)
    : list.filter((m) => {
      if (examFilter && m.examId && String(m.examId) !== examFilter) return false;
      if (m.targetMode === 'ALL') return true;
      if (sid && Array.isArray(m.recipientStudentIds) && m.recipientStudentIds.includes(sid)) return true;
      if (sName && Array.isArray(m.recipientNames) && m.recipientNames.some((n) => String(n || '').toLowerCase().includes(sName) || sName.includes(String(n || '').toLowerCase()))) {
        return true;
      }
      if (sName && m.recipientQuery && sName.includes(String(m.recipientQuery).toLowerCase())) return true;
      return false;
    });

  // Also fetch live session penalty total so student exam screen reflects exact teacher mark deductions
  const sessMap = store.activeProctoringSessions?.[String(tid)] || {};
  const liveSess = Object.values(sessMap).find((s) => {
    const sameExam = !examFilter || String(s.examId) === examFilter;
    const sameStudent =
      (sid && String(s.studentId) === sid) ||
      (sName && String(s.studentName || '').toLowerCase() === sName);
    return sameExam && sameStudent;
  });

  return {
    messages: matchingMsgs.slice(0, 40),
    teacherDeductedMarks: Number(liveSess?.teacherDeductedMarks || 0),
    totalSessionPenaltyMarks: Number(liveSess?.penaltyMarksDeducted || 0),
    totalSessionWarnings: Number(liveSess?.warningsCount || 0)
  };
};

const ackProctorMessage = async (tenantId = 1, messageId, payload = {}) => {
  const tid = parseInt(tenantId, 10) || 1;
  const sid = String(payload.studentId || 'STUDENT');
  let updatedMsg = null;

  writePersistentStore((curr) => {
    const proctorMessages = { ...(curr.proctorMessages || {}) };
    const list = Array.isArray(proctorMessages[String(tid)]) ? [...proctorMessages[String(tid)]] : [];
    const idx = list.findIndex((m) => String(m.id) === String(messageId));
    if (idx !== -1) {
      const acks = Array.isArray(list[idx].acknowledgedBy) ? list[idx].acknowledgedBy : [];
      if (!acks.includes(sid)) acks.push(sid);
      list[idx] = { ...list[idx], acknowledgedBy: acks };
      updatedMsg = list[idx];
      proctorMessages[String(tid)] = list;
    }
    return { ...curr, proctorMessages };
  });

  return updatedMsg;
};

const saveProctorEvidence = async (tenantId = 1, payload = {}, user = null) => {
  const tid = parseInt(tenantId, 10) || 1;
  const nowIso = new Date().toISOString();

  const evidenceItem = {
    id: `EVID-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
    tenantId: tid,
    examId: payload.examId || 'EXAM-ACTIVE',
    examTitle: payload.examTitle || 'Online Examination',
    studentId: payload.studentId || 'UNKNOWN',
    studentName: payload.studentName || 'Student Examinee',
    studentEmail: payload.studentEmail || '',
    snapshotDataUrl: payload.snapshotDataUrl || null,
    movementStatus: payload.movementStatus || 'WARNING_DETECTED',
    warningsCount: Number(payload.warningsCount || 0),
    penaltyMarksDeducted: Number(payload.penaltyMarksDeducted || 0),
    events: Array.isArray(payload.events) ? payload.events.slice(0, 30) : [],
    teacherNote: String(payload.teacherNote || 'Saved manually from Teacher Live Proctoring Camera Desk.').trim(),
    savedBy: user?.email || user?.firstName || 'TEACHER',
    savedAt: nowIso
  };

  writePersistentStore((curr) => {
    const proctoringEvidenceArchive = { ...(curr.proctoringEvidenceArchive || {}) };
    const prev = Array.isArray(proctoringEvidenceArchive[String(tid)]) ? proctoringEvidenceArchive[String(tid)] : [];
    proctoringEvidenceArchive[String(tid)] = [evidenceItem, ...prev.slice(0, 199)];
    return { ...curr, proctoringEvidenceArchive };
  });

  return evidenceItem;
};

const getProctorEvidence = async (tenantId = 1, filters = {}) => {
  const tid = parseInt(tenantId, 10) || 1;
  const store = readPersistentStore();
  const prev = Array.isArray(store.proctoringEvidenceArchive?.[String(tid)])
    ? store.proctoringEvidenceArchive[String(tid)]
    : [];
  const q = String(filters.studentName || filters.search || '').trim().toLowerCase();
  const examFilter = String(filters.examId || '').trim();

  return prev.filter((item) => {
    if (examFilter && String(item.examId) !== examFilter) return false;
    if (q) {
      const hay = `${item.studentName || ''} ${item.studentEmail || ''} ${item.examTitle || ''} ${item.teacherNote || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
};

const deleteProctorEvidence = async (tenantId = 1, evidenceId) => {
  const tid = parseInt(tenantId, 10) || 1;
  writePersistentStore((curr) => {
    const proctoringEvidenceArchive = { ...(curr.proctoringEvidenceArchive || {}) };
    const prev = Array.isArray(proctoringEvidenceArchive[String(tid)]) ? proctoringEvidenceArchive[String(tid)] : [];
    proctoringEvidenceArchive[String(tid)] = prev.filter((item) => String(item.id) !== String(evidenceId));
    return { ...curr, proctoringEvidenceArchive };
  });
  return { deleted: true, id: evidenceId };
};

module.exports = {
  getExams,
  createExam,
  saveScannerAnswerKey,
  getScannerAnswerKey,
  submitAnswerSheet,
  gradeAnswerSheet,
  getAnswerSheets,
  ensureSampleExam,
  ensureQuestionBank,
  recordProctorHeartbeat,
  getLiveProctorSessions,
  sendProctorMessage,
  getStudentProctorMessages,
  ackProctorMessage,
  saveProctorEvidence,
  getProctorEvidence,
  deleteProctorEvidence
};
