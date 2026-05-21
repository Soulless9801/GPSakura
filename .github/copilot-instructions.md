# GPSakura - Copilot Agent Instructions

**Description**: The following protocol should be used by the Copilot Agent when making changes to code, configuration, or documentation in the projects affiliated with "GPSakura". 

**Purpose**: These instructions are designed to ensure that all modifications are made in a controlled, predictable, and reviewable manner, adhering to best practices for code quality, collaboration, and React/TypeScript development. 

**Notes***: For legacy JavaScript files, the same principles apply, but with allowances for existing code style and patterns.

---

## Core Principles

- **Preserve Existing Behavior**: Only modify what the user explicitly requests. Avoid speculative changes.
- **Prefer Additive Changes**: Add new features or improvements rather than refactoring existing code unless necessary.
- **Deterministic & Reproducible**: All changes must be reproducible and result in consistent behavior.
- **Thorough Testing**: Validate all changes locally before committing.

---

## Naming Conventions

### JavaScript/TypeScript

- **camelCase** for:
  - Variables
  - Functions
  - State fields
  - Methods
  - CSS class names (when using CSS Modules, export as camelCase)

- **PascalCase** for:
  - Classes
  - Interfaces
  - Types
  - React Components
  - File names for components (e.g., `MyComponent.tsx`)

- **UPPER_SNAKE_CASE** for:
  - Constants
  - Environment variables

### CSS

- **kebab-case** for CSS class names: `my-component-class`, `button-primary`
- CSS Modules: export class names as camelCase in JavaScript

### General Rules

- Avoid abbreviations or acronyms unless widely recognized and unambiguous, the likes of `API`, `URL`, `ID` are acceptable.
- Do not introduce snake_case or kebab-case unless required by external APIs or tooling
- Component file names must match the component name exactly

---

## Git Workflow Policy

### Critical Rules

- **NEVER push to remote** – this requires explicit human approval
- **Commit locally first** after thorough testing and validation
- **Do not merge to main** without explicit human approval and successful code review
- **Use preview branches** for review and testing before main merge

### Branch Strategy

- **main**: Production-ready code
- **preview**: `preview/<branchName>` – for code review and testing
- **Feature branches**: `feature/description` (e.g., `feature/navbar-mobile-menu`)
- **Bug fixes**: `fix/description` (e.g., `fix/hero-image-loading`)
- **Chores**: `chore/description` (e.g., `chore/update-dependencies`)

### Commit Workflow

1. Make changes on a feature/fix/chore branch
2. Test thoroughly locally (`npm run lint`, `npm run build`)
3. Commit with clear, descriptive messages
4. Push to a preview branch for review
5. Await human approval before merging to main

---

## TypeScript & Type Safety

### Required Standards

- **Strict Mode**: TypeScript strict mode is enforced in `tsconfig.json`. All code must pass strict type checking.
- **Explicit Types**: Always declare function parameters and return types explicitly. Avoid implicit `any`.
- **No `as` Assertions**: Do not use type assertions (`as Type`) unless absolutely necessary. Use type guards or proper typing instead.
- **Interface vs Type**:
  - Use `interface` for object shapes that may be extended
  - Use `type` for unions, primitives, or immutable definitions
- **React Component Types**:
  - Use `React.FC<Props>` or `function ComponentName(props: Props)` syntax
  - Define props as interfaces for reusable components
  - Use `React.ReactNode` or `React.ReactElement` for children props

### File Extensions

- `.tsx` for React components
- `.ts` for utilities and non-JSX code
- `.jsx` and `.js` only for legacy code; prefer `.tsx` and `.ts` for all new code

---

## Component Structure & Organization

### Directory Organization

```
src/
├── components/        # Reusable UI components
│   ├── common/       # Generic components (Button, Modal, etc.)
│   ├── layout/       # Layout components (Header, Footer, etc.)
│   └── [Feature]/    # Feature-specific components
├── pages/            # Page components (route-level)
├── entities/         # Data models, constants, enums
├── utils/            # Utility functions, helpers
├── hooks/            # Custom React hooks
├── services/         # API calls, external service integrations
├── styles/           # Global styles and CSS variables
└── types/            # Shared TypeScript types (if not co-located)
```

### Component Naming & Structure

