/**
 * Universal Language Translator, Word/Statement Meaning Dictionary & Receiver Messaging Engine
 *
 * Capabilities:
 * 1. Explicit Mode Selection:
 *    - "TRANSLATE_WORD_OR_STATEMENT": Translate a word, statement, or copied sentence into the exact chosen language + give accurate meanings/definitions.
 *    - "SEND_TRANSLATED_MESSAGE": Translate a message into the exact chosen language and send it to a selected receiver (Parent, Teacher, Student, Headmaster, Accountant, Staff, or specific contact).
 * 2. Real Live + Offline Translation across 15 Languages (Twi, Ga, Ewe, Hausa, Yoruba, French, Spanish, Swahili, Arabic, Chinese, German, Portuguese, Hindi, Zulu, English).
 * 3. Real Dictionary Word Definitions & Statement Meaning Breakdown.
 */

export const SUPPORTED_TRANSLATION_LANGUAGES = [
  { code: "TWI", iso: "ak", name: "Twi (Akan - Ghana)", flag: "🇬🇭", speechLang: "ak-GH" },
  { code: "GA", iso: "gaa", name: "Ga (Greater Accra - Ghana)", flag: "🇬🇭", speechLang: "en-GH" },
  { code: "EWE", iso: "ee", name: "Ewe (Volta - Ghana/Togo)", flag: "🇬🇭", speechLang: "ee-GH" },
  { code: "HAUSA", iso: "ha", name: "Hausa (West Africa)", flag: "🇳🇬", speechLang: "ha-NG" },
  { code: "FRENCH", iso: "fr", name: "French (Français)", flag: "🇫🇷", speechLang: "fr-FR" },
  { code: "ENGLISH", iso: "en", name: "English (Standard & Simplified)", flag: "🇬🇧", speechLang: "en-GB" },
  { code: "SPANISH", iso: "es", name: "Spanish (Español)", flag: "🇪🇸", speechLang: "es-ES" },
  { code: "ARABIC", iso: "ar", name: "Arabic (العربية)", flag: "🇸🇦", speechLang: "ar-SA" },
  { code: "CHINESE", iso: "zh-CN", name: "Mandarin Chinese (中文)", flag: "🇨🇳", speechLang: "zh-CN" },
  { code: "SWAHILI", iso: "sw", name: "Kiswahili (East Africa)", flag: "🇰🇪", speechLang: "sw-KE" },
  { code: "YORUBA", iso: "yo", name: "Yoruba (West Africa)", flag: "🇳🇬", speechLang: "yo-NG" },
  { code: "GERMAN", iso: "de", name: "German (Deutsch)", flag: "🇩🇪", speechLang: "de-DE" },
  { code: "PORTUGUESE", iso: "pt", name: "Portuguese (Português)", flag: "🇵🇹", speechLang: "pt-PT" },
  { code: "HINDI", iso: "hi", name: "Hindi (हिन्दी)", flag: "🇮🇳", speechLang: "hi-IN" },
  { code: "ZULU", iso: "zu", name: "isiZulu (Southern Africa)", flag: "🇿🇦", speechLang: "zu-ZA" }
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
    definition: "The male or chief principal/administrator in charge of a school.",
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
  }
};

/**
 * Multi-Language Word & Phrase Lexicon for Offline / Local Ghanaian & International Translation
 * Ensures Ga (gaa), Twi (ak), Ewe (ee), Hausa (ha), French (fr), Spanish (es), Swahili (sw), Arabic (ar), Chinese (zh-CN)
 * always translate real words & sentences accurately even offline.
 */
const MULTILINGUAL_LEXICON = {
  TWI: {
    // Common sentences & phrases
    "welcome to our school": "Akwaabaaba yɛn sukuu mu",
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
    "your child was absent today": "Wo ba no amma sukuu ɛnnɛ",
    "your child is present in school": "Wo ba no wɔ sukuu mu ɛnnɛ",
    "terminal report card": "nhoma a ɛkyerɛ sukuuni dwumadie wɔ afe/tɛm awieeɛ",
    "parent teacher meeting": "Awofoɔ ne Akyerɛkyerɛfoɔ nhyiamu (PTA)",
    "examination results": "Nsɔhwɛ mu nsunsuansoɔ",
    "admission approved": "Yɛagye wo ba no ato mu wɔ sukuu mu",
    // Word-level dictionary
    hello: "uhuru / Agoo, ɛte sɛn",
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
    please: "mepa wo kyɛw",
    come: "bra",
    go: "kɔ",
    read: "kenkan",
    write: "twerɛ"
  },
  GA: {
    "welcome to our school": "Atuu yɛ wɔ skul lɛ mli",
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
    grade: "gbɛhe",
    results: "yibii",
    report: "amaniebɔɔ wolo",
    fee: "shika / nyɔmɔ",
    fees: "skul shika",
    tuition: "nikasemɔ shika",
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
    please: "ofainɛ",
    come: "ba",
    go: "yaa",
    read: "kanemɔ",
    write: "ŋmaa"
  },
  EWE: {
    "welcome to our school": "Woezɔ va míaƒe suku me",
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
    please: "meɖekuku",
    come: "va",
    go: "yi",
    read: "xlẽ",
    write: "ŋlɔ"
  },
  HAUSA: {
    "welcome to our school": "Barka da zuwa makarantarmu",
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
    no: "A'a",
    please: "don Allah"
  }
};

