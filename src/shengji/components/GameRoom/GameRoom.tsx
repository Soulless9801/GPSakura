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

    const getChannel = () => {
        if (!ably) return null;
        const options : Ably.ChannelOptions = { modes: ['SUBSCRIBE', 'PRESENCE', 'PRESENCE_SUBSCRIBE'] };
        return ably.channels.get(`room_${roomId}`, options);
    }

    const [players, setPlayers] = useState<string[]>([]);
    const [teams, setTeams] = useState<boolean[]>([]);
    const [team, setTeam] = useState<boolean>(false);

    useEffect(() => {

        if (!ably) return;
        const channel = getChannel();
        if (!channel) return;

        const update = async () => {
            await channel.presence.enter({ username: username, team: team });
        }

        update();

    }, [username, team]);

    useEffect(() => {

        if (!ably) return;
        const channel = getChannel();
        if (!channel) return;

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

            const pid = ably.auth.clientId;

            channel.subscribe('state_change', (msg) => { // game state updated
                if (cancelled) return;
                const game = JSON.parse(msg.data.game) as ShengJiGame.GameState;
                setGame(game);
            });
        }

        connect();

        return () => {
            cancelled = true;
            channel.unsubscribe();
            channel.presence.unsubscribe();
        };

    }, [ably, roomId]);

    const [phase, setPhase] = useState<string | null>(null);
    const [pidx, setPidx] = useState<number>(-1);

    useEffect(() => {
        if (!game) { 
            setPhase(null); 
            setHand(null);
            return; 
        }
        setPidx(ShengJiGame.Game.find(game.players, ably?.auth.clientId || null));
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
            <p>Room {roomId}</p>
            <p>Username: {username}</p>
            {/*<button onClick={() => endGame()}> End Game</button>*/}
            {!phase && (
                <div className="sjg-lobby">
                    <PlayerList players={players} teams={teams} />
                    <div className="sjg-button__group">
                        <button onClick={() => setTeam(p => !p)}>Switch Team</button>
                        <button onClick={() => startGame()}>Start Game</button>
                    </div>
                </div>
            )}
            {game && phase && (
                <div className="sjg-phase">
                    {phase !== "over" && (
                        <section>
                            <div className="sjg-info__area">
                                <div className="sjg-trump">
                                    <p>Trump</p>
                                    <Card card={ShengJiCore.trumpToCard(game.trump)} />
                                </div>
                                <div className="sjg-info">
                                    <p>Round: {game.round}</p>
                                    <p>Zhuang: {game.users[game.zhuang]}</p>
                                </div>
                                <div className="sjg-info">
                                    <p>Team: {(game.atk === (team ? 1 : 0) ? "Attack" : "Defense")}</p>
                                    <p>Points: {game.score}</p>
                                </div>
                                <div className="sjg-info">
                                    <p>Lead: {game.users[game.lead]}</p>
                                    <p>Turn: {game.users[game.turn]}</p>
                                </div>
                            </div>
                            <hr />
                            {phase === "dipai" && (
                                <div className="sjg-dipai">
                                    {pidx === game.zhuang && (
                                        <>
                                            <p>Dipai</p>
                                            <Hand ref={dipaiRef} cards={dipai || []} className="sjg-hand__wrapper"/>
                                            <div className="sjg-button__group">
                                                <button onClick={() => exchangeDipai()}>Exchange Dipai</button>
                                                <button onClick={() => getDipai()}>Get Dipai</button>
                                            </div>
                                        </>
                                    ) || (
                                        <p>Waiting for <strong>{game.users[game.zhuang]}</strong> to look at their dipai.</p>
                                    )}
                                </div>
                            )}
                            {phase === "draw" && (
                                <div className="sjg-draw">
                                    <div className="sjg-button__group">
                                        <button onClick={() => drawCard()}>Draw Card</button>
                                        <button onClick={() => callTrump()}>Call Trump</button>
                                    </div>
                                </div>
                            )}
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
                            <div className="sjg-hand">
                                <hr />
                                <Hand ref={handRef} cards={hand ? ShengJiCore.handToCards(hand) : []} className="sjg-hand__wrapper"/>
                                <div className="sjg-button__group">
                                    {phase === "play" && (
                                        <button onClick={() => playCards()}>Play Cards</button>
                                    )}
                                    <button onClick={() => getHand()}>Refresh Hand</button>
                                </div>
                            </div>
                            {/*<button onClick={() => speedDraw()}>Speed Draw (Cheat)</button>*/}
                        </section>        
                    )}
                </div>
            )}
        </div>
    );
}

function PlayerList({ players, teams }: { players: string[], teams: boolean[] }) {

    const a = players.filter((p, i) => teams[i]);
    const b = players.filter((p, i) => !teams[i]);

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
