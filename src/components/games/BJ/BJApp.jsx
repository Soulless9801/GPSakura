import { useState, useEffect } from "react";
import { clientRequest } from "/src/blackjack/server/request";

import "./BJApp.css";

export default function BJApp() {

    const [gameId, setGameId] = useState(1);
    const [playerId, setPlayerId] = useState(1); // TODO: replace with actual player ID in production
    const [playerCards, setPlayerCards] = useState(0);
    const [dealerCards, setDealerCards] = useState(0);

    async function startGame() {
        const res = await clientRequest({
            action: "start",
            clientId: playerId,
            payload: {
                bet_amount: 100,
            }
        });
    
        if (res?.result) {
            setGameId(res.result[0].game_id);
            setJson(res.result);
        }
    }

    async function hit() {
        const res = await clientRequest({
            action: "hit",
            clientId: playerId,
            payload: {
                game_id: gameId,
            }
        });
    
        if (res?.result) setJson(res.result);
    }

    async function stand() {
        const res = await clientRequest({
            action: "stand",
            clientId: playerId,
            payload: {
                game_id: gameId,
            }
        });
    
        if (res?.result) setJson(res.result);
    }

    const setJson = (json) => {
        if (!json) return;
        console.log("Received update:", json);
        const data = json[0]
        if (data.game_id !== gameId) return; // ignore updates for other games
        setPlayerCards(data.player_cards);
        setDealerCards(data.dealer_cards);
    };

    return (
        <div className="bjWrapper">
            <div className="bjLabels">
                <h1>Blackjack Game</h1>
                <h2>GameID: {gameId}</h2>
            </div>
            <div className="bjActions">
                <button onClick={startGame}>
                    Start Game
                </button>
                <button onClick={hit}>
                    Hit
                </button>
                <button onClick={stand}>
                    Stand
                </button>
            </div>
            <div className="bjLabels">
                <h2>Player Cards: {playerCards}</h2>
                <h2>Dealer Cards: {dealerCards}</h2>
            </div>
        </div>
    );
}
