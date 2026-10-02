import globals from 'globals'
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
            format: ['camelCase'],
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
        files: ['**/*.{js,jsx,ts,tsx}'],
        plugins: {
            'react-refresh': reactRefresh,
        },
        extends: [
            tseslint.configs.recommended,
            tseslint.configs.strictTypeChecked,
        ],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            ...naming_rules,
            ...reactRefresh.configs.vite.rules,

            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/consistent-type-imports': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/no-unnecessary-condition': 'error',
            '@typescript-eslint/no-unsafe-argument': 'error',
            '@typescript-eslint/no-unsafe-assignment': 'error',
            '@typescript-eslint/no-unsafe-call': 'error',
            '@typescript-eslint/no-unsafe-member-access': 'error',
            '@typescript-eslint/no-unsafe-return': 'error',

            'arrow-body-style': ['error', 'as-needed'],
            curly: ['error', 'all'],
            eqeqeq: ['error', 'always'],
            'no-console': 'error',
            'no-debugger': 'error',
            'no-implicit-coercion': 'error',
            'no-var': 'error',
            'object-shorthand': 'error',
            'prefer-const': 'error',
            'prefer-template': 'error',
        },
    },
    {
        files: [
            'db/**/*.{js,jsx,ts,tsx}',
            'netlify/**/*.{js,jsx,ts,tsx}',
            'vite.config.{js,ts}',
            'eslint.config.js',
            'node_modules/**/*.{js,jsx,ts,tsx}',
        ],
        extends: [tseslint.configs.disableTypeChecked],
    },
])
