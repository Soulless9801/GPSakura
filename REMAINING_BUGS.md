# Remaining bugs: hand-off for other agents

This file preserves the original audit hand-off from branch `audit/tests` at commit `238f372`.
The status update below supersedes the original open-item descriptions and test counts. Original
line numbers refer to that commit; search for the quoted symbol in files that have changed.

[AUDIT.md](AUDIT.md) is the short, ranked summary (and records what is already fixed). This file is
the detailed descriptions, including items resolved since the hand-off.


## Expected-failure cleanup and production boundaries — 2026-10-07

All **14 remaining `it.fails` markers** have been converted to passing regression tests.
The pre-fix run of those ordinary tests failed exactly 14 times. Resolved items:

* **SV-6:** malformed Firebase request JSON or a non-object body receives HTTP 400.
* **UT-1 / UT-2:** CSS units parse correctly with trailing zeros, signs and exponents; corrupt or
  blocked storage falls back safely, and failed write-back does not discard a successful read.
* **UI-1 / UI-2 / UI-3:** Form explicitly reports committed edits without dropping parent echoes;
  Form and Slider share zero-based step rounding followed by clamping; slider width follows its
  actual value. Hold timers and drag listeners clean up on cancellation/unmount, and fixed ranges
  do not produce invalid widths.
* **UI-4 / UI-5:** numeric Select defaults match; empty options do not crash or call `onChange`.
* **UI-7 / UI-8 / UI-9:** Modal restores prior scrolling styles on cleanup, icon buttons have
  required accessible labels and pressed state, and zero-velocity particles remain finite.
* **DEP-1:** Hand and BlogApp import the declared `motion/react` entrypoint.

Build settings now separate Vite and Vitest, exclude unit tests/helpers from production TypeScript
roots, and reject development-only imports in Vite's production module graph. Shengji's developer
panel is development-only. Netlify uses a clean `netlify/entrypoints/` directory with seven handlers:
its previous directory also discovered seven `.test.ts` files as functions. All seven production
archives were built locally and inspected: no test artifacts, and only the appropriate Firebase
JSON or Codeforces CSV fallback assets. The production guard was tested with an intentionally
imported test module and rejected it; the temporary module was then removed.

Validation for this pass: **1,095 passing tests across 51 files, zero expected failures**;
coverage thresholds, lint, full typecheck, production build and `git diff --check` pass.
The dependency audit reports zero vulnerabilities. Function archives were built with the locally
installed Netlify bundler; no deployment or live service calls were made.

**Still open:** unpinned SV-7 through SV-9 and the remaining reported leads/design questions below.
Zero expected failures does not mean those unpinned items have been resolved.

## Shengji verification and fixes — 2026-10-07

* **Verified existing fixes:** SJ-1 (joker tractors), SJ-2 (pair obligation), SJ-3 (throw
  count, short-suit replies, component beatability and advisor follows), SJ-4 (independent
  deserialization), SJ-5 (valid generated trump ranks), and SV-1 through SV-4 (authentication
  before rate limits, development-only speed draw, usernames and payload guards).
* **Rules retained:** the existing `following.test.ts` records the owner's house rule that
  triples need not be split to answer pairs. The existing triple-tractor fallback also remains.
  Failed lead throws are still rejected; automatic forced-down throws remain a design decision.
* **SJ-3 follow-up fixed:** the original single-suit check allowed an off-suit trump-rank card
  alongside ordinary cards of the same printed suit. A lead throw now requires one actual line.
  Empty throw leads are also rejected. The randomized leader oracle now checks this prerequisite.
* **SV-5 / LEAD-1 fixed:** the server saves/broadcasts only when `paused` changes. Clients sync
  once per change in missing player IDs, including when everyone returns; rejected requests
  retry after 1.5 seconds, with cleanup. Joining clients explicitly load state instead of relying
  on a connection broadcast. A late initial response cannot overwrite a newer live update.
* **UI-6 fixed:** base/custom hand classes are separate; selection and highlighting survive
  equal cards recreated during render, and both clear when hand contents change.
* **LEAD-4 fixed:** advice reacts to the current hand, help toggle and turn. It includes the
  trick from `chu` (the first player), not only from its current winner, and excludes the previous
  trick when starting a new one.
* **LEAD-6 partial:** subscription and initial state loading no longer depend on successful
  `presence.enter`. The other LEAD-6 issues, including imperative button re-enabling in
  `services/request.ts`, remain open. The optional `start` presence restriction under SV-2 and
  the generator helper cleanup under SJ-5 remain outside this pass.

Validation: all 560 pre-existing Shengji/server tests passed before new work. Added component,
server and rules regressions, including exhaustive replies from randomized small hands against a
throw containing a tractor, pair and two singles. Restoring the original four rules/server source
files from `238f372` produced 77 regression failures; the fixed files were restored afterward.
The client regressions also failed before their fixes. Final checks: 1,056 passing tests and 14
unrelated expected failures across 50 files; coverage thresholds, lint, typecheck and production
build pass. The dependency audit reports zero vulnerabilities.

---

## 0. How to work on these

### 0.1 The test convention: `it.fails`

Almost every bug below is **pinned by a test written as `it.fails("KNOWN BUG: ...")`** (Vitest).
Such a test asserts the *correct* behaviour. While the bug exists the assertion fails, which makes
`it.fails` pass, so the suite is green. **When you fix the bug, that test starts passing, so
`it.fails` reports an error and the suite goes red.** That is the signal that you are done with that
item:

1. Fix the source.
2. Run the suite; the pinned test(s) for your bug will now fail with "Expect test to fail".
3. Change `it.fails(` to `it(` on exactly those tests (and rename them if "KNOWN BUG" no longer
   fits). They are now regression tests. Do not delete them.
4. Make sure nothing else turned red. If an *unrelated* test turned red, read section 0.4.

Find every open marker with:

```bash
grep -rn "it.fails(" src netlify
```

There are **30** at the time of writing; each is cross-referenced below.

### 0.2 Commands (all must pass before you hand work back)

