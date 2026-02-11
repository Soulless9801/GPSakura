import { useEffect, useState, useRef } from "react";
import { useAbly } from "/src/shengji/server/ably";
import Ably from "ably";

interface ClientRequest {
    roomId : string;
    action: string;
    clientId: string;
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

    if (!res.ok) {
        console.error("Request failed:", res.statusText);
        return null;
    }

    return res.json();
}

async function joinRoom(roomId: string, clientId: string) {
    const response = await clientRequest({
        roomId,
        action: "join",
        clientId,
    });

    if (response) {
        console.log("Joined room successfully:", response);
    } else {
        console.error("Failed to join room");
    }
}

async function leaveRoom(roomId: string, clientId: string) {
    const response = await clientRequest({
        roomId,
        action: "leave",
        clientId,
    });

    if (response) {
        console.log("Left room successfully:", response);
    } else {
        console.error("Failed to leave room");
    }
}

interface ChatMessage {
    user: string;
    text: string;
}

export default function GameRoom({ roomId }: { roomId: string }) {

    const ably = useAbly();
    
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messageInput, setMessageInput] = useState("");

    function getPID(): string {
        return ably?.auth.clientId || "Unknown";
    }

    function send() {
        if (!messageInput.trim()) return;

        if (!ably) return;

        const pid = getPID();

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

        const pid : string = getPID();

        const options : Ably.ChannelOptions = { modes: ['OBJECT_SUBSCRIBE', 'OBJECT_PUBLISH'] };
        const channel = ably.channels.get(`room_${roomId}`, options);

        let cancelled : boolean = false;

        const connect = async () => {

            if (ably.connection.state !== "connected") {
                await new Promise<void>(resolve =>
                    ably.connection.once("connected", () => resolve())
                );
            }

            channel.subscribe("chat", (msg) => {
                if (cancelled) return;
                setMessages((prev) => [...prev, msg.data as ChatMessage]);
            });

            await channel.presence.enter();

            await joinRoom(roomId, pid);

            console.log(`Joined room_${roomId}`);
        }

        connect();

        return () => {
            cancelled = true;
            channel.presence.unsubscribe();
            channel.unsubscribe();
            channel.presence.leave();
            leaveRoom(roomId, pid);
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
