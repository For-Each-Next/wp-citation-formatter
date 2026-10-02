/**
 * @file eslint.config.mjs
 * Purpose: eslint.config module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. Exports
 */

import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const browserGlobals = [
    "window",
    "document",
    "mw",
    "fetch",
    "localStorage",
    "sessionStorage",
    "navigator",
    "HTMLElement",
    "Element",
    "Node",
    "DOMParser",
];

export default defineConfig(
    globalIgnores([
        "dist/**",
        "coverage/**",
        "test-results/**",
        "playwright-report/**",
    ]),
    {
        files: ["**/*.{ts,mjs}"],
        extends: [js.configs.recommended, tseslint.configs.recommended],
        languageOptions: {
            globals: { ...globals.browser, ...globals.node, mw: "readonly" },
        },
        rules: {
            "@typescript-eslint/consistent-type-imports": [
                "error",
                { disallowTypeAnnotations: false },
            ],
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
            ],
            "no-eval": "error",
            "no-new-func": "error",
        },
    },
    {
        files: ["src/domain/**/*.ts"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            regex: "(?:^|/)(?:app|features|platform|i18n)(?:/|$)|^(?!\\.{1,2}/|entities$)",
                            message:
                                "Domain code depends only on domain, configuration, shared modules, and the pure HTML entity decoder.",
                        },
                    ],
                },
            ],
            "no-restricted-globals": [
                "error",
                { globals: browserGlobals, checkGlobalObject: true },
            ],
        },
    },
    {
        files: ["src/shared/**/*.ts"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            regex: "(?:^|/)(?:app|features|platform|domain|i18n)(?:/|$)|^(?!\\.{1,2}/)",
                            message:
                                "Shared modules must stay independent of application layers.",
                        },
                    ],
                },
            ],
            "no-restricted-globals": [
                "error",
                { globals: browserGlobals, checkGlobalObject: true },
            ],
        },
    },
    {
        files: ["src/platform/**/*.ts"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            regex: "(?:^|/)(?:features|i18n)(?:/|$)",
                            message:
                                "Platform adapters must not depend on product features or catalogs.",
                        },
                        {
                            regex: "(?:^|/)app(?:/|$)",
                            allowTypeImports: true,
                            message:
                                "Platform adapters may use application contracts only as types.",
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ["src/features/**/*.ts"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            regex: "(?:^|/)app(?:/|$)",
                            allowTypeImports: true,
                            message:
                                "Features receive application services through injected contracts.",
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ["src/**/*.d.ts"],
        rules: {
            "@typescript-eslint/no-empty-object-type": [
                "error",
                { allowInterfaces: "with-single-extends" },
            ],
        },
    },
    {
        files: ["src/types/codex-components.d.ts"],
        rules: {
            // Codex slots accept scopes specific to each mounted component.
            "@typescript-eslint/no-explicit-any": "off",
        },
    },
    {
        files: ["tests/**/*.ts"],
        rules: {
            // Host fixtures expose partial browser and MediaWiki runtimes.
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-empty-function": "off",
            // Fixture assertions preserve meaningful wikitext indentation.
            "no-regex-spaces": "off",
        },
    },
);