```bash
npm run lint          # eslint, strict type-checked rules, also lints the test files
npm run typecheck     # tsc --noEmit (covers src/ including tests; netlify/ is not type-checked)
npm run coverage      # vitest run --coverage; enforces per-directory coverage floors
npm run build         # vite build
npm audit --audit-level=high
```

`npm run test:run` runs the tests once without coverage; `npx vitest run path/to/file.test.ts` runs
one file. Tests are co-located with the code (`*.test.ts`, `*.test.tsx`) and under
`netlify/functions/`. Component tests opt in to jsdom with `// @vitest-environment jsdom` on the
first line; everything else runs in Node.

### 0.3 Repository conventions you must follow

From `.github/copilot-instructions.md` and the ESLint config:

* **Never push** and **never merge to `main`**. Work on a branch off `audit/tests` (or on it, if you
  are told to) and commit locally with a descriptive message. Commit messages in this repo end with
  the `Co-Authored-By` trailer shown in `git log`.
* Only change what the task needs; prefer additive changes. Do not reformat unrelated code.
* Absolute imports use the `/src/...` alias (resolved by Vite and `tsconfig.json` `paths`).
* ESLint (`eslint.config.js`) is strict: no `any`, no non-null assertions beyond what already
  passes, `curly` braces always, `prefer-template`, `eqeqeq`, `no-console`, naming-convention rules,
  `@typescript-eslint/no-unnecessary-condition`, `consistent-type-imports` (no `import("x")` type
  annotations; use `import type`). The `tsconfig` target is ES2020 (no `String.prototype.replaceAll`).
* Never read or print `.env`. Never commit secrets. Tests mock `dotenv` so they never touch it.

### 0.4 If another test turns red when you fix something

Do **not** edit a passing test just to make it green. First decide which of these it is:

* the test was pinning the *buggy* behaviour by accident (this happens: see bug **SJ-2**, where an
  advisor test passes only because of the bug). Then stop and read the "Open question" in that
  bug's section; some of these need a human rules decision;
* you changed more than you meant to. Revert and narrow the change.

### 0.5 Proving a test actually discriminates

A test that passes both before and after your fix proves nothing. Before you finish, swap the
original source file back in and confirm your new/flipped tests **fail** against it:

```bash
cp path/to/file.ts /tmp/file.fixed                 # keep your fix
git show HEAD:path/to/file.ts > path/to/file.ts    # original
npx vitest run path/to/file.test.ts                # expect failures
cp /tmp/file.fixed path/to/file.ts                 # restore the fix
```

### 0.6 Shared test helpers

`src/test/shengji.ts` (not a test file) provides what you need for Shengji work:

* `newTable(n=4)` seats `n` players; `dealAndSkipKitty(table)` deals and closes the kitty;
* `craft({ hands, dipai, overrides })` builds a mid-game position by hand;
* `playRound(table, rng)` plays random **legal** moves (taken from `src/shengji/advisor/moves.ts`)
  to the end of the round and returns `{ plays, rejected, trickPoints, played }`;
* `seedRandom(seed)` makes `Math.random` (used by `Deck.shuffle`) deterministic;
* `card`, `buildHand`, `cardsHeld`, `tally`.

Netlify function tests use small in-memory fakes defined at the top of each
`netlify/functions/*.test.ts` (database, Redis with a controllable clock, Ably channel, Firebase).

### 0.7 Already fixed: do not redo

Signing / impersonation, path traversal, empty `SESSION_SECRET`, stale-signature reuse, the round-2
dealing order, the discard pile, the trump suit reset, markdown/table HTML escaping, blackjack tie /
abandon / phantom-refill, `RNG(0)`, and `blackjack Deck.deserialize`. See AUDIT.md.

---

## 1. Suggested work packages (avoid collisions)

Bugs in the same file should go to the **same** agent, or be done in sequence.

| Package | Bugs | Files touched | Notes |
|---|---|---|---|
| **A: Shengji rules engine** | SJ-1, SJ-2, SJ-3 | `src/shengji/core/comparison.ts` (+ tests) | One agent. SJ-2 needs a rules decision; see its section. |
| **B: Shengji room server** | SV-1 .. SV-5 | `netlify/functions/shengji-game-room.ts` (+ test) | One agent. Independent of A. |
| **C: Shengji small items** | SJ-4, SJ-5 | `src/shengji/core/entities.ts`, `testcase.ts` | Tiny; can be done by A or alone. |
| **D: Other server** | SV-6 .. SV-9 | `firebase-collection-query.ts`, `blackjack-game-room.ts`, `neon-create-user.ts` | SV-8 / SV-9 need product decisions. |
| **E: Form / Slider / Select** | UI-1, UI-2, UI-3, UI-4, UI-5 | `Form.tsx`, `Slider.tsx`, `Select.tsx`, `src/utils/list.ts` | `Slider` embeds `Form`, and `Select` depends on `findIndex`; keep in one package. |
| **F: Hand / Modal / GenericButton / Particle** | UI-6 .. UI-9 | their own files | Independent of each other. |
| **G: Utilities** | UT-1, UT-2 | `src/utils/resize.ts`, `src/utils/storage.ts` | Independent. |
| **H: Dependencies** | DEP-1 | `Hand.tsx`, `BlogApp.tsx`, `package.json` | Touches `Hand.tsx` import line only; coordinate with F. |
| **I: Unverified leads** | LEAD-1 .. LEAD-6 | various | Start by writing a failing test; some may not be bugs. |

---

## 2. Shengji rules engine (`src/shengji/core/comparison.ts`)

Background you need: Shengji ("tractor", 升级) is a trick-taking game. In a trick the leader plays a
*structure*: a single card, a pair, a triple (3+ decks), or a **tractor** (consecutive pairs or
triples such as 5-5-6-6). Followers must follow the led suit with the same structure when they can,
and must play exactly as many cards as were led. A **trump** (the declared suit, the trump rank in
every suit, and the two jokers) beats plain suits. The module has three layers:

* *ordering*: `isCardBigger`, `isCardNext`, `sortCards`, `getNextCardData` (cards ordered as
  four-number arrays `[isJoker, isTrumpRank, isTrumpSuit, rank]`);
