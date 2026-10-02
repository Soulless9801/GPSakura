import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { analyse } from "/src/shengji/advisor/advisor";
import { allCards, cardKey, moveKey } from "/src/shengji/advisor/moves";
import { HARMFUL_RULES, PARAMETERS } from "/src/shengji/advisor/playbook";
import type { Advice, Card, Move, Position, Rank, Suit, Trump } from "/src/shengji/advisor/types";

import * as CardModule from '/src/entities/card';

import "./Advisor.css";

// example with easy correct answer
const EXAMPLE: { hand: Card[]; trick: Move[]; trump: Trump } = {
    trump: { suit: "spades", rank: 2 },
    hand: [
        { suit: "hearts", rank: 13 },
        { suit: "hearts", rank: 9 },
        { suit: "hearts", rank: 7 },
        { suit: "hearts", rank: 3 },
        { suit: "diamonds", rank: 14 },
        { suit: "diamonds", rank: 12 },
        { suit: "diamonds", rank: 4 },
        { suit: "clubs", rank: 9 },
        { suit: "clubs", rank: 4 },
        { suit: "clubs", rank: 3 },
        { suit: "spades", rank: 11 },
        { suit: "spades", rank: 8 },
        { suit: "spades", rank: 5 },
    ],
    trick: [[{ suit: "hearts", rank: 14 }], [{ suit: "hearts", rank: 6 }]],
};

// adding to card to where?
type Target = { kind: "hand" } | { kind: "seen" } | { kind: "trick"; index: number };

// small display copmonents
function PlayCard({ card, size = "md" }: { card: Card; size?: "sm" | "md" }) {
    return (
        <span className={`advCard advCard--${size} ${CardModule.isRed(card) ? "advCard--red" : "advCard--black"}`}>
            <span className="advCard__rank">{CardModule.rankLabel(card)}</span>
            <span className="advCard__suit">{CardModule.SUIT_GLYPH[card.suit]}</span>
        </span>
    );
}

function CardRow({ cards, size = "md" }: { cards: Card[]; size?: "sm" | "md" }) {
    return (
        <span className="advCardRow">
            {cards.map((card, i) => (
                <PlayCard key={`${cardKey(card)}-${String(i)}`} card={card} size={size} />
            ))}
        </span>
    );
}

function Chips({ cards, onRemove }: { cards: Card[]; onRemove: (index: number) => void }) {
    if (!cards.length) {return <span className="advEmpty">nothing yet</span>;}
    return (
        <span className="advChips">
            {cards.map((card, i) => (
                <button
                    key={`${cardKey(card)}-${String(i)}`}
                    className="advChip"
                    title={`remove ${CardModule.cardName(card)}`}
                    onClick={() => { onRemove(i); }}
                >
                    <PlayCard card={card} size="sm" />
                    <span className="advChip__x">&times;</span>
                </button>
            ))}
        </span>
    );
}

function Segmented<T extends string | number>({
    options,
    value,
    onChange,
    render,
}: {
    options: T[];
    value: T;
    onChange: (next: T) => void;
    render?: (option: T) => ReactNode;
}) {
    return (
        <span className="advSegmented">
            {options.map((option) => (
                <button
                    key={String(option)}
                    className={`advSeg${option === value ? " active" : ""}`}
                    onClick={() => { onChange(option); }}
                >
                    {render ? render(option) : String(option)}
                </button>
            ))}
        </span>
    );
}

// ---------------------------------------------------------------------------
// the page
// ---------------------------------------------------------------------------

