import { useState, useCallback } from "react";

import { clientRequest, GameRequest } from "/src/utils/request";

import { deserialize } from "/src/utils/serial";

import { Card, Hand } from "/src/blackjack/core/entities";

import "./BJApp.css";

// Specific Request

async function BJRequest(request : GameRequest) {
    return clientRequest(request, "bj-button__game", "blackjack-game-room");
}

// TODO: replace
// TEMPORARY

function cardToString(card: Card): string {
    return `${card.rank} of ${card.suit}`;
}

function handToString(hand: Hand | null): string {
    const cards = hand?.getCards() || [];
    // console.log("Hand cards:", cards);
    return "[" + cards.map(cardToString).join(", ") + "]";
}

export default function BJApp() {

    const [gameId, setGameId] = useState("1");
    const [playerId, setPlayerId] = useState("1"); // TODO: replace with actual player ID in production

    const [playerCards, setPlayerCards] = useState<Hand | null>(null);
    const [dealerCards, setDealerCards] = useState<Hand | null>(null);

    async function startGame() {
        const res = await BJRequest({
            action: "start",
            clientId: playerId,
            roomId: gameId,
            payload: {
                bet_amount: 100,
            }
        });

        // console.log("Started game:", res);
    
        if (res) setJson(res);
    }

    async function hit() {
        const res = await BJRequest({
            action: "hit",
            clientId: playerId,
            roomId: gameId,
            payload: {
                game_id: gameId,
            }
        });
    
        if (res) setJson(res);
    }

    async function stand() {
        const res = await BJRequest({
            action: "stand",
            clientId: playerId,
            roomId: gameId,
            payload: {
                game_id: gameId,
            }
        });
    
        if (res) setJson(res);
    }

    const setJson = useCallback((data: any) => {
        setGameId(String(data.game_id || gameId));
        setPlayerCards(Hand.deserialize(deserialize(data.player_cards) /* as { cards: Map<Suit, Map<Rank, number>>,  card_count: number, hand_value: number, ace_count: number } */));
        setDealerCards(Hand.deserialize(deserialize(data.dealer_cards) /* as { cards: Map<Suit, Map<Rank, number>>,  card_count: number, hand_value: number, ace_count: number } */));
    }, [gameId]);

    return (
        <div className="bjWrapper">
            <div className="bjLabels">
                <h1>Blackjack Game</h1>
                <h2>GameID: {gameId}</h2>
            </div>
            <div className="bjActions">
                <button onClick={startGame} className="bj-button__game">
                    Start Game
                </button>
                <button onClick={hit} className="bj-button__game">
                    Hit
                </button>
                <button onClick={stand} className="bj-button__game">
                    Stand
                </button>
            </div>
            <div className="bjLabels">
                <h2>Player Cards: {handToString(playerCards)}</h2>
                <h2>Dealer Cards: {handToString(dealerCards)}</h2>
            </div>
        </div>
    );
}
