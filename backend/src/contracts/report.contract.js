"use strict";
module.exports = {
    version: "1.0.0",
    requiredFields: ["id", "tenantId", "createdAt"],
    validateSchema(obj) {
        return this.requiredFields.every(field => field in obj);
    }
};
