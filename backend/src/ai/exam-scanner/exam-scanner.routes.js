"use strict";

const express = require("express");
const router = express.Router();
const omrScannerService = require("./omr-scanner.service");
const autoGradingEngine = require("./auto-grading.engine");

router.post("/scan-sheet", async (req, res) => {
  try {
    const { imageBase64, examId, studentId } = req.body;
    const imageBuffer = Buffer.from(imageBase64 || "", "base64");
    const scanResult = await omrScannerService.processExamSheetImage(imageBuffer, examId, studentId);
    return res.status(200).json(scanResult);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/grade", async (req, res) => {
  try {
    const { extractedAnswers, answerKey, weights, negativeMarkRatio } = req.body;
    const gradeResult = await autoGradingEngine.gradeSheet(extractedAnswers, answerKey, weights, negativeMarkRatio);
    return res.status(200).json({ success: true, result: gradeResult });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
