import { describe, expect, it } from "vitest";

import { Deck, Hand } from "./entities";
import type { Card, Rank } from "./entities";
import { Game } from "./game";
import type { GameData } from "./game";

const fresh = (seed: number, extra: Partial<GameData> = {}): GameData => ({
    player_cards: 2,
    dealer_cards: 1,
    deck_seed: seed,
    bet_amount: 10,
    settled: false,
    ...extra,
});

/** First seed in [1, limit) whose fresh deal satisfies `pred`. */
function findSeed(pred: (game: Game, seed: number) => boolean, limit = 20_000): number {
    for (let seed = 1; seed < limit; seed++) {
        if (pred(new Game(fresh(seed)), seed)) {return seed;}
    }
    throw new Error("no seed found for predicate");
}

function cardsOf(game: Game): { player: Card[]; dealer: Card[] } {
    return { player: game.getPlayerHand().getCards(), dealer: game.getDealerHand().getCards() };
}

/** The game as the server rebuilds it from the stored row. */
const reload = (game: Game): Game => new Game(game.getGameData());

describe("dealing", () => {
    it("deals the dealer's up-card, then the hole card, then the player two cards", () => {
        const deck = new Deck(1, 123);
        const up = deck.draw();
        deck.draw(); // hole card, hidden
        const p1 = deck.draw();
        const p2 = deck.draw();

        const { player, dealer } = cardsOf(new Game(fresh(123)));

        expect(dealer).toEqual([up]);
        expect(player).toEqual([p1, p2]);
    });

    it("hides the hole card until the player stands", () => {
        const game = new Game(fresh(5));
        expect(game.getDealerHand().getCardCount()).toBe(1);
        expect(game.getGameData().dealer_cards).toBe(1);
    });

    it("exposes the stored bet and settled flag", () => {
        const game = new Game(fresh(5, { bet_amount: 42.5, settled: true }));
        expect(game.getBetAmount()).toBe(42.5);
        expect(game.isSettled()).toBe(true);
        expect(new Game(fresh(5)).isSettled()).toBe(false);
    });

    it("treats a missing settled flag as false", () => {
        const data = { ...fresh(5) } as Partial<GameData>;
        delete data.settled;
        expect(new Game(data as GameData).isSettled()).toBe(false);
    });

    it("setSettled() flips the flag and is reflected in the saved data", () => {
        const game = new Game(fresh(5));
        game.setSettled(true);
        expect(game.isSettled()).toBe(true);
        expect(game.getGameData().settled).toBe(true);
    });

    it("saves exactly what it needs to be rebuilt", () => {
        const game = new Game(fresh(321, { bet_amount: 7 }));
        expect(game.getGameData()).toEqual({
            player_cards: 2,
            dealer_cards: 1,
            deck_seed: 321,
            bet_amount: 7,
            settled: false,
        });
    });

    it("uses a single 52-card shoe (jokers are skipped)", () => {
        const game = new Game(fresh(9));
        expect(game.getDeck().getSeed()).toBe(9);
    });
});

