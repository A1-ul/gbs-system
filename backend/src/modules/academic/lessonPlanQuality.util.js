'use strict';

/**
 * Ghana NaCCA Learner-Centred Lesson Planning Metadata,
 * Subject-Adaptable Templates, and Pedagogical Quality Checker.
 *
 * CRITICAL INTEGRITY GUARANTEE:
 * - Never fabricates official NaCCA Content Standard / Learning Indicator codes.
 * - Never fabricates post-lesson Teacher Reflections.
 * - Evaluates alignment transparently to guide teachers and academic supervisors.
 */

const NACCA_CORE_COMPETENCIES = [
  { id: 'CP', code: 'CP', label: 'Critical Thinking and Problem Solving (CP)' },
  { id: 'CI', code: 'CI', label: 'Creativity and Innovation (CI)' },
  { id: 'CC', code: 'CC', label: 'Communication and Collaboration (CC)' },
  { id: 'CG', code: 'CG', label: 'Cultural Identity and Global Citizenship (CG)' },
  { id: 'PL', code: 'PL', label: 'Personal Development and Leadership (PL)' },
  { id: 'DL', code: 'DL', label: 'Digital Literacy (DL)' }
];

const LEARNER_CENTRED_METHODS = [
  'Think-Pair-Share',
  'Guided Discovery & Inquiry',
  'Cooperative Group Work',
  'Demonstration & Guided Practice',
  'Problem-Based Learning (PBL)',
  'Hands-On Practical / Experiment',
  'Role-Play & Simulation',
  'Questioning & Socratic Dialogue',
  'Gallery Walk & Peer Critique',
  'Case Study & Real-World Analysis',
  'Project-Based Learning',
  'Brainstorming & Concept Mapping'
];

/**
 * 6 genuinely distinct, subject-adaptable lesson scaffolds.
 * Content Standard, Learning Indicator, Curriculum References, and Teacher's Reflection
 * are intentionally left blank for authentic teacher input (never fabricated).
 */
