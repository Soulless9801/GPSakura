import { useEffect, useState, useRef } from "react";
import { useAbly } from "/src/shengji/server/ably";
import * as ShengJiGame from "/src/shengji/core/game";
import * as ShengJiCore from "/src/shengji/core/entities";
import Ably from "ably";
import { X } from "node_modules/@upstash/redis/zmscore-BjNXmrug";

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
    const lastActionAtRef = useRef(0);
    const actionCooldownMs = 1000;

    const [hand, setHand] = useState<ShengJiCore.Hand>();

    const [game, setGame] = useState<ShengJiGame.GameState>();

    async function runAction(actionFn: () => Promise<any>) {
        const now = Date.now();
        if (now - lastActionAtRef.current < actionCooldownMs) {
            return null;
        }
        lastActionAtRef.current = now;
        return actionFn();
    }

    async function startGame() {
        return runAction(() =>
            clientRequest({
                roomId,
                action: "start",
            })
        );
    }

    async function endGame() {
        return runAction(() =>
            clientRequest({
                roomId,
                action: "end",
            })
        );
    }

    async function drawCard() {
        return runAction(() =>
            clientRequest({
                roomId,
                action: "draw",
                clientId: ably?.auth.clientId,
            })
        );
    }

    async function requestHand() {
        const res = await runAction(() =>
            clientRequest({
                roomId,
                action: "hand",
                clientId: ably?.auth.clientId,
            })
        );

        if (res?.hand) setHand(ShengJiGame.Game.deserialize(res.hand) as ShengJiCore.Hand);
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

            channel.presence.subscribe((msg) => {
                if (cancelled) return;
                channel.presence.get().then(presence => {
                    const playerIds = presence.map(p => p.clientId);
                    setPlayers(playerIds);
                });
            });

            await channel.presence.enter();

            const pid = ably.auth.clientId;

            channel.subscribe('state_change', (msg) => { // game state updated
                if (cancelled) return;
                const game = ShengJiGame.Game.deserialize(msg.data.game);
                setGame(game as ShengJiGame.GameState);
            });

            channel.subscribe('hand_change', (msg) => { // someone's hand changed
                if (cancelled) return;
                if (msg.data.clientId === pid) requestHand();
            }); 

            // console.log(`Joined room_${roomId} as ${pid}`);
        }

        connect();

        return () => {
            // console.log(`Leaving room_${roomId}`);
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
            <div>
                <h4>Hand</h4>
                {hand && game && (
                    <div>
                        {ShengJiCore.handToString(hand, game.trump)}
                    </div>
                )}
            </div>
        </>
    );
}
