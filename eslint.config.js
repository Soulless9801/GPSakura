import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const react_prop_parameters = [
    'className',
    'style',
    'id',
    'ref',
    'children',
    'key',
    'defaultValue',
    'value',
    'placeholder',
    'type',
    'htmlFor',
    'disabled',
    'readOnly',
    'autoFocus',
    'tabIndex',
    'onChange',
    'onSubmit',
    'onClick',
    'onInput',
    'onBlur',
    'onFocus',
    'onKeyDown',
    'onKeyUp',
    'onMouseDown',
    'onMouseUp',
    'onMouseMove',
    'onPointerDown',
    'onPointerUp',
    'onPointerMove',
    'onClose',
    'onExited',
    'onSelect',
    'clientX',
    'clientY',
    'isSet',
    'nextValue',
    'setPage',
    'aria-label',
    'role',
]

const naming_rules = {
    '@typescript-eslint/naming-convention': [
        'error',
        {
            selector: 'parameter',
            format: ['camelCase'],
            filter: {
                regex: `^(${react_prop_parameters.join('|')})$`,
                match: true,
            },
        },
        {
            selector: 'parameter',
            format: ['PascalCase'],
            filter: {
                regex: '^Page$',
                match: true,
            },
        },
        {
            selector: 'variable',
            format: ['camelCase'],
            filter: {
                regex: '^(set[A-Z]|[a-z]+[A-Z][a-zA-Z0-9]*)$',
                match: true,
            },
        },
        {
            selector: 'variable',
            format: ['PascalCase'],
            filter: {
                regex: '^[A-Z][a-zA-Z0-9]*$',
                match: true,
            },
        },
        {
            selector: 'variable',
            format: ['snake_case', 'UPPER_CASE'],
            leadingUnderscore: 'allow',
        },
        {
            selector: 'parameter',
            format: ['snake_case'],
            leadingUnderscore: 'allow',
        },
        {
            selector: 'function',
            format: ['camelCase', 'PascalCase'],
        },
        {
            selector: 'typeLike',
            format: ['PascalCase'],
        },
    ],
}

export default defineConfig([
    globalIgnores(['dist', 'scripts', '.netlify', 'node_modules']),
    {
        files: ['**/*.{js,jsx}'],
        extends: [
            js.configs.recommended,
            reactHooks.configs['recommended-latest'],
            reactRefresh.configs.vite,
        ],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
            parserOptions: {
                ecmaVersion: 'latest',
                ecmaFeatures: { jsx: true },
                sourceType: 'module',
            },
        },
        rules: {
            'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
        },
    },
    ...tseslint.config(
        {
            files: ['**/*.{js,jsx,ts,tsx}'],
            extends: [tseslint.configs.recommended],
            languageOptions: {
                globals: {
                    ...globals.browser,
                    ...globals.node,
                },
            },
            rules: {
                ...naming_rules,
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            },
        },
    ),
])
