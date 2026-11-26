/**
 * GBS Optical Mark Recognition (OMR) & Mobile-Captured Student Script Extractor
 *
 * Strictly enforces the GBS Teacher-Only Answer Key Standard:
 * - Teachers ONLY enter their preferred correct answer key (Q1..QN).
 * - Student chosen answers are NEVER typed manually by the teacher — they are
 *   automatically extracted from the mobile-captured or uploaded student exam script
 *   via HTML5 Canvas optical bubble darkness & grid analysis.
 * - Produces exact lists of:
 *   1) Questions Marked Correct (count + exact question numbers)
 *   2) Questions Marked Wrong (count + exact question numbers with Student Choice vs Teacher Key)
 *   3) Final Score / Marks Obtained & Letter Grade.
 */

const OPTIONS = ["A", "B", "C", "D"];

/**
 * Loads an image dataUrl / URL into an HTMLImageElement cleanly.
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err || new Error("Could not decode captured script image."));
    img.src = src;
  });
}

/**
 * Compute mean grayscale luminance (0 = pure black ink, 255 = pure white paper)
 * inside a rectangular region of an ImageData buffer.
 */
function sampleRegionLuminance(data, imgW, imgH, x0, y0, x1, y1) {
  const sx = Math.max(0, Math.floor(x0));
  const sy = Math.max(0, Math.floor(y0));
  const ex = Math.min(imgW, Math.ceil(x1));
  const ey = Math.min(imgH, Math.ceil(y1));
  if (ex <= sx || ey <= sy) return 255;

  let sum = 0;
  let count = 0;
  for (let y = sy; y < ey; y++) {
    for (let x = sx; x < ex; x++) {
      const idx = (y * imgW + x) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      sum += lum;
      count++;
    }
  }
  return count > 0 ? sum / count : 255;
}

/**
 * Real HTML5 Canvas Optical Bubble Analysis on a captured student exam script image.
 * Supports multi-column layouts cleanly (1 column for <= 25 Qs, 2 columns for 26–50 Qs,
 * or 4 columns for > 50 Qs matching standard GBS OMR bubble sheets).
 *
 * @param {string} imageDataUrl - Captured camera frame or uploaded script photo data URL
 * @param {number} questionCount - Exact number of questions defined by the Teacher (1..N)
 * @returns {Promise<{ detectedAnswers: Record<number, string>, confidences: Record<number, number>, answeredCount: number, blankCount: number, imageWidth: number, imageHeight: number, method: string }>}
 */