export default function Advisor() {
    const [numPlayers, setNumPlayers] = useState<number>(4);
    const [trumpSuit, setTrumpSuit] = useState<Suit | null>("spades");
    const [trumpRank, setTrumpRank] = useState<Rank>(2);

    const [hand, setHand] = useState<Card[]>([]);
    const [trick, setTrick] = useState<Move[]>([]);
    const [seen, setSeen] = useState<Card[]>([]);

    const [target, setTarget] = useState<Target>({ kind: "hand" });
    const [showSeen, setShowSeen] = useState<boolean>(false);

    const decks: number = numPlayers / 2;
    const myPosition: number = trick.length;

    const advice: Advice = useMemo(() => {
        const position: Position = {
            numPlayers,
            decks: numPlayers / 2,
            trump: { suit: trumpSuit, rank: trumpRank },
            hand,
            trick,
            seen,
        };
        return analyse(position);
    }, [numPlayers, trumpSuit, trumpRank, hand, trick, seen]);

    // how many copies of each card the position already accounts for
    const used = useMemo(() => {
        const counts: Map<string, number> = new Map<string, number>();
        for (const card of [...hand, ...seen, ...trick.flat()]) {
            counts.set(cardKey(card), (counts.get(cardKey(card)) || 0) + 1);
        }
        return counts;
    }, [hand, trick, seen]);

    const addCard = (card: Card): void => {
        if (target.kind === "hand") {setHand((prev) => [...prev, card]);}
        else if (target.kind === "seen") {setSeen((prev) => [...prev, card]);}
        else {
            setTrick((prev) =>
                prev.map((play, i) => (i === target.index ? [...play, card] : play)),
            );
        }
    };

    const removeFrom = (where: Target, index: number): void => {
        const drop = (list: Card[]): Card[] => list.filter((_, i) => i !== index);
        if (where.kind === "hand") {setHand(drop);}
        else if (where.kind === "seen") {setSeen(drop);}
        else {setTrick((prev) => prev.map((play, i) => (i === where.index ? drop(play) : play)));}
    };

    const addPlay = (): void => {
        if (trick.length >= numPlayers - 1) {return;}
        setTrick((prev) => [...prev, []]);
        setTarget({ kind: "trick", index: trick.length });
    };

    const removePlay = (index: number): void => {
        setTrick((prev) => prev.filter((_, i) => i !== index));
        setTarget({ kind: "hand" });
    };

    const reset = (): void => {
        setHand([]);
        setTrick([]);
        setSeen([]);
        setTarget({ kind: "hand" });
    };

    const loadExample = (): void => {
        setNumPlayers(4);
        setTrumpSuit(EXAMPLE.trump.suit);
        setTrumpRank(EXAMPLE.trump.rank);
        setHand(EXAMPLE.hand);
        setTrick(EXAMPLE.trick.map((play) => [...play]));
        setSeen([]);
        setTarget({ kind: "hand" });
    };

    const targetLabel: string =
        target.kind === "hand"
            ? "your hand"
            : target.kind === "seen"
              ? "cards seen earlier"
              : `seat ${String(target.index + 1)}'s play`;

    const best = advice.candidates[0];
    const alternatives = advice.candidates.slice(1, 5);

    return (
        <div className="advWrapper">
            <ol className="advSteps">
                <li>Set the table size and the trump.</li>
                <li>Enter the cards in your hand.</li>
                <li>Add what has already been put down this trick.</li>
                <li>Read the play, and why.</li>
            </ol>

            {/* game config/setup */}
            <section className="advPanel advSetup">
                <div className="advField">
                    <span className="advField__label">Players</span>
                    <Segmented options={[4, 6, 8]} value={numPlayers} onChange={setNumPlayers} />
                </div>

                <div className="advField">
                    <span className="advField__label">Trump suit</span>
                    <Segmented
                        options={[...CardModule.PLAY_SUITS, "none"] as Array<Suit | "none">}
                        value={(trumpSuit ?? "none")}
                        onChange={(next) => { setTrumpSuit(next === "none" ? null : (next)); }}
                        render={(option) =>
                            option === "none" ? (
                                "NT"
                            ) : (
                                <span className={CardModule.isRed({ suit: option, rank: 2 }) ? "advRed" : ""}>
                                    {CardModule.SUIT_GLYPH[option as string]}
                                </span>
                            )
                        }
                    />
                </div>

                <div className="advField">
                    <span className="advField__label">Trump Rank</span>
                    <Segmented
                        options={CardModule.RANKS}
                        value={trumpRank}
                        onChange={setTrumpRank}
                        render={(option) => CardModule.RANK_LABEL[option as number] || String(option)}
                    />
                </div>

                <span className="advSetup__actions">
                    <button onClick={loadExample}>Load Example</button>
                    <button onClick={reset}>Clear</button>
                </span>
            </section>

            {/* card picker */}
            <section className="advPanel advPicker">
                <header className="advPanel__head">
                    <h3>
                        Adding to <em>{targetLabel}</em>
                    </h3>
                    <span className="advCount">
                        {decks} decks &mdash; each card can appear {decks} times
                    </span>
                </header>

                {CardModule.PLAY_SUITS.map((suit) => (
                    <div key={suit} className="advPickRow">
                        <span className={`advPickRow__suit${CardModule.isRed({ suit, rank: 2 }) ? " advRed" : ""}`}>
                            {CardModule.SUIT_GLYPH[suit]}
                        </span>
                        {CardModule.RANKS.map((rank) => {
                            const card: Card = { suit, rank };
                            const spent: number = used.get(cardKey(card)) || 0;
                            return (
                                <button
                                    key={rank}
                                    className={`advPick${spent ? " advPick--used" : ""}`}
                                    disabled={spent >= decks}
                                    onClick={() => { addCard(card); }}
                                    title={`add ${CardModule.cardName(card)}`}
                                >
                                    {CardModule.RANK_LABEL[rank] || rank}
                                    {spent > 0 && <span className="advPick__used">{spent}</span>}
                                </button>
                            );
                        })}
                    </div>
                ))}

                <div className="advPickRow">
                    <span className="advPickRow__suit">{CardModule.SUIT_GLYPH.jokers}</span>
                    {allCards()
                        .filter((card) => card.suit === "jokers")
                        .map((card) => {
                            const spent: number = used.get(cardKey(card)) || 0;
                            return (
                                <button
                                    key={card.rank}
                                    className={`advPick advPick--joker${spent ? " advPick--used" : ""}${CardModule.isRed(card) ? " advRed" : ""}`}
                                    disabled={spent >= decks}
                                    onClick={() => { addCard(card); }}
                                    title={`add the ${CardModule.cardName(card)}`}
                                >
                                    {CardModule.rankLabel(card)}
                                    {spent > 0 && <span className="advPick__used">{spent}</span>}
                                </button>
                            );
                        })}
                </div>
            </section>

            <div className="advGrid">
                {/* current game state column*/}
                <div className="advColumn">
                    <section className="advPanel">
                        <header className="advPanel__head">
                            <h3>Your hand</h3>
                            <span className="advCount">{hand.length} cards</span>
                            <button
                                className={target.kind === "hand" ? "active" : ""}
                                onClick={() => { setTarget({ kind: "hand" }); }}
                            >
                                {target.kind === "hand" ? "adding here" : "add cards"}
                            </button>
                        </header>
                        <Chips cards={hand} onRemove={(i) => { removeFrom({ kind: "hand" }, i); }} />
                    </section>

                    <section className="advPanel">
                        <header className="advPanel__head">
                            <h3>On the table</h3>
                            <span className="advCount">
                                {trick.length ? `${String(advice.facts.potPoints)} pts in the trick` : "you are leading"}
                            </span>
                            <button onClick={addPlay} disabled={trick.length >= numPlayers - 1}>
                                add a play
                            </button>
                        </header>

                        {trick.map((play, i) => {
                            const partner: boolean = (myPosition - i) % 2 === 0;
                            const winning: boolean = advice.facts.winningPosition === i;
                            return (
                                <div key={i} className={`advSeat${winning ? " advSeat--winning" : ""}`}>
                                    <span className="advSeat__who">
                                        <span className="advSeat__name">
                                            Seat {i + 1}
                                            {i === 0 ? " (led)" : ""}
                                        </span>
                                        <span className={`advTag ${partner ? "advTag--partner" : "advTag--opponent"}`}>
                                            {partner ? "partner" : "opponent"}
                                        </span>
                                        {winning && <span className="advTag advTag--winning">winning</span>}
                                    </span>
                                    <span className="advSeat__cards">
                                        <Chips
                                            cards={play}
                                            onRemove={(index) => { removeFrom({ kind: "trick", index: i }, index); }}
                                        />
                                    </span>
                                    <span className="advSeat__actions">
                                        <button
                                            className={
                                                target.kind === "trick" && target.index === i ? "active" : ""
                                            }
                                            onClick={() => { setTarget({ kind: "trick", index: i }); }}
                                        >
                                            {target.kind === "trick" && target.index === i ? "adding" : "add"}
                                        </button>
                                        <button onClick={() => { removePlay(i); }}>remove</button>
                                    </span>
                                </div>
                            );
                        })}

                        <div className="advSeat advSeat--you">
                            <span className="advSeat__who">
                                <span className="advSeat__name">You</span>
                                <span className="advTag advTag--you">to play</span>
                            </span>
                        </div>
                    </section>

                    <section className="advPanel">
                        <header className="advPanel__head">
                            <h3>Seen earlier this round</h3>
                            <span className="advCount">{seen.length} cards</span>
                            <button onClick={() => { setShowSeen((prev) => !prev); }}>
                                {showSeen ? "hide" : "optional"}
                            </button>
                        </header>
                        {showSeen && (
                            <>
                                <p className="advNote">
                                    Cards played in earlier tricks. Leave this empty and the advisor
                                    assumes nothing has gone yet, which makes it pessimistic about
                                    whether your high cards are still boss.
                                </p>
                                <div className="advPanel__head">
                                    <button
                                        className={target.kind === "seen" ? "active" : ""}
                                        onClick={() => { setTarget({ kind: "seen" }); }}
                                    >
                                        {target.kind === "seen" ? "adding here" : "add cards"}
                                    </button>
                                </div>
                                <Chips cards={seen} onRemove={(i) => { removeFrom({ kind: "seen" }, i); }} />
                            </>
                        )}
                    </section>
                </div>

                {/* answer column */}
                <div className="advColumn">
                    <section className="advPanel advResult">
                        {advice.problems.length > 0 ? (
                            <>
                                <h3>Not Enough Information</h3>
                                <ul className="advProblems">
                                    {advice.problems.map((problem) => (
                                        <li key={problem}>{problem}</li>
                                    ))}
                                </ul>
                            </>
                        ) : (
                            <>
                                <h3>Play</h3>
                                <div className="advBest">
                                    <CardRow cards={best.move} />
                                </div>

                                <div className="advStats">
                                    <span className="advStat">
                                        <span className="advStat__value">
                                            {Math.round((best.winProbability ?? 0) * 100)}%
                                        </span>
                                        <span className="advStat__label">your side holds it</span>
                                    </span>
                                    <span className="advStat">
                                        <span className="advStat__value">{best.pointsAdded}</span>
                                        <span className="advStat__label">points you commit</span>
                                    </span>
                                    <span className="advStat">
                                        <span className="advStat__value">{best.takesTrick ? "yes" : "no"}</span>
                                        <span className="advStat__label">takes the trick now</span>
                                    </span>
                                    <span className="advStat">
                                        <span className="advStat__value">{advice.facts.legalMoveCount}</span>
                                        <span className="advStat__label">legal plays</span>
                                    </span>
                                </div>

                                <h4>Why</h4>
                                {best.rules.length ? (
                                    <ul className="advRules">
                                        {best.rules.map((rule) => (
                                            <li key={rule.id}>
                                                <span
                                                    className={`advRule__delta ${rule.delta >= 0 ? "advRule__delta--up" : "advRule__delta--down"}`}
                                                >
                                                    {rule.delta >= 0 ? "+" : ""}
                                                    {rule.delta.toFixed(1)}
                                                </span>
                                                <span className="advRule__body">
                                                    <span className="advRule__id">
                                                        {rule.id}
                                                        {HARMFUL_RULES[rule.id] && (
                                                            <span
                                                                className="advTag advTag--warn"
                                                                title={HARMFUL_RULES[rule.id]}
                                                            >
                                                                measured harmful
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="advRule__plain">{rule.plain}</span>
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="advNote">
                                        No rule had anything to say here — every legal play scores the
                                        same, so this one is arbitrary.
                                    </p>
                                )}

                                {alternatives.length > 0 && (
                                    <>
                                        <h4>Next best</h4>
                                        <ul className="advAlts">
                                            {alternatives.map((candidate) => (
                                                <li key={moveKey(candidate.move)}>
                                                    <CardRow cards={candidate.move} size="sm" />
                                                    <span className="advAlt__score">
                                                        {candidate.score.toFixed(1)}
                                                    </span>
                                                    <span className="advAlt__why">
                                                        {candidate.rules.length
                                                            ? candidate.rules
                                                                  .slice()
                                                                  .sort((a, b) => a.delta - b.delta)[0].id
                                                            : "nothing scored it"}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </>
                        )}
                    </section>
                </div>
            </div>
            <div className="advPickRow">
                    <section className="advPanel advCaveat">
                        <h4>What this actually is</h4>
                        <p>
                            The legal plays come from{" "}
                            <code>core/comparison.ts</code> &mdash; the same validator the game
                            runs on &mdash; so nothing suggested here is an illegal move.
                        </p>
                        <p>
                            The ranking is the playbook heuristic, ported from the offline bot. Over
                            200 paired deals at 4 players it wins 48.5% against the strongest
                            hand-written bot in this repo and 59.0% against the plain one. It is not
                            a solver, and against perfect-information hindsight it picks the truly
                            optimal move about a third of the time.
                        </p>
                        <p>
                            The win-probability figure is an uncalibrated estimate, so treat{" "}
                            {Math.round(PARAMETERS.trump_commit_threshold * 100)}% as a dial rather
                            than a real probability.
                        </p>
                    </section>
                </div>
        </div>
    );
}