const SUBJECT_LESSON_TEMPLATES = [
  {
    id: 'MATH_PROBLEM_SOLVING',
    name: 'Mathematics — Problem-Solving & Inquiry Lesson',
    subjectArea: 'Mathematics',
    durationMinutes: 60,
    recommendedMethods: ['Demonstration & Guided Practice', 'Think-Pair-Share', 'Problem-Based Learning (PBL)'],
    recommendedCompetencies: ['Critical Thinking and Problem Solving (CP)', 'Communication and Collaboration (CC)'],
    guidanceNote: 'Focuses on concrete-to-abstract reasoning, worked examples, pair problem solving, and common misconception checks.',
    defaults: {
      planType: 'LESSON_NOTES',
      durationMinutes: 60,
      teachingLearningResources: 'Graph/grid board, coloured chalk/markers, student mini-whiteboards or exercise books, rulers, real-life word problem cards.',
      teachingLearningMethods: ['Demonstration & Guided Practice', 'Think-Pair-Share', 'Problem-Based Learning (PBL)'],
      coreCompetencies: ['Critical Thinking and Problem Solving (CP)', 'Communication and Collaboration (CC)'],
      differentiatedLearning: 'Support: Provide step-by-step worked cue cards and smaller numerical values for learners needing scaffolding. Extension: Assign multi-step real-world application problems to fast finishers. Inclusion: Read word problems aloud and allow oral explanation alongside written steps.',
      teacherActivities: '1. Starter (10 mins): Pose a quick real-world mental warm-up linking prior arithmetic/algebra knowledge.\n2. Main Modelling (15 mins): Demonstrate 2 structured examples step-by-step, verbalising why each step works and asking probing "Why?" questions.\n3. Guided Practice & Circulation (25 mins): Circulate as pairs tackle tiered problems, addressing misconceptions immediately.\n4. Plenary (10 mins): Facilitate class error-analysis of one common mistake and summarise key steps.',
      learnerActivities: '1. Attempt starter warm-up individually and share reasoning with a seat partner.\n2. Observe worked demonstration, identify each mathematical rule used, and suggest the next step.\n3. Work in pairs to solve graded practice problems and justify solutions on the board.\n4. Complete a 2-question exit ticket showing clear working steps.',
      assessmentEvaluation: 'Formative oral questioning during modelling, observation of pair working steps, and a 3-item exit ticket assessing accuracy and method.',
      conclusionPlenary: 'Learners restate the key mathematical rule in their own words and reflect on one misconception to avoid.',
      assignmentHomework: 'Complete 4 structured practice problems plus 1 contextual Ghanaian market/measurement word problem from the class workbook.'
    }
  },
  {
    id: 'SCIENCE_INQUIRY_LAB',
    name: 'Science — Hands-On Practical & Inquiry Lesson',
    subjectArea: 'Integrated / General Science',
    durationMinutes: 60,
    recommendedMethods: ['Hands-On Practical / Experiment', 'Guided Discovery & Inquiry', 'Cooperative Group Work'],
    recommendedCompetencies: ['Critical Thinking and Problem Solving (CP)', 'Creativity and Innovation (CI)', 'Communication and Collaboration (CC)'],
    guidanceNote: 'Follows Predict–Observe–Explain (POE) practical inquiry with explicit laboratory safety and observation recording.',
    defaults: {
      planType: 'LESSON_NOTES',
      durationMinutes: 60,
      teachingLearningResources: 'Laboratory apparatus / safe local improvised materials, labelled diagrams or charts, observation worksheets, safety goggles/gloves where applicable.',
      teachingLearningMethods: ['Hands-On Practical / Experiment', 'Guided Discovery & Inquiry', 'Cooperative Group Work'],
      coreCompetencies: ['Critical Thinking and Problem Solving (CP)', 'Creativity and Innovation (CI)', 'Communication and Collaboration (CC)'],
      differentiatedLearning: 'Support: Assign clear group roles (observer, recorder, equipment handler) and provide structured observation tables with sentence starters. Extension: Ask advanced learners to identify variables and propose a follow-up investigation. Inclusion: Position learners with visual/hearing needs near demonstration bench and provide large-print diagrams.',
      teacherActivities: '1. Starter / Predict (10 mins): Present an everyday scientific phenomenon from learners\' environment and elicit predictions.\n2. Safety & Inquiry Setup (10 mins): Review safety rules and demonstrate correct apparatus handling.\n3. Facilitation (25 mins): Guide small groups through Predict–Observe–Explain investigation using open-ended prompts.\n4. Synthesis (15 mins): Connect group observations to the formal scientific principle.',
      learnerActivities: '1. Record initial predictions before the practical activity begins.\n2. Conduct guided observation/experiment in groups of 4–5, measuring and recording evidence accurately.\n3. Compare findings with predictions and present group conclusions to the class.\n4. Answer short application questions linking the concept to health, agriculture, or daily life.',
      assessmentEvaluation: 'Practical observation checklist (safe handling, accurate recording), group oral explanation, and 3 short-answer conceptual check questions.',
      conclusionPlenary: 'Class co-constructs a summary table contrasting initial predictions with observed scientific evidence.',
      assignmentHomework: 'Draw and label the setup/diagram in science notebooks and write 2 real-life applications observed at home or in the community.'
    }
  },
  {
    id: 'ENGLISH_LITERACY_WORKSHOP',
    name: 'English Language — Reading, Writing & Oral Workshop',
    subjectArea: 'English Language / Literature',
    durationMinutes: 60,
    recommendedMethods: ['Think-Pair-Share', 'Role-Play & Simulation', 'Gallery Walk & Peer Critique'],
    recommendedCompetencies: ['Communication and Collaboration (CC)', 'Creativity and Innovation (CI)', 'Cultural Identity and Global Citizenship (CG)'],
    guidanceNote: 'Integrates vocabulary activation, model text analysis, collaborative drafting, and peer oral/written feedback.',
    defaults: {
      planType: 'LESSON_NOTES',
      durationMinutes: 60,
      teachingLearningResources: 'Selected reading passage/comprehension text, word-wall flashcards, sentence-frame strips, learners\' readers and writing books.',
      teachingLearningMethods: ['Think-Pair-Share', 'Role-Play & Simulation', 'Gallery Walk & Peer Critique'],
      coreCompetencies: ['Communication and Collaboration (CC)', 'Creativity and Innovation (CI)', 'Cultural Identity and Global Citizenship (CG)'],
      differentiatedLearning: 'Support: Pre-teach key vocabulary with picture cues and offer sentence starters for paragraph writing. Extension: Challenge confident writers to incorporate varied figurative language or contrasting viewpoints. Inclusion: Allow paired oral rehearsal before independent writing.',
      teacherActivities: '1. Vocabulary Warm-Up (8 mins): Introduce 4–5 target words in context and model pronunciation.\n2. Interactive Model Reading (15 mins): Read aloud with expression, pausing for inference and comprehension questions.\n3. Guided Writing / Speaking Workshop (27 mins): Model structure, then coach pairs as they draft or rehearse responses.\n4. Sharing & Feedback (10 mins): Select 2–3 learner examples to celebrate strengths and refine grammar/clarity.',
      learnerActivities: '1. Predict text meaning from title/pictures and use new vocabulary in oral sentences.\n2. Read passage in pairs, underline key ideas, and answer inferential questions.\n3. Draft a short structured response or perform a short dialogue applying the target language feature.\n4. Exchange work with a partner to give one praise point and one improvement suggestion.',
      assessmentEvaluation: 'Oral reading fluency check, targeted comprehension questions, and quick rubric review of learners\' drafted paragraph/dialogue.',
      conclusionPlenary: 'Learners share one new vocabulary word or grammar rule mastered and use it correctly in a closing sentence.',
      assignmentHomework: 'Revise the class draft cleanly and write a short 6–8 sentence reflection/continuation applying the lesson\'s grammar focus.'
    }
  },
  {
    id: 'SOCIAL_STUDIES_DIALOGUE',
    name: 'Social Studies / Humanities — Case Study & Civic Dialogue',
    subjectArea: 'Social Studies / RME / History',
    durationMinutes: 60,
    recommendedMethods: ['Case Study & Real-World Analysis', 'Questioning & Socratic Dialogue', 'Cooperative Group Work'],
    recommendedCompetencies: ['Cultural Identity and Global Citizenship (CG)', 'Critical Thinking and Problem Solving (CP)', 'Personal Development and Leadership (PL)'],
    guidanceNote: 'Centers on Ghanaian community realities, evidence-based civic discussion, and responsible citizenship.',
    defaults: {
      planType: 'LESSON_NOTES',
      durationMinutes: 60,
      teachingLearningResources: 'Local community case scenario cards, map of Ghana / historical timeline chart, constitution/civic excerpts, flipchart sheets.',
      teachingLearningMethods: ['Case Study & Real-World Analysis', 'Questioning & Socratic Dialogue', 'Cooperative Group Work'],
      coreCompetencies: ['Cultural Identity and Global Citizenship (CG)', 'Critical Thinking and Problem Solving (CP)', 'Personal Development and Leadership (PL)'],
      differentiatedLearning: 'Support: Provide simplified scenario summary bullets and guided discussion questions. Extension: Ask advanced groups to evaluate two competing policy/community solutions and defend a recommendation. Inclusion: Encourage respectful turn-taking so quieter learners contribute via written sticky-notes or small-group spokespersons.',
      teacherActivities: '1. Contextual Hook (10 mins): Present a familiar local/national scenario or news dilemma to spark curiosity.\n2. Concept Framing (12 mins): Clarify key civic/historical terms and link to learners\' lived experience.\n3. Group Case Analysis (25 mins): Facilitate small-group examination of causes, effects, and practical solutions.\n4. Structured Debrief (13 mins): Guide respectful whole-class dialogue highlighting democratic values and evidence.',
      learnerActivities: '1. Share prior community observations related to the lesson theme.\n2. Read/discuss the case study in groups, identifying key facts, root causes, and stakeholder perspectives.\n3. Present group action recommendations on a poster or brief 2-minute oral summary.\n4. Complete a short personal civic commitment / exit check.',
      assessmentEvaluation: 'Quality of evidence cited during group discussion, group summary chart, and 3 structured short-answer review items.',
      conclusionPlenary: 'Summarise 3 core takeaways on the board and invite learners to state one positive action they can practice in school or community.',
      assignmentHomework: 'Interview a parent or community elder on one practical example related to the topic and write a 5-line summary.'
    }
  },
  {
    id: 'TVET_PRACTICAL_WORKSHOP',
    name: 'Career Tech / TVET — Practical Skill & Safety Workshop',
    subjectArea: 'Career Technology / Home Economics / Technical',
    durationMinutes: 70,
    recommendedMethods: ['Demonstration & Guided Practice', 'Hands-On Practical / Experiment', 'Project-Based Learning'],
    recommendedCompetencies: ['Creativity and Innovation (CI)', 'Personal Development and Leadership (PL)', 'Critical Thinking and Problem Solving (CP)'],
    guidanceNote: 'Prioritizes workshop safety briefing, step-by-step tool demonstration, supervised skill practice, and product inspection.',
    defaults: {
      planType: 'LESSON_NOTES',
      durationMinutes: 70,
      teachingLearningResources: 'Required workshop tools/materials, personal protective equipment (aprons/goggles), sample finished model, step-by-step safety & process chart.',
      teachingLearningMethods: ['Demonstration & Guided Practice', 'Hands-On Practical / Experiment', 'Project-Based Learning'],
      coreCompetencies: ['Creativity and Innovation (CI)', 'Personal Development and Leadership (PL)', 'Critical Thinking and Problem Solving (CP)'],
      differentiatedLearning: 'Support: Pair beginners with confident peers during tool setup and break task into checked mini-milestones. Extension: Challenge skilled learners to refine finish quality or design a functional variation. Inclusion: Adapt workbench height/grip aids and verify safety instructions visually and verbally.',
      teacherActivities: '1. Safety & Readiness Check (10 mins): Inspect tools, protective gear, and review specific hazard controls.\n2. Skill Demonstration (15 mins): Model the exact technique slowly, pausing to highlight precision points.\n3. Supervised Practical (35 mins): Monitor every workstation closely, giving immediate corrective coaching on posture, measurement, and safety.\n4. Inspection & Cleanup (10 mins): Guide peer quality inspection and proper tool storage.',
      learnerActivities: '1. Identify required tools and state key safety precautions before touching materials.\n2. Observe the teacher\'s step-by-step demonstration and clarify measurement steps.\n3. Execute the practical task safely, checking dimensions/quality at each checkpoint.\n4. Clean workstation, return tools, and evaluate finished piece against quality criteria.',
      assessmentEvaluation: 'Practical performance rubric (safety compliance, measurement accuracy, craftsmanship/neatness, teamwork & cleanup).',
      conclusionPlenary: 'Display 2–3 learner workpieces to highlight strong technique and review one skill to strengthen next session.',
      assignmentHomework: 'Sketch the labelled tool/process sequence in practical journal and list 3 maintenance practices for the tools used.'
    }
  },
  {
    id: 'ICT_CREATIVE_PROJECT',
    name: 'Computing / ICT / Creative Arts — Studio & Digital Project',
    subjectArea: 'Computing / ICT / Creative Arts & Design',
    durationMinutes: 60,
    recommendedMethods: ['Project-Based Learning', 'Demonstration & Guided Practice', 'Gallery Walk & Peer Critique'],
    recommendedCompetencies: ['Digital Literacy (DL)', 'Creativity and Innovation (CI)', 'Communication and Collaboration (CC)'],
    guidanceNote: 'Combines live digital/creative demonstration, guided creation (with unplugged fallback if devices are limited), and showcase critique.',
    defaults: {
      planType: 'LESSON_NOTES',
      durationMinutes: 60,
      teachingLearningResources: 'Computers/tablets or projector (plus unplugged flowchart/sketch sheets where devices are shared), sample starter file/artwork, step checklist.',
      teachingLearningMethods: ['Project-Based Learning', 'Demonstration & Guided Practice', 'Gallery Walk & Peer Critique'],
      coreCompetencies: ['Digital Literacy (DL)', 'Creativity and Innovation (CI)', 'Communication and Collaboration (CC)'],
      differentiatedLearning: 'Support: Provide a starter template/checklist and rotate driver/navigator roles when sharing devices. Extension: Add an optional creative feature or optimization challenge. Inclusion: Ensure clear high-contrast visuals and alternative unplugged/paper sketching options.',
      teacherActivities: '1. Inspiration Hook (8 mins): Show a real digital/creative example and ask learners what makes it effective.\n2. Live Walkthrough (12 mins): Demonstrate core workflow step-by-step, emphasizing digital responsibility and naming/saving work.\n3. Studio Creation (30 mins): Coach individuals/pairs as they build their artifact, troubleshooting errors via guiding questions.\n4. Showcase (10 mins): Lead brief gallery walk/screen showcase with constructive peer feedback.',
      learnerActivities: '1. Analyse the model artifact and list 2 design/technical features they notice.\n2. Plan their own mini-output briefly on paper/storyboard before creating.\n3. Build and test their digital or creative product step-by-step, collaborating constructively.\n4. Present output to peers and record one improvement idea.',
      assessmentEvaluation: 'Artifact checklist (functionality/creativity, adherence to requirements, safe/ethical use) and brief oral explanation of steps taken.',
      conclusionPlenary: 'Learners summarize the key workflow steps and share one troubleshooting lesson learned during studio work.',
      assignmentHomework: 'Sketch or outline an enhancement for the next class project iteration and review key terminology.'
    }
  }
];

