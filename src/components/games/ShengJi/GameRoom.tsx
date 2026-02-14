import { useEffect, useState, useRef } from "react";
import { useAbly } from "/src/shengji/server/ably";
import { Game } from "/src/shengji/core/game";
import Ably from "ably";

interface ClientRequest {
    roomId : string;
    action: string;
    clientId?: string;
    payload?: any;
}

async function clientRequest(request: ClientRequest) {
    const res =  await fetch("/.netlify/functions/shengji-game-room", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });

    if (!res) {
        console.error("Request failed");
        return null;
    }

    const data = await res.json();

    if (!res.ok) {
        console.log("Error: ", data.error);
        return null;
    }

    return data;
}

export default function GameRoom({ roomId }: { roomId: string }) {

    const ably = useAbly();

    async function startGame() {

        const res = await clientRequest({
            roomId,
            action: "start",
        });

        if (res) console.log("Game Started");
    }

    async function endGame() {
        const res = await clientRequest({
            roomId,
            action: "end",
        });

        if (res) console.log("Game Ended");
    }

    async function drawCard() {

        const res = await clientRequest({
            roomId,
            action: "draw",
            clientId: ably?.auth.clientId,
        });

        if (res) console.log("Card Drawn");
    }

    async function requestHand() {

        const res = await clientRequest({
            roomId,
            action: "hand",
            clientId: ably?.auth.clientId,
        });

        console.log(res);

        if (res) console.log("Hand Requested", Game.deserialize(res.msg.hand));
    }

    async function requestGame() {

        const res = await clientRequest({
            roomId,
            action: "state",
        });

        if (res) console.log("Game State Requested", Game.deserialize(res.msg.state));
    }

    const [players, setPlayers] = useState<string[]>([]);

    useEffect(() => {

        if (!ably) return;

        const options : Ably.ChannelOptions = { modes: ['SUBSCRIBE', 'PRESENCE', 'PRESENCE_SUBSCRIBE'] };
        const channel = ably.channels.get(`room_${roomId}`, options);

        let cancelled : boolean = false;

        const connect = async () => {

            if (ably.connection.state !== "connected") {
                await new Promise<void>(resolve =>
                    ably.connection.once("connected", () => resolve())
                );
            }

            await channel.attach();

            channel.presence.subscribe(async () => {
                if (cancelled) return;
                const snapshot = await channel.presence.get();
                setPlayers(prev => {
                    const players = snapshot.map(p => p.clientId).filter(Boolean);
                    return Array.from(new Set([...prev, ...players]));
                });
            });

            await channel.presence.enter();

            const pid = ably.auth.clientId;

            console.log(`Joined room_${roomId} as ${pid}`);
        }

        connect();

        return () => {
            console.log(`Leaving room_${roomId}`);
            cancelled = true;
            channel.unsubscribe();
            channel.presence.unsubscribe();
        };

    }, [ably, roomId]);

    return (
        <>
            <h3>Room {roomId}</h3>
            <div>
                Players: {players.join(", ")}
            </div>
            <button onClick={() => startGame()}>Start Game</button>
            <button onClick={() => endGame()}>End Game</button>
            <button onClick={() => drawCard()}>Draw Card</button>
            <button onClick={() => requestHand()}>Request Hand</button>
            <button onClick={() => requestGame()}>Request Game State</button>
        </>
    );
}
