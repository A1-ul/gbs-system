"use strict";
async function exportAudit(logs = []) {
    return Buffer.from("AUDIT_EXPORT_DATA:" + JSON.stringify(logs));
}
module.exports = { exportAudit };
