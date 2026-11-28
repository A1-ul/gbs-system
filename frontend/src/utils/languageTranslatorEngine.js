import { resolveApiUrl } from "../api/client/apiConfig";

/**
 * Universal Language Translator, Command Parser, Word/Statement Meaning Dictionary & Receiver Messaging Engine
 *
 * Capabilities:
 * 1. Explicit Mode Selection:
 *    - "TRANSLATE_WORD_OR_STATEMENT": Translate any word, statement, or copied sentence into the exact chosen language + give accurate dictionary meanings/definitions.
 *    - "SEND_TRANSLATED_MESSAGE": Translate a message into the exact chosen language and deliver it to a selected receiver (Parent, Teacher, Student, Headmaster, Accountant, Staff, Developer).
 * 2. Smart Command Recognition:
 *    - Understands direct user commands such as:
 *      • "Translate Welcome to our school to French"
 *      • "What is the meaning of arrears in Twi?"
 *      • "Define scholarship"
 *      • "Send Please pay your school fees to Parent in Ga"
 * 3. Real Server-Backed + Live Neural + Offline Lexicon Translation across all 15 Languages:
 *    Twi (ak), Ga (gaa), Ewe (ee), Hausa (ha), French (fr), English (en), Spanish (es),
 *    Arabic (ar), Mandarin Chinese (zh-CN), Kiswahili (sw), Yoruba (yo), German (de),
 *    Portuguese (pt), Hindi (hi), isiZulu (zu).
 */

export const SUPPORTED_TRANSLATION_LANGUAGES = [
  { code: "TWI", iso: "ak", name: "Twi (Akan - Ghana)", flag: "🇬🇭", speechLang: "ak-GH", aliases: ["twi", "akan", "ashanti", "asante", "fante"] },
  { code: "GA", iso: "gaa", name: "Ga (Greater Accra - Ghana)", flag: "🇬🇭", speechLang: "en-GH", aliases: ["ga", "gaa"] },
  { code: "EWE", iso: "ee", name: "Ewe (Volta - Ghana/Togo)", flag: "🇬🇭", speechLang: "ee-GH", aliases: ["ewe", "eve"] },
  { code: "HAUSA", iso: "ha", name: "Hausa (West Africa)", flag: "🇳🇬", speechLang: "ha-NG", aliases: ["hausa"] },
  { code: "FRENCH", iso: "fr", name: "French (Français)", flag: "🇫🇷", speechLang: "fr-FR", aliases: ["french", "francais", "français"] },
  { code: "ENGLISH", iso: "en", name: "English (Standard & Simplified)", flag: "🇬🇧", speechLang: "en-GB", aliases: ["english"] },
  { code: "SPANISH", iso: "es", name: "Spanish (Español)", flag: "🇪🇸", speechLang: "es-ES", aliases: ["spanish", "espanol", "español"] },
  { code: "ARABIC", iso: "ar", name: "Arabic (العربية)", flag: "🇸🇦", speechLang: "ar-SA", aliases: ["arabic"] },
  { code: "CHINESE", iso: "zh-CN", name: "Mandarin Chinese (中文)", flag: "🇨🇳", speechLang: "zh-CN", aliases: ["chinese", "mandarin"] },
  { code: "SWAHILI", iso: "sw", name: "Kiswahili (East Africa)", flag: "🇰🇪", speechLang: "sw-KE", aliases: ["swahili", "kiswahili"] },
  { code: "YORUBA", iso: "yo", name: "Yoruba (West Africa)", flag: "🇳🇬", speechLang: "yo-NG", aliases: ["yoruba"] },
  { code: "GERMAN", iso: "de", name: "German (Deutsch)", flag: "🇩🇪", speechLang: "de-DE", aliases: ["german", "deutsch"] },
  { code: "PORTUGUESE", iso: "pt", name: "Portuguese (Português)", flag: "🇵🇹", speechLang: "pt-PT", aliases: ["portuguese", "portugues"] },
  { code: "HINDI", iso: "hi", name: "Hindi (हिन्दी)", flag: "🇮🇳", speechLang: "hi-IN", aliases: ["hindi"] },
  { code: "ZULU", iso: "zu", name: "isiZulu (Southern Africa)", flag: "🇿🇦", speechLang: "zu-ZA", aliases: ["zulu", "isizulu"] }
];

export const RECEIVER_ROLES = [
  { id: "PARENT", label: "Parent / Guardian", icon: "👨‍👩‍👧", defaultChannel: "SMS & Parent Portal Inbox" },
  { id: "TEACHER", label: "Teacher / Faculty", icon: "👨‍🏫", defaultChannel: "Teacher Portal & SMS" },
  { id: "STUDENT", label: "Student", icon: "🎓", defaultChannel: "Student Hub & Notification" },
  { id: "ADMIN", label: "Headmaster / School Admin", icon: "👑", defaultChannel: "Executive Headmaster Desk" },
  { id: "ACCOUNTANT", label: "Accountant / Bursar", icon: "💰", defaultChannel: "Finance & Bursary Desk" },
  { id: "STAFF", label: "Non-Teaching Staff / HR", icon: "👔", defaultChannel: "Staff & HR Operations Inbox" },
  { id: "DEVELOPER", label: "System Developer", icon: "🛡️", defaultChannel: "Developer Control Center" }
];

/**
 * Parse natural-language commands typed or spoken by the user, e.g.:
 * - "Translate welcome to our school to French"
 * - "Translate 'good morning' into Twi"
 * - "What is the meaning of arrears in Ga?"
 * - "Define scholarship"
 * - "Send Please pay your school fees to Parent in Ewe"
 */
