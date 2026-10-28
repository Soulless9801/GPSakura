import { useEffect, useState, useRef, useMemo } from "react";

import { deserialize } from "/src/utils/serial";

import { useAbly } from "/src/shengji/server/ably";
import type { GameRequest} from "/src/services/request";
import { clientRequest } from "/src/services/request";

import type * as SJGame from "/src/shengji/core/game";
import * as SJCore from "/src/shengji/core/entities";
import * as SJComp from "/src/shengji/core/comparison";
import * as SJConv from "/src/shengji/core/convert";

import type * as SJAdvt from "/src/shengji/advisor/types";
import * as SJAdvr from "/src/shengji/advisor/advisor";

import type Ably from "ably";

import type { HandRef } from "/src/components/tools/Hand/Hand";
import Hand from "/src/components/tools/Hand/Hand";
import Card from "/src/components/tools/Card/Card";

import './GameRoom.css';
import type { Identity} from "/src/utils/verify";
import { getIdentity, issueIdentity } from "/src/utils/verify";

// Specific Request

const SJRequest = async (request: GameRequest) => clientRequest(request, "sjg-button__game", "shengji-game-room");

// Game components

function PlayerList({ players, teams }: { players: string[], teams: number[] }) {

    const a = players.filter((_, i) => teams[i] === 0);
    const b = players.filter((_, i) => teams[i] === 1);

    return (
        <div className="ui-panel ui-stack sjg-player__wrapper">
            <p>Teams</p>
            <div className="sjg-player__list">
                <div className="ui-panel ui-stack sjg-player__team">
                    {a.map((p, i) => (
                        <div key={i} className="sjg-player__player">{p}</div>
                    ))}
                </div>
                <div className="ui-panel ui-stack sjg-player__team">
                    {b.map((p, i) => (
                        <div key={i} className="sjg-player__player">{p}</div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function CardAdvice({ cards }: { cards: SJCore.Card[] | undefined }) {

    if (!cards || cards.length === 0) {return <p>No advice available</p>;}

    return (
        <div className="ui-stack sjg-advice__wrapper">
            <h3>Recommended Play</h3>
            {cards.map((card, i) => (
                <Card key={i} card={card} />
            ))}
        </div>
    );
}

function GameInfo({ identity, roomId, team, game, missing }: { identity: Identity | null, roomId: string, team: number, game: SJGame.GameState | null, missing: string[] | null }) {
    
    const [hand, setHand] = useState<SJCore.Hand | null>(null);
    const handRef = useRef<HandRef>(null);

    const [dipai, setDipai] = useState<SJCore.Card[] | null>([]);
    const dipaiRef = useRef<HandRef>(null);

    const parseRes = (res: string | null): void => {
        if (res === null) {return;}
        const data = deserialize<{ 
            hand?: SJCore.HandData, 
            dipai?: SJCore.Card[]
        }>(res);

        if (data.hand) {setHand(SJCore.Hand.deserialize(data.hand));}
        if (data.dipai) {setDipai(data.dipai);}
    }

    const runAsync = <T,>(action: () => Promise<T>): void => {
        void action().catch(() => undefined);
    };

    async function drawCard() {
        const res = await SJRequest({
            roomId,
            action: "draw",
            identity,
        });

        parseRes(res);
    }

    async function getHand() {
        const res = await SJRequest({
            roomId,
            action: "hand",
            identity,
        });

        parseRes(res);
    }

    async function callTrump() {
        const cards = handRef.current?.getActiveCards() || [];
        if (cards.length === 0) {return;} // must select cards to call trump
        if (!SJComp.isAllSame(cards) && !SJComp.isAllJokers(cards)) {return;} // must be all same card or jokers to call trump
        await SJRequest({
            roomId,
            action: "trump",
            identity,
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
        if (cards.length === 0) {return;} // must select cards to play
        const play = { cards: cards.map(c => ({ suit: c.suit, rank: c.rank })) }; // assert type
        const res = await SJRequest({
            roomId,
            action: "play",
            identity,
            payload: {
                play: JSON.stringify(play),
            }
        });

        parseRes(res);
    }

    async function shuaiCards() {
        const cards = handRef.current?.getActiveCards() || [];
        if (cards.length === 0) {return;} // must select cards to shuai
        const play = { cards: cards.map(c => ({ suit: c.suit, rank: c.rank })) }; // assert type
        const res = await SJRequest({
            roomId,
            action: "shuai",
            identity,
            payload: {
                play: JSON.stringify(play),
            }
        });

        parseRes(res);
    }

    async function getDipai() {
        const res = await SJRequest({
            roomId,
            action: "dipai",
            identity,
        });

        parseRes(res);
    }

    async function speedDraw() {
        if (phase !== "draw") {return;}
        if (!window.confirm("Are you sure you want to speed draw?")) {return;}
        await SJRequest({
            roomId,
            action: "speed",
            identity,
        });
    }

    async function exchangeDipai() {
        const give = handRef.current?.getActiveCards() || [];
        const receive = dipaiRef.current?.getActiveCards() || [];
        const res = await SJRequest({
            roomId,
            action: "exchange",
            identity,
            payload: {
                give: JSON.stringify(give),
                receive: JSON.stringify(receive),
            }
        });

        parseRes(res);
    }

    const [phase, setPhase] = useState<string | null>(null);

    const [help, setHelp] = useState<boolean>(false); // toggle advice display
    const advice = useMemo<SJAdvt.Advice | null>(() => {
        if (!game || !hand || !help || game.over || game.draw || game.dip || game.players[game.turn] !== identity?.clientId) {return null;}
        let i = game.chu;
        const tricks : SJAdvt.Move[] = [];
        for (let steps = 0; steps < game.players.length && i !== game.turn; steps++) {
            const play = game.info.get(game.players[i])?.play;
            if (!play) {break;}
            tricks.push(play.cards);
            i = (i + 1) % game.players.length;
        }
        const pos: SJAdvt.Position = {
            numPlayers: game.players.length,
            decks: game.players.length / 2,
            trump: game.trump,
            hand: SJConv.handToCards(hand, game.trump),
            trick: tricks,
            seen: game.discard,
        };
        return SJAdvr.analyse(pos);
    }, [game, hand, help, identity?.clientId]);

    useEffect(() => {
        if (!game) {
            setPhase(null); 
            setHand(null);
            return; 
        }

        // phase update
        if (game.over) {setPhase("over");}
        else if (game.draw) {setPhase("draw");}
        else if (game.dip) {
            setPhase("dipai");
            if (game.players[game.zhuang] !== identity?.clientId) {return;}
            runAsync(getDipai);
        } else {
            setPhase("play");
        }
    }, [game]);

    useEffect(() => {
        if (!phase || phase === "over") {setHand(null);}
        else {
            if (phase !== "dipai") {setDipai([]);}
            else {runAsync(getHand);}
        }
    }, [phase]);

    if (!game) {return null;}

    const actionDisabled = game.paused;

    return (
        <div className="ui-panel ui-stack sjg-phase">
            {phase !== "over" && (
                <div>
                    {game.paused && missing && missing.length > 0 && (
                        <div className="sjg-status__banner" role="status" aria-live="polite">
                            <span style={{ fontWeight: 'bold', padding: '0 5px 0 0' }}>Awaiting Reconnection:</span>
                            {missing.map((p, i) => (
                                <span key={i} style={{ padding: '0 3px 0 0' }}>{p}{i < missing.length - 1 ? "," : ""}</span>
                            ))}
                        </div>
                    )}
                    <div className="ui-panel sjg-info__area">
                        <div className="ui-stack sjg-trump">
                            <p>Trump</p>
                            <Card card={SJConv.trumpToCard(game.trump)} />
                            <p>Declared <strong>{game.declare}</strong>x by <strong>{game.info.get(game.players[game.whodec])?.username}</strong></p>
                        </div>
                        <div className="sjg-info">
                            <p>Trump: <strong>{game.trump.rank}</strong></p>
                            <p>Zhuang (庄):  <strong>{game.info.get(game.players[game.zhuang])?.username}</strong></p>
                        </div>
                        <div className="sjg-info">
                            <p>Team: {(team === -1 ? "Spectator" : (game.atk === team) ? "Attack" : "Defense")}</p>
                            <p>Points (分): <strong>{game.score}</strong></p>
                        </div>
                        <div className="sjg-info">
                            <p>Lead: <strong>{game.info.get(game.players[game.lead])?.username}</strong></p>
                            <p>Turn: <strong>{game.info.get(game.players[game.turn])?.username}</strong></p>
                        </div>
                    </div>
                    <hr />
                    {phase === "play" && (
                        <div className="ui-stack sjg-play">
                            <div className="ui-panel sjg-plays">
                                {game.players.map((player, i) => (
                                    <div key={i} className={`sjg-play__player${i === game.turn ? ' active' : ''}${i === game.lead ? ' lead' : ''}`}>
                                        <p>{game.info.get(player)?.username}'s Play</p>
                                        <Hand cards={game.info.get(player)?.play?.cards || []}/>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {phase === "dipai" && (
                        <div className="ui-stack sjg-dipai">
                            {identity?.clientId === game.players[game.zhuang] && (
                                <>
                                    <p>Dipai (底牌)</p>
                                    <Hand ref={dipaiRef} cards={dipai || []} className="sjg-hand__wrapper"/>
                                    <div className="sjg-button__group">
                                        <button className="sjg-button__game" onClick={() => { runAsync(exchangeDipai); }} disabled={actionDisabled}>Exchange Dipai</button>
                                        <button className="sjg-button__game" onClick={() => { runAsync(getDipai); }} disabled={actionDisabled}>Get Dipai</button>
                                    </div>
                                </>
                            ) || (
                                <p>Waiting for <strong>{game.info.get(game.players[game.zhuang])?.username}</strong> to look at their dipai.</p>
                            )}
                        </div>
                    )}
                    {team !== -1 && (
                        <div className="sjg-team">
                            {phase === "draw" && (
                                <div className="ui-stack sjg-draw">
                                    <div className="sjg-button__group">
                                        <button className="sjg-button__game" onClick={() => { runAsync(drawCard); }} disabled={actionDisabled}>Draw Card</button>
                                    </div>
                                </div>
                            )}
                            <div className="ui-stack sjg-hand">
                                <hr />
                                <Hand ref={handRef} cards={hand ? SJConv.handToCards(hand, game.trump) : []} className="sjg-hand__wrapper"/>
                                <div className="sjg-button__group">
                                    {phase === "play" && (
                                        <>
                                            <button className="sjg-button__game" onClick={() => { runAsync(playCards); }} disabled={actionDisabled}>Play Cards</button>
                                            <button className="sjg-button__game" onClick={() => { runAsync(shuaiCards); }} disabled={actionDisabled}>Gamble (甩)</button>
                                        </>
                                    )}
                                    {(phase === "dipai" || phase === "draw") && (
                                        <button className="sjg-button__game" onClick={() => { runAsync(callTrump); }} disabled={actionDisabled}>Call Trump (亮)</button>
                                    )}
                                    <button className="sjg-button__game" onClick={() => { runAsync(getHand); }}>Refresh Hand</button>
                                </div>
                            </div>
                            {help && (
                                <div className="ui-stack sjg-advice">
                                    <CardAdvice cards={advice?.candidates[0]?.move} />
                                </div>
                            )}
                        </div>
                    )}
                    <div className="sjg-button__group">
                        {import.meta.env.DEV && (
                            <button className="sjg-button__game" onClick={() => { runAsync(speedDraw); }}>Speed Draw (Cheat)</button>
                        )}
                        <button className="sjg-button__game" onClick={() => { setHelp(help => !help); }}>Toggle Help</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function GameRoom({ roomId, username }: { roomId: string, username: string }) {

    // Ably config

    const [identity, setIdentity] = useState<Identity | null>(null);
    const ably = useAbly({ request: identity });

    const runAsync = <T,>(action: () => Promise<T>): void => {
        void action().catch(() => undefined);
    };

    // "Authenticate" user

    useEffect(() => {

        const identify = async () => {
            await getIdentity("ablyClientId", "ablySignature", issueIdentity, false).then((id) => {
                if (!id) {return;}
                setIdentity(id);
            });
        }

        runAsync(identify);

    }, []);

    // Game state

    const [game, setGame] = useState<SJGame.GameState | null>(null);

    // Game actions

    async function startGame() {
        if (team < 0) {return false;}
        return SJRequest({
            roomId,
            action: "start",
            identity,
        });
    }

    // async function getState() { // UNUSED

    //     const res = await SJRequest({
    //         roomId,
    //         action: "state",
    //         identity,
    //     });

    //     if (!res) return;

    //     const des_data = deserialize(res);
    //     if (!des_data || typeof des_data !== "object") return;

    //     const data = des_data as { game?: SJGame.GameState };

    //     if (!data) return;

    //     if (data.game) setGame(data.game);
    // }

    async function changeUsername(user: string) {
        return SJRequest({
            roomId,
            action: "username",
            identity,
            payload: {
                username: user,
            }
        });
    }

    async function endGame() {
        if (team < 0) {return false;}
        if (!window.confirm("Are you sure you want to end the current game?")) {return false;}
        return SJRequest({
            roomId,
            action: "end",
            identity,
        });
    }

    // Player team

    const [team, setTeam] = useState<number>(-1);

    useEffect(() => {
        const channel = channelRef.current;
        if (!channel) {return;}
        runAsync(() => channel.presence.update({ username, team }));
    }, [username, team]);

    useEffect(() => {
        runAsync(() => changeUsername(username));
    }, [username]);

    // Ably connection

    const channelRef = useRef<Ably.RealtimeChannel | null>(null);

    const [connectionState, setConnectionState] = useState<string>("");

    useEffect(() => {
        if (!ably) {return;}
        const onConnectionStateChange = (state: Ably.ConnectionStateChange) => {
            setConnectionState(state.current);
        };
        ably.connection.on(onConnectionStateChange);
        return () => {
            ably.connection.off(onConnectionStateChange);
        };
    }, [ably]);

    const [ids, setIds] = useState<string[] | null>(null);
    const [players, setPlayers] = useState<string[]>([]);
    const [teams, setTeams] = useState<number[]>([]);

    const isPresenceData = (value: object): value is { username: string; team: number } => (
        "username" in value && typeof value.username === "string"
            && "team" in value && typeof value.team === "number"
    );

    useEffect(() => {

        if (!ably) {return;}
        const options: Ably.ChannelOptions = { modes: ['SUBSCRIBE', 'PRESENCE', 'PRESENCE_SUBSCRIBE'] };
        const channel = ably.channels.get(`room:${roomId}:shengji`, options);
        channelRef.current = channel;
        setIds(null);
        setGame(null);

        let cancelled : boolean = false;
        let receivedState = false;
        const isCurrent = (): boolean => !cancelled;
        const loadInitialState = (res: string | null): void => {
            if (res && !cancelled && !receivedState) {
                setGame(deserialize<{ game: SJGame.GameState }>(res).game);
            }
        };

        const connect = async () => {

            if (ably.connection.state !== "connected") {
                await new Promise<void>(resolve => {
                    ably.connection.once("connected", () => { resolve(); });
                });
            }

            await channel.attach();
            if (cancelled) {return;}

            void channel.presence.subscribe((_msg) => {
                if (cancelled) {return;}
                void channel.presence.get().then(presence => {
                    if (cancelled) {return;}
                    setIds(presence.map(p => p.clientId));
                    setPlayers(presence.map(p => {
                        const data = p.data as object;
                        return isPresenceData(data) ? data.username : "";
                    }));
                    setTeams(presence.map(p => {
                        const data = p.data as object;
                        return isPresenceData(data) ? data.team : -1;
                    }));
                }).catch(() => undefined);
            });

            // console.log(`Joined room:${roomId}:shengji as ${username} on team ${team ? "1" : "2"}`);

            await channel.subscribe('state_change', (msg) => { // game state updated
                if (cancelled) {return;}
                receivedState = true;
                const rawData = msg.data as { game?: string } | null;
                if (!rawData || typeof rawData.game !== "string") {
                    setGame(null);
                    return;
                }
                const state = deserialize<SJGame.GameState>(rawData.game);
                setGame(state);
                // console.log("Updated:", state);
            });

            // Read the current game explicitly: an unchanged connection no longer broadcasts.
            // Subscribing and loading state must not depend on presence.enter succeeding.
            const res = await SJRequest({ roomId, action: "state", identity });
            if (!isCurrent()) {return;}
            loadInitialState(res);
            await channel.presence.enter({ username, team });
            const presence = await channel.presence.get();
            if (isCurrent()) {setIds(presence.map(p => p.clientId));}
        }

        runAsync(connect);

        return () => {
            cancelled = true;
            channelRef.current = null;
            channel.unsubscribe();
            channel.presence.unsubscribe();
        };

    }, [ably, roomId]);

    // respond to game state changes

    const missingIds = game && ids ? game.players.filter(player => !ids.includes(player)) : null;
    const missing = game && missingIds?.length ? missingIds.map(player => game.info.get(player)?.username || player) : null;
    // Use player IDs, not state object identity or display names, to recognize a change.
    const connectionKey = game && missingIds ? JSON.stringify([game.players, missingIds]) : null;

    useEffect(() => {
        if (!game) {return;}
        // adjust team
        const idx = game.info.get(identity?.clientId || "")?.index;
        // console.log(idx);
        if (idx === undefined) {setTeam(-1);}
        else {setTeam(idx % 2);}

    }, [game]);

    useEffect(() => {

        if (!connectionKey || !identity) {return;}
        let cancelled = false;
        let retry: ReturnType<typeof setTimeout> | undefined;
        const sync = async (): Promise<void> => {
            const res = await SJRequest({ roomId, action: "connection", identity }).catch(() => null);
            // Other clients share the room's limiter. Retry a rejected update so a return
            // during that window cannot leave the game paused indefinitely.
            if (res === null && !cancelled) {retry = setTimeout(() => { void sync(); }, 1500);}
        };
        void sync();
        return () => {
            cancelled = true;
            clearTimeout(retry);
        };
    }, [connectionKey, roomId, identity]);

    return (
        <div className="ui-stack sjg-room">
            <div className="sjg-room__info">
                <p>Room: <strong>{roomId}</strong></p>
                <p>Username: <strong>{username}</strong></p>
                <p>PlayerID: <strong>{identity?.clientId}</strong></p>
                <p>Connection: <strong>{connectionState}</strong></p>
            </div>
            <button className="sjg-button__game" onClick={() => { runAsync(endGame); }}>End Game</button>
            {!game && (
                <div className="ui-panel ui-stack sjg-lobby">
                    <PlayerList players={players} teams={teams} />
                    <div className="sjg-button__group">
                        <button className="sjg-button__game" onClick={() => { setTeam(p => 1 - Math.abs(p)); }}>{team === -1 ? `Join Game` : `Switch Team`}</button>
                        <button className="sjg-button__game" onClick={() => { runAsync(startGame); }}>Start Game</button>
                    </div>
                </div>
            )}
            <GameInfo identity={identity} roomId={roomId} team={team} game={game} missing={missing} />
        </div>
    );
}
