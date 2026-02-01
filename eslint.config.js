import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.ts', 'tests/**/*.ts', 'tests/**/*.tsx'],
        languageOptions: {
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
            globals: {
                ...globals.node,
                ...globals.browser,
                describe: 'readonly',
                it: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                vi: 'readonly',
                act: 'readonly',
            },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
        },
    },
    {
        files: ['tests/**/*.ts', 'tests/**/*.tsx'],
        rules: {
            'no-global-assign': 'off',
        },
    },
    {
        files: ['src/native-api-types.ts'],
        rules: {
            '@typescript-eslint/no-redeclare': 'off',
        },
    },
    {
        ignores: ['dist/**', 'node_modules/**', 'demo/**'],
    },
];