* *structure*: `getPlayStruct` / `playToInfo` / `handToInfo` (decomposes a play or hand into groups);
* *validation*: `isPlayValid` (may this follower play this?), `isPlayBigger`, `isShuaiValid` (leading
  or following a multi-structure "throw", called *shuai*).

`src/shengji/advisor/moves.ts` enumerates candidate moves and then asks `isPlayValid` to approve each
one, so a bug in the validator changes what the advisor suggests. `src/shengji/core/game.ts` calls the
validator for every play, so these bugs affect real games.

### SJ-1 (fixed): small and big joker are not "consecutive" when the trump rank is 2

* **Severity:** high. The trump rank is 2 for the whole of round 1 (and whenever a side is on 2).
* **Symptom:** a tractor of joker pairs (`SJ SJ BJ BJ`) is not recognised. `getPlayStruct` returns two
  separate groups instead of one tractor, so the play is invalid as a lead and cannot be matched as a
  follow.
* **Pinned tests (must flip):**
  * `src/shengji/core/comparison.test.ts:206` "the small joker is followed by the big joker when the
    trump rank is 2"
  * `src/shengji/core/comparison.test.ts:291` "... and also when the trump rank is 2"
* **Root cause (verified by experiment):** `getNextCardData` (`comparison.ts:155`) computes the next
  card by `val[3] += 1`, then at line 166 skips the trump rank: `if (val[3] === trump.rank) val[3] += 1`.
  For the small joker, `val[3]` is its joker rank (1); `+= 1` gives 2, which *equals* `trump.rank`
  when the trump rank is 2, so it is bumped to 3, and `isCardNext(BJ, SJ)` compares against a card
  `[1,0,0,3]` that does not exist. The "skip the trump rank" rule applies to plain ranks, never to
  jokers, whose `rank` field (1 or 2) is not a rank in that sense.
* **Suggested fix:** in `getNextCardData`, after computing `val = getCardData(card, trump)`, add
  `if (isJoker(card)) { val[3] += 1; return val; }` before the small-trump / rank-skipping logic. Do
  *not* hard-code `[1,0,0,2]`: when the declared trump suit is `"jokers"` (a joker declaration),
  `getCardData` of a joker is `[1,0,1,rank]` and the next card must match that shape.
* **Experiment already run:** this change alone flips exactly the two tests above and breaks nothing.
* **Add tests:** next-of-SJ is BJ for trump rank 2, for another rank, with trump suit `"spades"`,
  `null` and `"jokers"`; `getPlayStruct` of `SJ SJ BJ BJ` is one group `{cards: [[SJ, BJ]], count: [2]}`
  for each of those trumps; a joker tractor is a legal lead and can be followed by another joker
  tractor.

### SJ-2 (fixed under the existing house rule): following a pair lead does not require playing a pair you hold

* **Severity:** high (rules violation in normal play).
* **Symptom:** the leader plays a pair of hearts. A follower holding `H3 H3 H9 H10` may play `H9 H10`
  (two loose hearts) instead of the pair `H3 H3`; holding `H3 H3 H9` they may split their pair and
  play `H3 H9`. Tractor leads **do** enforce "play your pair/tractor if you have one".
* **Pinned tests (must flip):**
  * `src/shengji/core/comparison.test.ts:408` "must play the pair when holding one"
  * `src/shengji/core/comparison.test.ts:412` "must not split a pair into two singles when a pair is held"
* **Root cause (verified by experiment):** `findMaxConsecutive` (`comparison.ts:342`) reports a
  phantom run when its input is empty. Line 353, `let len = cards.length > 0 ? amount(cards[0]) : 1`,
  starts `len` at `1` for an empty list and then does `seq[len]++`, so zero pair-units is reported as
  "one run of length 1". In `isTrickValid` a follower whose play contains no pair therefore looks as if
  it *does* contain one, so the "you hold a pair but did not play one" check never fires for
  single-group leads.
* **Suggested fix:** at the top of `findMaxConsecutive`, `if (units.length === 0) return [0];`.
* **Experiment already run:** this fixes both pinned tests, but it also makes **one existing test fail**:
  `src/shengji/advisor/advisor.test.ts` "allows non-splitting of triples when playing pairs"
  (hand `H6 H6 H6 H7 H8`, lead `H12 H12`, expects `[H7, H8]` to be a legal reply). That test currently
  passes **only because of this bug**.
* **Open question (needs a human rules decision; do not guess):** is `[H7, H8]` meant to be legal?
  Under the standard rules, a hand containing `H6 H6 H6` contains a pair, so a pair must be played
  and `[H7, H8]` is illegal. The comment in `getTrickUnits` (`comparison.ts:321`) says "a card held
  `count` times can stand in for `floor(count/size)` groups ... so a quad answers a lead of pairs as
  two pairs", which is consistent with the standard rule (a triple supplies one pair). The test name
  suggests the author may have intended "you need not break a triple to answer a pair" as a house rule.
  The git history (`58199ba`, "touch up sj advisor ui") gives no rationale. Recommended action: ask the
  repository owner. If standard rules apply, change that advisor test to expect `[H6, H6]` (and
  `[H6, H7]`/`[H6, H8]` are *not* legal), and update the sibling test described next.
