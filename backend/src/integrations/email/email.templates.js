"use strict";

function welcomeTemplate(
    name
) {

    return `
Welcome ${name}

Thank you for joining GBS.
`;
}

function resetPasswordTemplate(
    token
) {

    return `
Password Reset Token:

${token}
`;
}

module.exports =
    Object.freeze({

        welcomeTemplate,

        resetPasswordTemplate
    });