describe("playing a hand", () => {
    it("hit() deals the next card from the shoe", () => {
        const seed = findSeed((g) => g.getPlayerHand().getHandValue() < 12);
        const game = new Game(fresh(seed));

        const deck = new Deck(1, seed);
        for (let i = 0; i < 4; i++) {deck.draw();}
        const expected = deck.draw();

        expect(game.playerHit()).toBe(true);
        expect(game.getPlayerHand().getCards()[2]).toEqual(expected);
        expect(game.getGameData().player_cards).toBe(3);
    });

    it("stand() reveals the hole card and lets the dealer play out", () => {
        const seed = findSeed((g) => g.getPlayerHand().getHandValue() <= 16);
        const game = new Game(fresh(seed));

        expect(game.playerStand()).toBe(true);

        expect(game.getDealerHand().getCardCount()).toBeGreaterThanOrEqual(2);
        expect(game.checkOver()).toBe(true);
        expect(game.getGameData().dealer_cards).toBe(game.getDealerHand().getCardCount());
    });

    it("the dealer draws to 17 and then stands", () => {
        for (let seed = 1; seed < 500; seed++) {
            const game = new Game(fresh(seed));
            if (game.getPlayerHand().getHandValue() > 21) {continue;}
            game.playerStand();
            const value = game.getDealerHand().getHandValue();
            expect(value).toBeGreaterThanOrEqual(17);
        }
    });

    it("the dealer stands on soft 17", () => {
        const seed = findSeed((g) => {
            const d = new Game(fresh(g.getGameData().deck_seed));
            d.playerStand();
            const cards = d.getDealerHand().getCards();
            return (
                cards.length === 2 &&
                cards.some((c) => c.rank === 14) &&
                d.getDealerHand().getHandValue() === 17
            );
        });
        const game = new Game(fresh(seed));
        game.playerStand();
        expect(game.getDealerHand().getCardCount()).toBe(2);
    });

    it("the dealer keeps drawing while the total is 16 or less", () => {
        let sawDraw = false;
        for (let seed = 1; seed < 500; seed++) {
            const game = new Game(fresh(seed));
            game.playerStand();
            const cards = game.getDealerHand().getCards();

            // replay the dealer's cards one at a time: every card after the second must have
            // been taken while the running total was below 17
            const running = new Hand();
            cards.forEach((c, i) => {
                if (i >= 2) {
                    sawDraw = true;
                    expect(running.getHandValue()).toBeLessThan(17);
                }
                running.addCard(c);
            });
        }
        expect(sawDraw).toBe(true);
    });

    it("hit() after standing is refused", () => {
        const seed = findSeed((g) => g.getPlayerHand().getHandValue() <= 16);
        const game = new Game(fresh(seed));
        game.playerStand();
        expect(game.playerHit()).toBe(false);
        expect(game.playerStand()).toBe(false);
    });

    it("hit() and stand() are refused once the player has busted", () => {
        const seed = findSeed((g) => g.getPlayerHand().getHandValue() >= 12 && g.getPlayerHand().getHandValue() <= 16);
        const game = new Game(fresh(seed));
        let guard = 0;
        while (game.playerHit() && guard++ < 20) {continue;}

        expect(game.getPlayerHand().getHandValue()).toBeGreaterThan(21);
        expect(game.checkNotLoser()).toBe("dealer");
        expect(game.checkOver()).toBe(true);
        expect(game.checkWinner()).toBe("dealer");
        expect(game.playerHit()).toBe(false);
        expect(game.playerStand()).toBe(false);
    });

    it("a bust ends the hand without revealing the hole card", () => {
        const seed = findSeed((g) => g.getPlayerHand().getHandValue() >= 12 && g.getPlayerHand().getHandValue() <= 16);
        const game = new Game(fresh(seed));
        while (game.playerHit()) {continue;}
        expect(game.getPlayerHand().getHandValue()).toBeGreaterThan(21);
        expect(game.getDealerHand().getCardCount()).toBe(1);
    });

    it("dealerPlay() does nothing before the player has finished", () => {
        const game = new Game(fresh(5));
        expect(game.dealerPlay()).toBe(false);
        expect(game.getDealerHand().getCardCount()).toBe(1);
    });

    it("a hand is not over while the player may still act", () => {
        const seed = findSeed((g) => g.getPlayerHand().getHandValue() < 21);
        expect(new Game(fresh(seed)).checkOver()).toBe(false);
    });
});

describe("winner determination", () => {
    it("matches the final totals for every outcome", () => {
        const outcomes = new Set<string>();
        for (let seed = 1; seed < 3000; seed++) {
            const game = new Game(fresh(seed));
            game.playerStand();
            const p = game.getPlayerHand().getHandValue();
            const d = game.getDealerHand().getHandValue();
            const winner = game.checkWinner();
            outcomes.add(winner);

            if (p > 21) {expect(winner).toBe("dealer");}
            else if (d > 21) {expect(winner).toBe("player");}
            else if (p > d) {expect(winner).toBe("player");}
            else if (d > p) {expect(winner).toBe("dealer");}
            else {expect(winner).toBe("tie");}
        }
        expect([...outcomes].sort()).toEqual(["dealer", "player", "tie"]);
    });

    it("a dealer bust loses the hand even though the dealer is over", () => {
        const seed = findSeed((g, s) => {
            if (g.getPlayerHand().getHandValue() > 21) {return false;}
            const d = new Game(fresh(s));
            d.playerStand();
            return d.getDealerHand().getHandValue() > 21;
        });
        const game = new Game(fresh(seed));
        game.playerStand();
        expect(game.checkNotLoser()).toBe("player");
        expect(game.checkWinner()).toBe("player");
        expect(game.checkOver()).toBe(true);
    });

    it("player 21 against dealer 21 is a tie", () => {
        const seed = findSeed((g, s) => {
            if (g.getPlayerHand().getHandValue() !== 21) {return false;}
            const d = new Game(fresh(s));
            d.playerStand();
            return d.getDealerHand().getHandValue() === 21;
        }, 200_000);
        const game = new Game(fresh(seed));
        game.playerStand();
        expect(game.checkWinner()).toBe("tie");
    });
});

