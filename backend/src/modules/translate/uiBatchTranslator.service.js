'use strict';

const fs = require('fs');
const path = require('path');

const CACHE_FILE_PATH = path.resolve(__dirname, '../../../data/ui_translation_cache.json');
const DISK_CACHE = new Map();
let cacheLoaded = false;
let flushTimer = null;

// Core institutional dictionary for instant offline/cold-start translation across key languages
const CORE_UI_LEXICON = {
  fr: {
    'Headmaster Command Center': 'Centre de Commandement du Directeur',
    'Teacher Portal': 'Portail Enseignant',
    'Student Learning Portal': 'Portail d\'Apprentissage Étudiant',
    'Student Hub': 'Espace Étudiant',
    'Parent Portal': 'Portail des Parents',
    'Finance & Bursar Portal': 'Portail Finances et Économat',
    'Accountant Desk': 'Bureau du Comptable',
    'Staff Operations Portal': 'Portail des Opérations du Personnel',
    'Staff Ops': 'Opérations Personnel',
    'HR Portal': 'Portail RH',
    'Alumni Hub': 'Espace Anciens Élèves',
    'Dashboard': 'Tableau de bord',
    'Overview': 'Aperçu',
    'Students': 'Étudiants',
    'Teachers': 'Enseignants',
    'Parents': 'Parents',
    'Attendance': 'Présence',
    'Examinations': 'Examens',
    'Examinations & Schedule': 'Examens et Calendrier',
    'School Clinic': 'Clinique Scolaire',
    'School Clinic & Medical Registry': 'Clinique Scolaire et Registre Médical',
    'School Clinic & Medical File': 'Clinique Scolaire et Dossier Médical',
    'School Clinic & Health Billing Ledger': 'Clinique Scolaire et Registre de Facturation',
    'University Operations': 'Opérations Universitaires',
    'Academic Classes & Curriculum': 'Classes Académiques et Programme',
    'Admissions Pipeline & Intake': 'Pipeline des Admissions',
    'Financial Statements & Audit Engine': 'États Financiers et Moteur d\'Audit',
    'Sign Out': 'Déconnexion',
    'Sign In': 'Connexion',
    'Blueprint Light': 'Mode Clair',
    'Navy Mode': 'Mode Bleu Marine',
    'Full View': 'Plein Écran',
    'Open New Tab': 'Ouvrir Nouvel Onglet',
    'Sync to Cloud & Backup': 'Synchroniser Cloud et Sauvegarde',
    'Language Translator & Inbox': 'Traducteur et Boîte de Réception',
    'Direct Mobile SMS': 'SMS Mobile Direct',
    'Global Educational News': 'Actualités Éducatives Mondiales',
    'Mobile App & Push': 'Application Mobile et Notifications',
    'Install GBS App Now': 'Installer l\'App GBS',
    'Clear Test Data': 'Effacer les Données de Test',
    'Reset Demo Data': 'Réinitialiser la Démo',
    'My Class Timetable': 'Mon Emploi du Temps',
    'Homework & Submissions': 'Devoirs et Soumissions',
    'Verified Report Card': 'Bulletin de Notes Vérifié',
    'Course & Class Registration': 'Inscription aux Cours et Classes',
    'Digital Library & E-Books': 'Bibliothèque Numérique',
    'Lifetime Fee History & Receipts (Day 1)': 'Historique des Frais et Reçus',
    'Peer Chat & Study Circle': 'Discussion et Cercle d\'Étude',
    'Quick Actions': 'Actions Rapides',
    'Recent Activities': 'Activités Récentes',
    'Settings': 'Paramètres',
    'Reports': 'Rapports',
    'Save': 'Enregistrer',
    'Cancel': 'Annuler',
    'Submit': 'Soumettre',
    'Search': 'Rechercher',
    'Send Message': 'Envoyer Message',
    'Industrial Internships': 'Stages Industriels',
    'Academic & Field Attachments': 'Stages Académiques et de Terrain',
    'My Personal Health & Medical Dossier': 'Mon Dossier Médical Personnel',
    'All Staff & Student Health Profiles': 'Profils Médicaux du Personnel et des Étudiants',
    'Online (Cloud Ready)': 'En ligne (Cloud Prêt)',
    'DEMO SANDBOX MODE': 'MODE DÉMO ÉDUCATIF',
    'LIVE PRODUCTION WORKSPACE': 'ESPACE PRODUCTION RÉEL',
    'Onboard Your Educational Institution / School': 'Enregistrer Votre Établissement Scolaire'
  },
  es: {
    'Headmaster Command Center': 'Centro de Mando del Director',
    'Teacher Portal': 'Portal del Docente',
    'Student Learning Portal': 'Portal de Aprendizaje Estudiantil',
    'Student Hub': 'Centro Estudiantil',
    'Parent Portal': 'Portal de Padres',
    'Finance & Bursar Portal': 'Portal de Finanzas y Tesorería',
    'Accountant Desk': 'Oficina Contable',
    'Staff Operations Portal': 'Portal de Operaciones del Personal',
    'HR Portal': 'Portal de Recursos Humanos',
    'Alumni Hub': 'Comunidad de Egresados',
    'Dashboard': 'Panel Principal',
    'Overview': 'Resumen',
    'Students': 'Estudiantes',
    'Teachers': 'Docentes',
    'Parents': 'Padres',
    'Attendance': 'Asistencia',
    'Examinations': 'Exámenes',
    'Examinations & Schedule': 'Exámenes y Horarios',
    'School Clinic': 'Clínica Escolar',
    'School Clinic & Medical Registry': 'Clínica Escolar y Registro Médico',
    'Sign Out': 'Cerrar Sesión',
    'Sign In': 'Iniciar Sesión',
    'Blueprint Light': 'Modo Claro',
    'Navy Mode': 'Modo Azul Marino',
    'Full View': 'Vista Completa',
    'Open New Tab': 'Abrir Nueva Pestaña',
    'My Class Timetable': 'Mi Horario de Clases',
    'Homework & Submissions': 'Tareas y Entregas',
    'Verified Report Card': 'Boleta de Calificaciones Verificada',
    'Quick Actions': 'Acciones Rápidas',
    'Recent Activities': 'Actividades Recientes',
    'Settings': 'Configuración',
    'Reports': 'Informes',
    'Save': 'Guardar',
    'Cancel': 'Cancelar',
    'Submit': 'Enviar',
    'Search': 'Buscar',
    'Online (Cloud Ready)': 'En línea (Nube Lista)'
  },
  ar: {
    'Headmaster Command Center': 'مركز قيادة مدير المدرسة',
    'Teacher Portal': 'بوابة المعلم',
    'Student Learning Portal': 'بوابة تعلم الطالب',
    'Student Hub': 'مركز الطلاب',
    'Parent Portal': 'بوابة أولياء الأمور',
    'Finance & Bursar Portal': 'بوابة المالية والمحاسبة',
    'Accountant Desk': 'مكتب المحاسب',
    'Staff Operations Portal': 'بوابة عمليات الموظفين',
    'HR Portal': 'بوابة الموارد البشرية',
    'Alumni Hub': 'بوابة الخريجين',
    'Dashboard': 'لوحة التحكم',
    'Overview': 'نظرة عامة',
    'Students': 'الطلاب',
    'Teachers': 'المعلمون',
    'Parents': 'أولياء الأمور',
    'Attendance': 'الحضور والغياب',
    'Examinations': 'الاختبارات',
    'Examinations & Schedule': 'الاختبارات والجدول',
    'School Clinic': 'العيادة المدرسية',
    'School Clinic & Medical Registry': 'العيادة المدرسية والسجل الطبي',
    'Sign Out': 'تسجيل الخروج',
    'Sign In': 'تسجيل الدخول',
    'Blueprint Light': 'الوضع المضيء',
    'Navy Mode': 'الوضع الليلي',
    'Full View': 'عرض كامل',
    'Open New Tab': 'فتح تبويب جديد',
    'My Class Timetable': 'جدول حصصي',
    'Homework & Submissions': 'الواجبات والتسليمات',
    'Verified Report Card': 'كشف الدرجات المعتمد',
    'Quick Actions': 'إجراءات سريعة',
    'Settings': 'الإعدادات',
    'Reports': 'التقارير',
    'Save': 'حفظ',
    'Cancel': 'إلغاء',
    'Submit': 'إرسال',
    'Search': 'بحث',
    'Online (Cloud Ready)': 'متصل (جاهز للسحابة)'
  },
  pt: {
    'Headmaster Command Center': 'Centro de Comando do Diretor',
    'Teacher Portal': 'Portal do Professor',
    'Student Learning Portal': 'Portal de Aprendizagem do Aluno',
    'Parent Portal': 'Portal dos Pais',
    'Accountant Desk': 'Tesouraria e Finanças',
    'HR Portal': 'Portal de RH',
    'Alumni Hub': 'Rede de Ex-Alunos',
    'Dashboard': 'Painel',
    'Students': 'Estudantes',
    'Teachers': 'Professores',
    'Attendance': 'Frequência',
    'Examinations': 'Exames',
    'School Clinic': 'Clínica Escolar',
    'Sign Out': 'Sair',
    'Sign In': 'Entrar',
    'My Class Timetable': 'Meu Horário de Aulas'
  },
  de: {
    'Headmaster Command Center': 'Schulleitung-Kommandozentrale',
    'Teacher Portal': 'Lehrerportal',
    'Student Learning Portal': 'Schüler-Lernportal',
    'Parent Portal': 'Elternportal',
    'Accountant Desk': 'Finanzbuchhaltung',
    'HR Portal': 'Personalportal',
    'Alumni Hub': 'Alumni-Netzwerk',
    'Dashboard': 'Übersicht',
    'Students': 'Schüler',
    'Teachers': 'Lehrkräfte',
    'Attendance': 'Anwesenheit',
    'Examinations': 'Prüfungen',
    'School Clinic': 'Schulklinik',
    'Sign Out': 'Abmelden',
    'Sign In': 'Anmelden',
    'My Class Timetable': 'Mein Stundenplan'
  },
  sw: {
    'Headmaster Command Center': 'Kituo cha Uongozi cha Mkuu wa Shule',
    'Teacher Portal': 'Lango la Mwalimu',
    'Student Learning Portal': 'Lango la Kujifunza la Mwanafunzi',
    'Parent Portal': 'Lango la Mzazi',
    'Accountant Desk': 'Dawati la Mhasibu',
    'HR Portal': 'Lango la Rasilimali Watu',
    'Dashboard': 'Dashibodi',
    'Students': 'Wanafunzi',
    'Teachers': 'Walimu',
    'Attendance': 'Mahudhurio',
    'Examinations': 'Mitihani',
    'School Clinic': 'Kliniki ya Shule',
    'Sign Out': 'Ondoka',
    'Sign In': 'Ingia',
    'My Class Timetable': 'Ratiba Yangu ya Darasa'
  },
  ak: {
    'Headmaster Command Center': 'Sukuu Panin Adwumayɛbea',
    'Teacher Portal': 'Ɔkyerɛkyerɛni Adwumayɛbea',
    'Student Learning Portal': 'Osuani Adesua Beae',
    'Parent Portal': 'Ɔwofoɔ Nkitahodi Beae',
    'Accountant Desk': 'Sikasɛm ne Ka Adwumayɛbea',
    'HR Portal': 'Adwumayɛfoɔ Nhyehyɛeɛ',
    'Dashboard': 'Adwumayɛbea',
    'Students': 'Asuafoɔ',
    'Teachers': 'Akyerɛkyerɛfoɔ',
    'Attendance': 'Sukuu Ba ne Kɔ',
    'Examinations': 'Sɔhwɛ',
    'School Clinic': 'Sukuu Ayaresabea',
    'Sign Out': 'Pue',
    'Sign In': 'Bra Mu',
    'My Class Timetable': 'Me Adesua Nhyehyɛeɛ'
  },
  'zh-CN': {
    'Headmaster Command Center': '校长指挥中心',
    'Teacher Portal': '教师门户',
    'Student Learning Portal': '学生学习门户',
    'Parent Portal': '家长门户',
    'Finance & Bursar Portal': '财务与会计门户',
    'Accountant Desk': '财务处',
    'HR Portal': '人事门户',
    'Alumni Hub': '校友中心',
    'Dashboard': '仪表板',
    'Students': '学生',
    'Teachers': '教师',
    'Attendance': '考勤记录',
    'Examinations': '考试管理',
    'School Clinic': '校医务室',
    'Sign Out': '退出登录',
    'Sign In': '登录',
    'My Class Timetable': '我的课程表'
  },
  hi: {
    'Headmaster Command Center': 'प्रधानाचार्य कमान केंद्र',
    'Teacher Portal': 'शिक्षक पोर्टल',
    'Student Learning Portal': 'छात्र शिक्षण पोर्टल',
    'Parent Portal': 'अभिभावक पोर्टल',
    'Dashboard': 'डैशबोर्ड',
    'Students': 'छात्र',
    'Teachers': 'शिक्षक',
    'Attendance': 'उपस्थिति',
    'Examinations': 'परीक्षाएं',
    'School Clinic': 'स्कूल क्लिनिक',
    'Sign Out': 'लॉग आउट',
    'Sign In': 'लॉग इन करें'
  },
  ja: {
    'Headmaster Command Center': '校長管理センター',
    'Teacher Portal': '教員ポータル',
    'Student Learning Portal': '生徒学習ポータル',
    'Parent Portal': '保護者ポータル',
    'Dashboard': 'ダッシュボード',
    'Students': '生徒',
    'Teachers': '教員',
    'Attendance': '出欠記録',
    'Examinations': '試験管理',
    'School Clinic': '学校保健室',
    'Sign Out': 'ログアウト',
    'Sign In': 'ログイン'
  }
};

