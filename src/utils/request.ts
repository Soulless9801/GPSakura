export interface ClientRequest {
    payload?: any;
}

export interface GameRequest extends ClientRequest {
    action: string;
    clientId: string;
    roomId: string;
}

const timeout = 1000; // UX timeout in ms

// UX throttling

function disableButtons(className: string) {

    const btns = document.querySelectorAll<HTMLButtonElement>(`.${className}`);

    // console.log(`Disabling ${btns.length} buttons for ${timeout}ms`);

    btns.forEach(btn => {
        btn.disabled = true;
    });

    setTimeout(() => {
        btns.forEach(btn => {
            btn.disabled = false;
        });
    }, timeout);
}

export async function clientRequest(request: ClientRequest, className: string, functionName: string) {

    disableButtons(className);

    const res =  await fetch(`/.netlify/functions/${functionName}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    });

    if (!res) {
        console.error("Request failed");
        return null;
    }

    const data = await res.json();

    if (!res.ok) {
        // console.log("Error: ", data.error); --- IGNORE ---
        return null;
    }

    return data;
}