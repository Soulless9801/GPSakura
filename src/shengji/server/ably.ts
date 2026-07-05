import { useState, useEffect } from "react";
import Ably from "ably";
import { deserialize } from "/src/utils/serial";

export function useAbly({ request }: { request: { clientId: string; signature: string | null } }): Ably.Realtime | null {
    const [ably, setAbly] = useState<Ably.Realtime | null>(null);

    useEffect(() => {

        const clientId: string = String(request.clientId || "").trim();
        const signature: string = String(request.signature || "").trim();

        const verify = async () => {

            if (!clientId || !clientId.startsWith("player_") || !signature) return false;

            const res = await fetch('/.netlify/functions/create-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'verify',
                    clientId,
                    signature
                }),
            });

            if (!res || !res.ok) return false;

            const data = await res.text();

            const ret = deserialize(data) as { 
                valid: boolean 
            };

            if (!ret || !ret.valid) return false;

            return true;
        }

        verify();

        const client = new Ably.Realtime({
            authUrl: "/.netlify/functions/ably-auth",
            authParams: { clientId, signature },
        });

        setAbly(client);

        return () => {
            client.close();
        };
        
    }, [request.clientId, request.signature]);

    return ably;
}
