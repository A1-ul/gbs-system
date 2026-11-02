'use strict';

const fs = require('fs');
const path = require('path');
const net = require('net');

const DATA_DIR = path.resolve(__dirname, '../../../data');
const STORE_FILE = path.join(DATA_DIR, 'gbs_persistent_store.json');

const DEFAULT_TOPIC_VIDEOS = [
  {
    id: 'vid_default_math_101',
    title: 'Introduction to Algebraic Expressions & Quadratic Equations',
    subject: 'Core Mathematics',
    className: 'All Classes / General Cohort',
    teacherName: 'Dr. Robert Vance',
    teacherEmail: 'teacher@gbs.com',
    absenceNote: 'Topic Introduction in Teacher Absence — Watch completely and take notes in your exercise book before our next class.',
    lessonSummary: 'Covers variables, coefficients, factoring quadratic trinomials, and applying the quadratic formula with step-by-step worked examples.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    videoType: 'MP4_STREAM',
    durationLabel: '12:45',
    createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
    watchedBy: [
      {
        studentName: 'Alex Student',
        studentEmail: 'student@gbs.com',
        watchedAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
        studentQuestion: 'Understood the quadratic formula derivation clearly. Thank you sir!'
      }
    ]
  },
  {
    id: 'vid_default_sci_102',
    title: 'Cell Structure, Osmosis & Biological Membranes (Absence Lecture)',
    subject: 'Integrated Science / Biology',
    className: 'All Classes / General Cohort',
    teacherName: 'Prof. Eleanor Sterling',
    teacherEmail: 'teacher@gbs.com',
    absenceNote: 'Recorded Topic Lesson in Teacher Absence — Please play and watch this topic introduction and answer the 3 review questions in the notes.',
    lessonSummary: 'Detailed walkthrough of prokaryotic vs eukaryotic cells, semi-permeable membrane transport, diffusion, and osmosis experiments.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    videoType: 'MP4_STREAM',
    durationLabel: '18:20',
    createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    watchedBy: []
  }
];

function ensureStoreFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_FILE)) {
      const initial = {
        institutions: [],
        users: [],
        topicVideos: DEFAULT_TOPIC_VIDEOS,
        subscriptions: [],
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.topicVideos) || parsed.topicVideos.length === 0) {
      parsed.topicVideos = DEFAULT_TOPIC_VIDEOS;
    }
    if (!Array.isArray(parsed.institutions)) parsed.institutions = [];
    if (!Array.isArray(parsed.users)) parsed.users = [];
    if (!Array.isArray(parsed.subscriptions)) parsed.subscriptions = [];
    return parsed;
  } catch (err) {
    return {
      institutions: [],
      users: [],
      topicVideos: DEFAULT_TOPIC_VIDEOS,
      subscriptions: []
    };
  }
}

function readPersistentStore() {
  return ensureStoreFile();
}

function writePersistentStore(updater) {
  try {
    const current = ensureStoreFile();
    const updated = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
    updated.updatedAt = new Date().toISOString();
    fs.writeFileSync(STORE_FILE, JSON.stringify(updated, null, 2), 'utf8');
    return updated;
  } catch (err) {
    return ensureStoreFile();
  }
}

/**
 * Fast non-throwing TCP socket check to see if PostgreSQL is listening on the configured host & port.
 * Prevents Prisma from printing scary `prisma:error Can't reach database server at localhost:5432` logs.
 */
function checkPostgresReachable(timeoutMs = 350) {
  return new Promise((resolve) => {
    const dbUrl = process.env.DATABASE_URL || '';
    if (!dbUrl) {
      return resolve(false);
    }
    let host = 'localhost';
    let port = 5432;
    try {
      const parsed = new URL(dbUrl);
      host = parsed.hostname || 'localhost';
      port = parseInt(parsed.port || '5432', 10);
    } catch {
      // keep defaults
    }

    const socket = new net.Socket();
    let settled = false;
    const finish = (ok) => {
      if (!settled) {
        settled = true;
        try {
          socket.destroy();
        } catch {}
        resolve(ok);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    try {
      socket.connect(port, host);
    } catch {
      finish(false);
    }
  });
}

module.exports = {
  readPersistentStore,
  writePersistentStore,
  checkPostgresReachable,
  STORE_FILE
};

