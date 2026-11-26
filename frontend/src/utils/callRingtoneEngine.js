/**
 * GBS In-System Video & Voice Call Ringtone & Ringback Audio Engine
 *
 * Uses the Web Audio API (zero external mp3 files to fail or 404):
 * - Outgoing Call Ringback Tone: Classic telephone ringback (440Hz + 480Hz dual sine, 1.8s ON / 2.6s OFF)
 *   so the caller hears clearly that their outgoing video or voice call is ringing.
 * - Incoming Call Ringtone: Crisp classic telephone double-ring (440Hz + 480Hz + subtle bell harmonic,
 *   double-pulse 0.45s + 0.45s every 2.8s) + optional spoken caller identity announcement
 *   ("Incoming video call from <Name>, <Position>").
 * - Auto-unlocks AudioContext cleanly on any user interaction and stops immediately on answer/decline/end.
 */

let ringAudioCtx = null;
let outgoingTimer = null;
let incomingTimer = null;
let activeOscillators = [];
let lastAnnouncedCallId = null;

function ensureRingAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!ringAudioCtx || ringAudioCtx.state === "closed") {
    ringAudioCtx = new Ctx();
  }
  if (ringAudioCtx.state === "suspended") {
    ringAudioCtx.resume().catch(() => { });
  }
  return ringAudioCtx;
}

// Unlock audio context smoothly on first user gesture anywhere in the app
if (typeof window !== "undefined") {
  const unlockOnce = () => {
    try {
      const ctx = ensureRingAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => { });
      }
    } catch { }
  };
  window.addEventListener("pointerdown", unlockOnce, { passive: true });
  window.addEventListener("keydown", unlockOnce, { passive: true });
}

function stopActiveOscillators() {
  for (const node of activeOscillators) {
    try {
      if (typeof node.stop === "function") node.stop();
    } catch { }
    try {
      if (typeof node.disconnect === "function") node.disconnect();
    } catch { }
  }
  activeOscillators = [];
}

function playDualToneBurst(freqA, freqB, durationSec, gainLevel = 0.14, delaySec = 0) {
  const ctx = ensureRingAudioContext();
  if (!ctx) return;
  try {
    const start = ctx.currentTime + delaySec;
    const end = start + durationSec;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(freqA, start);
    osc2.frequency.setValueAtTime(freqB, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(gainLevel, start + 0.03);
    gain.gain.setValueAtTime(gainLevel, Math.max(start + 0.04, end - 0.04));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(start);
    osc2.start(start);
    osc1.stop(end + 0.02);
    osc2.stop(end + 0.02);

    activeOscillators.push(osc1, osc2, gain);
  } catch { }
}

/**
 * Starts classic outgoing call ringback tone while waiting for the recipient to answer.
 */
export function startOutgoingRingbackTone() {
  stopOutgoingRingbackTone();
  const pulse = () => {
    playDualToneBurst(440, 480, 1.65, 0.11, 0);
  };
  pulse();
  outgoingTimer = setInterval(pulse, 3800);
}

export function stopOutgoingRingbackTone() {
  if (outgoingTimer) {
    clearInterval(outgoingTimer);
    outgoingTimer = null;
  }
  if (!incomingTimer) {
    stopActiveOscillators();
  }
}

/**
 * Starts classic incoming telephone ringing tone + vibrates mobile devices + announces
 * caller name and position once per incoming call ID.
 */
export function startIncomingRingtone({ callId, callerName, callerPosition, mediaMode = "VIDEO" } = {}) {
  stopIncomingRingtone();

  const ringPattern = () => {
    // Classic double-pulse ringtone (bright chime + dual bell frequencies)
    playDualToneBurst(523.25, 659.25, 0.42, 0.16, 0);
    playDualToneBurst(523.25, 659.25, 0.42, 0.16, 0.56);
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate([320, 160, 320]);
      } catch { }
    }
  };

  ringPattern();
  incomingTimer = setInterval(ringPattern, 2750);

  // Announce caller name & position clearly once per incoming call so user immediately knows who is calling
  if (callId && lastAnnouncedCallId !== callId && typeof window !== "undefined" && "speechSynthesis" in window) {
    lastAnnouncedCallId = callId;
    try {
      const modeLabel = String(mediaMode || "VIDEO").toUpperCase() === "VOICE" ? "voice call" : "video call";
      const posSuffix = callerPosition ? `, ${callerPosition}` : "";
      const phrase = `Incoming ${modeLabel} from ${callerName || "a school member"}${posSuffix}.`;
      const u = new SpeechSynthesisUtterance(phrase);
      u.rate = 1.02;
      u.pitch = 1.05;
      u.volume = 0.9;
      setTimeout(() => {
        if (incomingTimer) {
          try { window.speechSynthesis.speak(u); } catch { }
        }
      }, 900);
    } catch { }
  }
}

export function stopIncomingRingtone() {
  if (incomingTimer) {
    clearInterval(incomingTimer);
    incomingTimer = null;
  }
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try { navigator.vibrate(0); } catch { }
  }
  if (!outgoingTimer) {
    stopActiveOscillators();
  }
}

export function stopAllCallRingtones() {
  stopOutgoingRingbackTone();
  stopIncomingRingtone();
  stopActiveOscillators();
}

export function formatRolePositionLabel(role = "") {
  const r = String(role || "").trim().toUpperCase();
  const MAP = {
    DEVELOPER: "System Engineer / Developer",
    SUPER_ADMIN: "Executive Headmaster / Director",
    ADMIN: "Headmaster / Principal",
    HEADMASTER: "Headmaster / Principal",
    PRINCIPAL: "Principal / Headmaster",
    TEACHER: "Teacher / Lecturer",
    LECTURER: "Lecturer / Teacher",
    SECRETARY: "School Secretary",
    CLINIC_DOCTOR: "School Clinic Doctor",
    CLINIC_NURSE: "School Clinic Nurse",
    DOCTOR: "School Clinic Doctor",
    NURSE: "School Clinic Nurse",
    ACCOUNTANT: "Accountant / Bursar",
    BURSAR: "Accountant / Bursar",
    HR: "Human Resources Officer",
    STAFF: "Non-Teaching Staff",
    STUDENT: "Student",
    PARENT: "Parent / Guardian",
    ALUMNI: "Alumni Member"
  };
  return MAP[r] || (r ? r.replace(/_/g, " ") : "School Member");
}
