import { useState, useEffect } from "react";
import Ably from "ably";

export function useAbly(): Ably.Realtime | null {
    const [ably, setAbly] = useState<Ably.Realtime | null>(null);

    useEffect(() => {
        const client = new Ably.Realtime({
            authUrl: "/.netlify/functions/ably-auth",
        });

        setAbly(client);

        return () => {
            client.close();
        };
    }, []);

    return ably;
}