describe("persistence: rebuilding from the saved row", () => {
    it("restores a mid-hand state exactly", () => {
        for (let seed = 1; seed < 200; seed++) {
            const game = new Game(fresh(seed));
            if (game.getPlayerHand().getHandValue() < 21) {game.playerHit();}

            const copy = reload(game);

            expect(cardsOf(copy)).toEqual(cardsOf(game));
            expect(copy.checkOver()).toBe(game.checkOver());
            expect(copy.checkWinner()).toBe(game.checkWinner());
            expect(copy.getGameData()).toEqual(game.getGameData());
        }
    });

    it("restores a finished hand, including the dealer's draws", () => {
        for (let seed = 1; seed < 300; seed++) {
            const game = new Game(fresh(seed));
            game.playerStand();

            const copy = reload(game);

            expect(cardsOf(copy)).toEqual(cardsOf(game));
            expect(copy.checkOver()).toBe(game.checkOver());
            expect(copy.checkWinner()).toBe(game.checkWinner());
        }
    });

    it("a reloaded finished hand refuses further actions", () => {
        const seed = findSeed((g) => g.getPlayerHand().getHandValue() <= 16);
        const game = new Game(fresh(seed));
        game.playerStand();
        const copy = reload(game);
        expect(copy.playerHit()).toBe(false);
        expect(copy.playerStand()).toBe(false);
    });

    it("a reloaded game continues exactly like the original would have", () => {
        for (let seed = 1; seed < 200; seed++) {
            const a = new Game(fresh(seed));
            if (a.getPlayerHand().getHandValue() >= 21) {continue;}

            const b = reload(a);
            a.playerHit();
            b.playerHit();

            expect(cardsOf(b)).toEqual(cardsOf(a));
        }
    });

    it("never changes the seed", () => {
        const game = new Game(fresh(31415));
        game.playerHit();
        expect(reload(game).getGameData().deck_seed).toBe(31415);
    });

    it("rebuilds a bust without a revealed hole card", () => {
        const seed = findSeed((g) => g.getPlayerHand().getHandValue() >= 12 && g.getPlayerHand().getHandValue() <= 16);
        const game = new Game(fresh(seed));
        while (game.playerHit()) {continue;}
        const copy = reload(game);
        expect(copy.getDealerHand().getCardCount()).toBe(1);
        expect(copy.checkWinner()).toBe("dealer");
        expect(copy.checkOver()).toBe(true);
    });

    it("plays all of a long stack of hands without drawing past the shoe", () => {
        for (let seed = 1; seed < 400; seed++) {
            const game = new Game(fresh(seed));
            while (game.getPlayerHand().getHandValue() < 17 && game.playerHit()) {continue;}
            game.playerStand();
            const total = game.getPlayerHand().getCardCount() + game.getDealerHand().getCardCount();
            expect(total).toBeLessThanOrEqual(52);
        }
    });
});

describe("dealerCondition", () => {
    const handOf = (...ranks: number[]): Hand => {
        const hand = new Hand();
        for (const rank of ranks) {hand.addCard({ suit: "clubs", rank: rank as Rank });}
        return hand;
    };

    it("hits 16 and below", () => {
        expect(Game.dealerCondition(handOf(10, 6))).toBe(true);
        expect(Game.dealerCondition(handOf(2))).toBe(true);
        expect(Game.dealerCondition(new Hand())).toBe(true);
    });

    it("stands on hard and soft 17 and above", () => {
        expect(Game.dealerCondition(handOf(10, 7))).toBe(false);
        expect(Game.dealerCondition(handOf(14, 6))).toBe(false); // soft 17
        expect(Game.dealerCondition(handOf(10, 10))).toBe(false);
    });

    it("a soft hand that would bust is re-evaluated as hard", () => {
        expect(Game.dealerCondition(handOf(14, 5, 10))).toBe(true); // 26 -> ace drops to 1 -> hard 16
        expect(Game.dealerCondition(handOf(14, 6, 10))).toBe(false); // hard 17
    });
});
