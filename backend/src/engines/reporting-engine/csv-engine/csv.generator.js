"use strict";
async function generateCSV(data = [], headers = []) {
    const lines = [headers.join(",")];
    for (const row of data) {
        lines.push(headers.map(h => row[h] || "").join(","));
    }
    return lines.join("\n");
}
module.exports = { generateCSV };
