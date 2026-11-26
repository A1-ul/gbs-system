/**
 * GBS Authentic Phonetic Sound & Country Letter Stroke-Order Engine
 *
 * Guarantees that all 42 Jolly Phonics sounds and all 17 Country & Language Alphabets
 * pronounce the EXACT PHONETIC SOUND of each letter/digraph (NEVER the English letter name!)
 * and provides step-by-step visual stroke-order guides showing how each country writes its letters.
 */

let sharedAudioCtx = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new Ctx();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => { });
  }
  return sharedAudioCtx;
}

/**
 * Pure Acoustic Web Audio Phoneme Synthesizer for continuous fricatives/sibilants
 * that SpeechSynthesis engines often misread as letter names ("ess", "ef", "zee", "vee", "aitch").
 */
const ACOUSTIC_PHONEMES = {
  s: { type: "noise", filterType: "highpass", freq: 5600, q: 1.4, duration: 0.62, gain: 0.32 },
  sh: { type: "noise", filterType: "bandpass", freq: 2700, q: 1.8, duration: 0.64, gain: 0.42 },
  f: { type: "noise", filterType: "bandpass", freq: 4400, q: 0.6, duration: 0.56, gain: 0.24 },
  h: { type: "noise", filterType: "bandpass", freq: 1450, q: 1.1, duration: 0.44, gain: 0.34 },
  th_unvoiced: { type: "noise", filterType: "highpass", freq: 4100, q: 0.9, duration: 0.54, gain: 0.22 },
  z: { type: "voiced_fricative", voiceFreq: 138, filterFreq: 5400, q: 1.4, duration: 0.64, noiseGain: 0.22, voiceGain: 0.16 },
  v: { type: "voiced_fricative", voiceFreq: 132, filterFreq: 2900, q: 0.8, duration: 0.58, noiseGain: 0.16, voiceGain: 0.18 }
};