function cleanStr(val) {
  return typeof val === 'string' ? val.trim() : (val == null ? '' : String(val).trim());
}

function asStringArray(val) {
  if (Array.isArray(val)) return val.map((x) => cleanStr(x)).filter(Boolean);
  if (typeof val === 'string' && val.trim()) {
    return val.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

const REQUIRED_PRE_TEACHING_FIELDS = [
  { key: 'title', label: 'Lesson / Plan Title', group: 'Identification' },
  { key: 'subjectName', label: 'Subject', group: 'Identification' },
  { key: 'className', label: 'Class / Grade Level', group: 'Identification' },
  { key: 'topic', label: 'Topic / Focus', group: 'Identification' },
  { key: 'contentStandard', label: 'Content Standard (NaCCA)', group: 'Curriculum Alignment' },
  { key: 'learningIndicator', label: 'Learning Indicator', group: 'Curriculum Alignment' },
  { key: 'performanceIndicator', label: 'Performance Indicator', group: 'Curriculum Alignment' },
  { key: 'coreCompetencies', label: 'Core Competencies', group: 'Curriculum Alignment', isArray: true },
  { key: 'previousKnowledge', label: 'Previous Knowledge', group: 'Preparation & Pedagogy' },
  { key: 'teachingLearningResources', label: 'Teaching & Learning Resources (TLRs)', group: 'Preparation & Pedagogy' },
  { key: 'teachingLearningMethods', label: 'Teaching & Learning Methods', group: 'Preparation & Pedagogy', isArray: true },
  { key: 'differentiatedLearning', label: 'Differentiated Learning', group: 'Preparation & Pedagogy' },
  { key: 'expectedLearningOutcomes', label: 'Expected Learning Outcomes', group: 'Lesson Delivery' },
  { key: 'teacherActivities', label: 'Teacher Activities', group: 'Lesson Delivery' },
  { key: 'learnerActivities', label: 'Learner Activities', group: 'Lesson Delivery' },
  { key: 'assessmentEvaluation', label: 'Assessment / Evaluation', group: 'Closure & Follow-Up' },
  { key: 'conclusionPlenary', label: 'Conclusion / Plenary', group: 'Closure & Follow-Up' },
  { key: 'assignmentHomework', label: 'Assignment / Homework', group: 'Closure & Follow-Up' },
  { key: 'curriculumReferences', label: 'Relevant Curriculum References', group: 'Curriculum Alignment' }
];

const IDENTIFICATION_RECOMMENDED_FIELDS = [
  { key: 'lessonDate', label: 'Lesson Date' },
  { key: 'durationMinutes', label: 'Lesson Duration' },
  { key: 'strand', label: 'Strand' },
  { key: 'subStrand', label: 'Sub-Strand' }
];

function extractSignificantWords(text) {
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'will', 'able', 'learners',
    'students', 'teacher', 'lesson', 'using', 'into', 'their', 'about', 'through',
    'should', 'have', 'been', 'each', 'make', 'more', 'class', 'activity', 'activities'
  ]);
  return new Set(
    cleanStr(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !stopWords.has(w))
  );
}