export async function extractStudentAnswersFromScriptImage(imageDataUrl, questionCount = 10) {
  const totalQ = Math.max(1, Math.min(2000, parseInt(questionCount, 10) || 10));
  if (!imageDataUrl || typeof document === "undefined") {
    return {
      detectedAnswers: {},
      confidences: {},
      answeredCount: 0,
      blankCount: totalQ,
      imageWidth: 0,
      imageHeight: 0,
      method: "NO_IMAGE_CAPTURED"
    };
  }

  const img = await loadImage(imageDataUrl);
  const targetW = Math.min(900, Math.max(360, img.naturalWidth || img.width || 600));
  const targetH = Math.min(1200, Math.max(480, img.naturalHeight || img.height || 800));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const imgData = ctx.getImageData(0, 0, targetW, targetH);
  const pixels = imgData.data;

  // Determine standard GBS OMR answer grid bounds (matches printable GBS OMR sheets & standard paper bubble columns)
  const columns = totalQ <= 25 ? 1 : totalQ <= 50 ? 2 : totalQ <= 100 ? 4 : Math.ceil(totalQ / 25);
  const rowsPerCol = Math.ceil(totalQ / columns);

  const gridLeft = targetW * 0.10;
  const gridRight = targetW * 0.92;
  const gridTop = targetH * 0.16;
  const gridBottom = targetH * 0.92;
  const gridW = gridRight - gridLeft;
  const gridH = gridBottom - gridTop;
  const colW = gridW / columns;
  const rowH = gridH / Math.max(1, rowsPerCol);

  const detectedAnswers = {};
  const confidences = {};
  let answeredCount = 0;
  let blankCount = 0;

  for (let q = 1; q <= totalQ; q++) {
    const colIdx = Math.floor((q - 1) / rowsPerCol);
    const rowIdx = (q - 1) % rowsPerCol;

    const colStartX = gridLeft + colIdx * colW;
    const rowCenterY = gridTop + (rowIdx + 0.5) * rowH;

    // Reserve first 22% of column width for question number ("Q1"), remaining 78% for options A, B, C, D
    const optAreaLeft = colStartX + colW * 0.22;
    const optAreaW = colW * 0.74;
    const optStep = optAreaW / OPTIONS.length;
    const sampleHalfW = Math.max(3, optStep * 0.28);
    const sampleHalfH = Math.max(3, Math.min(rowH * 0.30, optStep * 0.28));

    const lums = OPTIONS.map((opt, oIdx) => {
      const cx = optAreaLeft + (oIdx + 0.5) * optStep;
      const lum = sampleRegionLuminance(
        pixels,
        targetW,
        targetH,
        cx - sampleHalfW,
        rowCenterY - sampleHalfH,
        cx + sampleHalfW,
        rowCenterY + sampleHalfH
      );
      return { opt, lum };
    });

    // Sort darkest (lowest luminance) first
    const sorted = [...lums].sort((a, b) => a.lum - b.lum);
    const darkest = sorted[0];
    const secondDarkest = sorted[1];
    const avgOtherLum = (sorted[1].lum + sorted[2].lum + sorted[3].lum) / 3;
    const contrastDelta = avgOtherLum - darkest.lum;
    const marginOverSecond = secondDarkest.lum - darkest.lum;

    // A genuinely shaded/marked bubble has noticeably lower luminance than unfilled bubbles in the same row
    if (contrastDelta >= 14 && marginOverSecond >= 8) {
      detectedAnswers[q] = darkest.opt;
      confidences[q] = Math.min(99, Math.max(78, Math.round(75 + contrastDelta * 0.45)));
      answeredCount++;
    } else if (darkest.lum < 145 && contrastDelta >= 6) {
      detectedAnswers[q] = darkest.opt;
      confidences[q] = Math.min(92, Math.max(70, Math.round(68 + contrastDelta * 0.6)));
      answeredCount++;
    } else {
      detectedAnswers[q] = "";
      confidences[q] = 95;
      blankCount++;
    }
  }

  return {
    detectedAnswers,
    confidences,
    answeredCount,
    blankCount,
    imageWidth: targetW,
    imageHeight: targetH,
    method: "OPTICAL_CANVAS_OMR"
  };
}

/**
 * Generates a high-contrast GBS Standard OMR Answer Sheet image (Data URL)
 * matching the exact optical grid coordinates used by extractStudentAnswersFromScriptImage.
 * Useful for printing blank/calibration sheets AND deterministic camera verification.
 */
export function generateStandardOmrSheetDataUrl(questionCount = 10, shadedAnswers = {}, headerTitle = "GBS STANDARD OMR EXAM SCRIPT") {
  const totalQ = Math.max(1, Math.min(200, parseInt(questionCount, 10) || 10));
  const width = 720;
  const height = 960;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // White paper background + crisp fiducial corner markers
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(22, 22, 24, 24);
  ctx.fillRect(width - 46, 22, 24, 24);
  ctx.fillRect(22, height - 46, 24, 24);
  ctx.fillRect(width - 46, height - 46, 24, 24);

  // Header Banner
  ctx.fillStyle = "#081833";
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(headerTitle, width / 2, 62);
  ctx.font = "13px Arial, sans-serif";
  ctx.fillStyle = "#334155";
  ctx.fillText(`Questions: 1–${totalQ} • Shade ONE bubble clearly per question (A, B, C, or D)`, width / 2, 88);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(60, 112);
  ctx.lineTo(width - 60, 112);
  ctx.stroke();

  const columns = totalQ <= 25 ? 1 : totalQ <= 50 ? 2 : totalQ <= 100 ? 4 : Math.ceil(totalQ / 25);
  const rowsPerCol = Math.ceil(totalQ / columns);
  const gridLeft = width * 0.10;
  const gridRight = width * 0.92;
  const gridTop = height * 0.16;
  const gridBottom = height * 0.92;
  const gridW = gridRight - gridLeft;
  const gridH = gridBottom - gridTop;
  const colW = gridW / columns;
  const rowH = gridH / Math.max(1, rowsPerCol);

  for (let q = 1; q <= totalQ; q++) {
    const colIdx = Math.floor((q - 1) / rowsPerCol);
    const rowIdx = (q - 1) % rowsPerCol;
    const colStartX = gridLeft + colIdx * colW;
    const rowCenterY = gridTop + (rowIdx + 0.5) * rowH;

    // Question number label
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 13px Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(`Q${q}`, colStartX + colW * 0.18, rowCenterY);

    const optAreaLeft = colStartX + colW * 0.22;
    const optAreaW = colW * 0.74;
    const optStep = optAreaW / OPTIONS.length;
    const radius = Math.max(6, Math.min(13, Math.min(rowH * 0.34, optStep * 0.30)));
    const studentPick = String(shadedAnswers[q] || shadedAnswers[String(q)] || "").trim().toUpperCase();

    OPTIONS.forEach((opt, oIdx) => {
      const cx = optAreaLeft + (oIdx + 0.5) * optStep;
      ctx.beginPath();
      ctx.arc(cx, rowCenterY, radius, 0, Math.PI * 2);
      if (studentPick === opt) {
        ctx.fillStyle = "#020617";
        ctx.fill();
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.fillStyle = "#475569";
        ctx.font = "bold 10px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(opt, cx, rowCenterY);
      }
    });
  }

  return canvas.toDataURL("image/png");
}