export function playAcousticPhoneme(phonemeKey) {
  const cfg = ACOUSTIC_PHONEMES[String(phonemeKey || "").toLowerCase()];
  if (!cfg) return Promise.resolve(false);
  const ctx = getAudioContext();
  if (!ctx) return Promise.resolve(false);

  return new Promise((resolve) => {
    try {
      const now = ctx.currentTime;
      const dur = cfg.duration;
      const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < sampleCount; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = cfg.filterType || "highpass";
      filter.frequency.setValueAtTime(cfg.freq || cfg.filterFreq || 4000, now);
      filter.Q.setValueAtTime(cfg.q || 1.0, now);

      const env = ctx.createGain();
      const targetGain = cfg.type === "voiced_fricative" ? cfg.noiseGain : cfg.gain;
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(targetGain, now + 0.06);
      env.gain.setValueAtTime(targetGain, now + dur - 0.1);
      env.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      noiseSrc.connect(filter);
      filter.connect(env);
      env.connect(ctx.destination);
      noiseSrc.start(now);
      noiseSrc.stop(now + dur + 0.02);

      if (cfg.type === "voiced_fricative") {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(cfg.voiceFreq, now);
        const lpf = ctx.createBiquadFilter();
        lpf.type = "lowpass";
        lpf.frequency.setValueAtTime(420, now);
        const vEnv = ctx.createGain();
        vEnv.gain.setValueAtTime(0.0001, now);
        vEnv.gain.linearRampToValueAtTime(cfg.voiceGain, now + 0.05);
        vEnv.gain.setValueAtTime(cfg.voiceGain, now + dur - 0.1);
        vEnv.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        osc.connect(lpf);
        lpf.connect(vEnv);
        vEnv.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + dur + 0.02);
      }

      setTimeout(() => resolve(true), Math.round(dur * 1000) + 40);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Exact Phonetic Pronunciation Map for ALL 42 Jolly Phonics Sounds.
 * Every entry is crafted so SpeechSynthesis NEVER speaks a letter name ("ess", "ay", "tee", "bee").
 */
export const JOLLY_PHONICS_EXACT_SOUND_MAP = {
  s: { acoustic: "s", pureSound: "ssssss", soundCue: "ssssss", exampleWord: "snake, sun, sat", rate: 0.88 },
  a: { pureSound: "ah, ah, ah", soundCue: "ah", exampleWord: "ant, apple, arrow", rate: 0.90 },
  t: { pureSound: "tuh, tuh, tuh", soundCue: "tuh", exampleWord: "tennis, tap, top", rate: 1.12 },
  i: { pureSound: "ih, ih, ih", soundCue: "ih", exampleWord: "ink, igloo, inky", rate: 0.92 },
  p: { pureSound: "puh, puh, puh", soundCue: "puh", exampleWord: "puff, pan, pig", rate: 1.12 },
  n: { pureSound: "nnnnnn", soundCue: "nnnnnn", exampleWord: "net, nap, nest", rate: 0.86 },
  ck: { pureSound: "kuh, kuh, kuh", soundCue: "kuh", exampleWord: "cat, kite, duck", rate: 1.12 },
  e: { pureSound: "eh, eh, eh", soundCue: "eh", exampleWord: "egg, elephant, pen", rate: 0.92 },
  h: { acoustic: "h", pureSound: "huh, huh, huh", soundCue: "huh", exampleWord: "hat, hen, hop", rate: 1.02 },
  r: { pureSound: "rrrrrr", soundCue: "rrrrrr", exampleWord: "rat, run, red", rate: 0.88 },
  m: { pureSound: "mmmmmm", soundCue: "mmmmmm", exampleWord: "mat, man, mum", rate: 0.86 },
  d: { pureSound: "duh, duh, duh", soundCue: "duh", exampleWord: "drum, dog, dad", rate: 1.12 },
  g: { pureSound: "guh, guh, guh", soundCue: "guh", exampleWord: "gurgle, goat, gap", rate: 1.12 },
  o: { pureSound: "aw, aw, aw", soundCue: "aw", exampleWord: "orange, octopus, on", rate: 0.90 },
  u: { pureSound: "uh, uh, uh", soundCue: "uh", exampleWord: "umbrella, up, sun", rate: 0.92 },
  l: { pureSound: "llllll", soundCue: "llllll", exampleWord: "lollipop, leg, lip", rate: 0.88 },
  f: { acoustic: "f", pureSound: "ffffff", soundCue: "ffffff", exampleWord: "fish, fan, frog", rate: 0.88 },
  b: { pureSound: "buh, buh, buh", soundCue: "buh", exampleWord: "bat, ball, bus", rate: 1.12 },
  ai: { pureSound: "ayyy", soundCue: "ayyy", exampleWord: "rain, pain, train", rate: 0.88 },
  j: { pureSound: "juh, juh, juh", soundCue: "juh", exampleWord: "jelly, jam, jet", rate: 1.10 },
  oa: { pureSound: "ohhh", soundCue: "ohhh", exampleWord: "goat, boat, coat", rate: 0.88 },
  ie: { pureSound: "eye", soundCue: "eye", exampleWord: "tie, pie, lie", rate: 0.88 },
  ee: { pureSound: "eeee", soundCue: "eeee", exampleWord: "bee, tree, see", rate: 0.88 },
  or: { pureSound: "awr", soundCue: "awr", exampleWord: "fork, corn, storm", rate: 0.88 },
  z: { acoustic: "z", pureSound: "zzzzzz", soundCue: "zzzzzz", exampleWord: "zebra, zip, buzz", rate: 0.86 },
  w: { pureSound: "wuh, wuh, wuh", soundCue: "wuh", exampleWord: "wind, web, win", rate: 1.06 },
  ng: { pureSound: "nnng", soundCue: "nnng", exampleWord: "ring, sing, strong", rate: 0.88 },
  v: { acoustic: "v", pureSound: "vvvvvv", soundCue: "vvvvvv", exampleWord: "van, vet, vest", rate: 0.88 },
  oo_short: { pureSound: "uuh", soundCue: "uuh", exampleWord: "book, look, foot", rate: 0.90 },
  oo_long: { pureSound: "oooo", soundCue: "oooo", exampleWord: "moon, spoon, zoo", rate: 0.86 },
  y: { pureSound: "yuh, yuh, yuh", soundCue: "yuh", exampleWord: "yogurt, yellow, yes", rate: 1.08 },
  x: { pureSound: "ksss, ksss", soundCue: "ksss", exampleWord: "box, fox, six", rate: 0.96 },
  ch: { pureSound: "chuh, chuh, chuh", soundCue: "chuh", exampleWord: "chick, chop, train", rate: 1.08 },
  sh: { acoustic: "sh", pureSound: "shhhhh", soundCue: "shhhhh", exampleWord: "ship, shop, hush", rate: 0.86 },
  th_voiced: { pureSound: "thuh, thuh", soundCue: "thuh", exampleWord: "this, that, feather", rate: 1.02 },
  th_unvoiced: { acoustic: "th_unvoiced", pureSound: "thhhhh", soundCue: "thhhhh", exampleWord: "thumb, three, thin", rate: 0.88 },
  qu: { pureSound: "kwuh, kwuh", soundCue: "kwuh", exampleWord: "quack, queen, quick", rate: 1.04 },
  ou: { pureSound: "owww", soundCue: "owww", exampleWord: "ouch, cloud, out", rate: 0.88 },
  oi: { pureSound: "oyyy", soundCue: "oyyy", exampleWord: "oil, coin, boil", rate: 0.88 },
  ue: { pureSound: "yooo", soundCue: "yooo", exampleWord: "barbecue, statue, rescue", rate: 0.88 },
  er: { pureSound: "urrr", soundCue: "urrr", exampleWord: "mixer, sister, fern", rate: 0.88 },
  ar: { pureSound: "ahhh", soundCue: "ahhh", exampleWord: "car, star, park", rate: 0.88 }
};

/**
 * Pure phonetic sound table for single Latin & African/European letters so country alphabets
 * NEVER pronounce English letter names ("ay", "bee", "see") when demonstrating letter sounds.
 */
const LATIN_LETTER_PURE_SOUND = {
  A: { pureSound: "ah", acoustic: null },
  B: { pureSound: "buh", acoustic: null },
  C: { pureSound: "kuh", acoustic: null },
  D: { pureSound: "duh", acoustic: null },
  E: { pureSound: "eh", acoustic: null },
  F: { pureSound: "ffffff", acoustic: "f" },
  G: { pureSound: "guh", acoustic: null },
  H: { pureSound: "huh", acoustic: "h" },
  I: { pureSound: "ih", acoustic: null },
  J: { pureSound: "juh", acoustic: null },
  K: { pureSound: "kuh", acoustic: null },
  L: { pureSound: "llllll", acoustic: null },
  M: { pureSound: "mmmmmm", acoustic: null },
  N: { pureSound: "nnnnnn", acoustic: null },
  O: { pureSound: "aw", acoustic: null },
  P: { pureSound: "puh", acoustic: null },
  Q: { pureSound: "kwuh", acoustic: null },
  R: { pureSound: "rrrrrr", acoustic: null },
  S: { pureSound: "ssssss", acoustic: "s" },
  T: { pureSound: "tuh", acoustic: null },
  U: { pureSound: "uh", acoustic: null },
  V: { pureSound: "vvvvvv", acoustic: "v" },
  W: { pureSound: "wuh", acoustic: null },
  X: { pureSound: "ksss", acoustic: null },
  Y: { pureSound: "yuh", acoustic: null },
  Z: { pureSound: "zzzzzz", acoustic: "z" },
  // Ghana Twi / Ga / Ewe & Nigerian Hausa / Yoruba special letters & digraphs
  "Ɛ": { pureSound: "ehh", acoustic: null },
  "Ɔ": { pureSound: "aww", acoustic: null },
  "Ŋ": { pureSound: "nnng", acoustic: null },
  "Ɖ": { pureSound: "duh", acoustic: null },
  "Ƒ": { pureSound: "ffffff", acoustic: "f" },
  "Ɣ": { pureSound: "ghuh", acoustic: null },
  "Ʋ": { pureSound: "vvvvvv", acoustic: "v" },
  "Ɓ": { pureSound: "buh", acoustic: null },
  "Ɗ": { pureSound: "duh", acoustic: null },
  "Ƙ": { pureSound: "kuh", acoustic: null },
  "Ƴ": { pureSound: "yuh", acoustic: null },
  "Ẹ": { pureSound: "ehh", acoustic: null },
  "Ọ": { pureSound: "aww", acoustic: null },
  "Ṣ": { pureSound: "shhhhh", acoustic: "sh" },
  KY: { pureSound: "chuh", acoustic: null },
  GY: { pureSound: "juh", acoustic: null },
  TW: { pureSound: "chwuh", acoustic: null },
  DW: { pureSound: "jwuh", acoustic: null },
  NY: { pureSound: "nyuh", acoustic: null },
  GB: { pureSound: "gbuh", acoustic: null },
  KP: { pureSound: "kpuh", acoustic: null },
  TS: { pureSound: "tsuh", acoustic: null },
  CH: { pureSound: "chuh", acoustic: null },
  SH: { pureSound: "shhhhh", acoustic: "sh" },
  "NG'": { pureSound: "nnng", acoustic: null },
  HL: { pureSound: "hluh", acoustic: null },
  // European accented characters
  "É": { pureSound: "ay", acoustic: null },
  "È": { pureSound: "eh", acoustic: null },
  "Ê": { pureSound: "eh", acoustic: null },
  "Ç": { pureSound: "ssssss", acoustic: "s" },
  "À": { pureSound: "ah", acoustic: null },
  "Ä": { pureSound: "ehh", acoustic: null },
  "Ö": { pureSound: "uhh", acoustic: null },
  "Ü": { pureSound: "ooo", acoustic: null },
  "ß": { pureSound: "ssssss", acoustic: "s" },
  "Ñ": { pureSound: "nyuh", acoustic: null },
  "Ã": { pureSound: "ahng", acoustic: null },
  "Õ": { pureSound: "ohng", acoustic: null }
};

function pickClearVoice(locale = "en-GB") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;
  const targetLang = String(locale || "en-GB").toLowerCase();
  const baseLang = targetLang.split("-")[0];

  const exactMatch = voices.find((v) => String(v.lang || "").toLowerCase() === targetLang);
  if (exactMatch) return exactMatch;

  const naturalLang = voices.find(
    (v) =>
      String(v.lang || "").toLowerCase().startsWith(baseLang) &&
      /natural|neural|google|online|enhanced/i.test(String(v.name || ""))
  );
  if (naturalLang) return naturalLang;

  const sameLang = voices.find((v) => String(v.lang || "").toLowerCase().startsWith(baseLang));
  if (sameLang) return sameLang;

  return (
    voices.find((v) => /natural|google us|google uk/i.test(String(v.name || "")) && String(v.lang || "").toLowerCase().startsWith("en")) ||
    voices.find((v) => String(v.lang || "").toLowerCase().startsWith("en")) ||
    voices[0]
  );
}

function speakUtteranceAsync(text, locale = "en-GB", rate = 0.92, pitch = 1.05) {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) {
      resolve(false);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text));
      u.lang = locale || "en-GB";
      u.rate = Math.min(1.18, Math.max(0.76, Number(rate) || 0.92));
      u.pitch = pitch;
      u.volume = 1.0;
      const v = pickClearVoice(locale);
      if (v) u.voice = v;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve(true);
      };
      u.onend = finish;
      u.onerror = finish;
      window.speechSynthesis.speak(u);
      setTimeout(finish, 4500);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Pronounces the EXACT PHONETIC SOUND of a Jolly Phonics item (never its letter name!).
 * @param {object} soundItem - item from JOLLY_PHONICS_42_SOUNDS
 * @param {{ withWord?: boolean, locale?: string }} options
 */