- One component per file (unless it's a small, tightly-coupled sub-component)
- Component files match the component name: `MyComponent.tsx` exports `MyComponent`
- Co-locate component tests and styles with the component file when possible
- Use barrel exports (`index.ts`) in folders for cleaner imports: `import { MyComponent } from '@/components/common'`

### React Best Practices

- **Functional Components Only**: No class components. Use hooks for state and effects.
- **Hook Rules**: Follow all React hook rules (dependencies, no hooks in loops, etc.).
- **Custom Hooks**: Extract complex logic into custom hooks in a `hooks/` directory.
- **Prop Drilling Prevention**: Use Context or state management for deeply nested props. Document with comments if drilling is necessary.
- **React.memo**: Use for performance optimization, ONLY when profiling shows improvement.
- **Keys in Lists**: Always use stable, unique keys (not array indices) when rendering lists.

---

## State Management

### Local State

- Use `useState` for component-local state
- Use `useReducer` for complex state logic with multiple related pieces

### Shared State

- Use React Context + `useContext` for moderate amounts of shared state
- For complex global state, consider a lightweight state library (not Redux unless necessary)
- Keep context consumers close to where state is used; avoid wrapping the entire app with multiple contexts

### Data Fetching

- Use `useEffect` for data fetching with proper cleanup
- Consider `React.Suspense` and error boundaries for loading/error states
- **Centralize API calls** in `services/` folder; never inline fetch calls in components

---

## Styling & CSS

### Conventions

- **Bootstrap Integration**: This project uses Bootstrap 5. Leverage utility classes for responsive design.
- **CSS Modules or Inline Styles**: For component-specific styles, use CSS Modules (`.module.css`) or inline styles.
- **Global Styles**: Place global styles in `src/styles/index.css` or a SCSS file if the project adopts SCSS.
- **CSS Variables**: Use CSS custom properties for theme colors and spacing; define in a root stylesheet.
- **Avoid !important**: Use specificity or proper structure instead.
- **Responsive Design**: Mobile-first approach; use Bootstrap breakpoints or CSS media queries consistently.
- **Avoid Abbreviations**: Use descriptive class names

### Naming

- CSS class names use kebab-case: `my-component-class`, `button-primary`
- If using CSS Modules, export class names as camelCase in JavaScript: `styles.myComponentClass`

---

## Code Quality & Linting

### ESLint Compliance

- All code must pass `npm run lint` without warnings or errors
- Run `npm run lint` before committing changes
- Do not disable ESLint rules without documenting why (use `// eslint-disable-line` with justification)

### Pre-Commit Checklist

- [ ] Code passes linting (`npm run lint`)
- [ ] Production build succeeds (`npm run build`)
- [ ] Manual testing completed locally
- [ ] No console errors or warnings (except expected ones)
- [ ] Commit message is clear and follows conventions

### Code Review Guidelines

- Keep commits focused; one feature or fix per commit
- Write clear commit messages describing the **what** and **why**
- Test all changes locally before committing
- Run the full build (`npm run build`) to ensure no runtime errors

---

## Testing Strategy

### Testing Expectations

- **Unit Tests**: Write unit tests for utility functions and custom hooks
- **Component Tests**: Test components for proper rendering and user interactions
- **Integration Tests**: Test flows that involve multiple components or services
- **Test Location**: Store tests alongside the source code with `.test.ts` or `.test.tsx` suffix
- **Testing Library**: Use React Testing Library for component tests (if test infrastructure exists)

### Running Tests

- Tests should run with `npm test` or similar command if configured
- All tests must pass before committing
- Maintain or improve code coverage; do not decrease it

---

## Performance Optimization

### Code Splitting

- Use React Router's lazy loading for page components: `const Page = lazy(() => import('./pages/Page'))`
- Load heavy libraries (Three.js, KaTeX, Shiki) on-demand if not used on all pages

### Bundle Size

- Monitor bundle size; avoid unnecessary dependencies
- Prefer tree-shakeable imports: `import { specific } from 'library'` over `import library`

### Runtime Performance

- Use React DevTools Profiler to identify bottlenecks
- Memoize expensive computations with `useMemo`
- Prevent unnecessary re-renders with `useCallback` for callback props
- Lazy-load images using native `loading="lazy"` or intersection observer

---

## Error Handling & Logging

### Error Handling

- Use Error Boundaries for React component errors (wrap page components)
- Handle promise rejections in async functions with try/catch
- Provide user-friendly error messages; log technical details for debugging
- Never suppress errors silently unless explicitly intentional

### Logging

- Use `console.log`, `console.warn`, `console.error` appropriately
- Remove or comment out debug logs before committing to main
- Consider a logging service for production analytics (if applicable)

---

## Accessibility (a11y)

### Standards

- Follow WCAG 2.1 AA guidelines where practical
- Use semantic HTML: `<button>`, `<nav>`, `<main>`, `<section>`, etc.
- Include `aria-label` or `aria-labelledby` for interactive elements without visible text
- Ensure all images have meaningful `alt` text
- Maintain sufficient color contrast; test with contrast checkers
- Support keyboard navigation; ensure all interactive elements are focusable

### Testing

- Test with keyboard navigation (Tab, Enter, Escape)
- Use browser accessibility inspector to check for issues
- Test with screen readers if applicable to the feature

---

## External Integrations

### Firebase

- Firebase configuration should be in environment variables or a config file
- Never commit Firebase credentials to the repository
- Use Firebase services (Auth, Firestore, Hosting) according to their best practices

### Ably & Real-time Communication

- Centralize Ably client initialization in a service file
- Handle connection state gracefully (offline, reconnecting, connected)
- Clean up subscriptions on component unmount

### Third-party Libraries

- Document why external libraries are added (dependencies in package.json should be clear)
- Keep dependencies updated; use `npm outdated` regularly
- Prefer lightweight libraries over heavy frameworks when possible

---

## Documentation

### Code Comments

- Add comments for **why**, not **what**. The code should be self-explanatory for "what".
- Document complex algorithms, business logic, or non-obvious patterns
- Document breaking changes or important configuration details in component props

### README & Setup

- Update project README if adding new dependencies or setup steps
- Document how to run dev server, build, and deploy
- Include environment variable setup instructions

### Commit Messages

- Use clear, descriptive messages: `Fix navbar responsive layout on mobile` vs. `Fix bug`
- Include context: `Add password reset flow via email (Firebase Auth)`
- Reference issues if applicable: `Closes #42`

---

## Development Workflow

### Local Development

1. Run `npm install` after pulling new dependencies
2. Start dev server with `npm run dev`
3. Make changes in a feature branch
4. Run `npm run lint` to check code quality
5. Run `npm run build` to verify production build
6. Commit changes locally with descriptive messages

### Before Committing

- [ ] Code passes linting (`npm run lint`)
- [ ] Production build succeeds (`npm run build`)
- [ ] Manual testing completed locally
- [ ] No console errors or warnings (except expected ones)
- [ ] Commit message is clear and follows conventions

---

## Environment Variables

### Setup

- Use a local `.env` file (typically already present for you) in the project root for local development (add to `.gitignore` and NEVER commit this file).
- Once again, NEVER commit sensitive credentials (API keys, secrets) to the repository in any form.

### Usage

- NEVER expose the value of environment variables to the client. Treat all such values as secrets (API keys, Firebase config, etc.) and only use them in server-side code or during build time.
- Environmental variables should be accessed via `process.env.VARIABLE_NAME` in SERVER code only.

---

## Build & Deployment

### Production Build

- Run `npm run build` to create a production-ready bundle
- Verify build output has no errors or critical warnings
- Test production build locally with `npm run preview`

### Deployment Considerations

- The project uses Netlify (`netlify.toml` configured). Follow Netlify deployment conventions.
- Ensure environment variables are configured in Netlify dashboard for production
- Monitor build logs for errors post-deployment

---

## Quick Reference: Key Rules

1. ✅ **Always follow TypeScript strict mode**
2. ✅ **Use functional components and hooks exclusively**
3. ✅ **Pass `npm run lint` and `npm run build` before committing**
4. ✅ **Use camelCase for JS, PascalCase for components/types, UPPER_SNAKE_CASE for constants**
5. ✅ **Commit locally with clear messages; never push without approval**
6. ✅ **Centralize API calls and external services**
7. ✅ **Test locally before committing; prioritize user experience and accessibility**
8. ✅ **Document the "why", not the "what"; keep code self-explanatory**
9. ✅ **Use Bootstrap utilities for styling; maintain responsive design**
10. ✅ **Never commit secrets or credentials; use environment variables**

---