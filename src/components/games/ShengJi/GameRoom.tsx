import { useEffect, useState, useRef } from "react";
import { useAbly } from "/src/shengji/server/ably";
import * as ShenJiCore from "/src/shengji/core/entities";
import * as ShengJiGame from "/src/shengji/core/game";

interface ChatMessage {
    user: string;
    text: string;
}

export default function GameRoom({ roomId }: { roomId: string }) {

    const ably = useAbly();

    const [players, setPlayers] = useState<string[]>([]);

    useEffect(() => {
        console.log("Current players in room:", players);
    }, [players]);
    
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messageInput, setMessageInput] = useState("");

    function send() {
        if (!messageInput.trim()) return;

        if (!ably) return;

        const pid = ably.auth.clientId;

        ably.channels
            .get(`room_${roomId}`)
            .publish("chat", {
                user: pid || "Player",
                text: messageInput,
            });

        setMessageInput("");
    }

    useEffect(() => {

        if (!ably) return;

        const pid : string = ably.auth.clientId;

        const channel = ably.channels.get(`room_${roomId}`);

        let cancelled : boolean = false;

        const connect = async () => {

            if (ably.connection.state !== "connected") {
                await new Promise<void>(resolve =>
                    ably.connection.once("connected", () => resolve())
                );
            }

            channel.presence.subscribe((msg) => {
                if (cancelled) return;

                const action: string = msg.action;
                const player: string = msg.clientId;

                if (action === "enter") setPlayers((prev) => [...prev, player]);
                if (action === "leave" || action === "timeout") setPlayers((prev) => prev.filter((p) => p !== player));
            });

            channel.subscribe("chat", (msg) => {
                if (cancelled) return;
                setMessages((prev) => [...prev, msg.data as ChatMessage]);
            });

            channel.subscribe("game", (msg) => { // TODO: receive game state updates
                if (cancelled) return;
            });

            await channel.presence.enter();

            const snapshot = await channel.presence.get();
            if (!cancelled) setPlayers(snapshot.map(m => m.clientId));

            console.log(`Joined room_${roomId}`);
        }

        connect();

        return () => {
            cancelled = true;
            channel.presence.unsubscribe();
            channel.unsubscribe();
            channel.presence.leave();
            console.log(`Unsubscribed from room_${roomId}`);
        };

    }, [ably, roomId]);

    return (
        <div style={{ maxWidth: 400 }}>
        <h3>Room {roomId}</h3>

        <div style={{ border: "1px solid #ccc", padding: 8 }}>
            {messages.map((m, i) => (
                <div key={i}>
                    <strong>{m.user}:</strong> {m.text}
                </div>
            ))}
        </div>

        <input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button onClick={send}>Send</button>
        </div>
    );
}
