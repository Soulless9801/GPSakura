import { deserialize } from "/src/utils/serial";

export interface Identity {
    clientId: string;
    signature: string;
}

export async function getIdentity(functionName: string, clidntIdLoc: string, sigLoc: string, gen: () => Promise<string | null>, forceNew: boolean = false): Promise<Identity | null> {

    let clientId = localStorage.getItem(clidntIdLoc);
    let signature = localStorage.getItem(sigLoc);

    const ver = await fetch("/.netlify/functions/create-session", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            action: "verify",
            clientId: clientId,
            signature: signature,
        }),
    });

    if (!ver || !ver.ok || forceNew) {

        clientId = await gen();
        if (!clientId) return null;
        localStorage.setItem(clidntIdLoc, clientId);

        const res = await fetch(`/.netlify/functions/${functionName}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                action: "sign",
                clientId: clientId,
            }),
        });
        if (!res || !res.ok) return null;

        const data = await res.text();
        if (!data) return null;

        const des_data = deserialize(data);
        if (!des_data || typeof des_data !== "object") return null;

        const ret = des_data as { signature: string | null };
        signature = ret.signature;
        localStorage.setItem(sigLoc, signature || "");
    }

    return { clientId: clientId || "", signature: signature || "" };
}