function ensureCacheLoaded() {
  if (cacheLoaded) return;
  cacheLoaded = true;
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const raw = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf8'));
      if (raw && typeof raw === 'object') {
        for (const [iso, entries] of Object.entries(raw)) {
          if (entries && typeof entries === 'object') {
            DISK_CACHE.set(iso, new Map(Object.entries(entries)));
          }
        }
      }
    }
  } catch { }
}

function getCachedOrLexicon(iso, text) {
  ensureCacheLoaded();
  const isoMap = DISK_CACHE.get(iso);
  if (isoMap && isoMap.has(text)) return isoMap.get(text);
  const lex = CORE_UI_LEXICON[iso] || (iso === 'tw' ? CORE_UI_LEXICON.ak : null) || (iso === 'zh' ? CORE_UI_LEXICON['zh-CN'] : null);
  if (lex && lex[text]) return lex[text];
  return null;
}

function saveToDiskCache(iso, text, translated) {
  if (!text || !translated) return;
  ensureCacheLoaded();
  let isoMap = DISK_CACHE.get(iso);
  if (!isoMap) {
    isoMap = new Map();
    DISK_CACHE.set(iso, isoMap);
  }
  if (isoMap.size >= 3000) {
    const oldest = isoMap.keys().next().value;
    if (oldest !== undefined) isoMap.delete(oldest);
  }
  isoMap.set(text, translated);

  // Skip persisting temporary test fixtures to disk during unit test runs
  if (process.env.GBS_TEST_OFFLINE === '1' || process.env.NODE_ENV === 'test') return;

  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    try {
      const out = {};
      for (const [langKey, map] of DISK_CACHE.entries()) {
        out[langKey] = Object.fromEntries(map.entries());
      }
      fs.mkdirSync(path.dirname(CACHE_FILE_PATH), { recursive: true });
      fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(out), 'utf8');
    } catch { }
  }, 400);
}