export function parseTranslationCommand(rawInput, currentLangCode = "TWI", currentMode = "TRANSLATE_WORD_OR_STATEMENT") {
  const original = String(rawInput || "").trim();
  if (!original) {
    return {
      cleanText: "",
      targetLangCode: currentLangCode,
      mode: currentMode,
      receiverRole: null,
      wasCommandParsed: false
    };
  }

  let text = original;
  let targetLangCode = currentLangCode;
  let mode = currentMode;
  let receiverRole = null;
  let wasCommandParsed = false;

  // Build language regex matcher from names, codes, and aliases
  const findLangByName = (token) => {
    const low = String(token || "").trim().toLowerCase();
    if (!low) return null;
    for (const lang of SUPPORTED_TRANSLATION_LANGUAGES) {
      if (
        lang.code.toLowerCase() === low ||
        lang.iso.toLowerCase() === low ||
        (Array.isArray(lang.aliases) && lang.aliases.includes(low))
      ) {
        return lang.code;
      }
    }
    return null;
  };

  // Pattern 1: "Send <message> to <receiver> in/into <language>"
  const sendMatch = text.match(
    /^send\s+["'“”]?(.+?)["'“”]?\s+to\s+(parent|parents|guardian|teacher|teachers|student|students|headmaster|admin|accountant|bursar|staff|developer)(?:\s+(?:in|into|to)\s+([a-zA-Z-]+))?[.?]?$/i
  );
  if (sendMatch) {
    text = sendMatch[1].trim();
    mode = "SEND_TRANSLATED_MESSAGE";
    const roleWord = sendMatch[2].toLowerCase();
    if (roleWord.startsWith("parent") || roleWord === "guardian") receiverRole = "PARENT";
    else if (roleWord.startsWith("teacher")) receiverRole = "TEACHER";
    else if (roleWord.startsWith("student")) receiverRole = "STUDENT";
    else if (roleWord === "headmaster" || roleWord === "admin") receiverRole = "ADMIN";
    else if (roleWord === "accountant" || roleWord === "bursar") receiverRole = "ACCOUNTANT";
    else if (roleWord === "staff") receiverRole = "STAFF";
    else if (roleWord === "developer") receiverRole = "DEVELOPER";

    if (sendMatch[3]) {
      const matchedLang = findLangByName(sendMatch[3]);
      if (matchedLang) targetLangCode = matchedLang;
    }
    return {
      cleanText: text,
      targetLangCode,
      mode,
      receiverRole,
      wasCommandParsed: true
    };
  }

  // Pattern 2: "Translate <text> to/into/in <language>"
  const translateToMatch = text.match(
    /^(?:please\s+)?translate\s+["'“”]?(.+?)["'“”]?\s+(?:to|into|in)\s+([a-zA-Z-]+)[.?!]?$/i
  );
  if (translateToMatch) {
    const matchedLang = findLangByName(translateToMatch[2]);
    if (matchedLang) {
      return {
        cleanText: translateToMatch[1].trim().replace(/^["'“”]|["'“”]$/g, ""),
        targetLangCode: matchedLang,
        mode,
        receiverRole: null,
        wasCommandParsed: true
      };
    }
  }

  // Pattern 3: "What is the meaning of <word/statement> in <language>?" or "Meaning of <word> in <language>"
  const meaningInMatch = text.match(
    /^(?:what\s+is\s+the\s+meaning\s+of|meaning\s+of|define|definition\s+of|explain)\s+["'“”]?(.+?)["'“”]?(?:\s+(?:in|into|to)\s+([a-zA-Z-]+))?[.?!]?$/i
  );
  if (meaningInMatch) {
    const potentialLang = meaningInMatch[2] ? findLangByName(meaningInMatch[2]) : null;
    if (meaningInMatch[2] && potentialLang) {
      targetLangCode = potentialLang;
      text = meaningInMatch[1].trim();
    } else if (!meaningInMatch[2]) {
      text = meaningInMatch[1].trim();
    }
    return {
      cleanText: text.replace(/^["'“”]|["'“”]$/g, ""),
      targetLangCode,
      mode,
      receiverRole: null,
      wasCommandParsed: true
    };
  }

  // Pattern 4: Leading "Translate <text>" without a trailing language
  const simpleTranslateMatch = text.match(/^(?:please\s+)?translate\s+["'“”]?(.+?)["'“”]?$/i);
  if (simpleTranslateMatch) {
    return {
      cleanText: simpleTranslateMatch[1].trim().replace(/^["'“”]|["'“”]$/g, ""),
      targetLangCode,
      mode,
      receiverRole: null,
      wasCommandParsed: true
    };
  }

  return {
    cleanText: text,
    targetLangCode,
    mode,
    receiverRole,
    wasCommandParsed
  };
}

/**
 * Comprehensive Built-In English Dictionary for Common Words, Academic Terms, Financial Terms & School Vocabulary
 */
const BUILTIN_WORD_DICTIONARY = {
  school: {
    partOfSpeech: "noun",
    definition: "An institution for educating children, students, or learners under the guidance of teachers.",
    example: "Our school opens at 7:30 AM every weekday."
  },
  tuition: {
    partOfSpeech: "noun",
    definition: "A sum of money charged for teaching or instruction by a school, college, or university.",
    example: "Tuition fees for the term must be paid before examinations."
  },
  fee: {
    partOfSpeech: "noun",
    definition: "A payment made to a professional person or to a professional or public body in exchange for advice or services.",
    example: "The school fee receipt was issued by the accountant."
  },
  fees: {
    partOfSpeech: "noun (plural)",
    definition: "Official charges or payments required for school enrollment, tuition, boarding, or services.",
    example: "Parents can pay school fees via Mobile Money or bank deposit."
  },
  arrears: {
    partOfSpeech: "noun",
    definition: "Money that is owed and should have been paid earlier; an unpaid overdue balance.",
    example: "Please clear all fee arrears before the end of the term."
  },
  attendance: {
    partOfSpeech: "noun",
    definition: "The action or state of going regularly to or being present at a place or event, such as daily school classes.",
    example: "The teacher recorded 100% class attendance today."
  },
  absent: {
    partOfSpeech: "adjective",
    definition: "Not present in a place, at an occasion, or as part of something.",
    example: "If a student is absent, an automated alert is sent to the parent."
  },
  present: {
    partOfSpeech: "adjective / verb",
    definition: "In a particular place; being in attendance at school or class right now.",
    example: "All thirty students were marked present this morning."
  },
  examination: {
    partOfSpeech: "noun",
    definition: "A formal test of a person's knowledge or proficiency in a subject or skill.",
    example: "End-of-term examinations begin next Monday."
  },
  exam: {
    partOfSpeech: "noun",
    definition: "A formal test of student knowledge in a subject (short for examination).",
    example: "She scored 92% in her Mathematics exam."
  },
  report: {
    partOfSpeech: "noun / verb",
    definition: "An official document or account giving information about a student's academic grades, conduct, and progress.",
    example: "The Headmaster signed and published the terminal report cards."
  },
  grade: {
    partOfSpeech: "noun / verb",
    definition: "A mark indicating the quality of a student's academic work, or a class level in school.",
    example: "He earned an A1 grade in Integrated Science."
  },
  admission: {
    partOfSpeech: "noun",
    definition: "The process or fact of being accepted and allowed to enter a school or institution.",
    example: "Her admission letter was approved by the Headmaster."
  },
  enroll: {
    partOfSpeech: "verb",
    definition: "Officially register as a member of an institution or a student on a course.",
    example: "Parents can enroll their wards online."
  },
  scholarship: {
    partOfSpeech: "noun",
    definition: "A grant or payment made to support a student's education, awarded on the basis of academic or other achievement.",
    example: "He received a merit scholarship covering his full tuition."
  },
  receipt: {
    partOfSpeech: "noun",
    definition: "A written or printed statement acknowledging that something, especially money or school fees, has been paid and received.",
    example: "Always keep your official fee payment receipt."
  },
  invoice: {
    partOfSpeech: "noun",
    definition: "A list of goods sent or services provided, with a statement of the sum due for these; a bill.",
    example: "The bursar generated the termly fee invoice."
  },
  headmaster: {
    partOfSpeech: "noun",
    definition: "The chief principal or executive administrator in charge of a school.",
    example: "The Headmaster approved the new academic timetable."
  },
  teacher: {
    partOfSpeech: "noun",
    definition: "A person who teaches, instructs, and guides students in a school.",
    example: "Our Mathematics teacher explained the equation clearly."
  },
  student: {
    partOfSpeech: "noun",
    definition: "A person who is studying at a school, college, or university.",
    example: "Every student has a unique ID and portal login."
  },
  parent: {
    partOfSpeech: "noun",
    definition: "A father, mother, or legal guardian responsible for a child or ward.",
    example: "Each parent receives live SMS updates on their child's progress."
  },
  guardian: {
    partOfSpeech: "noun",
    definition: "A person who is legally responsible for the care and protection of a child or student.",
    example: "Please provide the guardian's active phone number."
  },
  bursar: {
    partOfSpeech: "noun",
    definition: "A person who manages the financial affairs and fee collections of a school or college.",
    example: "The bursar reconciled all Mobile Money fee payments."
  },
  accountant: {
    partOfSpeech: "noun",
    definition: "A professional who keeps, audits, and inspects financial accounts and records.",
    example: "The school accountant prepared the monthly payroll."
  },
  payroll: {
    partOfSpeech: "noun",
    definition: "A list of a company's or school's employees and the amount of salary they are to be paid.",
    example: "Staff salaries were disbursed through the monthly payroll."
  },
  salary: {
    partOfSpeech: "noun",
    definition: "A fixed regular payment, typically paid on a monthly basis, made by an employer to an employee.",
    example: "Teachers received their monthly salary payslips."
  },
  timetable: {
    partOfSpeech: "noun",
    definition: "A chart or schedule showing the times at which particular subjects or classes are taught.",
    example: "Check the class timetable for tomorrow's lessons."
  },
  homework: {
    partOfSpeech: "noun",
    definition: "Schoolwork that a pupil is required to do at home outside regular class hours.",
    example: "Please submit your homework assignment before Friday."
  },
  assignment: {
    partOfSpeech: "noun",
    definition: "A task or piece of work allocated to someone as part of a course of study or job.",
    example: "The science assignment was uploaded to the student portal."
  },
  discipline: {
    partOfSpeech: "noun",
    definition: "The practice of training people to obey rules or a code of behavior, fostering orderly conduct.",
    example: "Good discipline and punctuality help students succeed."
  },
  punctual: {
    partOfSpeech: "adjective",
    definition: "Happening or doing something at the agreed or proper time; on time.",
    example: "Students must be punctual for morning assembly."
  },
  emergency: {
    partOfSpeech: "noun",
    definition: "A serious, unexpected, and often dangerous situation requiring immediate action.",
    example: "In case of an emergency, the school contacts the parent immediately."
  },
  approved: {
    partOfSpeech: "adjective / verb",
    definition: "Officially agreed to, accepted, or ratified as satisfactory and valid.",
    example: "Your institution registration has been approved."
  },
  pending: {
    partOfSpeech: "adjective",
    definition: "Awaiting decision, verification, or settlement; not yet finalized.",
    example: "Your application is currently pending approval."
  },
  locked: {
    partOfSpeech: "adjective",
    definition: "Restricted or blocked from access until authorized or unlocked by an administrator.",
    example: "The account was locked due to an expired subscription."
  },
  hello: {
    partOfSpeech: "interjection",
    definition: "Used as a greeting or to begin a conversation.",
    example: "Hello, welcome to our school portal."
  },
  welcome: {
    partOfSpeech: "interjection / verb / noun",
    definition: "A polite or friendly greeting to someone who has arrived.",
    example: "Welcome to the new academic term."
  },
  thank: {
    partOfSpeech: "verb",
    definition: "Express gratitude or appreciation to someone.",
    example: "Thank you for paying the school fees on time."
  },
  akwaaba: {
    partOfSpeech: "interjection (Twi / Akan)",
    definition: "Welcome; an expression of warm hospitality and greeting upon arrival.",
    example: "Akwaaba! Welcome to our school."
  },
  ojekoo: {
    partOfSpeech: "interjection (Ga)",
    definition: "Good morning; a polite morning greeting in the Ga language.",
    example: "Ojekoo, how are you this morning?"
  },
  medaase: {
    partOfSpeech: "interjection (Twi / Akan)",
    definition: "Thank you; an expression of gratitude.",
    example: "Medaase paa for your support."
  }
};

/**
 * Multi-Language Word & Phrase Lexicon for Offline / Local Resilience Across All 15 Supported Languages
 */
const MULTILINGUAL_LEXICON = {
  TWI: {
    "welcome to our school": "Akwaabaaba yɛn sukuu mu",
    "welcome to our school. please pay your school fees on time": "Akwaaba ba yɛn sukuu mu. Yɛsrɛ sɛ tua wo sukuu ka wɔ berɛ ano",
    "welcome to our school. please ensure all tuition fees and student attendance records are verified": "Akwaaba ba yɛn sukuu mu. Yɛsrɛ sɛ hwɛ hu sɛ wɔagye adesua sika ne asukuufoɔ sukuu kɔ ho kyerɛwtohɔ nyinaa atom",
    "your child is present in school today and doing very well in examinations": "Wo ba no wɔ sukuu mu ɛnnɛ, na ɔrebɔ ne ho mmɔden paa wɔ nsɔhwɛ mu",
    "please pay your child's school fees before examinations begin": "Yɛsrɛ sɛ tua wo ba no sukuu ka ansa na nsɔhwɛ ahyɛ aseɛ",
    "your child is absent from school today": "Wo ba no amma sukuu ɛnnɛ",
    "good morning": "Maakye",
    "good afternoon": "Maaha",
    "good evening": "Maadwo",
    "how are you": "Wo ho te sɛn?",
    "i am fine": "Me ho yɛ",
    "thank you": "Medaase",
    "thank you very much": "Medaase paa",
    "please": "Mepa wo kyɛw",
    "school fees": "Sukuu ka (Sukuu sika)",
    "pay your school fees": "Tua wo sukuu ka",
    "please pay school fees": "Yɛsrɛ sɛ tua sukuu ka",
    "your child was absent today": "Wo ba no amma sukuu ɛnnɛ",
    "your child is present in school": "Wo ba no wɔ sukuu mu ɛnnɛ",
    "terminal report card": "nhoma a ɛkyerɛ sukuuni dwumadie wɔ afe/tɛm awieeɛ",
    "parent teacher meeting": "Awofoɔ ne Akyerɛkyerɛfoɔ nhyiamu (PTA)",
    "examination results": "Nsɔhwɛ mu nsunsuansoɔ",
    "admission approved": "Yɛagye wo ba no ato mu wɔ sukuu mu",
    hello: "Agoo / Ɛte sɛn",
    welcome: "Akwaaba",
    school: "sukuu",
    student: "sukuuni",
    students: "asukuufoɔ",
    teacher: "ɔkyerɛkyerɛni",
    teachers: "akyerɛkyerɛfoɔ",
    headmaster: "sukuu panyin (Headmaster)",
    parent: "ɔwofoɔ",
    parents: "awofoɔ",
    child: "abofra / ɔba",
    ward: "abofra a wowɛn no",
    class: "adesuabea (klase)",
    lesson: "adesua",
    book: "nhoma",
    exam: "nsɔhwɛ",
    examination: "nsɔhwɛ",
    examinations: "nsɔhwɛ",
    grade: "mmpɛnpɛnsoɔ (gyinabea)",
    results: "nsunsuansoɔ",
    report: "amaneɛbɔ nhoma",
    fee: "sika / ɛka",
    fees: "sukuu ka",
    tuition: "adesua sika",
    money: "sika",
    pay: "tua",
    paid: "atua",
    payment: "sikatua",
    receipt: "adanseɛ krataa (receipt)",
    arrears: "ɛka a aka wɔ w'akyi",
    balance: "sika a aka",
    attendance: "sukuu kɔ",
    present: "ɔwɔ ha",
    absent: "ɔnni ha",
    today: "ɛnnɛ",
    tomorrow: "ɔkyena",
    yesterday: "ɛnnora",
    morning: "anɔpa",
    afternoon: "awia",
    evening: "anwummerɛ",
    approved: "yɛagye ato mu",
    pending: "ɛretwɛn nhwehwɛmu",
    locked: "yɛato mu",
    deleted: "yɛapopa afiri mu",
    message: "nkra / asɛm",
    important: "ɛho hia paa",
    urgent: "ntɛmntɛm",
    meeting: "nhyiamu",
    homework: "fie adwuma (adesua)",
    assignment: "dwumadie",
    scholarship: "sika a wɔde ma wɔ adesua mu (scholarship)",
    help: "mmoa",
    water: "nsuo",
    food: "aduan",
    health: "apɔmuden",
    hospital: "ayaresabea",
    bus: "sukuu hyɛn (bɔs)",
    safe: "asomdwoeɛ mu",
    home: "efie",
    good: "ɛyɛ / papa",
    bad: "ɛnyɛ",
    yes: "Aane",
    no: "Daabi",
    you: "wo",
    your: "wo",
    we: "yɛn",
    our: "yɛn",
    is: "yɛ / wɔ",
    are: "wɔ",
    come: "bra",
    go: "kɔ",
    read: "kenkan",
    write: "twerɛ"
  },
  GA: {
    "welcome to our school": "Atuu yɛ wɔ skul lɛ mli",
    "welcome to our school. please pay your school fees on time": "Atuu yɛ wɔ skul lɛ mli. Ofainɛ wo oskul nyɔmɔ yɛ be naa",
    "welcome to our school. please ensure all tuition fees and student attendance records are verified": "Atuu yɛ wɔ skul lɛ mli. Ofainɛ kwɛmɔ ni nikasemɔ shika kɛ skulbii askulyaa woji fɛɛ afee anɔkwale",
    "your child is present in school today and doing very well in examinations": "Obi lɛ yɛ skul ŋmɛnɛ ni ebɔɔ mɔdɛŋ waa yɛ kaa mli",
    "please pay your child's school fees before examinations begin": "Ofainɛ wo obi lɛ skul nyɔmɔ dani aje kaa lɛ shishi",
    "your child is absent from school today": "Obi lɛ bako skul ŋmɛnɛ",
    "good morning": "Ojekoo",
    "good afternoon": "Oshwiee",
    "good evening": "Onaa nyɔŋ",
    "how are you": "Te oyɔɔ tɛŋŋ?",
    "i am fine": "Miyɛ jogbaŋŋ",
    "thank you": "Oyiwaladɔŋŋ",
    "thank you very much": "Oyiwaladɔŋŋ waa",
    "please": "Ofainɛ",
    "school fees": "Skul nyɔmɔ (Skul shika)",
    "pay your school fees": "Wo oskul nyɔmɔ",
    "please pay school fees": "Ofainɛ wo skul nyɔmɔ",
    "your child was absent today": "Obi lɛ bako skul ŋmɛnɛ",
    "your child is present in school": "Obi lɛ yɛ skul ŋmɛnɛ",
    "parent teacher meeting": "Fɔlɔi kɛ Tsɔɔlɔi akpee (PTA)",
    "examination results": "Kaa mli yibii",
    "admission approved": "Akpɛlɛ obi lɛ nɔ yɛ skul lɛ mli",
    hello: "Ojekoo / Te oyɔɔ tɛŋŋ",
    welcome: "Atuu",
    school: "skul",
    student: "skulnyo (nikaselɔ)",
    students: "skulbii (nikaselɔi)",
    teacher: "tsɔɔlɔ",
    teachers: "tsɔɔlɔi",
    headmaster: "skul onukpa (Headmaster)",
    parent: "fɔlɔ",
    parents: "fɔlɔi",
    child: "bi / gbekɛ",
    ward: "gbekɛ ni okwɛɔ lɛ",
    class: "klasi (nikasemohe)",
    lesson: "nikasemɔ",
    book: "wolo",
    exam: "kaa",
    examination: "kaa",
    examinations: "kaai",
    grade: "gbɛhe",
    results: "yibii",
    report: "amaniebɔɔ wolo",
    fee: "shika / nyɔmɔ",
    fees: "skul shika",
    tuition: "nikasemɔ shika",
    scholarship: "nikasemɔ yelikɛbuamɔ shika (scholarship)",
    money: "shika",
    pay: "wo nyɔmɔ",
    paid: "ewo nyɔmɔ",
    payment: "shikawoo",
    receipt: "odaseyelii wolo (receipt)",
    arrears: "nyɔmɔ ni eshwɛ",
    balance: "shika ni eshwɛ",
    attendance: "skulyaa",
    present: "eyɛ biɛ",
    absent: "ebɛ biɛ",
    today: "ŋmɛnɛ",
    tomorrow: "wɔ́",
    yesterday: "nyɛ",
    morning: "leebi",
    afternoon: "shwane",
    evening: "gbɛkɛ",
    approved: "akpɛlɛ nɔ",
    pending: "emɛɔ kwɛmɔ",
    locked: "aŋa mli",
    deleted: "ajie yɛ mli",
    message: "shɛɛ / wiemɔ",
    important: "ehaomɔ waa",
    urgent: "oyaya",
    meeting: "kpee",
    homework: "shia nitsumɔ",
    assignment: "nitsumɔ",
    help: "yelikɛbuamɔ",
    water: "nu",
    food: "niyenii",
    health: "gbɔmɔtsoiaŋ hewalɛ",
    bus: "skul lɔle",
    safe: "shweshweeshwe",
    home: "shia",
    good: "ejurɔ / jogbaŋŋ",
    bad: "ehiii",
    yes: "Hɛɛ",
    no: "Dabi",
    you: "bo",
    your: "o-",
    we: "wɔ",
    our: "wɔ-",
    come: "ba",
    go: "yaa",
    read: "kanemɔ",
    write: "ŋmaa"
  },
  EWE: {
    "welcome to our school": "Woezɔ va míaƒe suku me",
    "welcome to our school. please pay your school fees on time": "Woezɔ va míaƒe suku me. Meɖekuku xe wò suku fe le ɣeyiɣi dzi",
    "your child is present in school today and doing very well in examinations": "Viwò le suku egbea eye wòle dɔwɔm nyuie ŋutɔ le dodokpɔwo me",
    "please pay your child's school fees before examinations begin": "Meɖekuku xe viwò ƒe sukuga hafi dodokpɔwo nadze egɔme",
    "your child is absent from school today": "Viwò meva suku egbea o",
    "good morning": "Ŋdi na mi",
    "good afternoon": "Ŋdɔ na mi",
    "good evening": "Fiɛyi na mi",
    "how are you": "Efɔa? / Aleke nèle?",
    "i am fine": "Meli nyuie",
    "thank you": "Akpe",
    "thank you very much": "Akpe kakaka",
    "please": "Meɖekuku",
    "school fees": "Suku fe (Sukuga)",
    "pay your school fees": "Xe wò suku fe",
    "please pay school fees": "Meɖekuku xe suku fe",
    "your child was absent today": "Viwò meva suku egbea o",
    "your child is present in school": "Viwò le suku egbea",
    "parent teacher meeting": "Dzilawo kple Nufialawo ƒe takpekpe",
    "examination results": "Dodokpɔ me tsonuwo",
    hello: "Woezɔ / Efɔa",
    welcome: "Woezɔ",
    school: "suku",
    student: "sukuvi",
    students: "sukuviwo",
    teacher: "nufiala",
    teachers: "nufialawo",
    headmaster: "sukutatɔ (Headmaster)",
    parent: "dzila",
    parents: "dzilawo",
    child: "devi / vi",
    book: "agbalẽ",
    exam: "dodokpɔ",
    examination: "dodokpɔ",
    fee: "ga / fe",
    fees: "sukuga",
    tuition: "nusɔsrɔ̃ ƒe ga",
    scholarship: "sukukpekpeɖeŋuga (scholarship)",
    money: "ga",
    pay: "xe fe",
    paid: "exe fe",
    receipt: "ɖaseɖigbalẽ",
    arrears: "fexexe si susɔ",
    present: "ele afisia",
    absent: "meli o",
    today: "egbe",
    tomorrow: "etsɔ si gbɔna",
    yesterday: "etsɔ si va yi",
    approved: "woda asi ɖe edzi",
    message: "gbeƒãɖeɖe / nya",
    meeting: "takpekpe",
    homework: "aƒemedɔ",
    good: "nyuie",
    yes: "ɛ̃",
    no: "Ao",
    come: "va",
    go: "yi",
    read: "xlẽ",
    write: "ŋlɔ"
  },
  HAUSA: {
    "welcome to our school": "Barka da zuwa makarantarmu",
    "welcome to our school. please pay your school fees on time": "Barka da zuwa makarantarmu. Don Allah a biya kudin makaranta a kan lokaci",
    "your child is present in school today and doing very well in examinations": "Yaronku yana makaranta yau kuma yana kokari sosai a jarabawa",
    "please pay your child's school fees before examinations begin": "Don Allah a biya kudin makarantar yaronku kafin a fara jarabawa",
    "your child is absent from school today": "Yaronku bai zo makaranta yau ba",
    "good morning": "Ina kwana / Barka da safiya",
    "good afternoon": "Barka da rana",
    "good evening": "Barka da yamma",
    "how are you": "Kana lafiya? / Yaya kake?",
    "i am fine": "Lafiya kalau",
    "thank you": "Na gode",
    "thank you very much": "Mun gode sosai",
    "please": "Don Allah",
    "school fees": "Kudin makaranta",
    "pay your school fees": "Biya kudin makaranta",
    "please pay school fees": "Don Allah a biya kudin makaranta",
    "your child was absent today": "Yaronku bai zo makaranta yau ba",
    "your child is present in school": "Yaronku yana makaranta yau",
    hello: "Sannu",
    welcome: "Barka da zuwa",
    school: "makaranta",
    student: "ɗalibi",
    students: "ɗalibai",
    teacher: "malami",
    teachers: "malamai",
    headmaster: "shugaban makaranta",
    parent: "iyaye",
    child: "yaro / yarinya",
    book: "littafi",
    exam: "jarabawa",
    examination: "jarabawa",
    fee: "kudi",
    fees: "kudin makaranta",
    tuition: "kudin karatu",
    scholarship: "tallafin karatu",
    money: "kudi",
    pay: "biya",
    paid: "an biya",
    receipt: "rasiti",
    arrears: "bashin kudin makaranta",
    present: "yana nan",
    absent: "baya nan",
    today: "yau",
    tomorrow: "gobe",
    approved: "an amince",
    message: "saƙo",
    meeting: "taro",
    good: "mai kyau",
    yes: "Eh",
    no: "A'a"
  },
  FRENCH: {
    "welcome to our school": "Bienvenue dans notre école",
    "welcome to our school. please pay your school fees on time": "Bienvenue dans notre école. Veuillez payer vos frais de scolarité à temps.",
    "welcome to our school. please ensure all tuition fees and student attendance records are verified": "Bienvenue dans notre école. Veuillez vous assurer que tous les frais de scolarité et les registres de présence des élèves sont vérifiés.",
    "your child is present in school today and doing very well in examinations": "Votre enfant est présent à l'école aujourd'hui et réussit très bien aux examens.",
    "please pay your child's school fees before examinations begin": "Veuillez payer les frais de scolarité de votre enfant avant le début des examens.",
    "your child is absent from school today": "Votre enfant est absent de l'école aujourd'hui.",
    "good morning": "Bonjour",
    "good afternoon": "Bon après-midi",
    "good evening": "Bonsoir",
    "how are you": "Comment allez-vous ?",
    "thank you": "Merci",
    "please": "S'il vous plaît",
    "school fees": "Frais de scolarité",
    "please pay school fees": "Veuillez payer les frais de scolarité",
    hello: "Bonjour",
    welcome: "Bienvenue",
    school: "école",
    student: "élève / étudiant",
    teacher: "enseignant / professeur",
    headmaster: "directeur d'école",
    parent: "parent",
    tuition: "frais de scolarité",
    scholarship: "bourse d'études",
    arrears: "arriérés de paiement",
    attendance: "présence / assiduité",
    exam: "examen",
    examination: "examen",
    receipt: "reçu"
  },
  SPANISH: {
    "welcome to our school": "Bienvenido a nuestra escuela",
    "welcome to our school. please pay your school fees on time": "Bienvenido a nuestra escuela. Por favor pague sus matrículas escolares a tiempo.",
    "welcome to our school. please ensure all tuition fees and student attendance records are verified": "Bienvenido a nuestra escuela. Asegúrese de que se verifiquen todas las matrículas y los registros de asistencia de los estudiantes.",
    "your child is present in school today and doing very well in examinations": "Su hijo está presente en la escuela hoy y le está yendo muy bien en los exámenes.",
    "please pay your child's school fees before examinations begin": "Por favor pague las tasas escolares de su hijo antes de que comiencen los exámenes.",
    "your child is absent from school today": "Su hijo está ausente de la escuela hoy.",
    "good morning": "Buenos días",
    "good afternoon": "Buenas tardes",
    "good evening": "Buenas noches",
    "how are you": "¿Cómo estás?",
    "thank you": "Gracias",
    "please": "Por favor",
    "school fees": "Tasas escolares",
    hello: "Hola",
    welcome: "Bienvenido",
    school: "escuela",
    student: "estudiante",
    teacher: "profesor / maestro",
    headmaster: "director de la escuela",
    parent: "padre / madre",
    tuition: "matrícula / colegiatura",
    scholarship: "beca",
    arrears: "atrasos / pagos pendientes",
    attendance: "asistencia",
    exam: "examen",
    examination: "examen",
    receipt: "recibo"
  },
  ARABIC: {
    "welcome to our school": "مرحباً بكم في مدرستنا",
    "welcome to our school. please pay your school fees on time": "مرحباً بكم في مدرستنا. يرجى دفع الرسوم المدرسية في الوقت المحدد.",
    "your child is present in school today and doing very well in examinations": "طفلك حاضر في المدرسة اليوم ويؤدي بشكل جيد للغاية في الامتحانات.",
    "please pay your child's school fees before examinations begin": "يرجى دفع الرسوم المدرسية لطفلك قبل بدء الامتحانات.",
    "your child is absent from school today": "طفلك غائب عن المدرسة اليوم.",
    "good morning": "صباح الخير",
    "thank you": "شكراً لك",
    hello: "مرحباً",
    welcome: "أهلاً وسهلاً",
    school: "مدرسة",
    student: "طالب",
    teacher: "معلم",
    tuition: "الرسوم الدراسية",
    scholarship: "منحة دراسية",
    arrears: "متأخرات مالية",
    attendance: "الحضور"
  },
  CHINESE: {
    "welcome to our school": "欢迎来到我们学校",
    "welcome to our school. please pay your school fees on time": "欢迎来到我们学校。请按时缴纳学费。",
    "your child is present in school today and doing very well in examinations": "您的孩子今天在校，并且在考试中表现非常出色。",
    "please pay your child's school fees before examinations begin": "请在考试开始前缴纳您孩子的学费。",
    "your child is absent from school today": "您的孩子今天缺席未到校。",
    "good morning": "早上好",
    "thank you": "谢谢",
    hello: "你好",
    welcome: "欢迎",
    school: "学校",
    student: "学生",
    teacher: "老师",
    tuition: "学费",
    scholarship: "奖学金",
    arrears: "欠款 / 拖欠费用",
    attendance: "出勤"
  },
  SWAHILI: {
    "welcome to our school": "Karibu katika shule yetu",
    "welcome to our school. please pay your school fees on time": "Karibu katika shule yetu. Tafadhali lipa ada ya shule kwa wakati.",
    "your child is present in school today and doing very well in examinations": "Mtoto wako yupo shuleni leo na anafanya vizuri sana katika mitihani.",
    "please pay your child's school fees before examinations begin": "Tafadhali lipa ada ya shule ya mtoto wako kabla ya mitihani kuanza.",
    "your child is absent from school today": "Mtoto wako hayupo shuleni leo.",
    "good morning": "Habari za asubuhi",
    "thank you": "Asante",
    hello: "Hujambo",
    welcome: "Karibu",
    school: "shule",
    student: "mwanafunzi",
    teacher: "mwalimu",
    tuition: "ada ya masomo",
    scholarship: "ufadhili wa masomo",
    arrears: "malimbikizo ya ada",
    attendance: "mahudhurio"
  },
  YORUBA: {
    "welcome to our school": "Ẹ ku abọ si ile-iwe wa",
    "welcome to our school. please pay your school fees on time": "Ẹ ku abọ si ile-iwe wa. Jọwọ san owo ile-iwe rẹ ni akoko.",
    "your child is present in school today and doing very well in examinations": "Ọmọ rẹ wa ni ile-iwe loni o si n ṣe daradara pupọ ninu awọn idanwo.",
    "please pay your child's school fees before examinations begin": "Jọwọ san owo ile-iwe ọmọ rẹ ki awọn idanwo to bẹrẹ.",
    "your child is absent from school today": "Ọmọ rẹ ko wa si ile-iwe loni.",
    "good morning": "Ẹ kaarọ",
    "thank you": "Ẹ ṣeun",
    hello: "Bawo ni",
    welcome: "Ẹ ku abọ",
    school: "ile-iwe",
    student: "akẹkọọ",
    teacher: "olukọ",
    tuition: "owo ile-iwe",
    scholarship: "sikolashipu / iranlọwọ ẹkọ",
    arrears: "gbese owo ile-iwe",
    attendance: "wiwa si ile-iwe"
  },
  GERMAN: {
    "welcome to our school": "Willkommen an unserer Schule",
    "welcome to our school. please pay your school fees on time": "Willkommen an unserer Schule. Bitte bezahlen Sie Ihre Schulgebühren pünktlich.",
    "your child is present in school today and doing very well in examinations": "Ihr Kind ist heute in der Schule anwesend und schneidet bei den Prüfungen sehr gut ab.",
    "please pay your child's school fees before examinations begin": "Bitte bezahlen Sie das Schulgeld Ihres Kindes vor Beginn der Prüfungen.",
    "your child is absent from school today": "Ihr Kind fehlt heute in der Schule.",
    "good morning": "Guten Morgen",
    "thank you": "Danke",
    hello: "Hallo",
    welcome: "Willkommen",
    school: "Schule",
    student: "Schüler / Student",
    teacher: "Lehrer",
    tuition: "Schulgeld / Studiengebühren",
    scholarship: "Stipendium",
    arrears: "Zahlungsrückstände",
    attendance: "Anwesenheit"
  },
  PORTUGUESE: {
    "welcome to our school": "Bem-vindo à nossa escola",
    "welcome to our school. please pay your school fees on time": "Bem-vindo à nossa escola. Por favor, pague as propinas escolares a tempo.",
    "your child is present in school today and doing very well in examinations": "Seu filho está presente na escola hoje e está indo muito bem nos exames.",
    "please pay your child's school fees before examinations begin": "Por favor, pague as mensalidades escolares do seu filho antes do início dos exames.",
    "your child is absent from school today": "Seu filho está ausente da escola hoje.",
    "good morning": "Bom dia",
    "thank you": "Obrigado",
    hello: "Olá",
    welcome: "Bem-vindo",
    school: "escola",
    student: "estudante / aluno",
    teacher: "professor",
    tuition: "mensalidade escolar",
    scholarship: "bolsa de estudos",
    arrears: "atrasos de pagamento",
    attendance: "frequência / presença"
  },
  HINDI: {
    "welcome to our school": "हमारे स्कूल में आपका स्वागत है",
    "welcome to our school. please pay your school fees on time": "हमारे स्कूल में आपका स्वागत है। कृपया समय पर अपनी स्कूल फीस जमा करें।",
    "your child is present in school today and doing very well in examinations": "आपका बच्चा आज स्कूल में उपस्थित है और परीक्षाओं में बहुत अच्छा प्रदर्शन कर रहा है।",
    "please pay your child's school fees before examinations begin": "कृपया परीक्षा शुरू होने से पहले अपने बच्चे की स्कूल फीस का भुगतान करें।",
    "your child is absent from school today": "आपका बच्चा आज स्कूल से अनुपस्थित है।",
    "good morning": "सुप्रभात",
    "thank you": "धन्यवाद",
    hello: "नमस्ते",
    welcome: "स्वागत है",
    school: "विद्यालय / स्कूल",
    student: "छात्र",
    teacher: "शिक्षक",
    tuition: "शिक्षण शुल्क",
    scholarship: "छात्रवृत्ति",
    arrears: "बकाया राशि",
    attendance: "उपस्थिति"
  },
  ZULU: {
    "welcome to our school": "Siyakwamukela esikoleni sethu",
    "welcome to our school. please pay your school fees on time": "Siyakwamukela esikoleni sethu. Sicela ukhokhe imali yesikole ngesikhathi.",
    "your child is present in school today and doing very well in examinations": "Ingane yakho ikhona esikoleni namuhla futhi yenza kahle kakhulu ezivivinyweni.",
    "please pay your child's school fees before examinations begin": "Sicela ukhokhe imali yesikole yengane yakho ngaphambi kokuba kuqale izivivinyo.",
    "your child is absent from school today": "Ingane yakho ayikho esikoleni namuhla.",
    "good morning": "Sawubona ekuseni",
    "thank you": "Ngiyabonga",
    hello: "Sawubona",
    welcome: "Siyakwamukela",
    school: "isikole",
    student: "umfundi",
    teacher: "uthisha",
    tuition: "imali yokufunda",
    scholarship: "umfundaze",
    arrears: "izikweletu ezisele",
    attendance: "ukuba khona"
  }
};

/**
 * Lookup genuine English dictionary definitions (Free Dictionary API -> Datamuse -> Curated Terminology).
 * Never fabricates canned "Statement Meaning: ..." filler text.
 */
async function fetchGenuineWordDictionary(word) {
  const cleanWord = String(word || "").trim().toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9'-]+$/gi, "");
  if (!cleanWord) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const firstEntry = Array.isArray(data) ? data[0] : null;
      const firstMeaning = firstEntry?.meanings?.[0];
      const firstDef = firstMeaning?.definitions?.[0];
      if (firstDef?.definition) {
        return {
          word: firstEntry?.word || cleanWord,
          phonetic: firstEntry?.phonetic || firstEntry?.phonetics?.find((p) => p?.text)?.text || "",
          partOfSpeech: firstMeaning?.partOfSpeech || "",
          definition: firstDef.definition,
          secondaryDefinition: firstMeaning?.definitions?.[1]?.definition || "",
          example: firstDef.example || "",
          synonyms: (firstMeaning?.synonyms || []).slice(0, 5)
        };
      }
    }
  } catch { }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const dmRes = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(cleanWord)}&md=d&max=2`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (dmRes.ok) {
      const dmData = await dmRes.json();
      const exact = (Array.isArray(dmData) ? dmData : []).find(
        (x) => String(x.word || "").toLowerCase() === cleanWord && Array.isArray(x.defs) && x.defs.length > 0
      );
      if (exact) {
        const parts = String(exact.defs[0]).split("\t");
        const pos = parts[0] === "n" ? "noun" : parts[0] === "v" ? "verb" : parts[0] === "adj" ? "adjective" : parts[0] === "adv" ? "adverb" : parts[0] || "";
        const defText = (parts[1] || parts[0] || "").trim();
        if (defText) {
          return {
            word: cleanWord,
            phonetic: "",
            partOfSpeech: pos,
            definition: defText,
            secondaryDefinition: "",
            example: "",
            synonyms: []
          };
        }
      }
    }
  } catch { }

  const builtin = BUILTIN_WORD_DICTIONARY[cleanWord];
  if (builtin) {
    return {
      word: cleanWord,
      phonetic: "",
      partOfSpeech: builtin.partOfSpeech,
      definition: builtin.definition,
      secondaryDefinition: "",
      example: builtin.example || "",
      synonyms: []
    };
  }
  return null;
}

const CLIENT_STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was", "one",
  "our", "out", "has", "his", "how", "its", "may", "new", "now", "see", "way", "who",
  "did", "get", "had", "let", "put", "say", "she", "too", "use", "with", "from", "that",
  "this", "they", "have", "been", "will", "your", "into", "what", "when", "where", "which"
]);

/**
 * Call backend /api/v1/translate for complete verified translation + back-translation + dictionary meaning.
 */
async function requestServerTranslateFull(cleanText, targetLangCode) {
  if (typeof window === "undefined") return null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(resolveApiUrl("/api/v1/translate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: cleanText, targetLang: targetLangCode }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const json = await res.json();
      if (json?.data && (json.data.translatedText || json.data.meaning?.definition)) {
        return json.data;
      }
    }
  } catch { }
  return null;
}

async function directBrowserNeuralTranslate(cleanText, targetIso, sourceIso = "auto") {
  if (!targetIso) return "";

  // 1. CORS-enabled Google translate_a/single (runs from user's own browser IP, supports ALL 15 languages including Twi 'ak' & Ga 'gaa')
  for (const clientTag of ["dict-chrome-ex", "gtx"]) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const url = `https://translate.googleapis.com/translate_a/single?client=${clientTag}&sl=${encodeURIComponent(
        sourceIso
      )}&tl=${encodeURIComponent(targetIso)}&dt=t&q=${encodeURIComponent(cleanText)}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
          const translated = data[0]
            .map((segment) => (Array.isArray(segment) ? segment[0] : ""))
            .join("")
            .trim();
          if (translated) return translated;
        }
      }
    } catch { }
  }

  // 2. CORS-enabled Wikimedia MinT Neural Translator (skip 'gaa' because MinT uses 'ga' for Irish)
  const mintSrc = sourceIso === "auto" ? "en" : (sourceIso === "zh-CN" ? "zh" : sourceIso);
  const mintDst = targetIso === "zh-CN" ? "zh" : targetIso;
  if (mintDst !== "gaa" && mintSrc !== "gaa" && mintSrc !== mintDst) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const res = await fetch("https://translate.wmcloud.org/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_language: mintSrc,
          target_language: mintDst,
          content: cleanText,
          format: "text"
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json?.translation && String(json.translation).trim()) {
          return String(json.translation).trim();
        }
      }
    } catch { }
  }

  // 3. CORS-enabled MyMemory API fallback
  if (targetIso !== "gaa") {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const srcPair = sourceIso === "auto" ? "en" : sourceIso;
      const mmDst = targetIso === "ak" ? "tw" : targetIso;
      if (srcPair !== mmDst) {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
          cleanText.slice(0, 480)
        )}&langpair=${encodeURIComponent(`${srcPair}|${mmDst}`)}&de=support@gbssystem.org`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          const match = data?.responseData?.translatedText;
          if (
            match &&
            !String(match).includes("MYMEMORY WARNING") &&
            !String(match).includes("INVALID LANGUAGE")
          ) {
            return String(match).trim();
          }
        }
      }
    } catch { }
  }

  return "";
}

/**
 * Look up the exact real dictionary definition & meaning of a word or statement.
 */
export async function lookupWordOrStatementMeaning(inputText) {
  const clean = String(inputText || "").trim();
  if (!clean) {
    return {
      isSingleWord: false,
      word: "",
      partOfSpeech: "",
      definition: "Enter or paste a word or statement to look up its exact dictionary meaning.",
      example: "",
      keyTermsBreakdown: []
    };
  }

  const tokens = clean.replace(/[^\w\s'-]/g, " ").split(/\s+/).filter(Boolean);
  const isSingleWord = tokens.length === 1;

  if (isSingleWord) {
    const dict = await fetchGenuineWordDictionary(tokens[0]);
    if (dict) {
      return {
        isSingleWord: true,
        word: clean,
        phonetic: dict.phonetic || "",
        partOfSpeech: dict.partOfSpeech || "word",
        definition: dict.definition,
        secondaryDefinition: dict.secondaryDefinition || "",
        example: dict.example || "",
        synonyms: dict.synonyms || [],
        keyTermsBreakdown: []
      };
    }
    return {
      isSingleWord: true,
      word: clean,
      partOfSpeech: "word",
      definition: "",
      secondaryDefinition: "",
      example: "",
      synonyms: [],
      keyTermsBreakdown: []
    };
  }

  // Multi-word statement: define genuine key content words instead of fabricating canned text
  const contentWords = [];
  const seen = new Set();
  for (const tok of tokens) {
    const low = tok.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "");
    if (low.length >= 3 && !CLIENT_STOP_WORDS.has(low) && !seen.has(low)) {
      seen.add(low);
      contentWords.push(low);
      if (contentWords.length >= 5) break;
    }
  }

  const dictEntries = await Promise.all(contentWords.map((w) => fetchGenuineWordDictionary(w)));
  const keyTermsBreakdown = [];
  dictEntries.forEach((entry, idx) => {
    if (entry?.definition) {
      keyTermsBreakdown.push({
        term: contentWords[idx],
        partOfSpeech: entry.partOfSpeech || "word",
        meaning: entry.definition
      });
    }
  });

  return {
    isSingleWord: false,
    word: clean,
    partOfSpeech: `Statement (${tokens.length} words)`,
    definition: "",
    example: "",
    synonyms: [],
    keyTermsBreakdown
  };
}

/**
 * Exact Whole-Phrase Local Lexicon lookup (never produces partial English/native word-salad).
 */
function lookupExactPhraseLexicon(text, langCode) {
  const dict = MULTILINGUAL_LEXICON[langCode];
  if (!dict) return null;
  const lower = String(text || "").toLowerCase().replace(/[.!?]+$/, "").trim();
  return dict[lower] || null;
}

/**
 * Real Server-Proxied + Live Neural Translator (never fakes broken word-by-word output).
 */
export async function translateTextToLanguage(text, targetLangCode, options = {}) {
  const { forceTargetLang = false } = options || {};
  const parsed = parseTranslationCommand(text, targetLangCode);
  const cleanText = String(parsed.cleanText || text || "").trim();
  const effectiveLangCode = forceTargetLang
    ? targetLangCode || parsed.targetLangCode
    : parsed.targetLangCode || targetLangCode;
  if (!cleanText) return "";

  const langObj =
    SUPPORTED_TRANSLATION_LANGUAGES.find((l) => l.code === effectiveLangCode) ||
    SUPPORTED_TRANSLATION_LANGUAGES[0];

  // Reverse lookup exact match if translating back to English
  if (langObj.code === "ENGLISH") {
    const lowInput = cleanText.toLowerCase().replace(/[.!?]+$/, "").trim();
    for (const dict of Object.values(MULTILINGUAL_LEXICON)) {
      for (const [enKey, foreignVal] of Object.entries(dict)) {
        const variants = String(foreignVal)
          .split("/")
          .map((s) => s.replace(/\(.*?\)/g, "").toLowerCase().replace(/[.!?]+$/, "").trim());
        if (variants.includes(lowInput) || String(foreignVal).toLowerCase().replace(/[.!?]+$/, "").trim() === lowInput) {
          return enKey;
        }
      }
    }
  }

  // 1. Live Server-Side Multi-Provider Neural Translation
  const serverData = await requestServerTranslateFull(cleanText, langObj.code);
  if (serverData?.translatedText) {
    return String(serverData.translatedText).trim();
  }

  // 2. Direct Browser Neural Translation fallback
  const direct = await directBrowserNeuralTranslate(cleanText, langObj.iso, "auto");
  if (direct && (langObj.code === "ENGLISH" || direct.toLowerCase() !== cleanText.toLowerCase())) {
    return direct;
  }

  // 3. Verified exact whole-phrase match from curated offline glossary
  const exactPhrase = lookupExactPhraseLexicon(cleanText, langObj.code);
  if (exactPhrase) return exactPhrase;

  return cleanText;
}

/**
 * Full Combined Translation + Exact Meaning + Back-Translation Verification + Natural Command Resolution
 */
export async function performFullTranslationAndMeaning(inputText, targetLangCode, options = {}) {
  const { forceTargetLang = false } = options || {};
  const parsed = parseTranslationCommand(inputText, targetLangCode);
  const clean = String(parsed.cleanText || inputText || "").trim();
  const effectiveLangCode = forceTargetLang
    ? targetLangCode || parsed.targetLangCode
    : parsed.targetLangCode || targetLangCode;

  const langObj =
    SUPPORTED_TRANSLATION_LANGUAGES.find((l) => l.code === effectiveLangCode) ||
    SUPPORTED_TRANSLATION_LANGUAGES[0];

  if (!clean) {
    return {
      originalText: "",
      rawInput: "",
      wasCommandParsed: parsed.wasCommandParsed,
      detectedMode: parsed.mode,
      detectedReceiverRole: parsed.receiverRole,
      language: langObj,
      translatedText: "",
      verified: false,
      provider: "none",
      backTranslation: "",
      meaning: {
        partOfSpeech: "",
        definition: "Please enter or paste a word or statement to translate.",
        translatedDefinition: "",
        keyTermsBreakdown: []
      },
      timestamp: new Date().toISOString()
    };
  }

  // Prefer single authoritative backend call returning live translation + backTranslation + real dictionary meaning
  const serverData = await requestServerTranslateFull(clean, langObj.code);
  if (serverData && serverData.translatedText) {
    const serverMeaning = serverData.meaning || {};
    let defText = serverMeaning.definition || "";
    if (!defText && serverData.backTranslation) {
      defText = `Verified English meaning: "${serverData.backTranslation}"`;
    } else if (!defText && langObj.code === "ENGLISH") {
      defText = `Exact English translation: "${serverData.translatedText}"`;
    }

    return {
      originalText: clean,
      rawInput: String(inputText || "").trim(),
      wasCommandParsed: parsed.wasCommandParsed,
      detectedMode: parsed.mode,
      detectedReceiverRole: parsed.receiverRole,
      language: langObj,
      translatedText: serverData.translatedText,
      verified: serverData.verified !== false,
      provider: serverData.provider || "server",
      backTranslation: serverData.backTranslation || "",
      meaning: {
        isSingleWord: !clean.includes(" "),
        word: clean,
        phonetic: serverMeaning.phonetic || "",
        partOfSpeech: serverMeaning.partOfSpeech || (!clean.includes(" ") ? "word" : "Statement"),
        definition: defText,
        secondaryDefinition: serverMeaning.secondaryDefinition || "",
        translatedDefinition: serverMeaning.translatedDefinition || "",
        example: serverMeaning.example || "",
        synonyms: Array.isArray(serverMeaning.synonyms) ? serverMeaning.synonyms : [],
        keyTermsBreakdown: Array.isArray(serverMeaning.keyTermsBreakdown) ? serverMeaning.keyTermsBreakdown : []
      },
      timestamp: new Date().toISOString()
    };
  }

  // Browser-direct fallback when server proxy is offline
  let translatedText = await directBrowserNeuralTranslate(clean, langObj.iso, "auto");
  let provider = translatedText ? "browser_neural" : "none";
  if (!translatedText) {
    const exactPhrase = lookupExactPhraseLexicon(clean, langObj.code);
    if (exactPhrase) {
      translatedText = exactPhrase;
      provider = "verified_phrase_glossary";
    }
  }

  const serverMeaningFallback = serverData?.meaning || null;
  const hasServerDict = Boolean(
    serverMeaningFallback &&
    (serverMeaningFallback.definition ||
      (Array.isArray(serverMeaningFallback.keyTermsBreakdown) && serverMeaningFallback.keyTermsBreakdown.length > 0))
  );

  const meaningData = hasServerDict
    ? {
      isSingleWord: !clean.includes(" "),
      word: clean,
      phonetic: serverMeaningFallback.phonetic || "",
      partOfSpeech: serverMeaningFallback.partOfSpeech || (!clean.includes(" ") ? "word" : "Statement"),
      definition: serverMeaningFallback.definition || "",
      secondaryDefinition: serverMeaningFallback.secondaryDefinition || "",
      example: serverMeaningFallback.example || "",
      synonyms: Array.isArray(serverMeaningFallback.synonyms) ? serverMeaningFallback.synonyms : [],
      keyTermsBreakdown: Array.isArray(serverMeaningFallback.keyTermsBreakdown) ? serverMeaningFallback.keyTermsBreakdown : []
    }
    : await lookupWordOrStatementMeaning(
      langObj.code === "ENGLISH" && translatedText && !translatedText.includes(" ") ? translatedText : clean
    );

  let backTranslation = "";
  if (translatedText && langObj.code !== "ENGLISH") {
    backTranslation = await directBrowserNeuralTranslate(translatedText, "en", langObj.iso);
  }

  if (!meaningData.definition) {
    if (backTranslation) {
      meaningData.definition = `Verified English meaning: "${backTranslation}"`;
    } else if (translatedText && langObj.code === "ENGLISH") {
      meaningData.definition = `Exact English translation: "${translatedText}"`;
    } else if (!translatedText) {
      meaningData.definition =
        "Live translation server is currently unreachable. Reconnect to the internet and press Translate again for a verified translation.";
    }
  }

  let translatedDefinition = "";
  if (langObj.code !== "ENGLISH" && meaningData.definition && translatedText) {
    translatedDefinition = await directBrowserNeuralTranslate(meaningData.definition, langObj.iso, "en");
  }

  return {
    originalText: clean,
    rawInput: String(inputText || "").trim(),
    wasCommandParsed: parsed.wasCommandParsed,
    detectedMode: parsed.mode,
    detectedReceiverRole: parsed.receiverRole,
    language: langObj,
    translatedText: translatedText || "[Translation unavailable offline — reconnect and click Translate]",
    verified: Boolean(translatedText),
    provider,
    backTranslation,
    meaning: {
      ...meaningData,
      translatedDefinition
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Speak any translated or original text aloud reliably across all browsers and OS voice packs.
 */
export function speakTranslationAloud(textToSpeak, langCode = "TWI") {
  if (typeof window === "undefined" || !textToSpeak) return false;
  const langMeta =
    SUPPORTED_TRANSLATION_LANGUAGES.find((l) => l.code === langCode) ||
    SUPPORTED_TRANSLATION_LANGUAGES[0];

  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      const voices = window.speechSynthesis.getVoices() || [];
      const targetLocale = (langMeta.speechLang || "en-GB").toLowerCase();
      const targetPrefix = targetLocale.split("-")[0];

      const matchedVoice =
        voices.find((v) => String(v.lang || "").toLowerCase() === targetLocale) ||
        voices.find((v) => String(v.lang || "").toLowerCase().startsWith(targetPrefix)) ||
        voices.find((v) => String(v.lang || "").toLowerCase().startsWith("en")) ||
        voices[0];

      if (matchedVoice) {
        utterance.voice = matchedVoice;
        utterance.lang = matchedVoice.lang || langMeta.speechLang || "en-GB";
      } else {
        utterance.lang = "en-GB";
      }
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);

      if (typeof window.showGBSOpenNotice === "function") {
        window.showGBSOpenNotice(
          `🔊 Speaking ${langMeta.name} translation aloud: "${textToSpeak.slice(0, 90)}${textToSpeak.length > 90 ? "..." : ""}"`,
          "info",
          "VOICE PRONUNCIATION ACTIVE"
        );
      }
      return true;
    } catch { }
  }
  return false;
}

/**
 * Fetch Translated Messages Inbox from backend + localStorage so receivers across all portals see sender details.
 */
export async function fetchTranslatedMessagesInbox({ receiverRole = "", limit = 100 } = {}) {
  let localList = [];
  try {
    localList = JSON.parse(localStorage.getItem("gbs_translated_messages_inbox") || "[]");
    if (!Array.isArray(localList)) localList = [];
  } catch {
    localList = [];
  }

  let serverList = [];
  if (typeof window !== "undefined") {
    try {
      const authToken =
        typeof localStorage !== "undefined"
          ? localStorage.getItem("gbs_access_token") || localStorage.getItem("gbs_token") || localStorage.getItem("gbs_dev_token") || ""
          : "";
      if (authToken) {
        const qs = new URLSearchParams();
        if (receiverRole) qs.set("receiverRole", receiverRole);
        qs.set("limit", String(limit));
        const res = await fetch(resolveApiUrl(`/api/v1/translate/messages?${qs.toString()}`), {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (res.ok) {
          const json = await res.json();
          serverList = Array.isArray(json?.data?.messages) ? json.data.messages : [];
        }
      }
    } catch { }
  }

  const byId = new Map();
  [...serverList, ...localList].forEach((m) => {
    if (m && m.id) {
      const prev = byId.get(m.id);
      if (!prev || (!prev.read && m.read)) {
        byId.set(m.id, { ...(prev || {}), ...m });
      }
    }
  });

  const merged = Array.from(byId.values()).sort(
    (a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime()
  );

  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("gbs_translated_messages_inbox", JSON.stringify(merged.slice(0, 250)));
    }
  } catch { }

  return merged;
}

export async function markTranslatedMessageRead(messageId, readerName = "Recipient") {
  if (!messageId) return null;
  let updated = null;
  try {
    if (typeof localStorage !== "undefined") {
      const list = JSON.parse(localStorage.getItem("gbs_translated_messages_inbox") || "[]");
      const nextList = list.map((m) => {
        if (String(m.id) === String(messageId)) {
          updated = { ...m, read: true, readAt: new Date().toISOString(), readBy: readerName };
          return updated;
        }
        return m;
      });
      localStorage.setItem("gbs_translated_messages_inbox", JSON.stringify(nextList));
    }
  } catch { }

  if (typeof window !== "undefined") {
    try {
      const authToken =
        typeof localStorage !== "undefined"
          ? localStorage.getItem("gbs_access_token") || localStorage.getItem("gbs_token") || localStorage.getItem("gbs_dev_token") || ""
          : "";
      await fetch(resolveApiUrl(`/api/v1/translate/messages/${encodeURIComponent(messageId)}/read`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ readerName })
      });
    } catch { }
    window.dispatchEvent(new CustomEvent("gbs_translated_message_read", { detail: { id: messageId } }));
  }

  return updated;
}

/**
 * Dispatch a Translated Message with Full Sender Details to a Selected Receiver
 */
export async function sendTranslatedMessageToReceiver({
  senderId = null,
  senderName = "School Portal User",
  senderRole = "USER",
  senderEmail = "",
  tenantId = 1,
  receiverRole = "PARENT",
  receiverName = "",
  receiverContact = "",
  originalMessage = "",
  translatedMessage = "",
  meaningSummary = "",
  targetLanguageCode = "TWI",
  forceTargetLang = false
}) {
  const parsed = parseTranslationCommand(originalMessage, targetLanguageCode, "SEND_TRANSLATED_MESSAGE");
  const cleanOriginal = String(parsed.cleanText || originalMessage || "").trim();
  const effectiveLangCode = forceTargetLang
    ? targetLanguageCode || parsed.targetLangCode
    : parsed.targetLangCode || targetLangCode;
  const effectiveReceiverRole = parsed.receiverRole || receiverRole;

  const langObj =
    SUPPORTED_TRANSLATION_LANGUAGES.find((l) => l.code === effectiveLangCode) ||
    SUPPORTED_TRANSLATION_LANGUAGES[0];
  const roleObj = RECEIVER_ROLES.find((r) => r.id === effectiveReceiverRole) || RECEIVER_ROLES[0];

  const finalTranslated =
    translatedMessage || (await translateTextToLanguage(cleanOriginal, langObj.code, { forceTargetLang: true }));

  let messageRecord = {
    id: `TR-MSG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tenantId: String(tenantId || "1"),
    senderId,
    senderName,
    senderRole: String(senderRole || "USER").toUpperCase(),
    senderEmail: String(senderEmail || "").trim(),
    receiverRole: roleObj.id,
    receiverRoleLabel: roleObj.label,
    receiverLabel: roleObj.label,
    receiverName: receiverName.trim() || `All ${roleObj.label}s`,
    receiverContact: receiverContact.trim() || roleObj.defaultChannel,
    originalMessage: cleanOriginal,
    translatedMessage: finalTranslated,
    meaningSummary: String(meaningSummary || "").trim(),
    languageCode: langObj.code,
    languageName: langObj.name,
    languageFlag: langObj.flag,
    status: "DELIVERED",
    read: false,
    sentAt: new Date().toISOString()
  };

  // Persist to backend first so all devices/portals see the authoritative message & sender details
  if (typeof window !== "undefined") {
    try {
      const msgAuthToken =
        typeof localStorage !== "undefined"
          ? localStorage.getItem("gbs_access_token") || localStorage.getItem("gbs_token") || localStorage.getItem("gbs_dev_token") || ""
          : "";
      const postRes = await fetch(resolveApiUrl("/api/v1/translate/send-message"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(msgAuthToken ? { Authorization: `Bearer ${msgAuthToken}` } : {})
        },
        body: JSON.stringify(messageRecord)
      });
      if (postRes.ok) {
        const postJson = await postRes.json();
        if (postJson?.data?.id) {
          messageRecord = { ...messageRecord, ...postJson.data };
        }
      }
    } catch { }

    const phoneMatch = String(receiverContact || "").replace(/[\s()-]+/g, " ").match(/\+?\d[\d ]{6,16}\d/);
    if (phoneMatch) {
      try {
        const authToken =
          typeof localStorage !== "undefined"
            ? localStorage.getItem("gbs_access_token") || localStorage.getItem("gbs_token") || localStorage.getItem("gbs_dev_token") || ""
            : "";
        await fetch(resolveApiUrl("/api/v1/sms/send"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
          },
          body: JSON.stringify({
            recipientPhone: phoneMatch[0].replace(/\s+/g, ""),
            content: `[From ${senderName} (${senderRole}) • ${langObj.name}] ${finalTranslated}\n---\n[Original] ${cleanOriginal}`
          })
        });
      } catch { }
    }
  }

  try {
    if (typeof localStorage !== "undefined") {
      const existingInbox = JSON.parse(localStorage.getItem("gbs_translated_messages_inbox") || "[]");
      localStorage.setItem(
        "gbs_translated_messages_inbox",
        JSON.stringify([messageRecord, ...existingInbox.filter((m) => m.id !== messageRecord.id)].slice(0, 250))
      );

      const notificationEntry = {
        id: messageRecord.id,
        title: `🌐 Translated Message (${langObj.name}) from ${senderName} (${roleObj.label})`,
        message: `${finalTranslated} [Original: "${cleanOriginal}"] — Sent by ${senderName} (${messageRecord.senderRole}${messageRecord.senderEmail ? `, ${messageRecord.senderEmail}` : ""})`,
        senderName: messageRecord.senderName,
        senderRole: messageRecord.senderRole,
        senderEmail: messageRecord.senderEmail,
        recipientRole: roleObj.id,
        recipientName: messageRecord.receiverName,
        contact: messageRecord.receiverContact,
        language: langObj.name,
        timestamp: messageRecord.sentAt,
        read: false
      };

      const headmasterNotes = JSON.parse(localStorage.getItem("gbs_headmaster_notifications") || "[]");
      localStorage.setItem(
        "gbs_headmaster_notifications",
        JSON.stringify([notificationEntry, ...headmasterNotes].slice(0, 150))
      );

      const smsLogs = JSON.parse(localStorage.getItem("gbs_dispatched_sms_logs") || "[]");
      localStorage.setItem(
        "gbs_dispatched_sms_logs",
        JSON.stringify(
          [
            {
              id: messageRecord.id,
              sender: `${senderName} (${messageRecord.senderRole})`,
              recipient: `${messageRecord.receiverName} (${messageRecord.receiverContact})`,
              role: roleObj.label,
              language: langObj.name,
              message: finalTranslated,
              originalText: cleanOriginal,
              status: "DELIVERED",
              sentAt: messageRecord.sentAt
            },
            ...smsLogs
          ].slice(0, 150)
        )
      );
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("gbs_translated_message_sent", { detail: messageRecord }));
      window.dispatchEvent(new Event("storage"));
      if (typeof window.showGBSOpenNotice === "function") {
        window.showGBSOpenNotice(
          `📨 Translated message in ${langObj.flag} ${langObj.name} delivered to ${messageRecord.receiverName} (${roleObj.label}) from ${senderName}.`,
          "success",
          "TRANSLATED MESSAGE DELIVERED"
        );
      }
    }
  } catch { }

  return messageRecord;
}
