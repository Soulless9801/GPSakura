import * as BJCore from "/src/blackjack/core/entities";

export type GameData = {
    player_cards: number;
    dealer_cards: number;
    deck_seed: number;
};

export class Game {

    private deck: BJCore.Deck;

    private playerHand: BJCore.Hand;
    private dealerHand: BJCore.Hand;

    private purgatory: BJCore.Card; // hole card

    private playerFinished: boolean = true;
    private dealerFinished: boolean = false;

    static dealerCondition(hand: BJCore.Hand): boolean {
        return hand.getHandValue() < 17;
    }

    constructor(data: GameData) {

        this.deck = new BJCore.Deck(1, data.deck_seed);

        this.playerHand = new BJCore.Hand();
        this.dealerHand = new BJCore.Hand();

        let rem_player = data.player_cards;
        let rem_dealer = data.dealer_cards;

        this.dealerHand.addCard(this.deck.draw()!); // face up card
        this.purgatory = this.deck.draw()!; // hole card

        if (rem_dealer > 1) { // dealer turn
            rem_dealer -= 2;
            this.dealerHand.addCard(this.purgatory);
        } else {
            rem_dealer = 0; // not dealer turn
            this.playerFinished = false;
        }

        while (rem_player > 0 || rem_dealer > 0) {
            const card = this.deck.draw();
            if (!card) break; // should never happen
            if (rem_player > 0) {
                this.playerHand.addCard(card);
                rem_player--;
            } else {
                this.dealerHand.addCard(card);
                rem_dealer--;
            }
        }

        if (!Game.dealerCondition(this.dealerHand)) this.dealerFinished = true;
    }

    playerHit(): boolean {
        if (this.playerFinished || this.checkNotLoser()) return false;
        const card = this.deck.draw();
        if (!card) return false; // should never happen
        this.playerHand.addCard(card);
        return true;
    }

    playerStand(): boolean {
        if (this.playerFinished || this.checkNotLoser()) return false;
        this.playerFinished = true;
        this.dealerHand.addCard(this.purgatory);
        while (this.dealerPlay()) continue; // continuous dealer play
        return true;
    }

    dealerPlay(): boolean {
        if (!this.playerFinished || this.dealerFinished || this.checkNotLoser()) return false;
        if (Game.dealerCondition(this.dealerHand)) {
            const card = this.deck.draw();
            if (!card) return false; // should never happen
            this.dealerHand.addCard(card);
        } else this.dealerFinished = true; // dealer stands
        return true;
    }

    // turnsOver(): boolean {
    //     return this.playerFinished && this.dealerFinished;
    // }

    checkNotLoser(): "player" | "dealer" | null {

        const playerValue = this.playerHand.getHandValue();
        const dealerValue = this.dealerHand.getHandValue();
        
        if (playerValue > 21) return "dealer";
        if (dealerValue > 21) return "player";

        return null;
    }

    checkOver(): boolean {
        return (this.checkNotLoser() ? true : false) || (this.playerFinished && this.dealerFinished);
    }

    checkWinner(): "player" | "dealer" | "tie" {

        const playerValue = this.playerHand.getHandValue();
        const dealerValue = this.dealerHand.getHandValue();

        if (playerValue > 21) return "dealer";
        if (dealerValue > 21) return "player";

        if (playerValue > dealerValue) return "player";
        if (dealerValue > playerValue) return "dealer";
        
        return "tie";
    }

    getGameData(): GameData {
        return {
            player_cards: this.playerHand.getCardCount(),
            dealer_cards: this.dealerHand.getCardCount(),
            deck_seed: this.deck.getSeed(),
        };
    }

    getDeck(): BJCore.Deck {
        return this.deck;
    }

    getPlayerHand(): BJCore.Hand {
        return this.playerHand;
    }

    getDealerHand(): BJCore.Hand {
        return this.dealerHand;
    }
}