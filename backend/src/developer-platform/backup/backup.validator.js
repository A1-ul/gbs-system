"use strict";
function validateBackup(backup) {
    if (!backup || !backup.timestamp) {
        return { valid: false, error: "Invalid backup metadata" };
    }
    return { valid: true };
}
module.exports = { validateBackup };
