# Audit findings

Produced alongside the unit-test suite. Every item marked **pinned** has a test tagged
`KNOWN BUG` (or `SECURITY`) that documents the defect. Known-bug tests use `it.fails(...)`: they
assert the *correct* behaviour, so the suite stays green while the bug exists and **turns red the
moment it is fixed**. When that happens, delete the `.fails` and the test becomes a regression
guard. Find them all with `grep -rn "it.fails" src netlify`.

Items marked **fixed** were resolved after the first audit pass; their tests are now ordinary
regression tests (no `.fails`).

For a detailed, agent-oriented description of everything still open (root causes, line
references, suggested fixes, work packages), see [REMAINING_BUGS.md](REMAINING_BUGS.md).

Items marked **reported** came from a static read of the UI code and are *not* covered by a test.
Treat them as leads, not confirmed defects.

The first pass changed no application source. The signing and path-traversal findings (S1, S2,
S3, S8) the round-2 findings (G1, G1b), the markdown/table escaping (S4) and the small blackjack bugs (G5, G6, phantom refill) were then fixed. Shengji follow-up fixes are recorded below and in `REMAINING_BUGS.md`.

## Security

| # | Finding | Status |
|---|---------|--------|
| S1 | ~~`create-session` `action: "sign"` signed any `clientId` for any caller~~ so anyone could impersonate another player. **Fixed:** the server now mints identities itself (`create-session` `issue`; `neon-create-user` returns a signature for the player id it creates) and the `sign` action is gone, so a signature proves the id was issued by the server. | **fixed**: `create-session.test.ts`, `neon-create-user.test.ts`, `shengji-game-room.test.ts` |
| S2 | ~~An unset `SESSION_SECRET` silently became an empty HMAC key.~~ **Fixed:** signing throws and verifying returns false when the secret is missing; signatures are compared in constant time. | **fixed**: `create-session.test.ts` |
| S3 | ~~`firebase-collection-query` spliced `loc` into a file path unchecked.~~ **Fixed:** `loc` must match `[A-Za-z0-9_-]+` (400 otherwise) and is joined onto the data directory. Still open: the `col` parameter lets callers read any Firestore collection. | **fixed** (traversal): `firebase-collection-query.test.ts` |
| S4 | ~~`parseMarkdown` escaped nothing and `TextParser` assigns the result to `innerHTML`; raw HTML ran and link URLs could break out of `href`.~~ **Fixed:** input is HTML-escaped before any markup is added; math and link URLs are protected from the emphasis rules; links get `rel="noopener noreferrer"`. The Codeforces and USACO tables interpolated remote strings into HTML cells the same way; they now use `escapeHtml`/`linkHtml` (`src/utils/html.ts`), which also restricts hrefs to http(s). | **fixed**: `parse.test.ts`, `html.test.ts`, `TextParser.test.tsx` |
| S5 | Shengji signatures are verified before consuming the claimed player's rate-limit budget. | **fixed**: `shengji-game-room.test.ts` |
| S6 | `speed_draw` / `speed` require a seated player and a development environment; the production client hides the button. | **fixed**: `shengji-game-room.test.ts` |
| S7 | `neon-create-user` mints a funded account per unauthenticated call; `refill` adds 1000 at any balance. ~~`refill` reported money for a player that does not exist.~~ **Fixed** (phantom refill: now "Player not found"). Open: account minting and unlimited refill. | phantom refill **fixed**; rest documented |
| S8 | ~~`getIdentity` treated the server's `200 {valid:false}` as valid.~~ **Fixed** as part of the identity rewrite: only `valid === true` reuses a stored identity. | **fixed**: `verify.test.ts` |

## Game logic

| # | Finding | Status |
|---|---------|--------|
| G1 | ~~After round 1 the next deal started with the winner of the last trick instead of the new zhuang~~ (`endTrick` overwrote the `turn` set by `endRound`), which dealt uneven hands (24 vs 25 cards) and a 9-11 card kitty in 139 of 200 simulated rounds, then made legal moves fail. **Fixed:** `endTrick` hands over to `endRound` and stops; `endRound` also resets `chu`/`lead`. | **fixed**: `game.test.ts` (Shengji) |
| G1b | ~~`state.discard` was never cleared between rounds.~~ `GameRoom` passes it to the advisor as the cards already seen, so from round 2 the advisor saw more copies than the pack holds and refused to give advice. **Fixed:** cleared in `endRound`. The trump suit is also reset to none each round, so a suit is only trump for the round it was declared in. | **fixed**: `game.test.ts` (Shengji) |
| G2 | Joker pairs form a tractor even at trump rank 2, including no-trump and joker declarations. | **fixed**: `comparison.test.ts` |
| G3 | Held pairs must answer pair leads. The existing house rule allowing triples to remain intact is preserved. | **fixed**: `comparison.test.ts`, `following.test.ts` |
| G4 | Throws enforce reply count, allow short-suit padding, require sufficient copies to beat a component, and require one actual line when led. Advisor follows and mixed tractor/pair/single replies are covered. | **fixed**: `comparison.test.ts`, `throws.test.ts` |
| G5 | ~~Blackjack: a **tie lost the bet**.~~ **Fixed** (a push returns the bet). ~~Starting a new hand while one was unfinished was allowed and unfinished hands are never charged, so a bad deal could be abandoned for free.~~ **Fixed** (409 "Finish your current hand first"; the open hand is resumed with Load). Still open: concurrent `stand` requests could double-settle (read-modify-write on `money`); not tested. | tie and abandon **fixed**: `blackjack-game-room.test.ts` |
| G6 | `RNG(0)`, blackjack deck deserialization, and Shengji hand deserialization aliasing are resolved. | **fixed** |
| G7 | The test-case generator draws trump ranks directly from 2 through 14. | **fixed**: `testcase.test.ts` |

