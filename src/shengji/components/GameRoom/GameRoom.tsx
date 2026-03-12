import { useEffect, useState, useRef, useCallback } from "react";
import { useAbly } from "/src/shengji/server/ably";
import * as ShengJiGame from "/src/shengji/core/game";
import * as ShengJiCore from "/src/shengji/core/entities";
import Ably from "ably";
import Hand, { HandRef } from "/src/shengji/components/Hand/Hand";
import Card from "/src/shengji/components/Card/Card";

import './GameRoom.css';

interface ClientRequest {
    roomId : string;
    action: string;
    clientId?: string;
    payload?: any;
}

export default function GameRoom({ roomId, username }: { roomId: string, username: string }) {

    const [ablyRequest, setAblyRequest] = useState<{ clientId: string; signature: string | null }>({ clientId: "", signature: null });
    const ably = useAbly({ request: ablyRequest });

    useEffect(() => {

        async function getIdentity() {
            let clientId = localStorage.getItem("ablyClientId");
            let signature = localStorage.getItem("ablySignature");
            if (!clientId || !signature) {
                clientId = `player_${Math.random().toString(36).substring(2, 10)}`;
                localStorage.setItem("ablyClientId", clientId);
                signature =  await fetch("/.netlify/functions/create-session", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        clientId: clientId,
                    }),
                }).then(res => res.json()).then(data => data.signature);
                localStorage.setItem("ablySignature", signature || "");
            }

            setAblyRequest({ clientId: clientId || "", signature: signature || null });
        }

        getIdentity();

    }, []);

    const [game, setGame] = useState<ShengJiGame.GameState>();

    const [hand, setHand] = useState<ShengJiCore.Hand | null>();
    const handRef = useRef<HandRef>(null);

    const [dipai, setDipai] = useState<ShengJiCore.Card[] | null>([]);
    const dipaiRef = useRef<HandRef>(null);

    // UX throttling

    const timeout = 1000

    function disableButtons() {

        const btns = document.querySelectorAll<HTMLButtonElement>(".sjg-button__game");

        console.log(`Disabling ${btns.length} buttons for ${timeout}ms`);

        btns.forEach(btn => {
            btn.disabled = true;
        });

        setTimeout(() => {
            btns.forEach(btn => {
                btn.disabled = false;
            });
        }, timeout);
    }

    async function clientRequest(request: ClientRequest) {
        const res =  await fetch("/.netlify/functions/shengji-game-room", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
        });

        disableButtons();

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

    // Server actions

    async function startGame() {
        return clientRequest({
            roomId,
            action: "start",
        });
    }

    async function endGame() {
        return clientRequest({
            roomId,
            action: "end",
        });
    }

    async function speedDraw() {
        await clientRequest({
            roomId,
            action: "speed_draw",
            clientId: ably?.auth.clientId,
        });
    }

    async function drawCard() {
        const res = await clientRequest({
            roomId,
            action: "draw",
            clientId: ably?.auth.clientId,
        });

        if (res?.hand) setHand(ShengJiGame.Game.deserialize(res.hand) as ShengJiCore.Hand);
    }

    async function getState() {
        const res = await clientRequest({
            roomId,
            action: "state",
            clientId: ably?.auth.clientId,
        });

        if (res?.game) setGame(JSON.parse(res.game) as ShengJiGame.GameState);
    }

    async function getHand() {
        const res = await clientRequest({
            roomId,
            action: "hand",
            clientId: ably?.auth.clientId,
        });

        if (res?.hand) setHand(ShengJiGame.Game.deserialize(res.hand) as ShengJiCore.Hand);
    }

    async function callTrump() {
        const cards = handRef.current?.getActiveCards() || [];
        if (cards.length === 0) return; // must select cards to call trump
        if (!ShengJiCore.isAllSame(cards) && !ShengJiCore.isAllJokers(cards)) return; // must be all same card or jokers to call trump
        return clientRequest({
            roomId,
            action: "trump",
            clientId: ably?.auth.clientId,
            payload: {
                trump: JSON.stringify({
                    suit: cards[0].suit,
                    rank: cards[0].rank,
                }),
            }
        });
    }

    async function playCards() {
        const cards = handRef.current?.getActiveCards() || [];
        const play = { cards: cards.map(c => ({ suit: c.suit, rank: c.rank })) };
        const res = await clientRequest({
            roomId,
            action: "play",
            clientId: ably?.auth.clientId,
            payload: {
                play: JSON.stringify(play),
            }
        });

        if (res?.hand) setHand(ShengJiGame.Game.deserialize(res.hand) as ShengJiCore.Hand);
    }

    async function getDipai() {
        const res = await clientRequest({
            roomId,
            action: "dipai",
            clientId: ably?.auth.clientId,
        });

        if (res?.dipai) setDipai(JSON.parse(res.dipai) as ShengJiCore.Card[]);
    }

    async function exchangeDipai() {
        const give = handRef.current?.getActiveCards() || [];
        const receive = dipaiRef.current?.getActiveCards() || [];
        const res = await clientRequest({
            roomId,
            action: "exchange",
            clientId: ably?.auth.clientId,
            payload: {
                give: JSON.stringify(give),
                receive: JSON.stringify(receive),
            }
        });

        if (res?.hand) setHand(ShengJiGame.Game.deserialize(res.hand) as ShengJiCore.Hand);
    }

    async function changeUsername(user: string) {
        return clientRequest({
            roomId,
            action: "username",
            clientId: ably?.auth.clientId,
            payload: {
                username: user,
            }
        });
    }

    // Ably realtime

    const channelRef = useRef<Ably.RealtimeChannel | null>(null);

    const [team, setTeam] = useState<number>(-1);

    useEffect(() => {
        const channel = channelRef.current;
        if (!channel) return;
        channel.presence.update({ username: username, team: team });
        changeUsername(username);
    }, [username, team]);

    // initialize connection

    const [connectionState, setConnectionState] = useState<string>("");

    useEffect(() => {
        if (!ably) return;
        const onConnectionStateChange = (state: Ably.ConnectionStateChange) => {
            setConnectionState(state.current);
        };
        ably.connection.on(onConnectionStateChange);
        return () => {
            ably.connection.off(onConnectionStateChange);
        };
    }, [ably]);

    const [players, setPlayers] = useState<string[]>([]);
    const [teams, setTeams] = useState<number[]>([]);

    useEffect(() => {

        if (!ably) return;
        const options: Ably.ChannelOptions = { modes: ['SUBSCRIBE', 'PRESENCE', 'PRESENCE_SUBSCRIBE'] };
        const channel = ably.channels.get(`room_${roomId}`, options);
        channelRef.current = channel;

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
                    setPlayers(presence.map(p => p.data.username));
                    setTeams(presence.map(p => p.data.team));
                });
            });

            await channel.presence.enter({ username: username, team: team });

            // console.log(`Joined room_${roomId} as ${username} on team ${team ? "1" : "2"}`);

            channel.subscribe('state_change', (msg) => { // game state updated
                if (cancelled) return;
                const state = JSON.parse(msg.data.game) as ShengJiGame.GameState;
                setGame(state);
                // console.log("Updated:", state);
            });

            await getState();
        }

        connect();

        return () => {
            cancelled = true;
            channelRef.current = null;
            channel.unsubscribe();
            channel.presence.unsubscribe();
        };

    }, [ably, roomId]);

    // respond to game state changes

    const [phase, setPhase] = useState<string | null>(null);
    const [pidx, setPidx] = useState<number>(-1);

    useEffect(() => {
        if (!game) { 
            setPhase(null); 
            setHand(null);
            return; 
        }
        // find index in list of players
        const idx = ShengJiGame.Game.find(game.players, ably?.auth.clientId || null);
        setPidx(idx);
        // adjust team
        if (idx === -1) setTeam(-1); // spectator
        else setTeam(idx % 2);
        // phase update
        if (game.over) setPhase("over");
        else if (game.draw) setPhase("draw");
        else if (game.dip) {
            setPhase("dipai");
            if (game.players[game.zhuang] !== ably?.auth.clientId) return;
            getDipai();
        } else setPhase("play");
    }, [game]);

    useEffect(() => {
        if (!phase || phase === "over") setHand(null);
        if (phase && phase !== "over" && !hand) getHand();
        if (phase !== "dipai") setDipai([]);
    }, [phase]);

    return (
        <div className="sjg-room">
            <div className="sjg-room__info">
                <p>Room: <strong>{roomId}</strong></p>
                <p>Username: <strong>{username}</strong></p>
                <p>PlayerID: <strong>{ably?.auth.clientId}</strong></p>
                <p>Connection: <strong>{connectionState}</strong></p>
            </div>
            <button className="sjg-button__game" onClick={() => endGame()}>End Game</button>
            {!phase && (
                <div className="sjg-lobby">
                    <PlayerList players={players} teams={teams} />
                    <div className="sjg-button__group">
                        <button onClick={() => setTeam(p => 1 - Math.abs(p))}>{team === -1 ? `Join Game` : `Switch Team`}</button>
                        <button onClick={() => startGame()}>Start Game</button>
                    </div>
                </div>
            )}
            {game && phase && (
                <div className="sjg-phase">
                    {phase !== "over" && (
                        <div>
                            <div className="sjg-info__area">
                                <div className="sjg-trump">
                                    <p>Trump</p>
                                    <Card card={ShengJiCore.trumpToCard(game.trump)} />
                                    <div>Declared <strong>{game.declare}</strong>x by <strong>{game.users[game.whodec]}</strong></div>
                                </div>
                                <div className="sjg-info">
                                    <p>Trump: <strong>{game.trump.rank}</strong></p>
                                    <p>Zhuang: <strong>{game.users[game.zhuang]}</strong></p>
                                </div>
                                <div className="sjg-info">
                                    <p>Team: {(team === -1 ? "Spectator" : (game.atk === team) ? "Attack" : "Defense")}</p>
                                    <p>Points: <strong>{game.score}</strong></p>
                                </div>
                                <div className="sjg-info">
                                    <p>Lead: <strong>{game.users[game.lead]}</strong></p>
                                    <p>Turn: <strong>{game.users[game.turn]}</strong></p>
                                </div>
                            </div>
                            <hr />
                            {phase === "play" && (
                                <div className="sjg-play">
                                    <div className="sjg-plays">
                                        {game.plays.map((play, i) => (
                                            <div key={i} className="sjg-play__player">
                                                <span>{game.users[i]}</span>
                                                <Hand cards={play.cards} className="sjg-hand__wrapper"/>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {phase === "dipai" && (
                                <div className="sjg-dipai">
                                    {pidx === game.zhuang && (
                                        <>
                                            <p>Dipai</p>
                                            <Hand ref={dipaiRef} cards={dipai || []} className="sjg-hand__wrapper"/>
                                            <div className="sjg-button__group">
                                                <button className="sjg-button__game" onClick={() => exchangeDipai()}>Exchange Dipai</button>
                                                <button className="sjg-button__game" onClick={() => getDipai()}>Get Dipai</button>
                                            </div>
                                        </>
                                    ) || (
                                        <p>Waiting for <strong>{game.users[game.zhuang]}</strong> to look at their dipai.</p>
                                    )}
                                </div>
                            )}
                            {team !== -1 && (
                                <div className="sjg-team">
                                    {phase === "draw" && (
                                        <div className="sjg-draw">
                                            <div className="sjg-button__group">
                                                <button className="sjg-button__game" onClick={() => drawCard()}>Draw Card</button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="sjg-hand">
                                        <hr />
                                        <Hand ref={handRef} cards={hand ? ShengJiCore.handToCards(hand, game.trump) : []} className="sjg-hand__wrapper"/>
                                        <div className="sjg-button__group">
                                            {phase === "play" && (
                                                <button className="sjg-button__game" onClick={() => playCards()}>Play Cards</button>
                                            )}
                                            {(phase === "dipai" || phase === "draw") && (
                                                <button className="sjg-button__game" onClick={() => callTrump()}>Call Trump</button>
                                            )}
                                            <button className="sjg-button__game" onClick={() => getHand()}>Refresh Hand</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/*<button className="sjg-button__game" onClick={() => speedDraw()}>Speed Draw (Cheat)</button>*/}
                        </div>        
                    )}
                </div>
            )}
        </div>
    );
}

function PlayerList({ players, teams }: { players: string[], teams: number[] }) {

    const a = players.filter((p, i) => teams[i] === 0);
    const b = players.filter((p, i) => teams[i] === 1);

    return (
        <div className="sjg-player__wrapper">
            <p>Teams</p>
            <div className="sjg-player__list">
                <div className="sjg-player__team">
                    {a.map((p, i) => (
                        <div key={i} className="sjg-player__player">{p}</div>
                    ))}
                </div>
                <div className="sjg-player__team">
                    {b.map((p, i) => (
                        <div key={i} className="sjg-player__player">{p}</div>
                    ))}
                </div>
            </div>
        </div>
    );
}