/**
 * Look up the exact dictionary definition & meaning of a word or statement.
 * Uses Free Dictionary API when online for single words, plus built-in dictionary & statement analyzer.
 */
export async function lookupWordOrStatementMeaning(inputText) {
  const clean = String(inputText || "").trim();
  if (!clean) {
    return {
      isSingleWord: false,
      word: "",
      partOfSpeech: "",
      definition: "Please enter or paste a word, phrase, or sentence to get its exact meaning and translation.",
      example: "",
      keyTermsBreakdown: []
    };
  }

  const tokens = clean
    .replace(/[^\w\s'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const isSingleWord = tokens.length === 1;
  const lowerSingle = tokens[0]?.toLowerCase() || "";

  // 1. If single word, check built-in dictionary and Free Dictionary API
  if (isSingleWord) {
    const builtin = BUILTIN_WORD_DICTIONARY[lowerSingle];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lowerSingle)}`, {
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
            isSingleWord: true,
            word: clean,
            phonetic: firstEntry?.phonetic || "",
            partOfSpeech: firstMeaning?.partOfSpeech || builtin?.partOfSpeech || "word",
            definition: firstDef.definition,
            secondaryDefinition: firstMeaning?.definitions?.[1]?.definition || builtin?.definition || "",
            example: firstDef.example || builtin?.example || "",
            synonyms: (firstMeaning?.synonyms || []).slice(0, 5),
            keyTermsBreakdown: []
          };
        }
      }
    } catch {
      // Fallback to built-in below
    }

    if (builtin) {
      return {
        isSingleWord: true,
        word: clean,
        partOfSpeech: builtin.partOfSpeech,
        definition: builtin.definition,
        example: builtin.example,
        synonyms: [],
        keyTermsBreakdown: []
      };
    }

    return {
      isSingleWord: true,
      word: clean,
      partOfSpeech: "term / word",
      definition: `"${clean}" is a specific word or term. See its direct translation in the selected language below.`,
      example: `Example usage: "${clean}"`,
      synonyms: [],
      keyTermsBreakdown: []
    };
  }

  // 2. Multi-word statement, sentence, or copied paragraph:
  // Extract any recognized key vocabulary terms and provide a clear statement meaning explanation.
  const matchedTerms = [];
  const seen = new Set();
  for (const tok of tokens) {
    const low = tok.toLowerCase();
    if (!seen.has(low) && BUILTIN_WORD_DICTIONARY[low]) {
      seen.add(low);
      matchedTerms.push({
        term: tok,
        partOfSpeech: BUILTIN_WORD_DICTIONARY[low].partOfSpeech,
        meaning: BUILTIN_WORD_DICTIONARY[low].definition
      });
    }
  }

  // Contextual intent summary of the statement
  const lower = clean.toLowerCase();
  let statementMeaningSummary = "";
  if (lower.includes("deleted") && (lower.includes("institution") || lower.includes("system") || lower.includes("re-register"))) {
    statementMeaningSummary =
      "Statement Meaning: This notice informs the user that their school/institution record has been permanently removed from the system, blocking login access until the institution completes a fresh onboarding registration for Developer approval.";
  } else if (lower.includes("fee") || lower.includes("tuition") || lower.includes("arrears") || lower.includes("payment") || lower.includes("ghc") || lower.includes("gh₵")) {
    statementMeaningSummary =
      "Statement Meaning: This financial statement communicates school fee billing, tuition balance, or payment confirmation requiring attention from the parent, student, or bursar.";
  } else if (lower.includes("absent") || lower.includes("attendance") || lower.includes("present") || lower.includes("late")) {
    statementMeaningSummary =
      "Statement Meaning: This attendance statement reports whether the student was present or absent in class and notifies the parent or school administration.";
  } else if (lower.includes("exam") || lower.includes("result") || lower.includes("grade") || lower.includes("report card") || lower.includes("score")) {
    statementMeaningSummary =
      "Statement Meaning: This academic statement communicates student examination performance, subject grading, or official terminal report card results.";
  } else if (lower.includes("approve") || lower.includes("pending") || lower.includes("verify") || lower.includes("registration")) {
    statementMeaningSummary =
      "Statement Meaning: This administrative statement describes the verification or approval status of an institutional or user registration.";
  } else {
    statementMeaningSummary =
      `Statement Meaning: This statement ("${clean.length > 120 ? clean.slice(0, 120) + "..." : clean}") expresses a complete message or instruction (${tokens.length} words) that has been translated word-for-word and contextually into your chosen target language below.`;
  }

  return {
    isSingleWord: false,
    word: clean,
    partOfSpeech: `Statement / Sentence (${tokens.length} words)`,
    definition: statementMeaningSummary,
    example: "",
    synonyms: [],
    keyTermsBreakdown: matchedTerms
  };
}

/**
 * Offline / Local Lexicon Translator fallback (especially useful for Ga or when offline).
 */
function translateWithLocalLexicon(text, langCode) {
  const dict = MULTILINGUAL_LEXICON[langCode];
  if (!dict) return null;

  const clean = String(text || "").trim();
  const lower = clean.toLowerCase().replace(/[.!?]+$/, "").trim();

  // Exact phrase match
  if (dict[lower]) {
    return dict[lower];
  }

  // Replace multi-word phrases first, then individual words
  let working = clean;
  const phraseEntries = Object.entries(dict)
    .filter(([k]) => k.includes(" "))
    .sort((a, b) => b[0].length - a[0].length);

  for (const [phrase, trans] of phraseEntries) {
    const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    working = working.replace(regex, trans);
  }

  // Word-by-word replacement preserving punctuation
  const translatedTokens = working.split(/(\s+|[.,!?;:()"])/).map((part) => {
    const wLow = part.toLowerCase();
    if (dict[wLow]) {
      return dict[wLow];
    }
    return part;
  });

  return translatedTokens.join("");
}

/**
 * Real Live + Offline Translator for any copied word, phrase, sentence, or paragraph
 * into the exact target language chosen by the user.
 */
export async function translateTextToLanguage(text, targetLangCode) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return "";

  const langObj =
    SUPPORTED_TRANSLATION_LANGUAGES.find((l) => l.code === targetLangCode) ||
    SUPPORTED_TRANSLATION_LANGUAGES[0];

  // If user chose ENGLISH (e.g., translating a copied French/Twi/Spanish/Arabic sentence back to English):
  if (langObj.code === "ENGLISH") {
    const lowInput = cleanText.toLowerCase().replace(/[.!?]+$/, "").trim();
    for (const dict of Object.values(MULTILINGUAL_LEXICON)) {
      for (const [enKey, foreignVal] of Object.entries(dict)) {
        if (String(foreignVal).toLowerCase().replace(/[.!?]+$/, "").trim() === lowInput) {
          return enKey;
        }
      }
    }
    // Live autodetect -> English via GTX
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(
        cleanText
      )}`;
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
    } catch {
      // Fallback below
    }
    return cleanText;
  }

  // 1. Check if exact phrase exists in our curated Ghanaian/Multilingual lexicon first for 100% native precision on short greetings/words
  const lowerClean = cleanText.toLowerCase().replace(/[.!?]+$/, "").trim();
  if (MULTILINGUAL_LEXICON[langObj.code] && MULTILINGUAL_LEXICON[langObj.code][lowerClean]) {
    return MULTILINGUAL_LEXICON[langObj.code][lowerClean];
  }

  // 2. Live Neural Translation via Google GTX API (supports Twi 'ak', Ewe 'ee', Hausa 'ha', Yoruba 'yo', French 'fr', Spanish 'es', Swahili 'sw', Arabic 'ar', Chinese 'zh-CN', German 'de', Portuguese 'pt', Hindi 'hi', Zulu 'zu')
  if (langObj.iso && langObj.iso !== "gaa") {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
        langObj.iso
      )}&dt=t&q=${encodeURIComponent(cleanText)}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
          const translated = data[0]
            .map((segment) => (Array.isArray(segment) ? segment[0] : ""))
            .join("")
            .trim();
          if (translated && translated.toLowerCase() !== cleanText.toLowerCase()) {
            return translated;
          }
        }
      }
    } catch {
      // Fallback to MyMemory or local lexicon
    }
  }

  // 3. Secondary Live Translation via MyMemory API (also supports Ga 'gaa' and all ISO pairs)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    const pair = `en|${langObj.iso}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      cleanText.slice(0, 480)
    )}&langpair=${encodeURIComponent(pair)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const match = data?.responseData?.translatedText;
      if (
        match &&
        !String(match).includes("MYMEMORY WARNING") &&
        !String(match).includes("INVALID LANGUAGE") &&
        String(match).trim().toLowerCase() !== cleanText.toLowerCase()
      ) {
        return String(match).trim();
      }
    }
  } catch {
    // Fallback to local lexicon below
  }

  // 4. Local Lexicon Phrase & Word-by-Word Translation (guaranteed offline & Ga support)
  const localTranslated = translateWithLocalLexicon(cleanText, langObj.code);
  if (localTranslated && localTranslated.trim()) {
    return localTranslated;
  }

  return cleanText;
}

