import { useState, useCallback, useEffect } from "react";

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

    const [gameId, setGameId] = useState<string>("");

    const [playerId, setPlayerId] = useState<string>("");
    const [signature, setSignature] = useState<string | null>(null);

    useEffect(() => {
        const getIdentity = async () => {
            let clientId = localStorage.getItem("bjClientId");
            let nSig = localStorage.getItem("bjSignature");
            //TODO: verify correct clientId vs. signature
            if (!clientId || !nSig) {

                const res_id = await fetch("/.netlify/functions/neon-create-user", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });
                // console.log("res_id:", res_id);
                if (!res_id || !res_id.ok) return;

                const data_id = await res_id.text();
                if (!data_id) return;

                // console.log(data_id);

                const des_id = deserialize(data_id);
                if (!des_id || typeof des_id !== "object") return;

                const ret_id = des_id as { player_id: string };
                if (!ret_id || !ret_id.player_id) return;

                clientId = ret_id.player_id;

                const res_sig =  await fetch("/.netlify/functions/create-session", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        action: "sign",
                        clientId: clientId,
                    }),
                });
                if (!res_sig || !res_sig.ok) return;

                const data_sig = await res_sig.text();
                if (!data_sig) return;

                const des_sig = deserialize(data_sig);
                if (!des_sig || typeof des_sig !== "object") return;
                
                const ret_sig = des_sig as { signature: string };
                if (!ret_sig || !ret_sig.signature) return;

                nSig = ret_sig.signature;

                localStorage.setItem("bjClientId", clientId);
                localStorage.setItem("bjSignature", nSig);
            }

            setPlayerId(clientId);
            setSignature(nSig);
        }

        getIdentity();

    }, []);

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
    
        setJson(res);
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
    
        setJson(res);
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
    
        setJson(res);
    }

    const setJson = useCallback((data: any) => {

        if (!data) return;

        const des_data = deserialize(data);
        if (!des_data || typeof des_data !== "object") return;

        const ret = des_data as { 
            game_id?: number, 
            player_cards?: BJCore.HandData, 
            dealer_cards?: BJCore.HandData, 
            over?: boolean, 
            status?: string 
        };

        if (!ret) return;

        // console.log("GameRoom setJson:", ret);

        if (ret.over) setStatus(ret.status || null);
        else setStatus(null);
        setGameId(String(ret.game_id || gameId));
        if (ret.player_cards) setPlayerCards(BJCore.Hand.deserialize(ret.player_cards));
        if (ret.dealer_cards) setDealerCards(BJCore.Hand.deserialize(ret.dealer_cards));
        // setPlayerCards(BJCore.Hand.deserialize(deserialize(data.player_cards) /* as { cards: Map<Suit, BJCore.Card[],  card_count: number, hand_value: number, ace_count: number } */));
        // setDealerCards(BJCore.Hand.deserialize(deserialize(data.dealer_cards) /* as { cards: Map<Suit, BJCore.Card[],  card_count: number, hand_value: number, ace_count: number } */));
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
