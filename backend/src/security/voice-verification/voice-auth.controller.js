"use strict";

const voiceSTTService = require("./voice-stt.service");
const voiceMatchService = require("./voice-match.service");
const logger = require("../../utils/logger");

class VoiceAuthController {
  async processVoiceAuthentication(req, res) {
    try {
      const { userId, audioBase64, passphrase } = req.body;

      if (!userId || !audioBase64) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: userId or audioBase64"
        });
      }

      const audioBuffer = Buffer.from(audioBase64, "base64");

      // Step 1: Speech to Text
      const sttResult = await voiceSTTService.transcribeAudio(audioBuffer);

      // Step 2: Speaker Verification
      const matchResult = await voiceMatchService.verifyVoiceIdentity(userId, audioBuffer, passphrase);

      if (!matchResult.isMatched) {
        logger.warn("VOICE_AUTH_FAILED", { userId });
        return res.status(401).json({
          success: false,
          status: "FAIL",
          error: "Voice Identity Verification Failed"
        });
      }

      logger.info("VOICE_AUTH_SUCCESS", { userId });

      return res.status(200).json({
        success: true,
        status: "PASS",
        userId,
        transcription: sttResult.transcribedText,
        confidence: matchResult.matchScore,
        rbacStatus: "ACCESS_GRANTED"
      });
    } catch (err) {
      logger.error("VOICE_AUTH_ERROR", { message: err.message });
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new VoiceAuthController();