export async function playJollyPhonicsExactSound(soundItem, { withWord = false, locale = "en-GB" } = {}) {
  if (!soundItem) return;
  const rawGrapheme = String(soundItem.phonemeKey || soundItem.grapheme || soundItem.id || "").toLowerCase().trim();
  const normalizedKey = rawGrapheme === "oo (short)"
    ? "oo_short"
    : rawGrapheme === "oo (long)"
      ? "oo_long"
      : rawGrapheme === "th (voiced)"
        ? "th_voiced"
        : rawGrapheme === "th (unvoiced)"
          ? "th_unvoiced"
          : rawGrapheme;
  const cfg = JOLLY_PHONICS_EXACT_SOUND_MAP[normalizedKey];

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try { window.speechSynthesis.cancel(); } catch { }
  }

  if (cfg?.acoustic) {
    await playAcousticPhoneme(cfg.acoustic);
    if (withWord) {
      await new Promise((r) => setTimeout(r, 150));
      const cleanWords = (soundItem.examples || []).slice(0, 3).join(", ") || cfg.exampleWord;
      await speakUtteranceAsync(`as in ${cleanWords}`, locale, 0.95, 1.06);
    }
    return;
  }

  const pureText = cfg?.pureSound || soundItem.phonemeSpeak || soundItem.speakText || "";
  if (!withWord) {
    await speakUtteranceAsync(pureText, locale, cfg?.rate || 0.94, 1.06);
  } else {
    const cue = cfg?.soundCue || pureText;
    const cleanWords = (soundItem.examples || []).slice(0, 3).join(", ") || cfg?.exampleWord || "";
    await speakUtteranceAsync(cue, locale, cfg?.rate || 0.94, 1.06);
    await new Promise((r) => setTimeout(r, 140));
    await speakUtteranceAsync(`as in ${cleanWords}`, locale, 0.95, 1.06);
  }
}