* **Related test that may need the same decision:** `advisor.test.ts` "allows filling in of a triple
  tlj with equal number of pairs": hand `H6 H6 H7 H7 H8 H8 H9 H10`, lead `H12 H12 H12 H13 H13 H13`
  (two consecutive triples), expects `[H6 H6 H7 H7 H9 H10]` to be legal. That hand holds a *third*
  pair (`H8 H8`) that is not played. It currently passes and still passes after the `findMaxConsecutive`
  fix; whether it is *correct* depends on the same house-rule question (play "as many pairs as the lead
  has tuples" vs "as many pairs as possible"). Write the rule down in a comment next to
  `isTrickValid` once decided.
* **Tests to add after deciding:** table-driven cases for lead = pair / triple / quad / 2-pair
  tractor / 3-pair tractor / pair-of-triples tractor against hands with and without matching
  structure, in a plain suit, in trumps, and mixed with a void suit. Re-run the 2/4/6/8-player random
  simulations in `src/shengji/core/game.test.ts` ("several rounds in a row"), which must keep
  completing with `rejected === 0`.

### SJ-3 (fixed, including the follow-up above): throws ("shuai") are broken for followers and are almost never valid for leaders

* **Severity:** high for correctness; medium for reach (throws are an advanced move, but a bad
  follow can **deadlock a game**).
* **There are three separate defects in `isShuaiValid` (`comparison.ts:583`) and `isBeatable`
  (`comparison.ts:538`).** The source already carries `// FIXME: shuai checking is bugged` at line 581.

**3a. Followers are held to the leader's "single suit" rule (deadlock).**
`isShuaiValid` first checks (line 585) that the play is "all main-line or all one suit", but that rule
only makes sense for a throw being **led**. A follower who is short in the led suit must dump their
remaining cards of that suit and fill the rest with anything, which is by nature a mixed-suit play,
so it is rejected. Holding `H3 C4 C5 C6` against a lead throw of `HA HK HQ`, the correct reply is
`H3 C4 C5` but `isShuaiValid` returns false for it, and `C4 C5 C6` is rejected too because the
follower holds a heart. **The follower has no legal reply.** Because `Game.tryPlay` routes every
play to `tryShuai` while `state.shuai` is true, the game cannot advance.
* Pinned: `comparison.test.ts:627` "a short follower may dump their suit and pad with other cards".

**3b. A follower is not required to play as many cards as the throw.**
In the follow branch (the `else` at line 601) there is no card-count check, unlike `isPlayValid`
(line 474). The follower above can play the single card `H3` against a three-card throw and it is
accepted; `Game.endTrick` then subtracts the winner's play length from `count`, corrupting the round.
* Pinned: `comparison.test.ts:633` "a follower must play as many cards as the throw".

**3c. `isBeatable` counts a single card as beating a pair (leaders almost never get a valid throw).**
`isBeatable` decides whether any opponent could beat a component of the throw. At line 564 it starts a
new candidate sequence for any card whose *count differs from the component's* (`count !== m`),
without requiring that count to be at least `m`. A lone `K` is therefore treated as beating a pair of
nines, so a throw containing a pair is judged beatable whenever an opponent holds any higher card of
the suit. (The correct test: a component of `n` consecutive `m`-tuples is beaten only by a higher
sequence of at least `n` consecutive tuples each held at least `m` times, in the same line, or by a
ruff where that is allowed.)
* Pinned: `comparison.test.ts:594` "single cards cannot beat a pair component".

* **Experiment already run for 3a + 3b:** moving the single-suit check into the `ilead.play.cards.length
  === 0` (initial throw) branch and adding `if (iplay.play.cards.length !== ilead.play.cards.length)
  return false;` at the top of the follow branch flips exactly the two follower tests and breaks
  nothing. It is a good first step, but see "Do not stop at the pinned tests" below.
* **Suggested fix for 3c:** rewrite the inner loop of `isBeatable` so a sequence only extends or
  starts when `count >= m` for that component, and compare per component. Keep `checkInline` so a card
  from another line is not counted.
* **Do not stop at the pinned tests.** The follow path of `isShuaiValid` ends in
  `isPlayPossible(lead, ...)` with `lead` built from the throw's decomposition. That code was written
  for single-structure leads and has not been exercised with throws made of several groups (e.g. a
  pair + two singles + a 2-tractor). Add a randomized test: generate a throw, generate a hand, brute
  force the set of legal follows by the written rules, and compare to `isShuaiValid`. Also check the
  game-level flow in `src/shengji/core/game.ts` (`tryShuai`, line 360): the throw leader's play is
  stored in `info`, `state.shuai` stays true for the trick, followers go through `tryShuai`, and
  `endTrick` resets it.
* **Also note (design):** by the usual rules a throw that fails (an opponent can beat a component)
  should be *forced down* to its smallest component rather than rejected outright. The current code
  just rejects it. Confirm with the owner before changing that behaviour.

### 2.1 Shengji small items

#### SJ-4 (fixed): `Hand.deserialize` aliases its source's per-suit maps
* **File:** `src/shengji/core/entities.ts:61`. **Pinned:** `entities.test.ts:97`.
* **Symptom:** `Hand.deserialize(data)` does `hand.cards = new Map(data.cards)`, copying only the outer
  map. The inner `Map<Rank, number>` per suit is shared, so mutating the restored hand mutates the
  object it was restored from. In the server this is mostly harmless because the source is a freshly
  parsed JSON blob, but callers that pass a live `Hand` (as the tests do) are surprised.
* **Fix:** copy each inner map: `new Map([...data.cards].map(([suit, ranks]) => [suit, new Map(ranks)]))`.
  The serialized form (a `Map` of `Map`s, encoded by `src/utils/serial.ts`) must keep round-tripping:
  see `entities.test.ts` "survives the server's serialize / deserialize round trip".

#### SJ-5 (fixed): the dev test-case generator can produce a trump of rank 1
* **File:** `src/shengji/core/testcase.ts:119` (`randomTrump`). **Pinned:** `testcase.test.ts:48`.
* **Symptom:** `randomTrump` draws a random card (which can be a joker with rank 1 or 2) and then only
  replaces its *suit* when it is a joker, keeping the joker's rank. So `trump.rank` can be 1 or 2
  attached to a plain suit, and 1 is not a valid trump rank. Used only by the `/shengji` test page
  (`src/shengji/components/Test`), not by real games.
* **Fix:** draw the rank from `2..14` directly instead of from `genCard`.
* **Related dead code:** `getCardFromData` (same file, ~line 70) has a loop that can never run
  (`val` is initialised to `card.suit !== trump.suit` right after checking `card.suit === trump.suit`) and
  calls `RNG.prototype.pick` unbound. Delete or repair it; no test depends on it.

---

## 3. Shengji room server (`netlify/functions/shengji-game-room.ts`)

All five items are in one handler. Tests: `netlify/functions/shengji-game-room.test.ts` (an in-memory
Redis with a controllable clock and a fake Ably channel). The helper `send(clientId, action, payload)`
advances the clock 5 s before each call so the 1 request/second limiter does not interfere; `raw(...)`
does not, which is what the rate-limit tests need.

### SV-1 (fixed): the rate limiter runs before the signature is checked
* **Pinned:** `shengji-game-room.test.ts:225`.
* **Symptom:** requests are rate-limited at line 110 using a key built from the *claimed* `clientId`
  (`rl:${roomId}:${clientId}:${action}`, default 1 request per second), and the signature is verified
  afterwards at line 113. Anyone can send unsigned/forged requests for another player's `clientId`
  and use up that player's allowance, so their real requests get `429`. Player ids are public (they
  appear in Ably presence).
