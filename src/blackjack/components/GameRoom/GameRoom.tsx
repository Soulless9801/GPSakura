import { useState, useCallback, useEffect } from "react";

import { clientRequest, GameRequest } from "/src/utils/request";

import { deserialize } from "/src/utils/serial";

import { Identity, getIdentity } from "/src/utils/verify";

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

const gen = async () => {
    const res = await fetch("/.netlify/functions/neon-create-user", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    });
    if (!res || !res.ok) return null;

    const data = await res.text();
    if (!data) return null;

    const des_data = deserialize(data);
    if (!des_data || typeof des_data !== "object") return null;

    const ret = des_data as { player_id: string };
    if (!ret || !ret.player_id) return null;

    return ret.player_id;
}

export default function GameRoom() {

    const [gameId, setGameId] = useState<string>("");

    const [identity, setIdentity] = useState<Identity | null>(null);

    useEffect(() => {
        const identify = async () => {
            await getIdentity("create-session", "bjClientId", "bjSignature", gen, false).then((id) => {
                if (!id) return;
                setIdentity(id);
            });
        }

        identify();

        // const identify = async () => {
        //     let clientId = localStorage.getItem("bjClientId");
        //     let nSig = localStorage.getItem("bjSignature");

        //     const ver = await fetch("/.netlify/functions/create-session", {
        //         method: "POST",
        //         headers: {
        //             "Content-Type": "application/json",
        //         },
        //         body: JSON.stringify({
        //             action: "verify",
        //             clientId: clientId,
        //             signature: nSig,
        //         }),
        //     });

        //     if (!ver || !ver.ok) {
        //         const res_id = await fetch("/.netlify/functions/neon-create-user", {
        //             method: "POST",
        //             headers: {
        //                 "Content-Type": "application/json",
        //             },
        //         });
        //         // console.log("res_id:", res_id);
        //         if (!res_id || !res_id.ok) return;

        //         const data_id = await res_id.text();
        //         if (!data_id) return;

        //         // console.log(data_id);

        //         const des_id = deserialize(data_id);
        //         if (!des_id || typeof des_id !== "object") return;

        //         const ret_id = des_id as { player_id: string };
        //         if (!ret_id || !ret_id.player_id) return;

        //         clientId = ret_id.player_id;

        //         const res_sig =  await fetch("/.netlify/functions/create-session", {
        //             method: "POST",
        //             headers: {
        //                 "Content-Type": "application/json",
        //             },
        //             body: JSON.stringify({
        //                 action: "sign",
        //                 clientId: clientId,
        //             }),
        //         });
        //         if (!res_sig || !res_sig.ok) return;

        //         const data_sig = await res_sig.text();
        //         if (!data_sig) return;

        //         const des_sig = deserialize(data_sig);
        //         if (!des_sig || typeof des_sig !== "object") return;
                
        //         const ret_sig = des_sig as { signature: string };
        //         if (!ret_sig || !ret_sig.signature) return;

        //         nSig = ret_sig.signature;

        //         localStorage.setItem("bjClientId", clientId);
        //         localStorage.setItem("bjSignature", nSig);
        //     }

        //     setPlayerId(clientId || "");
        //     setSignature(nSig || "");
        // }

    }, []);

    const [playerCards, setPlayerCards] = useState<BJCore.Hand | null>(null);
    const [dealerCards, setDealerCards] = useState<BJCore.Hand | null>(null);

    const [status, setStatus] = useState<string | null>(null);

    async function startGame() {
        const res = await BJRequest({
            action: "start",
            identity: identity,
            roomId: gameId,
            payload: {
                bet_amount: 100,
            }
        });

        // console.log("Started game:", res);
    
        setJson(res);
    }

    async function loadGame() {
        const res = await BJRequest({
            action: "load",
            identity: identity,
            roomId: gameId,
        });
    
        setJson(res);
    } 

    async function hit() {
        const res = await BJRequest({
            action: "hit",
            identity: identity,
            roomId: gameId,
        });
    
        setJson(res);
    }

    async function stand() {
        const res = await BJRequest({
            action: "stand",
            identity: identity,
            roomId: gameId,
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
                <p>PlayerID: {identity?.clientId}</p>
                <p>GameID: {gameId}</p>
                <p style={{ color: `${status === "player" ? "green" : status === "dealer" ? "red" : "var(--primary-color)"}` }}>Winner: {status || "None"}</p>
            </div>
            <div className="bjg-hands">
                <div className="bjg-hand">
                    <p>Dealer</p>
                    <Hand cards={dealerCards?.getCards() || []} />
                    <p>Hand Value: {dealerCards?.getHandValue()}</p>
                </div>
                <div className="bjg-hand">
                    <p>Player</p>
                    <Hand cards={playerCards?.getCards() || []} />  
                    <p>Hand Value: {playerCards?.getHandValue()}</p>
                </div>                
            </div>
            {/* <div className="bjg-labels">
                <h2>Player Cards: {handToString(playerCards)}</h2>
                <h2>Dealer Cards: {handToString(dealerCards)}</h2>
            </div> */}
            <div className="bjg-actions">
                <button onClick={loadGame} className="bjg-button">
                    Load Game
                </button>
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
        </div>
    );
}
