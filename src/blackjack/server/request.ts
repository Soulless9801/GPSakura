// client request interface

interface ClientRequest {
    action: string;
    clientId?: string;
    payload?: any;
}

const timeout = 1000; // UX timeout in ms

// UX throttling

function disableButtons() {

    const btns = document.querySelectorAll<HTMLButtonElement>(".bjg-button__game");

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

// Generic client request

export async function clientRequest(request: ClientRequest) {

    disableButtons();

    const res =  await fetch("/.netlify/functions/blackjack-game-room", {
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