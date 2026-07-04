import { useState, useCallback } from "react";

import { clientRequest, GameRequest } from "/src/utils/request";

import { deserialize } from "/src/utils/serial";

import * as BJCore from "/src/blackjack/core/entities";

import Hand from "/src/components/tools/Hand/Hand";

import "./GameRoom.css";

// Specific Request

const BJRequest = async (request: GameRequest) => clientRequest(request, "bjg-button", "blackjack-game-room");

// function cardToString(card: BJCore.Card): string {
//     return `${card.rank} of ${card.suit}`;
// }

// function handToString(hand: BJCore.Hand | null): string {
//     const cards = hand?.getCards() || [];
//     // console.log("Hand cards:", cards);
//     return "[" + cards.map(cardToString).join(", ") + "]";
// }

export default function GameRoom() {

    const [gameId, setGameId] = useState("1");
    const [playerId, setPlayerId] = useState("1"); // TODO: replace with actual player ID in production

    const [playerCards, setPlayerCards] = useState<BJCore.Hand | null>(null);
    const [dealerCards, setDealerCards] = useState<BJCore.Hand | null>(null);

    const [status, setStatus] = useState<string | null>(null);

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
        if (!data) return;
        if (data.over) setStatus(data.status);
        else setStatus(null);
        setGameId(String(data.game_id || gameId));
        setPlayerCards(BJCore.Hand.deserialize(deserialize(data.player_cards) /* as { cards: Map<Suit, BJCore.Card[],  card_count: number, hand_value: number, ace_count: number } */));
        setDealerCards(BJCore.Hand.deserialize(deserialize(data.dealer_cards) /* as { cards: Map<Suit, BJCore.Card[],  card_count: number, hand_value: number, ace_count: number } */));
    }, [gameId]);

    return (
        <div className="bjg-wrapper">
            <div className="bjg-labels">
                <p>PlayerID: {playerId}</p>
                <p>GameID: {gameId}</p>
                <p>Winner: {status || "None"}</p>
            </div>
            <div className="bjg-actions">
                <button onClick={startGame} className="bjg-button">
                    Start Game
                </button>
                <button onClick={hit} className="bjg-button">
                    Hit
                </button>
                <button onClick={stand} className="bjg-button">
                    Stand
                </button>
            </div>
            <div className="bjg-hands">
                <div className="bjg-hand">
                    <p>Dealer</p>
                    <Hand cards={dealerCards?.getCards() || []} />
                </div>
                <div className="bjg-hand">
                    <p>Player</p>
                    <Hand cards={playerCards?.getCards() || []} />  
                </div>                
            </div>
            {/* <div className="bjg-labels">
                <h2>Player Cards: {handToString(playerCards)}</h2>
                <h2>Dealer Cards: {handToString(dealerCards)}</h2>
            </div> */}
        </div>
    );
}
