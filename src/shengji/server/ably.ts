import { useState, useEffect } from "react";
import Ably from "ably";

import { Identity } from "/src/utils/verify";

export function useAbly({ request }: { request: Identity | null }): Ably.Realtime | null {
    
    const [ably, setAbly] = useState<Ably.Realtime | null>(null);

    useEffect(() => {

        const clientId: string = String(request?.clientId || "").trim();
        const signature: string = String(request?.signature || "").trim();

        let client: Ably.Realtime | null = null;

        client = new Ably.Realtime({
            authUrl: "/.netlify/functions/ably-auth",
            authParams: { clientId, signature },
        });

        setAbly(client);

        return () => {
            client?.close();
        };
        
    }, [request?.clientId, request?.signature]);

    return ably;
}
