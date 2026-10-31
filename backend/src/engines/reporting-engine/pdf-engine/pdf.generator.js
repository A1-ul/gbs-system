"use strict";
async function generatePDF(htmlContent, options = {}) {
    // Return buffer dummy for mock print
    return Buffer.from("PDF_GBS_ENTERPRISE_REPORT_MOCK:" + htmlContent);
}
module.exports = { generatePDF };