/**
 * Translate a batch of UI strings quickly into targetIso.
 * Checks persistent UI cache + curated offline dictionary first, then batches uncached items
 * via delimiter joining before falling back to bounded concurrent calls.
 */
async function translateBatchTexts(texts = [], targetIso = 'fr', translateSingleFn) {
  const uniqueTexts = [];
  const seen = new Set();
  for (const item of Array.isArray(texts) ? texts : []) {
    const clean = String(item || '').trim();
    if (!clean || clean.length > 500 || seen.has(clean)) continue;
    seen.add(clean);
    uniqueTexts.push(clean);
    if (uniqueTexts.length >= 80) break;
  }

  const translations = {};
  if (!targetIso || targetIso === 'en' || targetIso === 'english') {
    uniqueTexts.forEach((t) => { translations[t] = t; });
    return { translations, cachedCount: uniqueTexts.length, translatedCount: 0 };
  }

  const uncached = [];
  let cachedCount = 0;

  for (const text of uniqueTexts) {
    const hit = getCachedOrLexicon(targetIso, text);
    if (hit) {
      translations[text] = hit;
      cachedCount++;
    } else {
      uncached.push(text);
    }
  }

  if (uncached.length === 0 || process.env.GBS_TEST_OFFLINE === '1') {
    return { translations, cachedCount, translatedCount: 0 };
  }

  let translatedCount = 0;
  // Pack small chunks with explicit separator tokens so neural translators preserve boundaries cleanly
  const SEP = '\n|||\n';
  const chunks = [];
  let bucket = [];
  let bucketChars = 0;

  for (const txt of uncached) {
    if (txt.includes('|||')) {
      chunks.push([txt]);
      continue;
    }
    if (bucket.length >= 10 || bucketChars + txt.length > 750) {
      if (bucket.length) chunks.push(bucket);
      bucket = [];
      bucketChars = 0;
    }
    bucket.push(txt);
    bucketChars += txt.length + SEP.length;
  }
  if (bucket.length) chunks.push(bucket);

  await Promise.all(
    chunks.map(async (chunk) => {
      if (chunk.length > 1) {
        try {
          const joined = chunk.join(SEP);
          const joinedRes = await translateSingleFn(joined, targetIso, 'en', { skipDictionary: true });
          const parts = String(joinedRes?.translatedText || '').split(/\s*\|\|\|\s*/g);
          if (parts.length === chunk.length && parts.every((p) => p && p.trim().length > 0)) {
            chunk.forEach((orig, idx) => {
              const tr = parts[idx].trim();
              translations[orig] = tr;
              saveToDiskCache(targetIso, orig, tr);
              translatedCount++;
            });
            return;
          }
        } catch { }
      }

      // Fast 6-way concurrent single-item fallback if delimiter count mismatched
      for (let i = 0; i < chunk.length; i += 6) {
        const slice = chunk.slice(i, i + 6);
        await Promise.all(
          slice.map(async (orig) => {
            try {
              const single = await translateSingleFn(orig, targetIso, 'en', { skipDictionary: true });
              const tr = String(single?.translatedText || '').trim();
              if (tr) {
                translations[orig] = tr;
                saveToDiskCache(targetIso, orig, tr);
                translatedCount++;
              }
            } catch { }
          })
        );
      }
    })
  );

  return { translations, cachedCount, translatedCount };
}

module.exports = {
  CORE_UI_LEXICON,
  translateBatchTexts,
  getCachedOrLexicon
};