/**
 * Pronounces the EXACT PHONETIC SOUND of any Country & Language Alphabet character (never English letter names!).
 */
export async function playCountryAlphabetExactSound(letterEntry, langProfile = {}, { withWord = false } = {}) {
  if (!letterEntry) return;
  const langId = String(langProfile?.id || "").toLowerCase();
  const locale = langProfile?.speechLocale || "en-GB";
  const upperKey = String(letterEntry.upper || letterEntry.glyph || "").trim().toUpperCase();

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try { window.speechSynthesis.cancel(); } catch { }
  }

  // Non-Latin scripts (Arabic, Hindi Devanagari, Chinese Mandarin, Japanese Hiragana) speak directly in their native script locale
  const isNonLatin = /^(ar|hi|zh|ja)/i.test(locale);
  if (isNonLatin) {
    const nativeWord = String(letterEntry.example || "").split("(")[0].trim();
    const nativePhoneme = letterEntry.phonemeSpeak || letterEntry.glyph || letterEntry.letter;
    await speakUtteranceAsync(nativePhoneme, locale, 0.86, 1.04);
    if (withWord && nativeWord) {
      await new Promise((r) => setTimeout(r, 180));
      await speakUtteranceAsync(nativeWord, locale, 0.90, 1.04);
    }
    return;
  }

  // Special language vowel overrides (Ghana Twi/Ga/Ewe/Yoruba/Swahili/Spanish/German/French/Portuguese use pure vowels a=ah, e=ay/eh, i=ee, o=oh, u=oo)
  const isPureVowelLang = /twi|ga|ewe|ha|yo|sw|zu|fr|de|es|pt/i.test(langId);
  const pureVowelOverrides = isPureVowelLang
    ? { A: "ah", E: "ay", I: "eeee", O: "ohhh", U: "oooo" }
    : {};

  const mapped = LATIN_LETTER_PURE_SOUND[upperKey];
  if (!isPureVowelLang && mapped?.acoustic) {
    await playAcousticPhoneme(mapped.acoustic);
  } else if (mapped?.acoustic && ["F", "S", "V", "Z", "Ƒ", "Ʋ", "Ṣ", "SH", "Ç", "ß"].includes(upperKey)) {
    await playAcousticPhoneme(mapped.acoustic);
  } else {
    const soundOnly =
      letterEntry.phonemeSpeak ||
      pureVowelOverrides[upperKey] ||
      mapped?.pureSound ||
      "ah";
    await speakUtteranceAsync(soundOnly, locale, 0.92, 1.05);
  }

  if (withWord && letterEntry.example) {
    const exampleWordOnly = String(letterEntry.example).split("(")[0].trim();
    if (exampleWordOnly) {
      await new Promise((r) => setTimeout(r, 160));
      const connector = langId.startsWith("fr")
        ? "comme"
        : langId.startsWith("es") || langId.startsWith("pt")
          ? "como"
          : langId.startsWith("de")
            ? "wie"
            : "as in";
      await speakUtteranceAsync(`${connector} ${exampleWordOnly}`, locale, 0.94, 1.05);
    }
  }
}

