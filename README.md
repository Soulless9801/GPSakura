# GPSakura

A passion project manifested

- [Netlify](https://gpsakura.netlify.app) build

## Testing

```bash
npm run test:run   # run every test once
npm test           # watch mode
npm run coverage   # tests + coverage, enforces the floors in vitest.config.ts
```

Tests live next to the code (`*.test.ts`, `*.test.tsx`) and under `netlify/functions`. Component
tests opt in to jsdom with a `// @vitest-environment jsdom` comment on the first line; everything
else runs in plain Node. Shared helpers for the Shengji engine are in `src/test/`.

All previously expected failures are now ordinary regression tests. [AUDIT.md](AUDIT.md) and
[REMAINING_BUGS.md](REMAINING_BUGS.md) record the fixes and remaining unpinned issues.

## Production build

`npm run build` typechecks application sources with `tsconfig.build.json`, then Vite bundles
the application from `index.html` into `dist/`. Unit tests, specs, and `src/test/` are excluded
from the production TypeScript roots. `npm run typecheck` still checks the full `src/` tree,
including tests. Vitest configuration and coverage settings live separately in `vitest.config.ts`.

Vite checks its actual production module graph and rejects unit test files, test libraries and
test helpers if they are imported into the build. The interactive Shengji Test panel and its
test-case generator are application features and remain available in production, loaded on demand.

Netlify discovers functions only in `netlify/entrypoints/`. That directory contains seven small
handler re-exports; keep tests and implementation helpers in `netlify/functions/`, outside the
discovery directory. Esbuild traces each handler's runtime imports. The `included_files` settings
in `netlify.toml` copy only the filesystem-loaded Firebase JSON and Codeforces CSV fallbacks to
their respective functions. Application source, tests and coverage are not copied as extra assets.

## Credits

### Core Framework

- [React](https://github.com/facebook/react) 
- [React DOM](https://github.com/facebook/react)
- [React Router](https://github.com/remix-run/react-router)
- [Vite](https://github.com/vitejs/vite)

### Mathematical Typesetting & Syntax Highlighting

- [Katex](https://github.com/KaTeX/KaTeX)
- [Shiki](https://github.com/AVGVSTVS96/react-shiki)

### UI, Animations, Icons
- [Bootstrap](https://github.com/twbs/bootstrap)
- [Motion (formerly Framer Motion)](https://github.com/motiondivision/motion)
- [Font Awesome Free](https://github.com/FortAwesome/Font-Awesome)
- [Three.js](https://github.com/mrdoob/three.js)

### Utilities
- [jQuery](https://jquery.com)
- [Datatables](https://github.com/DataTables/DataTables)
- [datatables.net-dt](https://github.com/DataTables/Dist-DataTables-DataTables)

### APIs

- [Firebase](https://github.com/firebase/firebase-js-sdk)
- [dotenv](https://github.com/motdotla/dotenv)

### Services

- [Ably](https://github.com/ably/ably-js)
- [Upstash Redis](https://github.com/upstash/redis-js)

### Tools

- [ESLint](https://github.com/eslint/eslint)
- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react)

All third-party software are used in accordance with their respective licenses as listed on project websites or repositories.
