import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
    {
        ignores: ["dist/**"]
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["**/*.ts"],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module"
            },
            globals: {
                ...globals.node,
                ...globals.es2026
            }
        }
    }
];