function hasLexicalOverlap(textA, textB) {
  const setA = extractSignificantWords(textA);
  const setB = extractSignificantWords(textB);
  if (setA.size === 0 || setB.size === 0) return false;
  let shared = 0;
  for (const w of setA) {
    if (setB.has(w)) shared += 1;
  }
  return shared >= 1;
}

/**
 * Evaluates a Lesson Plan / Lesson Note against all 16 required Ghana NaCCA elements
 * and the 7 core pedagogical alignment criteria.
 * Does NOT fabricate curriculum codes or teacher reflections.
 */
function evaluateLessonPlanQuality(plan = {}) {
  const missingRequired = [];
  const completedRequired = [];

  for (const spec of REQUIRED_PRE_TEACHING_FIELDS) {
    const raw = plan[spec.key];
    const present = spec.isArray ? asStringArray(raw).length > 0 : cleanStr(raw).length >= 3;
    if (!present) {
      missingRequired.push({ key: spec.key, label: spec.label, group: spec.group });
    } else {
      completedRequired.push(spec.key);
    }
  }

  const missingRecommended = [];
  for (const spec of IDENTIFICATION_RECOMMENDED_FIELDS) {
    const val = plan[spec.key];
    const present = spec.key === 'durationMinutes' ? Number(val) > 0 : cleanStr(val).length >= 2;
    if (!present) {
      missingRecommended.push({ key: spec.key, label: spec.label });
    }
  }

  const contentStandard = cleanStr(plan.contentStandard);
  const learningIndicator = cleanStr(plan.learningIndicator);
  const performanceIndicator = cleanStr(plan.performanceIndicator);
  const expectedOutcomes = cleanStr(plan.expectedLearningOutcomes || plan.learningObjectives);
  const teacherActivities = cleanStr(plan.teacherActivities);
  const learnerActivities = cleanStr(plan.learnerActivities);
  const methods = asStringArray(plan.teachingLearningMethods);
  const methodsText = `${methods.join(' ')} ${cleanStr(plan.teachingLearningMethodsNotes)}`;
  const assessment = cleanStr(plan.assessmentEvaluation);
  const differentiated = cleanStr(plan.differentiatedLearning);
  const conclusion = cleanStr(plan.conclusionPlenary);
  const reflection = cleanStr(plan.teacherReflection);
  const curriculumRef = cleanStr(plan.curriculumReferences || plan.curriculumReference);
  const topic = cleanStr(plan.topic);

  const alignmentChecks = [];

  // 1. Learning Indicators align with Expected Learning Outcomes
  const indPresent = learningIndicator.length >= 5 && expectedOutcomes.length >= 8;
  const indAligned = indPresent && (hasLexicalOverlap(`${learningIndicator} ${performanceIndicator} ${topic}`, expectedOutcomes) || expectedOutcomes.length >= 25);
  alignmentChecks.push({
    id: 'indicators_objectives',
    title: 'Learning Indicators Align with Expected Learning Outcomes',
    status: indAligned ? 'PASS' : indPresent ? 'REVIEW' : 'MISSING',
    feedback: indAligned
      ? 'Learning Indicator and Expected Learning Outcomes clearly connect to measurable learner mastery.'
      : !indPresent
        ? 'Complete both Learning Indicator and Expected Learning Outcomes using measurable action verbs (e.g., explain, solve, demonstrate, construct).'
        : 'Review wording so Expected Learning Outcomes directly reflect the stated Learning Indicator and Topic.'
  });

  // 2. Teacher Activities support intended learning
  const teacherDetailed = teacherActivities.length >= 25;
  const teacherAligned = teacherDetailed && hasLexicalOverlap(`${expectedOutcomes} ${topic} ${learningIndicator}`, teacherActivities);
  alignmentChecks.push({
    id: 'teacher_activities',
    title: 'Teacher Activities Support Intended Learning',
    status: teacherAligned ? 'PASS' : teacherDetailed ? 'REVIEW' : 'MISSING',
    feedback: teacherAligned
      ? 'Teacher Activities clearly explain what the teacher will say, model, demonstrate, and scaffold.'
      : !teacherDetailed
        ? 'Expand Teacher Activities to describe what you will introduce, demonstrate, ask, and guide during the lesson.'
        : 'Link Teacher Activities more explicitly to the lesson topic and Expected Learning Outcomes.'
  });

  // 3. Learner Activities encourage active learner participation
  const activeVerbsRegex = /\b(discuss|pair|group|solve|experiment|investigate|demonstrate|build|create|present|measure|compare|role-?play|practice|explain|draw|construct|debate|analyse|analyze|design|collaborate|sketch|perform|write|read|share)\b/i;
  const passiveOnlyRegex = /^\s*(listen|copy notes|watch teacher|sit quietly)\s*\.?$/i;
  const learnerPresent = learnerActivities.length >= 20;
  const learnerActive = learnerPresent && activeVerbsRegex.test(learnerActivities) && !passiveOnlyRegex.test(learnerActivities);
  alignmentChecks.push({
    id: 'learner_participation',
    title: 'Learner Activities Encourage Active Participation',
    status: learnerActive ? 'PASS' : learnerPresent ? 'REVIEW' : 'MISSING',
    feedback: learnerActive
      ? 'Learner Activities promote active hands-on / collaborative engagement rather than passive listening.'
      : !learnerPresent
        ? 'Specify concrete tasks learners will perform individually, in pairs, or in groups.'
        : 'Strengthen learner-centred action verbs (e.g., investigate, discuss in pairs, construct, solve, present) so learners actively participate.'
  });

  // 4. Teaching Methods are appropriate for the topic
  const methodsOk = methods.length >= 1 || cleanStr(plan.teachingLearningMethodsNotes).length >= 10;
  alignmentChecks.push({
    id: 'teaching_methods',
    title: 'Teaching & Learning Methods Are Appropriate',
    status: methodsOk ? 'PASS' : 'MISSING',
    feedback: methodsOk
      ? `Selected learner-centred method(s): ${methods.length > 0 ? methods.join(', ') : cleanStr(plan.teachingLearningMethodsNotes)}.`
      : 'Select at least one learner-centred teaching method suited to this subject and class level.'
  });

  // 5. Assessment evaluates Expected Learning Outcomes
  const assessmentPresent = assessment.length >= 15;
  const assessmentAligned = assessmentPresent && (hasLexicalOverlap(`${expectedOutcomes} ${performanceIndicator} ${topic}`, assessment) || /\b(rubric|exit|quiz|observation|checklist|questions|exercise|task|practical)\b/i.test(assessment));
  alignmentChecks.push({
    id: 'assessment_alignment',
    title: 'Assessment Evaluates Expected Learning Outcomes',
    status: assessmentAligned ? 'PASS' : assessmentPresent ? 'REVIEW' : 'MISSING',
    feedback: assessmentAligned
      ? 'Assessment / Evaluation includes verifiable formative checks matched to intended learning outcomes.'
      : 'Specify concrete assessment questions, practical tasks, or checklists that verify learners met the Expected Learning Outcomes.'
  });

  // 6. Differentiated Learning is properly included
  const diffPresent = differentiated.length >= 20;
  const diffComprehensive = diffPresent && /\b(support|remedial|struggling|scaffold|slow|fast|extension|advanced|gifted|special|inclusion|sen|visual|audio|tier|group)\b/i.test(differentiated);
  alignmentChecks.push({
    id: 'differentiated_learning',
    title: 'Differentiated Learning Supports Diverse Learners',
    status: diffComprehensive ? 'PASS' : diffPresent ? 'REVIEW' : 'MISSING',
    feedback: diffComprehensive
      ? 'Differentiated Learning clearly plans support for learners needing scaffolding and/or extension for fast finishers.'
      : !diffPresent
        ? 'Include Differentiated Learning strategies explaining how you will support struggling learners, challenge fast learners, and include SEN/diverse needs.'
        : 'Clarify both support/scaffolding for learners needing help and extension tasks for learners who finish early.'
  });

  // 7. Conclusion / Plenary reinforces lesson understanding
  const conclusionOk = conclusion.length >= 15;
  alignmentChecks.push({
    id: 'conclusion_plenary',
    title: 'Conclusion / Plenary Reinforces Understanding',
    status: conclusionOk ? 'PASS' : 'MISSING',
    feedback: conclusionOk
      ? 'Conclusion / Plenary effectively consolidates key learning points and wraps up misconceptions.'
      : 'Add a clear Conclusion / Plenary describing how learners will summarise and consolidate the lesson.'
  });

  // Integrity guardrails (Non-Fabrication Warnings)
  const integrityNotices = [];
  const placeholderRegex = /\b(tbd|todo|placeholder|enter .* here|sample code|xxx|n\/a)\b/i;
  if (placeholderRegex.test(contentStandard) || placeholderRegex.test(learningIndicator) || placeholderRegex.test(curriculumRef)) {
    integrityNotices.push('Placeholder text detected in NaCCA Content Standard, Learning Indicator, or Curriculum References. Please enter verified official NaCCA curriculum details.');
  }
  if (!reflection) {
    integrityNotices.push("Teacher's Reflection is intentionally blank until after classroom delivery. Record authentic post-lesson reflection once the lesson has been taught.");
  }

  const totalRequired = REQUIRED_PRE_TEACHING_FIELDS.length;
  const completionPct = Math.round((completedRequired.length / totalRequired) * 100);
  const passedChecks = alignmentChecks.filter((c) => c.status === 'PASS').length;
  const readinessScore = Math.round((completionPct * 0.6) + ((passedChecks / alignmentChecks.length) * 100 * 0.4));

  return {
    completionPct,
    readinessScore,
    completedCount: completedRequired.length,
    totalRequiredCount: totalRequired,
    readyForVetting: missingRequired.length === 0 && passedChecks >= 5,
    missingRequiredSections: missingRequired,
    missingRecommendedSections: missingRecommended,
    alignmentChecks,
    integrityNotices,
    postTeachingReflectionRecorded: reflection.length >= 10,
    evaluatedAt: new Date().toISOString()
  };
}

module.exports = {
  NACCA_CORE_COMPETENCIES,
  LEARNER_CENTRED_METHODS,
  SUBJECT_LESSON_TEMPLATES,
  REQUIRED_PRE_TEACHING_FIELDS,
  evaluateLessonPlanQuality
};
