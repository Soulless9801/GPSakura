# Audit findings

Produced alongside the unit-test suite. Every item marked **pinned** has a test tagged
`KNOWN BUG` (or `SECURITY`) that documents the defect. Known-bug tests use `it.fails(...)`: they
assert the *correct* behaviour, so the suite stays green while the bug exists and **turns red the
moment it is fixed**. When that happens, delete the `.fails` and the test becomes a regression
guard. Find them all with `grep -rn "it.fails" src netlify`.

Items marked **fixed** were resolved after the first audit pass; their tests are now ordinary
regression tests (no `.fails`).

Items marked **reported** came from a static read of the UI code and are *not* covered by a test.
Treat them as leads, not confirmed defects.

The first pass changed no application source. The signing and path-traversal findings (S1, S2,
S3, S8) were then fixed; everything else below is still open.

## Security

| # | Finding | Status |
|---|---------|--------|
| S1 | ~~`create-session` `action: "sign"` signed any `clientId` for any caller~~ so anyone could impersonate another player. **Fixed:** the server now mints identities itself (`create-session` `issue`; `neon-create-user` returns a signature for the player id it creates) and the `sign` action is gone, so a signature proves the id was issued by the server. | **fixed**: `create-session.test.ts`, `neon-create-user.test.ts`, `shengji-game-room.test.ts` |
| S2 | ~~An unset `SESSION_SECRET` silently became an empty HMAC key.~~ **Fixed:** signing throws and verifying returns false when the secret is missing; signatures are compared in constant time. | **fixed**: `create-session.test.ts` |
| S3 | ~~`firebase-collection-query` spliced `loc` into a file path unchecked.~~ **Fixed:** `loc` must match `[A-Za-z0-9_-]+` (400 otherwise) and is joined onto the data directory. Still open: the `col` parameter lets callers read any Firestore collection. | **fixed** (traversal): `firebase-collection-query.test.ts` |
| S4 | `parseMarkdown` escapes nothing and `TextParser` assigns the result to `innerHTML`; raw HTML runs, and link URLs can break out of `href` (`onmouseover=...`). Fed by Firestore content and the problem tables. | pinned: `parse.test.ts`, `TextParser.test.tsx` |
| S5 | `shengji-game-room` rate-limits **before** verifying the signature, keyed by the claimed `clientId`: unsigned requests can burn a real player's budget (1 request/s per action). | pinned: `shengji-game-room.test.ts` |
| S6 | `speed_draw` / `speed` ("for testing") are live and never check that the caller is a seated player. | pinned: `shengji-game-room.test.ts` |
| S7 | `neon-create-user` mints a funded account per unauthenticated call; `refill` adds 1000 at any balance and reports success for a player row that does not exist. | pinned (phantom refill); account minting documented |
| S8 | ~~`getIdentity` treated the server's `200 {valid:false}` as valid.~~ **Fixed** as part of the identity rewrite: only `valid === true` reuses a stored identity. | **fixed**: `verify.test.ts` |

## Game logic

| # | Finding | Status |
|---|---------|--------|
| G1 | After round 1 the next deal starts with the player who won the last trick instead of the new zhuang (`endTrick` overwrites the `turn` set by `endRound`). Simulating random legal rounds, **139 of 200** rounds then deal uneven hands (24 vs 25 cards) and a kitty of 9-11 cards instead of 8. | pinned: `game.test.ts` (Shengji) |
| G2 | When the trump rank is 2 (always, in round 1) the small joker is not "next to" the big joker, so a joker-pair tractor (SJ SJ BJ BJ) is not recognised. | pinned: `comparison.test.ts` |
| G3 | Following a pair lead does not force a player holding a pair to play it (two loose cards of the suit are accepted). Tractor leads *do* enforce it. | pinned: `comparison.test.ts` |
| G4 | Shuai (throw): a short follower has no legal reply at all (mixed-suit padding is rejected) while a 1-card reply to a 3-card throw is accepted; and `isBeatable` counts a lone single as beating a pair, so almost no throw is valid. The source already carries a `FIXME`. | pinned: `comparison.test.ts` |
| G5 | Blackjack: a **tie loses the bet** (anything but a player win is charged as a loss). Starting a new hand while one is unfinished is allowed and unfinished hands are never charged, so a bad deal can be abandoned for free. Concurrent `stand` requests could also double-settle (read-modify-write on `money`); not tested. | tie and abandon pinned: `blackjack-game-room.test.ts` |
| G6 | `RNG(0)` is stuck at zero (xorshift fixed point), so one blackjack game in a million is dealt from a fixed shoe; `blackjack Deck.deserialize` returns a base `Deck`; `Hand.deserialize` aliases the source's per-suit maps. | pinned |
| G7 | `testcase.ts` can generate a trump of rank 1 (a joker's rank survives the suit swap). | pinned |

## Client utilities and components

| # | Finding | Status |
|---|---------|--------|
| C1 | `loadValue` throws on corrupt JSON in `localStorage`; it runs inside `useState` initialisers, so this blanks the page. | pinned |
| C2 | `convertToPixels("1.50em")` ignores the unit (it removes `String(parseFloat(x))` from the input). | pinned |
| C3 | `findIndex` compares `item.value === String(val)`, so numeric `Select` options never match their saved default (the Chaos demo's dimension switch). `Select` throws with empty `options`. | pinned |
| C4 | `Particle` with zero velocity becomes `NaN`. | pinned |
| C5 | `Form` with `notifyOnInitChange={false}` (used by `Slider` and the colour selector) swallows every second edit; values can snap above `max` (`step=2, max=5` shows 6). `Slider`'s track does not follow typed input unless the parent echoes the value back. | pinned: `Form.test.tsx`, `Slider.test.tsx` |
| C6 | `Hand`: the custom class is fused onto the base class (no space), and any re-render with a new-but-equal `cards` array clears the player's card selection. | pinned: `Hand.test.tsx` |
| C7 | `Modal` leaves `body { overflow: hidden }` behind if unmounted while open. `GenericButton` has no accessible name. | pinned |
| C8 | `framer-motion` is imported (`Hand`, `BlogApp`) but only `motion` is declared in `package.json`. Works today because `motion` pulls it in. | pinned: `package-hygiene.test.ts` |
| C9 | Shengji `GameRoom` effect on `[game, ids]` calls the server's `connection` action whenever a player is missing; the server publishes `state_change` on every call, which re-runs the effect, so a dropped player makes every client loop at the rate limit. | reported |
| C10 | Other reported leads: `ParticleNetwork` captures a stale `interactive` flag and misses `pointerup` outside its wrapper; `BlogApp`/`CodeforcesTable`/`USACOTable` fetch without `res.ok` checks (and USACO has a response-order race); no error boundary or catch-all route around lazy routes; `GameInfo` advice reads the previous hand; `FreqGuesser` counts every page load as a give-up; hex shorthand typed into the colour field is silently ignored; `Chaos` ignores `refresh`. | reported |

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
* `.gitignore` and `eslint.config.js`: ignore the generated `coverage/` folder.
