import { useState, useEffect } from "react";
import Ably from "ably";

export function useAbly({ request }: { request: { clientId: string; signature: string | null } }): Ably.Realtime | null {
    const [ably, setAbly] = useState<Ably.Realtime | null>(null);

    useEffect(() => {

        if (request.clientId.trim() === "" || !request.clientId.startsWith("player_")) return;
        if (!request.signature || request.signature.trim() === "") return;

        const client = new Ably.Realtime({
            authUrl: "/.netlify/functions/ably-auth",
            authParams: { clientId: request.clientId, signature: request.signature },
        });

        setAbly(client);

        return () => {
            client.close();
        };
        
    }, [request.clientId, request.signature]);

    return ably;
}