* **Suggested fix:** verify the signature first, then limit by the *verified* client id. To stop
  forged-signature floods, either accept that HMAC verification is cheap, or add a coarse limiter keyed
  by caller IP (`event.headers["x-nf-client-connection-ip"]` on Netlify) for unauthenticated requests.
  Keep `connection` as a room-wide bucket as it is today.
* **Do not break:** `shengji-game-room.test.ts` "request validation > rejects a missing or incorrect
  signature" and every "rate limiting" test (the limiter semantics for valid callers must not change).

### SV-2 (fixed): `speed_draw` and `speed` can be used by anyone, including non-players
* **Pinned:** `shengji-game-room.test.ts:521` and `:527`.
* **Symptom:** both actions (lines 222 and 363) call `game.speedDraw()` without checking that the caller
  is seated. `speed_draw` is even commented `// ADMIN ACTION: SPEED DRAW (FOR TESTING)`. A visitor with
  any signature (which anyone can now obtain via `create-session` `issue`) can force the whole deal.
  Even for seated players it removes the drawing/declaring phase, which is gameplay.
* **Decision needed:** (a) delete the actions from production, or (b) gate them behind an environment
  flag (for example `ALLOW_SPEED_DRAW === "true"`, unset in production), or (c) at least require
  `players.includes(clientId)`. The client already exposes this as a button labelled "Speed Draw (Cheat)" in
  `src/shengji/components/GameRoom/GameRoom.tsx` (button at ~line 355, handler `speedDraw` at ~173, which
  sends `action: "speed"` after a `window.confirm`), so the owner clearly treats it as a dev convenience:
  removing or gating it server-side means removing or hiding that button too. Whichever is chosen, update the two pinned tests to match
  (they currently assert "a spectator cannot", which holds under (a), (b) and (c)).
* **Related:** `start` (line 153) is also open to any signed visitor who is not in the room's presence
  list (it only reads presence). Consider requiring the caller to be in presence.

### SV-3 (fixed): a missing username is accepted as the literal text `"undefined"`
* **Pinned:** `shengji-game-room.test.ts:449`.
* **Symptom:** line 193, `const username = String(payload && payload.username) || ""`, turns an absent
  field into the string `"undefined"` (truthy), so the "Missing username" check on the next line can
  never fire and the player is renamed to "undefined".
* **Fix:** require `typeof payload.username === "string"`, trim it, reject empty, and cap the length
  (suggest 32; the name is rendered in every client and stored in Redis). Return `400`.

### SV-4 (fixed): a malformed payload field is a 500, not a 400
* **Pinned:** `shengji-game-room.test.ts:443` (only the `play` case is pinned).
* **Symptom:** five places call `JSON.parse(payload && String(payload.X))`: `trump` (line 267),
  `give`/`receive` (296-297), `play` (316) and `shuai` (335). Missing or invalid JSON throws a
  `SyntaxError` that the catch-all turns into `500 "...Internal server error Unexpected token..."`.
* **Fix:** add a small helper, for example `parseField<T>(raw: unknown, check: (v: unknown) => v is T):
  T | null`, that returns `null` on bad JSON or a bad shape, and respond `errorJSON("Invalid play", 400)`.
  Add type guards for `Card` (`suit` in the five valid suits, `rank` an integer 1..14, jokers only 1..2),
  `Play` (`cards: Card[]`) and `Trump`.
* **Unverified hazard to test while there:** well-formed JSON of the wrong shape (e.g. `{"cards": null}`,
  `{"cards":[{"suit":"x"}]}`, ranks as strings) reaches the game code. Add tests; if any produce a
  `TypeError` and a 500, the type guards above are the fix.
* **Related:** every handler's catch-all returns `Internal server error ${error.message}` to the client
  (information disclosure; low severity). Consider logging the message server-side and returning a
  generic text.

### SV-5 (fixed): players who drop out can trigger a request loop (reported, see LEAD-1)
Listed here because the server side of it is in this file; the cause is client-side. See LEAD-1.

---

## 4. Other server functions

### SV-6 (fixed): `firebase-collection-query` answers malformed JSON with an unhandled exception
* **File:** `netlify/functions/firebase-collection-query.ts:43`. **Pinned:**
  `firebase-collection-query.test.ts:204`.
* **Symptom:** `JSON.parse(event.body || '{}')` is outside the `try`, so a bad body rejects the whole
  handler (Netlify returns a generic 502) instead of a 400.
* **Fix:** wrap the parse; return `errorJSON("...Invalid JSON body", 400)` like `create-session` does.
  The test expects `statusCode === 400`.

### SV-7: any Firestore collection can be read through the public endpoint (not pinned)
* **File:** line 55: `fireStore.collection(db, col)` with `col` taken from the request body.
* **Symptom:** a caller can pass any collection name and read it. The local-file fallback was fixed to
  accept only a bare filename, but the live path was not restricted.
* **Fix:** an allowlist of the collection names the site uses (`posts`, `problems`, `usaco`; see
  `BlogApp.tsx:94`, `USACOTable.tsx:61,104`) and `400` for anything else. Add a test
  ("rejects an unknown collection and does not call Firestore"). Check the Firestore security rules
  independently; this endpoint should not be the only protection.

### SV-8: blackjack settlement can double-pay under concurrent requests (not tested)
* **File:** `netlify/functions/blackjack-game-room.ts:139` (`settleGame`).
* **Symptom:** `hit`/`stand` read the game and the player's money, compute the result, then write
  `money` and `settled = true` as separate statements with no transaction. Two simultaneous `stand`
  requests can both read `settled = false` and both pay out (or both charge).