## Client utilities and components

| # | Finding | Status |
|---|---------|--------|
| C1 | `loadValue` throws on corrupt JSON in `localStorage`; it runs inside `useState` initialisers, so this blanks the page. | pinned |
| C2 | `convertToPixels("1.50em")` ignores the unit (it removes `String(parseFloat(x))` from the input). | pinned |
| C3 | `findIndex` compares `item.value === String(val)`, so numeric `Select` options never match their saved default (the Chaos demo's dimension switch). `Select` throws with empty `options`. | pinned |
| C4 | `Particle` with zero velocity becomes `NaN`. | pinned |
| C5 | `Form` with `notifyOnInitChange={false}` (used by `Slider` and the colour selector) swallows every second edit; values can snap above `max` (`step=2, max=5` shows 6). `Slider`'s track does not follow typed input unless the parent echoes the value back. | pinned: `Form.test.tsx`, `Slider.test.tsx` |
| C6 | Hand classes are separated; selection and highlighting survive equal cards recreated during render and reset together on changed contents. | **fixed**: `Hand.test.tsx`, `Card.test.tsx` |
| C7 | `Modal` leaves `body { overflow: hidden }` behind if unmounted while open. `GenericButton` has no accessible name. | pinned |
| C8 | `framer-motion` is imported (`Hand`, `BlogApp`) but only `motion` is declared in `package.json`. Works today because `motion` pulls it in. | pinned: `package-hygiene.test.ts` |
| C9 | Shengji connection updates publish only on pause/resume transitions. Clients deduplicate by missing player IDs, sync returns, retry rejected updates, and explicitly load initial state. | **fixed**: `shengji-game-room.test.ts`, `GameRoom.test.tsx` |
| C10 | Other reported leads: `ParticleNetwork` captures a stale `interactive` flag and misses `pointerup` outside its wrapper; `BlogApp`/`CodeforcesTable`/`USACOTable` fetch without `res.ok` checks (and USACO has a response-order race); no error boundary or catch-all route around lazy routes; **fixed:** `GameInfo` advice now reacts to the latest hand and current trick (`GameRoom.test.tsx`); `FreqGuesser` counts every page load as a give-up; hex shorthand typed into the colour field is silently ignored; `Chaos` ignores `refresh`. | reported |

## What changed in the repository

* `src/**/*.test.ts(x)`, `netlify/**/*.test.ts`, `src/test/` (shared Shengji harness, jsdom setup).
* `vite.config.ts`: Vitest config, coverage provider and per-directory coverage floors.
* `package.json`: `test:run` and `coverage` scripts; dev-dependencies `@vitest/coverage-v8`, `jsdom`,
  `@testing-library/react`, `@testing-library/dom`.
* `package-lock.json`: the new dev-dependencies, plus `npm audit fix` (one transitive patch bump,
  `http-cache-semantics` 4.2.0 to 4.3.0, which cleared a high-severity advisory reachable through `ably`).
* `.github/workflows/ci-cd.yaml`: parallel lint/typecheck, test+coverage, audit and build jobs.
* Fixes: `netlify/functions/create-session.ts`, `neon-create-user.ts`, `firebase-collection-query.ts`,
  `src/utils/verify.ts` (`getIdentity` now takes a generator that returns a server-issued identity;
  new `issueIdentity`), and the two `GameRoom` components that call it.
* Escaping: `src/utils/parse.ts`, new `src/utils/html.ts`, the two table components.
* Blackjack: `netlify/functions/blackjack-game-room.ts`, `src/entities/rng.ts`, `src/entities/card.ts` (`Deck.deserialize`).
* Round-2 fix: `src/shengji/core/game.ts` (`endTrick`, `endRound`).
* `.gitignore` and `eslint.config.js`: ignore the generated `coverage/` folder.
