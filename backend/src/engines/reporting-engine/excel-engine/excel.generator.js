"use strict";
async function generateExcel(data = [], headers = []) {
    const lines = [headers.join(",")];
    for (const row of data) {
        lines.push(headers.map(h => row[h] || "").join(","));
    }
    return Buffer.from(lines.join("\n"));
}
module.exports = { generateExcel };