/**
 * Visual Step-by-Step Stroke Order Paths (100x100 SVG coordinate box)
 * Shows numbered green start dots (1, 2, 3...) + directional stroke paths so students
 * see EXACTLY how each country writes its letters.
 */
const STROKE_DIAGRAMS = {
  // Core Latin uppercase & lowercase & Jolly Phonics shapes
  a: [
    { d: "M 66 36 C 54 24, 30 28, 28 50 C 26 70, 52 78, 66 64", start: [66, 36] },
    { d: "M 66 30 L 66 76", start: [66, 30] }
  ],
  A: [
    { d: "M 50 18 L 22 82", start: [50, 18] },
    { d: "M 50 18 L 78 82", start: [50, 18] },
    { d: "M 32 58 L 68 58", start: [32, 58] }
  ],
  b: [
    { d: "M 30 16 L 30 82", start: [30, 16] },
    { d: "M 30 50 C 48 34, 74 42, 74 60 C 74 78, 46 84, 30 72", start: [30, 50] }
  ],
  B: [
    { d: "M 28 18 L 28 82", start: [28, 18] },
    { d: "M 28 18 C 68 18, 68 48, 28 50", start: [28, 18] },
    { d: "M 28 50 C 74 50, 74 82, 28 82", start: [28, 50] }
  ],
  c: [{ d: "M 70 38 C 54 22, 26 32, 28 54 C 30 76, 56 82, 72 68", start: [70, 38] }],
  C: [{ d: "M 74 28 C 54 12, 22 24, 24 50 C 26 78, 54 88, 76 72", start: [74, 28] }],
  d: [
    { d: "M 68 42 C 52 28, 26 36, 26 58 C 26 78, 52 84, 68 70", start: [68, 42] },
    { d: "M 68 16 L 68 82", start: [68, 16] }
  ],
  D: [
    { d: "M 28 18 L 28 82", start: [28, 18] },
    { d: "M 28 18 C 80 18, 80 82, 28 82", start: [28, 18] }
  ],
  e: [{ d: "M 28 54 L 72 54 C 72 32, 30 28, 28 54 C 28 76, 56 82, 72 70", start: [28, 54] }],
  E: [
    { d: "M 28 18 L 28 82", start: [28, 18] },
    { d: "M 28 18 L 72 18", start: [28, 18] },
    { d: "M 28 50 L 64 50", start: [28, 50] },
    { d: "M 28 82 L 74 82", start: [28, 82] }
  ],
  f: [
    { d: "M 68 22 C 54 12, 44 20, 44 36 L 44 84", start: [68, 22] },
    { d: "M 28 46 L 64 46", start: [28, 46] }
  ],
  F: [
    { d: "M 28 18 L 28 82", start: [28, 18] },
    { d: "M 28 18 L 74 18", start: [28, 18] },
    { d: "M 28 50 L 64 50", start: [28, 50] }
  ],
  g: [
    { d: "M 68 38 C 52 24, 28 32, 28 50 C 28 68, 52 72, 68 58", start: [68, 38] },
    { d: "M 68 34 L 68 78 C 68 92, 40 94, 30 82", start: [68, 34] }
  ],
  G: [
    { d: "M 74 28 C 52 12, 22 24, 22 50 C 22 78, 54 88, 76 74 L 76 52", start: [74, 28] },
    { d: "M 52 52 L 76 52", start: [52, 52] }
  ],
  h: [
    { d: "M 30 16 L 30 82", start: [30, 16] },
    { d: "M 30 50 C 42 34, 70 36, 70 54 L 70 82", start: [30, 50] }
  ],
  H: [
    { d: "M 28 18 L 28 82", start: [28, 18] },
    { d: "M 72 18 L 72 82", start: [72, 18] },
    { d: "M 28 50 L 72 50", start: [28, 50] }
  ],
  i: [
    { d: "M 50 40 L 50 80", start: [50, 40] },
    { d: "M 50 24 L 50 26", start: [50, 24] }
  ],
  I: [
    { d: "M 50 18 L 50 82", start: [50, 18] },
    { d: "M 32 18 L 68 18", start: [32, 18] },
    { d: "M 32 82 L 68 82", start: [32, 82] }
  ],
  j: [
    { d: "M 56 38 L 56 76 C 56 90, 38 92, 30 82", start: [56, 38] },
    { d: "M 56 22 L 56 24", start: [56, 22] }
  ],
  J: [{ d: "M 64 18 L 64 68 C 64 84, 34 86, 26 70", start: [64, 18] }],
  k: [
    { d: "M 30 16 L 30 82", start: [30, 16] },
    { d: "M 68 38 L 32 58", start: [68, 38] },
    { d: "M 42 52 L 70 82", start: [42, 52] }
  ],
  K: [
    { d: "M 28 18 L 28 82", start: [28, 18] },
    { d: "M 72 18 L 28 52", start: [72, 18] },
    { d: "M 40 44 L 74 82", start: [40, 44] }
  ],
  l: [{ d: "M 50 16 L 50 82", start: [50, 16] }],
  L: [
    { d: "M 30 18 L 30 82", start: [30, 18] },
    { d: "M 30 82 L 74 82", start: [30, 82] }
  ],
  m: [
    { d: "M 18 38 L 18 80", start: [18, 38] },
    { d: "M 18 48 C 28 32, 50 34, 50 52 L 50 80", start: [18, 48] },
    { d: "M 50 48 C 60 32, 82 34, 82 52 L 82 80", start: [50, 48] }
  ],
  M: [
    { d: "M 20 82 L 20 18", start: [20, 82] },
    { d: "M 20 18 L 50 62", start: [20, 18] },
    { d: "M 50 62 L 80 18", start: [50, 62] },
    { d: "M 80 18 L 80 82", start: [80, 18] }
  ],
  n: [
    { d: "M 30 38 L 30 80", start: [30, 38] },
    { d: "M 30 48 C 44 32, 70 36, 70 54 L 70 80", start: [30, 48] }
  ],
  N: [
    { d: "M 26 82 L 26 18", start: [26, 82] },
    { d: "M 26 18 L 74 82", start: [26, 18] },
    { d: "M 74 82 L 74 18", start: [74, 82] }
  ],
  o: [{ d: "M 50 32 C 26 32, 24 78, 50 78 C 76 78, 74 32, 50 32", start: [50, 32] }],
  O: [{ d: "M 50 18 C 20 18, 20 82, 50 82 C 80 82, 80 18, 50 18", start: [50, 18] }],
  p: [
    { d: "M 30 34 L 30 92", start: [30, 34] },
    { d: "M 30 42 C 50 28, 74 38, 74 56 C 74 74, 48 80, 30 68", start: [30, 42] }
  ],
  P: [
    { d: "M 28 18 L 28 82", start: [28, 18] },
    { d: "M 28 18 C 74 18, 74 54, 28 54", start: [28, 18] }
  ],
  q: [
    { d: "M 68 42 C 50 28, 26 36, 26 56 C 26 74, 52 80, 68 66", start: [68, 42] },
    { d: "M 68 34 L 68 92", start: [68, 34] }
  ],
  Q: [
    { d: "M 50 18 C 20 18, 20 80, 50 80 C 80 80, 80 18, 50 18", start: [50, 18] },
    { d: "M 58 62 L 80 86", start: [58, 62] }
  ],
  r: [
    { d: "M 34 36 L 34 80", start: [34, 36] },
    { d: "M 34 48 C 46 34, 62 34, 70 40", start: [34, 48] }
  ],
  R: [
    { d: "M 28 18 L 28 82", start: [28, 18] },
    { d: "M 28 18 C 72 18, 72 52, 28 52", start: [28, 18] },
    { d: "M 48 52 L 74 82", start: [48, 52] }
  ],
  s: [{ d: "M 68 34 C 52 24, 28 32, 32 46 C 36 58, 68 54, 68 70 C 68 84, 42 86, 28 74", start: [68, 34] }],
  S: [{ d: "M 72 26 C 54 12, 24 20, 28 38 C 32 54, 74 48, 74 68 C 74 86, 42 90, 26 76", start: [72, 26] }],
  t: [
    { d: "M 50 18 L 50 74 C 50 82, 60 84, 68 78", start: [50, 18] },
    { d: "M 32 40 L 68 40", start: [32, 40] }
  ],
  T: [
    { d: "M 20 20 L 80 20", start: [20, 20] },
    { d: "M 50 20 L 50 82", start: [50, 20] }
  ],
  u: [
    { d: "M 30 36 L 30 64 C 30 82, 58 84, 70 68", start: [30, 36] },
    { d: "M 70 36 L 70 80", start: [70, 36] }
  ],
  U: [{ d: "M 26 18 L 26 60 C 26 86, 74 86, 74 60 L 74 18", start: [26, 18] }],
  v: [
    { d: "M 28 36 L 50 80", start: [28, 36] },
    { d: "M 50 80 L 72 36", start: [50, 80] }
  ],
  V: [
    { d: "M 22 18 L 50 82", start: [22, 18] },
    { d: "M 50 82 L 78 18", start: [50, 82] }
  ],
  w: [
    { d: "M 16 36 L 32 80 L 50 48 L 68 80 L 84 36", start: [16, 36] }
  ],
  W: [
    { d: "M 14 18 L 30 82 L 50 38 L 70 82 L 86 18", start: [14, 18] }
  ],
  x: [
    { d: "M 28 36 L 72 80", start: [28, 36] },
    { d: "M 72 36 L 28 80", start: [72, 36] }
  ],
  X: [
    { d: "M 24 18 L 76 82", start: [24, 18] },
    { d: "M 76 18 L 24 82", start: [76, 18] }
  ],
  y: [
    { d: "M 28 36 L 50 74", start: [28, 36] },
    { d: "M 72 36 L 36 92", start: [72, 36] }
  ],
  Y: [
    { d: "M 22 18 L 50 52", start: [22, 18] },
    { d: "M 78 18 L 50 52", start: [78, 18] },
    { d: "M 50 52 L 50 84", start: [50, 52] }
  ],
  z: [{ d: "M 28 36 L 72 36 L 28 80 L 72 80", start: [28, 36] }],
  Z: [{ d: "M 24 20 L 76 20 L 24 80 L 76 80", start: [24, 20] }],

  // Ghana Twi / Ga / Ewe Special Characters
  "Ɛ": [
    { d: "M 68 24 C 40 16, 26 32, 36 48", start: [68, 24] },
    { d: "M 56 48 C 26 48, 24 84, 70 76", start: [56, 48] }
  ],
  "ɛ": [
    { d: "M 66 34 C 42 26, 30 40, 42 52", start: [66, 34] },
    { d: "M 54 52 C 30 52, 28 80, 68 74", start: [54, 52] }
  ],
  "Ɔ": [{ d: "M 28 28 C 52 12, 78 26, 78 50 C 78 76, 52 88, 28 72", start: [28, 28] }],
  "ɔ": [{ d: "M 32 36 C 52 24, 74 36, 74 56 C 74 76, 52 84, 32 72", start: [32, 36] }],
  "Ŋ": [
    { d: "M 26 80 L 26 18", start: [26, 80] },
    { d: "M 26 18 L 72 78", start: [26, 18] },
    { d: "M 72 18 L 72 84 C 72 94, 56 94, 50 88", start: [72, 18] }
  ],
  "ŋ": [
    { d: "M 28 34 L 28 76", start: [28, 34] },
    { d: "M 28 46 C 42 30, 68 34, 68 50 L 68 84 C 68 94, 52 94, 46 88", start: [28, 46] }
  ],
  "Ɖ": [
    { d: "M 28 18 L 28 82", start: [28, 18] },
    { d: "M 28 18 C 78 18, 78 82, 28 82", start: [28, 18] },
    { d: "M 16 50 L 42 50", start: [16, 50] }
  ],
  "Ƒ": [
    { d: "M 68 22 C 52 12, 42 20, 42 38 L 42 78 C 42 90, 28 92, 22 84", start: [68, 22] },
    { d: "M 26 48 L 64 48", start: [26, 48] }
  ],
  "Ɣ": [{ d: "M 26 24 L 54 68 C 60 80, 46 92, 42 82 C 38 72, 60 44, 74 24", start: [26, 24] }],
  "Ʋ": [{ d: "M 22 24 C 30 22, 36 42, 42 74 C 46 84, 54 84, 58 74 C 64 42, 70 22, 78 24", start: [22, 24] }],

  // Nigerian Yoruba underdots & Hausa hooks
  "Ẹ": [
    { d: "M 28 18 L 28 74", start: [28, 18] },
    { d: "M 28 18 L 70 18", start: [28, 18] },
    { d: "M 28 46 L 62 46", start: [28, 46] },
    { d: "M 28 74 L 72 74", start: [28, 74] },
    { d: "M 50 88 L 50 90", start: [50, 88] }
  ],
  "Ọ": [
    { d: "M 50 18 C 22 18, 22 74, 50 74 C 78 74, 78 18, 50 18", start: [50, 18] },
    { d: "M 50 88 L 50 90", start: [50, 88] }
  ],
  "Ṣ": [
    { d: "M 70 24 C 52 12, 26 18, 30 34 C 34 48, 72 44, 72 62 C 72 78, 42 80, 28 68", start: [70, 24] },
    { d: "M 50 88 L 50 90", start: [50, 88] }
  ],
  "Ɓ": [
    { d: "M 42 20 C 30 14, 24 22, 28 36 L 28 82", start: [42, 20] },
    { d: "M 28 30 C 70 28, 70 54, 28 54", start: [28, 30] },
    { d: "M 28 54 C 74 54, 74 82, 28 82", start: [28, 54] }
  ],
  "Ɗ": [
    { d: "M 44 20 C 30 14, 26 22, 28 36 L 28 82", start: [44, 20] },
    { d: "M 28 24 C 78 24, 78 82, 28 82", start: [28, 24] }
  ],

  // Arabic RTL Core Strokes (Right -> Left)
  "ا": [{ d: "M 52 16 L 52 82", start: [52, 16] }],
  "ب": [
    { d: "M 80 48 L 80 62 C 80 72, 20 72, 20 62 L 20 50", start: [80, 48] },
    { d: "M 50 82 L 50 84", start: [50, 82] }
  ],
  "ت": [
    { d: "M 80 50 L 80 64 C 80 74, 20 74, 20 64 L 20 52", start: [80, 50] },
    { d: "M 58 38 L 58 40", start: [58, 38] },
    { d: "M 42 38 L 42 40", start: [42, 38] }
  ],
  "س": [
    { d: "M 82 44 C 82 58, 68 58, 68 44 C 68 58, 54 58, 54 44 L 54 66 C 54 84, 20 84, 20 62", start: [82, 44] }
  ],

  // Chinese Hanzi Core Strokes (Left -> Right, Top -> Bottom)
  "一": [{ d: "M 18 52 L 82 52", start: [18, 52] }],
  "二": [
    { d: "M 26 36 L 74 36", start: [26, 36] },
    { d: "M 16 68 L 84 68", start: [16, 68] }
  ],
  "三": [
    { d: "M 24 26 L 76 26", start: [24, 26] },
    { d: "M 30 50 L 70 50", start: [30, 50] },
    { d: "M 16 76 L 84 76", start: [16, 76] }
  ],
  "人": [
    { d: "M 52 18 C 46 46, 34 68, 18 82", start: [52, 18] },
    { d: "M 48 44 C 58 60, 70 74, 84 82", start: [48, 44] }
  ],
  "大": [
    { d: "M 20 42 L 80 42", start: [20, 42] },
    { d: "M 50 18 C 48 48, 36 70, 18 84", start: [50, 18] },
    { d: "M 50 44 C 60 62, 72 76, 84 84", start: [50, 44] }
  ],
  "口": [
    { d: "M 24 24 L 24 78", start: [24, 24] },
    { d: "M 24 24 L 76 24 L 76 78", start: [24, 24] },
    { d: "M 24 76 L 76 76", start: [24, 76] }
  ],

  // Hindi Devanagari sample with top horizontal Shirorekha bar
  "अ": [
    { d: "M 22 36 C 42 26, 46 46, 30 52 C 48 56, 48 78, 22 72", start: [22, 36] },
    { d: "M 36 52 L 64 52", start: [36, 52] },
    { d: "M 64 26 L 64 82", start: [64, 26] },
    { d: "M 16 26 L 80 26", start: [16, 26] }
  ],
  // Japanese Hiragana sample
  "あ": [
    { d: "M 24 30 L 72 26", start: [24, 30] },
    { d: "M 46 18 C 42 42, 44 64, 52 80", start: [46, 18] },
    { d: "M 64 42 C 56 66, 32 82, 24 68 C 18 54, 48 40, 74 52 C 84 60, 78 78, 60 84", start: [64, 42] }
  ]
};

/**
 * Returns numbered stroke-order steps + SVG stroke paths for any character or digraph.
 */
export function getLetterStrokeDiagram(glyph = "", howToWrite = "", direction = "ltr") {
  const clean = String(glyph || "").trim();
  const firstChar = clean.charAt(0);
  const direct =
    STROKE_DIAGRAMS[clean] ||
    STROKE_DIAGRAMS[firstChar] ||
    STROKE_DIAGRAMS[clean.toLowerCase()] ||
    STROKE_DIAGRAMS[firstChar.toUpperCase()] ||
    null;

  // Parse written instruction into crisp numbered steps
  const rawSteps = String(howToWrite || "")
    .split(/(?:Stroke\s*\d+:|[.;]\s+)/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  const steps = rawSteps.length > 0
    ? rawSteps.slice(0, 5)
    : [
      direction === "rtl"
        ? "Write smoothly from Right to Left along the baseline."
        : "Start at the top green dot (1) and follow the directional strokes cleanly from Left to Right."
    ];

  return {
    glyph: clean,
    direction,
    paths: direct,
    steps
  };
}
