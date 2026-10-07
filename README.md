# GPSakura

A passion project manifested

- [Netlify](https://gpsakura.netlify.app) build

## Testing

```bash
npm run test:run   # run every test once
npm test           # watch mode
npm run coverage   # tests + coverage, enforces the floors in vite.config.ts
```

Tests live next to the code (`*.test.ts`, `*.test.tsx`) and under `netlify/functions`. Component
tests opt in to jsdom with a `// @vitest-environment jsdom` comment on the first line; everything
else runs in plain Node. Shared helpers for the Shengji engine are in `src/test/`.

A test written as `it.fails("KNOWN BUG: ...")` documents a defect that is still present: it asserts
the *correct* behaviour, passes while the bug exists, and fails once it is fixed, at which point the
`.fails` should be removed. [AUDIT.md](AUDIT.md) lists them all.

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
  