/**
 * Evaluates automatically extracted student answers strictly against the Teacher's Preferred Answer Key.
 * Returns exact counts + explicit numbered lists of Questions Marked Correct, Questions Marked Wrong,
 * and Final Score / Mark obtained.
 */
export function evaluateStudentScriptAgainstTeacherKey({
  teacherAnswerKey = {},
  extractedStudentAnswers = {},
  questionCount = 10,
  marksPerQuestion = 1
}) {
  const totalQuestions = Math.max(1, Math.min(2000, parseInt(questionCount, 10) || 10));
  const perQMarks = Math.max(0.25, Number(marksPerQuestion) || 1);

  const correctQuestions = [];
  const wrongQuestions = [];
  const unansweredQuestions = [];
  const questionBreakdown = [];

  for (let q = 1; q <= totalQuestions; q++) {
    const teacherPreferred = String(teacherAnswerKey[q] || teacherAnswerKey[String(q)] || "A").trim().toUpperCase();
    const studentChosen = String(extractedStudentAnswers[q] || extractedStudentAnswers[String(q)] || "").trim().toUpperCase();
    const isCorrect = Boolean(studentChosen) && studentChosen === teacherPreferred;

    if (isCorrect) {
      correctQuestions.push(q);
    } else {
      wrongQuestions.push({
        questionNumber: q,
        studentAnswer: studentChosen || "BLANK",
        correctAnswer: teacherPreferred,
        marksLost: perQMarks
      });
      if (!studentChosen) {
        unansweredQuestions.push(q);
      }
    }

    questionBreakdown.push({
      questionNumber: q,
      qNum: q,
      expected: teacherPreferred,
      correctAnswer: teacherPreferred,
      actual: studentChosen || "BLANK",
      studentAnswer: studentChosen || "BLANK",
      isCorrect,
      marksAwarded: isCorrect ? perQMarks : 0,
      maxMarks: perQMarks
    });
  }

  const correctCount = correctQuestions.length;
  const wrongCount = wrongQuestions.length;
  const unansweredCount = unansweredQuestions.length;
  const marksObtained = Math.round(correctCount * perQMarks * 100) / 100;
  const totalMarks = Math.round(totalQuestions * perQMarks * 100) / 100;
  const percentage = Math.round((correctCount / totalQuestions) * 100);
  const grade =
    percentage >= 90 ? "A+"
      : percentage >= 80 ? "A"
        : percentage >= 70 ? "B"
          : percentage >= 60 ? "C"
            : percentage >= 50 ? "D"
              : "F";

  return {
    totalQuestions,
    correctCount,
    wrongCount,
    unansweredCount,
    correctQuestions,
    wrongQuestions,
    unansweredQuestions,
    marksObtained,
    marksAwarded: marksObtained,
    totalMarks,
    maxMarks: totalMarks,
    scoreObtained: marksObtained,
    percentage,
    grade,
    isPassed: percentage >= 50,
    pass: percentage >= 50,
    questionBreakdown
  };
}
