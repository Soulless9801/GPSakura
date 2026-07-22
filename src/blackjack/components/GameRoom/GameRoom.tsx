import { useState, useCallback, useEffect } from "react";

import { clientRequest, GameRequest } from "/src/services/request";

import { deserialize } from "/src/utils/serial";

import { Identity, getIdentity } from "/src/utils/verify";

import * as BJCore from "/src/blackjack/core/entities";

import Hand from "/src/components/tools/Hand/Hand";
import Form from "/src/components/tools/Form/Form";

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

    }, []);

    const [playerCards, setPlayerCards] = useState<BJCore.Hand | null>(null);
    const [dealerCards, setDealerCards] = useState<BJCore.Hand | null>(null);

    const [status, setStatus] = useState<string | null>(null);

    const [money, setMoney] = useState<number>(0);
    const [bet, setBet] = useState<number>(0);

    async function getMoney() {
        const res = await BJRequest({
            action: "money",
            identity: identity,
            roomId: gameId,
        });

        setJson(res);
    }

    useEffect(() => {
        if (!identity) return;
        getMoney();
    }, []);

    async function refillMoney() {
        const res = await BJRequest({
            action: "refill",
            identity: identity,
            roomId: gameId,
        });

        setJson(res);
    }

    async function startGame() {
        const res = await BJRequest({
            action: "start",
            identity: identity,
            roomId: gameId,
            payload: {
                bet_amount: bet,
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
            id?: number,
            money?: number,
            player_cards?: BJCore.HandData, 
            dealer_cards?: BJCore.HandData, 
            over?: boolean, 
            status?: string 
        };

        if (!ret) return;

        // console.log("GameRoom setJson:", ret);

        if (ret.money !== undefined) setMoney(ret.money);
        if (ret.over) setStatus(ret.status || null);
        else setStatus(null);
        setGameId(String(ret.id || gameId));
        if (ret.player_cards) setPlayerCards(BJCore.Hand.deserialize(ret.player_cards));
        if (ret.dealer_cards) setDealerCards(BJCore.Hand.deserialize(ret.dealer_cards));
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
            <div>
                <p>Money: {money}</p>
            </div>
            <div className="bjg-actions">
                <button onClick={loadGame} className="bjg-button">
                    Load Game
                </button>
                <button onClick={startGame} className="bjg-button">
                    Start Game
                </button>
                <Form init={bet} min={0} max={1000} onChange={setBet} />
                <button onClick={hit} className="bjg-button">
                    Hit
                </button>
                <button onClick={stand} className="bjg-button">
                    Stand
                </button>
                <button onClick={refillMoney} className="bjg-button">
                    Refill
                </button>
            </div>
        </div>
    );
}
