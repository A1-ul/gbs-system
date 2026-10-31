import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
    js.configs.recommended,

    {
        files: ["**/*.{js,jsx}"],

        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module"
        },

        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh
        },

        rules: {
            ...reactHooks.configs.recommended.rules
        }
    }
];