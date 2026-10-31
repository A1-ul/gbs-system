"use strict";

const logger = require("../../utils/logger");

/**
 * AI Deterministic Auto-Grading Engine
 */
class AutoGradingEngine {
  async gradeSheet(extractedAnswers, answerKey, questionWeights = {}, negativeMarkRatio = 0.25) {
    logger.info("EXECUTING_AUTO_GRADING_ENGINE");

    let totalScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    const itemizedResults = [];

    const totalQuestions = Object.keys(answerKey).length;

    for (const qNum of Object.keys(answerKey)) {
      const expected = answerKey[qNum];
      const actual = extractedAnswers[qNum];
      const markValue = questionWeights[qNum] || 1.0;

      if (actual === expected) {
        correctCount++;
        totalScore += markValue;
        itemizedResults.push({ qNum, status: "CORRECT", score: markValue });
      } else if (actual) {
        wrongCount++;
        const deduction = markValue * negativeMarkRatio;
        totalScore -= deduction;
        itemizedResults.push({ qNum, status: "WRONG", score: -deduction });
      } else {
        itemizedResults.push({ qNum, status: "BLANK", score: 0 });
      }
    }

    const maxScore = totalQuestions * 1.0;
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const isPassed = percentage >= 50.0;

    return {
      totalQuestions,
      correctCount,
      wrongCount,
      totalScore: Math.max(0, totalScore),
      percentage: percentage.toFixed(2),
      isPassed,
      grade: percentage >= 80 ? "A" : percentage >= 60 ? "B" : percentage >= 50 ? "C" : "F",
      itemizedResults,
      gradedAt: new Date()
    };
  }
}

module.exports = new AutoGradingEngine();
