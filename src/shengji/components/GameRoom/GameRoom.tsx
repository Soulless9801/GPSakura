import { useEffect, useState, useRef } from "react";
import { useAbly } from "/src/shengji/server/ably";
import * as ShengJiGame from "/src/shengji/core/game";
import * as ShengJiCore from "/src/shengji/core/entities";
import Ably from "ably";
import Hand, { HandRef } from "/src/shengji/components/Hand/Hand";

interface ClientRequest {
    roomId : string;
    action: string;
    clientId?: string;
    payload?: any;
}

function PlayerList({ players }: { players: string[] }) {
    return (
        <div>
            Players: {players.join(", ")}
        </div>
    );
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
        // console.log("Error: ", data.error); --- IGNORE ---
        return null;
    }

    return data;
}

export default function GameRoom({ roomId, username }: { roomId: string, username: string }) {

    const ably = useAbly();
    const lastActionAtRef = useRef(0);
    const actionCooldownMs = 1000;

    const [hand, setHand] = useState<ShengJiCore.Hand | null>();
    const handRef = useRef<HandRef>(null);

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

    async function speedDraw() {
        await clientRequest({
            roomId,
            action: "speed_draw",
            clientId: ably?.auth.clientId,
        });
    }

    async function drawCard() {
        const res = await runAction(() =>
            clientRequest({
                roomId,
                action: "draw",
                clientId: ably?.auth.clientId,
            })
        );

        if (res?.hand) setHand(ShengJiGame.Game.deserialize(res.hand) as ShengJiCore.Hand);
    }

    async function getHand() {
        const res = await runAction(() =>
            clientRequest({
                roomId,
                action: "hand",
                clientId: ably?.auth.clientId,
            })
        );

        if (res?.hand) setHand(ShengJiGame.Game.deserialize(res.hand) as ShengJiCore.Hand);
    }

    async function callTrump() {
        const cards = handRef.current?.getActiveCards() || [];
        if (!ShengJiCore.isAllSame(cards)) return; // must be all same cards to call trump
        return runAction(() =>
            clientRequest({
                roomId,
                action: "trump",
                clientId: ably?.auth.clientId,
                payload: {
                    trump: JSON.stringify({
                        suit: cards[0].suit,
                        rank: cards[0].rank,
                    }),
                }
            })
        );
    }

    async function playCards() {
        const cards = handRef.current?.getActiveCards() || [];
        const play = { cards: cards.map(c => ({ suit: c.suit, rank: c.rank })) };
        const res = await runAction(() =>
            clientRequest({
                roomId,
                action: "play",
                clientId: ably?.auth.clientId,
                payload: {
                    play: JSON.stringify(play),
                }
            })
        );

        if (res?.hand) setHand(ShengJiGame.Game.deserialize(res.hand) as ShengJiCore.Hand);
    }

    const [dipai, setDipai] = useState<ShengJiCore.Card[] | null>([]);
    const dipaiRef = useRef<HandRef>(null);

    async function getDipai() {
        const res = await runAction(() => 
            clientRequest({
                roomId,
                action: "dipai",
                clientId: ably?.auth.clientId,
            })
        );

        if (res?.dipai) setDipai(JSON.parse(res.dipai) as ShengJiCore.Card[]);
    }

    async function exchangeDipai() {
        const give = handRef.current?.getActiveCards() || [];
        const receive = dipaiRef.current?.getActiveCards() || [];
        const res = await runAction(() =>
            clientRequest({
                roomId,
                action: "exchange",
                clientId: ably?.auth.clientId,
                payload: {
                    give: JSON.stringify(give),
                    receive: JSON.stringify(receive),
                }
            })
        );

        if (res?.hand) setHand(ShengJiGame.Game.deserialize(res.hand) as ShengJiCore.Hand);
    }

    const [players, setPlayers] = useState<string[]>([]);
    const player_map : Record<string, string> = {};

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
                    const pids = presence.map(p => p.clientId);
                    const users = presence.map(p => p.data.username);
                    setPlayers(users);
                    pids.forEach((pid, i) => {
                        player_map[pid] = users[i];
                    });
                });
            });

            await channel.presence.enter({ username: username });

            console.log(`Joined room_${roomId} as ${username}`);

            const pid = ably.auth.clientId;

            channel.subscribe('state_change', (msg) => { // game state updated
                if (cancelled) return;
                const game = JSON.parse(msg.data.game) as ShengJiGame.GameState;
                // console.log("Received game update: ", game);
                setGame(game);
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

    const [phase, setPhase] = useState<string | null>(null);

    useEffect(() => {
        if (!game) setPhase(null);
        else if (game.over) setPhase("game_over");
        else if (game.draw) setPhase("draw");
        else if (game.dip) {
            setPhase("dipai");
            if (game.players[game.zhuang] !== ably?.auth.clientId) return;
            getDipai();
        } else setPhase("play");
    }, [game]);

    useEffect(() => {
        if (phase === "dipai" || phase === "play" && !hand) getHand();
        // console.log("Phase changed to: ", phase); 
    }, [phase]);

    return (
        <>
            <h3>Room {roomId}</h3>
            <button onClick={() => endGame()}> End Game</button>
            {!phase && (
                <div>
                    <PlayerList players={players} />
                    <button onClick={() => startGame()}>Start Game</button>
                </div>
            )}
            {game && (
                <div>
                    {phase && phase === "dipai" && (
                        <div>
                            {game.players[game.zhuang] === ably?.auth.clientId && (
                                <>
                                    <h4>You are the zhuang!</h4>
                                    <Hand ref={dipaiRef} cards={dipai || []} />
                                    <button onClick={() => exchangeDipai()}>Exchange Dipai</button>
                                    <button onClick={() => getDipai()}>Get Dipai</button>
                                </>
                            ) || (
                                <h4>You are a nong! Waiting for {game ? player_map[game.zhuang] : "Unknown"} to look at their dipai. </h4>
                            )}
                        </div>
                    )}
                    {phase && phase === "draw" && (
                        <div>
                            <button onClick={() => drawCard()}>Draw Card</button>
                            <button onClick={() => callTrump()}>Call Trump</button>
                        </div>
                    )}
                    {phase && phase === "play" && (
                        <div>
                            <h4>Current Player: {player_map[game.turn]}</h4>
                            <h4>Current Lead: {player_map[game.lead]}</h4>
                            {game.plays.map((play, i) => (
                                <div key={i}>
                                    <span>{player_map[game.players[i]]}: </span>
                                    <span>{ShengJiCore.playToString(play)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {phase && phase !== "game_over" && (
                        <div>
                            {/*teams is index*/}
                            <h4>Your Team: {game.players.map((p, i) => (i - ShengJiGame.Game.find(game.players, ably?.auth.clientId || null)) % 2 ? null : player_map[p]).filter(n => n !== null).join(", ")}</h4>
                            <h4>Trump: {ShengJiCore.trumpToString(game.trump)}</h4>
                            <h4>Hand</h4>
                            <Hand ref={handRef} cards={hand ? ShengJiCore.handToCards(hand) : []} />
                            <button onClick={() => getHand()}>Refresh Hand</button>
                            {phase === "play" && (
                                <button onClick={() => playCards()}>Play Cards</button>
                            )}
                        </div>
                    )}
                    <button onClick={() => speedDraw()}>Speed Draw (Cheat)</button>
                </div>
            )}
        </>
    );
}
