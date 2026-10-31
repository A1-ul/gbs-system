"use strict";

class Validator {

    static isObject(value) {

        return (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        );
    }

    static isString(value) {

        return typeof value === "string";
    }

    static isNumber(value) {

        return (
            typeof value === "number" &&
            Number.isFinite(value)
        );
    }

    static isBoolean(value) {

        return typeof value === "boolean";
    }

    static isArray(value) {

        return Array.isArray(value);
    }

    static isEmail(email) {

        if (
            typeof email !== "string"
        ) {
            return false;
        }

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            email.trim()
        );
    }

    static isUUID(value) {

        if (
            typeof value !== "string"
        ) {
            return false;
        }

        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            value
        );
    }

    static hasRequiredFields(
        payload,
        fields = []
    ) {

        const missing = [];

        for (
            const field of fields
        ) {

            const value =
                payload?.[field];

            if (
                value === undefined ||
                value === null ||
                value === ""
            ) {

                missing.push(
                    field
                );
            }
        }

        return {
            valid:
                missing.length === 0,
            missing
        };
    }

    static sanitizeString(
        value
    ) {

        if (
            typeof value !== "string"
        ) {
            return "";
        }

        return value
            .trim()
            .replace(/\s+/g, " ");
    }
}

module.exports =
    Object.freeze(
        Validator
    );