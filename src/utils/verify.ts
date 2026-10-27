import { deserialize } from "/src/utils/serial";

export interface Identity {
    clientId: string;
    signature: string;
}

// ask the server to mint a fresh, signed identity (Shengji players)
export async function issueIdentity(): Promise<Identity | null> {
    const res = await fetch("/.netlify/functions/create-session", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "issue" }),
    });
    if (!res.ok) {return null;}

    const data = await res.text();
    if (!data) {return null;}

    const des_data = deserialize(data);
    if (!des_data || typeof des_data !== "object") {return null;}

    const ret = des_data as Partial<Identity>;
    if (!ret.clientId || !ret.signature) {return null;}

    return { clientId: ret.clientId, signature: ret.signature };
}

// reuse the stored identity while the server still accepts it, otherwise get a new one from `gen`
export async function getIdentity(clientIdLoc: string, sigLoc: string, gen: () => Promise<Identity | null>, forceNew: boolean = false): Promise<Identity | null> {

    const clientId = localStorage.getItem(clientIdLoc);
    const signature = localStorage.getItem(sigLoc);

    if (clientId && signature && !forceNew) {
        const ver = await fetch("/.netlify/functions/create-session", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                action: "verify",
                clientId,
                signature,
            }),
        });

        // A throttled or unavailable verifier has not invalidated this identity.
        // Preserve it and avoid amplifying the failure with another issuance/DB write.
        if (!ver.ok) {return null;}
        const data = deserialize<{ valid?: boolean } | null>(await ver.text());
        if (data?.valid === true) {return { clientId, signature };}
        if (data?.valid !== false) {return null;}
    }

    const identity = await gen();
    if (!identity) {return null;}

    localStorage.setItem(clientIdLoc, identity.clientId);
    localStorage.setItem(sigLoc, identity.signature);

    return identity;
}
