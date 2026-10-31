"use strict";
async function check() {
    return { status: "UP", lastBackupTime: new Date().toISOString(), storageUsedBytes: 104857600 };
}
module.exports = { check };
