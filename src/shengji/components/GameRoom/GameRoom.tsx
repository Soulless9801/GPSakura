import { useEffect, useState, useRef } from "react";

import { deserialize } from "/src/utils/serial";

import { useAbly } from "/src/shengji/server/ably";
import { GameRequest, clientRequest } from "/src/utils/request";

import * as SJGame from "/src/shengji/core/game";
import * as SJCore from "/src/shengji/core/entities";
import * as SJComp from "/src/shengji/core/comparison";
import * as SJConv from "/src/shengji/core/convert";

import Ably from "ably";

import Hand, { HandRef } from "/src/components/tools/Hand/Hand";
import Card from "/src/components/tools/Card/Card";

import './GameRoom.css';

// Specific Request

const SJRequest = async (request: GameRequest) => clientRequest(request, "sjg-button__game", "shengji-game-room");

// Game components

function PlayerList({ players, teams }: { players: string[], teams: number[] }) {

    const a = players.filter((_, i) => teams[i] === 0);
    const b = players.filter((_, i) => teams[i] === 1);

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

const getClientId = (ably: any) => { 
    return ably?.auth?.clientId || "";
};

function GameInfo({ ably, roomId, team, game }: { ably: any, roomId: string, team: number, game: SJGame.GameState | null }) {
    
    const [hand, setHand] = useState<SJCore.Hand | null>(null);
    const handRef = useRef<HandRef>(null);

    const [dipai, setDipai] = useState<SJCore.Card[] | null>([]);
    const dipaiRef = useRef<HandRef>(null);

    const parseRes = (res: any): void => {

        const des_data = deserialize(res);
        if (!des_data || typeof des_data !== "object") return;

        const data = des_data as { 
            hand?: SJCore.HandData, 
            dipai?: SJCore.Card[]
        };

        if (!data) return;

        if (data.hand) setHand(SJCore.Hand.deserialize(data.hand));
        if (data.dipai) setDipai(data.dipai || null);
    }

    async function drawCard() {
        const res = await SJRequest({
            roomId,
            action: "draw",
            clientId: getClientId(ably),
        });

        parseRes(res);
    }

    async function getHand() {
        const res = await SJRequest({
            roomId,
            action: "hand",
            clientId: getClientId(ably),
        });

        parseRes(res);
    }

    async function callTrump() {
        const cards = handRef.current?.getActiveCards() || [];
        if (cards.length === 0) return; // must select cards to call trump
        if (!SJComp.isAllSame(cards) && !SJComp.isAllJokers(cards)) return; // must be all same card or jokers to call trump
        return SJRequest({
            roomId,
            action: "trump",
            clientId: getClientId(ably),
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
        if (cards.length === 0) return; // must select cards to play
        const play = { cards: cards.map(c => ({ suit: c.suit, rank: c.rank })) }; // assert type
        const res = await SJRequest({
            roomId,
            action: "play",
            clientId: getClientId(ably),
            payload: {
                play: JSON.stringify(play),
            }
        });

        parseRes(res);
    }

    async function shuaiCards() {
        const cards = handRef.current?.getActiveCards() || [];
        if (cards.length === 0) return; // must select cards to shuai
        const play = { cards: cards.map(c => ({ suit: c.suit, rank: c.rank })) }; // assert type
        const res = await SJRequest({
            roomId,
            action: "shuai",
            clientId: getClientId(ably),
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
            clientId: getClientId(ably),
        });

        parseRes(res);
    }

    async function exchangeDipai() {
        const give = handRef.current?.getActiveCards() || [];
        const receive = dipaiRef.current?.getActiveCards() || [];
        const res = await SJRequest({
            roomId,
            action: "exchange",
            clientId: getClientId(ably),
            payload: {
                give: JSON.stringify(give),
                receive: JSON.stringify(receive),
            }
        });

        parseRes(res);
    }

    const [phase, setPhase] = useState<string | null>(null);

    useEffect(() => {
        if (!game) { 
            setPhase(null); 
            setHand(null);
            return; 
        }
        // phase update
        if (game.over) setPhase("over");
        else if (game.draw) setPhase("draw");
        else if (game.dip) {
            setPhase("dipai");
            if (game.players[game.zhuang] !== getClientId(ably)) return;
            getDipai();
        } else setPhase("play");
    }, [game]);

    useEffect(() => {
        if (!phase || phase === "over") setHand(null);
        if (phase && phase !== "over" && !hand) getHand();
        if (phase !== "dipai") setDipai([]);
    }, [phase]);

    if (!game) return null;

    return (
        <div className="sjg-phase">
            {phase !== "over" && (
                <div>
                    <div className="sjg-info__area">
                        <div className="sjg-trump">
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
                        <div className="sjg-play">
                            <div className="sjg-plays">
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
                        <div className="sjg-dipai">
                            {getClientId(ably) === game.players[game.zhuang] && (
                                <>
                                    <p>Dipai (底牌)</p>
                                    <Hand ref={dipaiRef} cards={dipai || []} className="sjg-hand__wrapper"/>
                                    <div className="sjg-button__group">
                                        <button className="sjg-button__game" onClick={() => exchangeDipai()}>Exchange Dipai</button>
                                        <button className="sjg-button__game" onClick={() => getDipai()}>Get Dipai</button>
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
                                <div className="sjg-draw">
                                    <div className="sjg-button__group">
                                        <button className="sjg-button__game" onClick={() => drawCard()}>Draw Card</button>
                                    </div>
                                </div>
                            )}
                            <div className="sjg-hand">
                                <hr />
                                <Hand ref={handRef} cards={hand ? SJConv.handToCards(hand, game.trump) : []} className="sjg-hand__wrapper"/>
                                <div className="sjg-button__group">
                                    {phase === "play" && (
                                        <>
                                            <button className="sjg-button__game" onClick={() => playCards()}>Play Cards</button>
                                            <button className="sjg-button__game" onClick={() => shuaiCards()}>Gamble (甩)</button>
                                        </>
                                    )}
                                    {(phase === "dipai" || phase === "draw") && (
                                        <button className="sjg-button__game" onClick={() => callTrump()}>Call Trump (亮)</button>
                                    )}
                                    <button className="sjg-button__game" onClick={() => getHand()}>Refresh Hand</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function GameRoom({ roomId, username }: { roomId: string, username: string }) {

    // Ably config

    const [ablyRequest, setAblyRequest] = useState<{ clientId: string; signature: string | null }>({ clientId: "", signature: null });
    const ably = useAbly({ request: ablyRequest });

    // "Authenticate" user

    useEffect(() => {

        async function getIdentity() {
            let clientId = localStorage.getItem("ablyClientId");
            let signature = localStorage.getItem("ablySignature");
            if (!clientId || !signature) {

                clientId = `player_${Math.random().toString(36).substring(2, 10)}`;
                localStorage.setItem("ablyClientId", clientId);

                const res = await fetch("/.netlify/functions/create-session", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        action: "sign",
                        clientId: clientId,
                    }),
                });
                if (!res || !res.ok) return;

                const data = await res.text();
                if (!data) return;

                const des_data = deserialize(data);
                if (!des_data || typeof des_data !== "object") return;

                const ret = des_data as { signature: string | null };
                signature = ret.signature;
                localStorage.setItem("ablySignature", signature || "");
            }

            setAblyRequest({ clientId: clientId || "", signature: signature || null });
        }

        getIdentity();

    }, []);

    // Game state

    const [game, setGame] = useState<SJGame.GameState | null>(null);

    // Game actions

    async function startGame() {
        if (team < 0) return false;
        return SJRequest({
            roomId,
            action: "start",
            clientId: getClientId(ably),
        });
    }

    async function getState() {
        const res = await SJRequest({
            roomId,
            action: "state",
            clientId: getClientId(ably),
        });

        if (!res) return;

        const des_data = deserialize(res);
        if (!des_data || typeof des_data !== "object") return;

        const ret = des_data as { game?: SJGame.GameState };

        if (!ret || !ret.game) return;

        setGame(ret.game);
    }

    async function changeUsername(user: string) {
        return SJRequest({
            roomId,
            action: "username",
            clientId: getClientId(ably),
            payload: {
                username: user,
            }
        });
    }

    // UNUSED / ADMIN FUNCTIONS

    async function endGame() {
        if (team < 0) return false;
        return SJRequest({
            roomId,
            action: "end",
            clientId: getClientId(ably),
        });
    }

    async function speedDraw() {
        await SJRequest({
            roomId,
            action: "speed_draw",
            clientId: getClientId(ably),
        });
    }

    // Player team

    const [team, setTeam] = useState<number>(-1);

    useEffect(() => {
        const channel = channelRef.current;
        if (!channel) return;
        channel.presence.update({ username: username, team: team });
        changeUsername(username);
    }, [username, team]);

    // Ably connection

    const channelRef = useRef<Ably.RealtimeChannel | null>(null);

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

    const [ids, setIds] = useState<string[]>([]);
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
                    setIds(presence.map(p => p.clientId));
                    setPlayers(presence.map(p => p.data.username));
                    setTeams(presence.map(p => p.data.team));
                });
            });

            await channel.presence.enter({ username: username, team: team });

            // console.log(`Joined room_${roomId} as ${username} on team ${team ? "1" : "2"}`);

            channel.subscribe('state_change', (msg) => { // game state updated
                if (cancelled) return;
                const des_data = deserialize(msg.data.game);
                if (!des_data || typeof des_data !== "object") return;
                const state = des_data as SJGame.GameState;
                if (state) setGame(state);
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

    useEffect(() => {
        if (!game) return;
        // adjust team
        const idx = game.info.get(getClientId(ably) || "")?.index;
        // console.log(idx);
        if (idx === undefined) setTeam(-1);
        else setTeam(idx % 2);
    }, [game]);

    //TODO: add reconnecting

    const [rec, setRec] = useState<boolean>(false);

    useEffect(() => {

        if (!game) return;

        let cnt : number = 0;

        for (let i = 0; i < ids.length; i++) if (game.info.get(ids[i])) cnt++;

        // console.log("Players in game:", cnt, "/", game.players.length);

        setRec(cnt !== game.players.length);

    }, [game, ids]);

    return (
        <div className="sjg-room">
            <div className="sjg-room__info">
                <p>Room: <strong>{roomId}</strong></p>
                <p>Username: <strong>{username}</strong></p>
                <p>PlayerID: <strong>{getClientId(ably)}</strong></p>
                <p>Connection: <strong>{connectionState}</strong></p>
            </div>
            <button className="sjg-button__game" onClick={() => endGame()}>End Game</button>
            {!game && (
                <div className="sjg-lobby">
                    <PlayerList players={players} teams={teams} />
                    <div className="sjg-button__group">
                        <button onClick={() => setTeam(p => 1 - Math.abs(p))}>{team === -1 ? `Join Game` : `Switch Team`}</button>
                        <button onClick={() => startGame()}>Start Game</button>
                    </div>
                </div>
            )}
            <GameInfo ably={ably} roomId={roomId} team={team} game={game} />
            {/*<button className="sjg-button__game" onClick={() => speedDraw()}>Speed Draw (Cheat)</button>*/}
        </div>
    );
}