* **Suggested fix:** make the claim atomic: `UPDATE games SET settled = true WHERE id = ? AND player_id
  = ? AND settled = false RETURNING ...`, and only if a row came back apply the balance change, using an
  atomic increment (`money = money + delta` via drizzle's `sql` template) instead of read-modify-write.
  The in-memory fake in `blackjack-game-room.test.ts` does not support `sql` templates or `returning`
  on `update`; extend the fake (it is ~60 lines at the top of the file) and add a test that fires two
  `stand` calls with `Promise.all` and asserts the balance moved exactly once.

### SV-9: unauthenticated account creation and unlimited refill (decisions, not pinned as failures)
* `netlify/functions/neon-create-user.ts` creates a funded player (`money: 1000`) for every call with no
  authentication, rate limit or captcha; `blackjack-game-room.ts:101` (`refill`) adds 1000 at any balance.
  Together the bankroll is unlimited and the database can be filled with rows.
* Both behaviours are currently *documented* by passing tests (`neon-create-user.test.ts` "SECURITY:
  every unauthenticated call creates another funded player"; `blackjack-game-room.test.ts` "refill is
  available even to a player who is not broke"). Decide the product rule first: for example refill only
  when `money < MIN_BET`, once per hour; and rate-limit account creation by IP using the same Redis
  limiter the Shengji room uses. Then change those tests to assert the new rule.

---

## 5. Client utilities

### UT-1 (fixed): `convertToPixels` ignores the unit when the number has trailing zeros
* **File:** `src/utils/resize.ts:5`. **Pinned:** `resize.test.ts:54` and `:58`.
* **Symptom:** the unit is found with `input.replace(String(parseFloat(input)), "")`. For `"1.50em"`,
  `String(1.5)` is `"1.5"`, which is removed from the string leaving `"0em"`, an unknown unit, so the
  switch falls to `default` and returns `1.5` instead of `1.5 * fontSize`. Same for `"2.50vw"`, `"10.0px"`
  (returns the right value only by accident), `"1e2px"`, etc.
* **Fix:** parse with one anchored regex, e.g. `/^\s*(-?(?:\d+\.?\d*|\.\d+))\s*([a-z%]*)\s*$/i`, and
  switch on the captured unit. Keep: numbers pass through; unitless strings are pixels; `"auto"`
  returns `NaN` (there is a test); `"5 px"` (space) is accepted (there is a test).

### UT-2 (fixed): `loadValue` throws on corrupt or blocked `localStorage`
* **File:** `src/utils/storage.ts:3`. **Pinned:** `storage.test.ts:46`.
* **Symptom:** `JSON.parse(raw)` is unguarded, and `getItem`/`setItem` can themselves throw (Safari
  private mode, blocked storage, quota). `loadValue` is called inside `useState` initialisers in
  `FractalDemo`, `GameOfLifeDemo`, `ParticleNetworkDemo`, `FreqGuesserDemo`, `ColorPickerDemo`, so one
  bad value blanks the page.
* **Fix:** wrap the whole body in `try/catch`; on any failure return `defaultValue` (and do not throw if
  the write-back fails). Keep the current contract that the (possibly default) value is written back.
* **Also (unverified):** `FreqGuesserDemo.tsx` (~lines 16, 60-62) and `ColorPickerDemo.tsx` (~39-41)
  reportedly call `loadValue` outside a lazy initialiser, which re-reads and rewrites storage on every
  render. Verify, then switch to `useState(() => loadValue(...))`.
* **Same family, not pinned:** `Navbar.tsx` (~17, 26), `Join.tsx` (~16-21), `GenericButton.tsx` (~24, 31),
  `BlogPost.tsx` (~23-28) and a comparator in `BlogApp.tsx` (~60) access `localStorage` or `JSON.parse`
  unguarded. A tiny `safeStorage` helper used by all of them would remove the whole class.

---

## 6. UI components

All have tests in the component's own folder. The jsdom setup is in `src/test/setup.ts`.

### UI-1 (fixed): `Form` swallows every second edit when `notifyOnInitChange={false}`
* **File:** `src/components/tools/Form/Form.tsx:21-37`. **Pinned:** `Form.test.tsx:180`.
* **Where it bites:** `Slider` renders `<Form ... onChange=...>` and the colour selector uses
  `notifyOnInitChange={false}` bound to parent state. In the Color game: type R=100 (registered), then
  type R=150 (**dropped**), so the guess is scored with the stale value.
* **Root cause (traced and reproduced in the test):** the first effect runs on every `init` change and
  sets `skipNextOnChange.current = !notifyOnInitChange` (i.e. `true`), then calls
  `setValue(updateValue(init))`. When the parent echoes the user's value back as `init`, that `setValue`
  sets the *same* value, React bails out, the second effect (which is the only code that clears the flag)
  never runs, and the flag stays `true`. The next genuine edit then hits `if (skipNextOnChange.current)`
  and is swallowed.
* **Fix direction:** do not use a latched flag. Track the last value *this component* reported/received
  (`lastReported` ref) and suppress `onChange` only when `value === lastInit` (the change came from the
  prop), or only call `onChange` from user-driven paths (`commit`, arrow keys, hold buttons) instead of
  from an effect on `value`. Keep the existing behaviours covered by `Form.test.tsx`: reports the initial
  value once by default; silent on mount with `notifyOnInitChange={false}`; follows a changed `init`;
  re-clamps when the range changes.

### UI-2 (fixed): `Form` can show a value above `max` (and below `min`)
* **File:** `Form.tsx:43-47` (`updateValue`); the same code is duplicated in `Slider.tsx:27-33`.
  **Pinned:** `Form.test.tsx:80`.
* **Symptom:** it clamps to `[min, max]` and *then* rounds to a multiple of `step` counted from zero, so
  rounding can leave the range: `min=0, max=5, step=2, init=5` shows `6`.
* **Fix:** round first, then clamp; or snap to `min + k*step`. Decide which grid is intended
  (`Math.round((v - min) / step) * step + min` is the usual, and also fixes `min=1, step=2` starting on
  odd numbers). **Test the existing expectation** "snaps values onto the step grid (multiples of the step,
  counted from zero)" in `Form.test.tsx`; if you change the grid anchor you must update that test
  deliberately. Extract one shared `clampToStep(value, min, max, step, places)` into `src/utils` and use
  it in both components (also add unit tests for it).
* **Related (reported, unverified):** `Form.tsx:74` omits `step`/`min`/`max` from the `useCallback`
  dependencies of the key handler (stale values after props change); the hold interval started at
  `Form.tsx:85-103` is not cleared on unmount.

### UI-3 (fixed): `Slider`'s track does not follow typed input unless the parent echoes the value back
* **File:** `src/components/tools/Slider/Slider.tsx:78`. **Pinned:** `Slider.test.tsx:106`.
* **Symptom:** the embedded `Form`'s `onChange` only calls `setInternalValue(e)`; the track percentage is
  state set in `updateValue`, which that path never calls. With a controlled parent that feeds the value
  back through `value` an effect re-syncs it, so the bug only shows with a static parent.
* **Fix:** derive `percent` from `internalValue` (`useMemo`) instead of storing it in state. That also
  removes the duplicate `setPercent` in `handleMove`.
* **Related (reported, unverified):** `max === min` divides by zero (`NaN%` width); there is no
  `pointercancel` listener so the window listeners can leak if a drag is cancelled.

### UI-4 (fixed): `Select` never matches a numeric `defaultValue`
* **Files:** `src/utils/list.ts:2` and `Select.tsx:46`. **Pinned:** `list.test.ts:50` and
  `Select.test.tsx:92`.
* **Symptom:** `findIndex` compares `item.value === String(val)`; for numeric option values the left side
  is a number and the right side a string, so it never matches and the saved choice falls back to the
  default index. The Chaos demo's dimension switch (`ChaosDemo.tsx` ~161-170, values `2` and `3`) always
  restores to the first option.
* **Fix:** `String(item.value) === String(val)`, guarding `val === null || val === undefined` first so
  the string `"undefined"` is not matched. Note the type signature allows `string | number`.

### UI-5 (fixed): `Select` crashes when `options` is empty
* **File:** `Select.tsx:46-47,70`. **Pinned:** `Select.test.tsx:103`.
* **Symptom:** `options[findIndex(...)]` is `undefined`; the mount effect calls `handleSelect(undefined)`
  which stores it in state and calls `onChange(undefined)`, then render reads `value.label` and throws.
* **Fix:** if there are no options, skip the initial selection (and do not call `onChange`), and render
  an empty label. Keep `fixedSelect` behaviour.
* **Related (reported, unverified, accessibility):** options are `div`s with `onClick`, so keyboard users
  cannot operate the navbar menus. Convert to a `button`/`listbox` pattern with arrow-key support.

### UI-6 (fixed): `Hand` fuses the custom class name and drops the selection on every re-render
* **File:** `src/components/tools/Hand/Hand.tsx:74` and `:59-63`. **Pinned:** `Hand.test.tsx:65`
  and `:73`.
* **6a, class name:** `` `card-hand__wrapper${className}` `` has no space, so `className="sjg-hand__wrapper"`
  yields the single token `card-hand__wrappersjg-hand__wrapper`; neither CSS class matches. Fix: add the
  space (`` `card-hand__wrapper ${className}` ``) and keep `.trim()`. Check `Hand.css` and the Shengji CSS
  for rules that were written against the fused name before shipping.
* **6b, selection reset:** an effect on `[cards]` resets the selection whenever the **array identity**
  changes, and `GameRoom` builds a fresh array every render (`handToCards(...)`, `|| []`). Any unrelated
  state/presence update clears what the player had selected, so "Play Cards" silently does nothing.
  `Card` has a second effect (`Card.tsx`, `useEffect(() => setActive(false), [card])`) that resets on card
  *object* identity. Fix both: compare content (a stable key such as `cards.map(cardKey).join("|")`) and
  reset only when the content actually changes; or have the parent memoise the array.
  Add a test where the parent re-renders with an equal array and the selection survives, and one where the
  hand genuinely changes and the selection clears (that second one passes today and must keep passing).

### UI-7 (fixed): `Modal` leaves the page unscrollable when unmounted while open
* **File:** `src/components/tools/Modal/Modal.tsx:17-19`. **Pinned:** `Modal.test.tsx:107`.
* **Fix:** return a cleanup from that effect that restores the previous `body.style.overflow`.
* **Related (reported, unverified, accessibility):** the closed modal stays in the tab order (`aria-hidden`
  on a subtree with focusable children); there is no `role="dialog"`/`aria-modal`, focus trap or labelled
  close button. `Navbar.tsx` (~42-100) queries `.nav-item.dropdown`, which nothing renders (dead code).

### UI-8 (fixed): `GenericButton` has no accessible name
* **File:** `src/components/tools/GenericButton/GenericButton.tsx:35`. **Pinned:**
  `GenericButton.test.tsx:63`.
* **Fix:** add a `label` prop (used as `aria-label`) and `aria-pressed={state}`; update the callers (grep
  for `<GenericButton`). Make `label` required so a nameless button cannot come back.

### UI-9 (fixed): `Particle` with zero velocity turns into `NaN`
* **File:** `src/entities/particle.ts:33` (`adjustSpeed`). **Pinned:** `particle.test.ts:123`.
* **Symptom:** `adjustSpeed` computes `Math.sqrt(this.s / Math.sqrt(vx² + vy²))`; when the velocity is
  exactly zero this is `0/0`. The constructor sets `s = Math.random() * speed`, so `s === 0` (and also
  `speed === 0` from the UI slider) is possible. Once `vx`/`vy` are `NaN`, the particle disappears.
* **Fix:** return early when the current magnitude is 0 (or `s` is 0).

---

## 7. Dependencies

### DEP-1 (fixed): `framer-motion` is imported but not declared
* **Files:** `src/components/tools/Hand/Hand.tsx:2` and `src/components/blog/BlogApp/BlogApp.tsx:2`
  import from `'framer-motion'`; `package.json` lists only `motion`. It works today because `motion`
  depends on `framer-motion` and npm hoists it. **Pinned:** `src/package-hygiene.test.ts:63`.
* **Fix (pick one):** (a) change both imports to `motion/react` (the supported entry point of the declared
  `motion` package; `motion` and `AnimatePresence` are exported from it), or (b) `npm install framer-motion`
  to declare it. (a) is preferred. Then in `package-hygiene.test.ts` flip the `it.fails` and delete the
  "only the known undeclared package is missing" test (it asserts the list is exactly `["framer-motion"]`,
  so it will fail once fixed, by design).
* Verify with `npm run build` and the `Hand`/`BlogApp` behaviour; jsdom tests for `Hand` cover rendering.

---

## 8. Reported leads (found by reading code; **not reproduced and not covered by tests**)

These came from a static review of the React code by a sub-agent. Treat each as a hypothesis. **The
first step for every one of them is to write a failing test (or a minimal reproduction) that proves it.**
If you cannot reproduce it, say so and do not "fix" it.

* **LEAD-1, request storm in the Shengji room.** `src/shengji/components/GameRoom/GameRoom.tsx`
  ~575-592: an effect on `[game, ids]` calls `connectionUpdate()` whenever a seated player is missing from
  presence. The server's `connection` action always saves and publishes `state_change`
  (`shengji-game-room.ts` ~136-151), which sets a new `game` object on every client, which re-runs the
  effect. Expected effect: after one player closes their tab, every remaining client loops requests at the
  rate limit (silent `429`s). Plausible from the code; needs a render test with a fake Ably and `fetch`.
  Likely fix: only call when the `missing` set *changes*, and/or have the server skip publishing when
  `paused` did not change.
* **LEAD-2, `ParticleNetwork` pointer handling** (`ParticleNetwork.tsx` ~138-181): the effect deps are
  `[resizeCanvas]` only, so `handlePointerMove` captures the first `interactive` value (clicking the
  toggle never starts tracking if storage held `false`); `pointerup` is listened for only on the wrapper, so
  releasing outside leaves `pointerDown` true and repulsion becomes attraction.
* **LEAD-3, fetch error handling** in `BlogApp.tsx` (~86-107), `CodeforcesTable.tsx` (~29-31) and
  `USACOTable.tsx` (~98-115): no `res.ok` check and, in places, no `catch`; an error body is parsed as
  data (`[...blogPosts]` throws, or garbage rows with `href="undefined"`). `USACOTable` also has a
  response-ordering race (View A then View B can show A). `App.tsx` has no error boundary around the lazy
  routes (a stale tab after a deploy gets a chunk-load rejection and a blank page) and no catch-all route.
  The `.catch(() => undefined)` pattern in the room components gives the user no feedback.
* **LEAD-4, stale advice** in `GameRoom.tsx` `GameInfo` (~204-248): `getAdvice` runs only in the `[game]`
  effect and reads the previous `hand`, so the recommended play can be for last turn's hand.
* **LEAD-5, `FreqGuesserDemo`** (~82, ~115-117): `reset()` runs on mount and increments the "gave up"
  counter, so every page load (twice under StrictMode) counts as a given-up game.
* **LEAD-6, smaller items:** `ColorSelector` accepts 3-digit hex in the text field via `hexToRGB` but
  `normalizeHex` rejects it so typing `#fff` does nothing and the draft is not reverted (~162-166);
  dragging to black/white resets the hue to 0 because the value round-trips through `hexToHsv`
  (~69-75); `ColorPickerDemo.colorFromDistance` (~60-66) uses `<10`/`<100` while the legend says
  "±10"/"±100" (boundary off by one); `Chaos.tsx` ignores the `refresh` prop; `GameOfLife.tsx`
  (~258-316) clamps `dt` so speed 100 behaves like ~60 and `setGrid(stepGeneration())` uses a stale grid;
  `FreqGuesser.tsx:125` recolours the axis with the primary colour; `services/request.ts:27-31` re-enables
  every `.sjg-button__game` button after 1 s, overriding `disabled={game.paused}`;
  `GameRoom.tsx` ~528-532 awaits `presence.enter` before subscribing to `state_change` (if it rejects no
  updates are ever received); the mount-time `[username, team]` effect (~461-466) returns early because
  `channelRef` is null so a username change only reaches the server after a team change;
  `ChaosDemo.tsx:19` rebuilds `attractors` each render and `Chaos.tsx:223` / `ThreeD.tsx:287` list
  `attractor` in effect deps, which recreates the WebGL renderer on every state change.

---

## 9. Quick index: pinned tests by bug

| Bug | Pinned test(s) |
|---|---|
| SJ-1 | `comparison.test.ts:206`, `:291` |
| SJ-2 | `comparison.test.ts:408`, `:412` (watch `advisor.test.ts` "allows non-splitting of triples...") |
| SJ-3 | `comparison.test.ts:594`, `:627`, `:633` |
| SJ-4 | `shengji/core/entities.test.ts:97` |
| SJ-5 | `shengji/core/testcase.test.ts:48` |
| SV-1 | `shengji-game-room.test.ts:225` |
| SV-2 | `shengji-game-room.test.ts:521`, `:527` |
| SV-3 | `shengji-game-room.test.ts:449` |
| SV-4 | `shengji-game-room.test.ts:443` |
| SV-6 | `firebase-collection-query.test.ts:204` |
| UT-1 | `utils/resize.test.ts:54`, `:58` |
| UT-2 | `utils/storage.test.ts:46` |
| UI-1 | `Form.test.tsx:180` |
| UI-2 | `Form.test.tsx:80` |
| UI-3 | `Slider.test.tsx:106` |
| UI-4 | `utils/list.test.ts:50`, `Select.test.tsx:92` |
| UI-5 | `Select.test.tsx:103` |
| UI-6 | `Hand.test.tsx:65`, `:73` |
| UI-7 | `Modal.test.tsx:107` |
| UI-8 | `GenericButton.test.tsx:63` |
| UI-9 | `entities/particle.test.ts:123` |
| DEP-1 | `src/package-hygiene.test.ts:63` |

That is 30 markers. SV-5, SV-7, SV-8, SV-9 and the LEAD items have **no** failing test yet; writing one is
part of the work.
