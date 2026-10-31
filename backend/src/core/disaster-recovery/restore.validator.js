"use strict";
function validateBackup(backupData) {
    if (!backupData) return { valid: false, error: "Empty backup data" };
    if (!backupData.timestamp) return { valid: false, error: "Missing timestamp" };
    if (!backupData.version) return { valid: false, error: "Missing GBS database version" };
    return { valid: true };
}
module.exports = { validateBackup };