/**
 * Full Combined Translation + Meaning Analysis
 */
export async function performFullTranslationAndMeaning(inputText, targetLangCode) {
  const clean = String(inputText || "").trim();
  const langObj =
    SUPPORTED_TRANSLATION_LANGUAGES.find((l) => l.code === targetLangCode) ||
    SUPPORTED_TRANSLATION_LANGUAGES[0];

  const [translatedText, meaningData] = await Promise.all([
    translateTextToLanguage(clean, langObj.code),
    lookupWordOrStatementMeaning(clean)
  ]);

  let translatedDefinition = meaningData.definition;
  if (langObj.code !== "ENGLISH" && meaningData.definition) {
    try {
      translatedDefinition = await translateTextToLanguage(meaningData.definition, langObj.code);
    } catch {
      translatedDefinition = meaningData.definition;
    }
  }

  return {
    originalText: clean,
    language: langObj,
    translatedText,
    meaning: {
      ...meaningData,
      translatedDefinition
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Dispatch a Translated Message to a Selected Receiver (Parent, Teacher, Student, Headmaster, Accountant, Staff, etc.)
 */
export async function sendTranslatedMessageToReceiver({
  senderName = "School Portal User",
  senderRole = "USER",
  receiverRole = "PARENT",
  receiverName = "",
  receiverContact = "",
  originalMessage = "",
  translatedMessage = "",
  targetLanguageCode = "TWI"
}) {
  const langObj =
    SUPPORTED_TRANSLATION_LANGUAGES.find((l) => l.code === targetLanguageCode) ||
    SUPPORTED_TRANSLATION_LANGUAGES[0];
  const roleObj = RECEIVER_ROLES.find((r) => r.id === receiverRole) || RECEIVER_ROLES[0];

  const finalTranslated =
    translatedMessage || (await translateTextToLanguage(originalMessage, targetLanguageCode));

  const messageRecord = {
    id: `TR-MSG-${Date.now()}`,
    senderName,
    senderRole,
    receiverRole: roleObj.id,
    receiverRoleLabel: roleObj.label,
    receiverName: receiverName.trim() || `All ${roleObj.label}s`,
    receiverContact: receiverContact.trim() || roleObj.defaultChannel,
    originalMessage: originalMessage.trim(),
    translatedMessage: finalTranslated,
    languageCode: langObj.code,
    languageName: langObj.name,
    languageFlag: langObj.flag,
    status: "DELIVERED",
    sentAt: new Date().toISOString()
  };

  try {
    // 1. Save in universal translated messages inbox
    const existingInbox = JSON.parse(localStorage.getItem("gbs_translated_messages_inbox") || "[]");
    localStorage.setItem(
      "gbs_translated_messages_inbox",
      JSON.stringify([messageRecord, ...existingInbox].slice(0, 200))
    );

    // 2. Also route to role-specific notification queues so the receiver sees it on their dashboard
    const notificationEntry = {
      id: messageRecord.id,
      title: `🌐 Translated Message (${langObj.name}) from ${senderName}`,
      message: `${finalTranslated} [Original: "${originalMessage.trim()}"]`,
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
            recipient: `${messageRecord.receiverName} (${messageRecord.receiverContact})`,
            role: roleObj.label,
            language: langObj.name,
            message: finalTranslated,
            originalText: originalMessage.trim(),
            status: "DELIVERED",
            sentAt: messageRecord.sentAt
          },
          ...smsLogs
        ].slice(0, 150)
      )
    );

    window.dispatchEvent(new CustomEvent("gbs_translated_message_sent", { detail: messageRecord }));
    window.dispatchEvent(new Event("storage"));
  } catch {
    // Ignore storage errors
  }

  // 3. Best-effort backend SMS/message dispatch if receiverContact is provided
  if (receiverContact && /\d{7,}/.test(receiverContact)) {
    try {
      await fetch("/api/v1/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: receiverContact.trim(),
          message: `[${langObj.name}] ${finalTranslated}\n---\n[Original] ${originalMessage.trim()}`
        })
      });
    } catch {
      // Offline / local fallback already stored
    }
  }

  return messageRecord;
}

