import "./BJApp.css";

export default function BJApp() {

    async function startGame() {

        console.log("Starting game...");

        const response = await fetch("/.netlify/functions/blackjack-game-room", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                action: "start",
                clientId: 1, // replace with actual client ID in production
                payload: {
                    bet_amount: 100, // TODO: replace with actual bet amount from payload
                }
            }),
        });

        if (!response.ok) console.error("Failed to start game:", response.statusText);
        else {
            const data = await response.json();
            console.log("Game started with game_id", data.result[0].id);
        }
    }

    return (
        <div className="bjWrapper">
            <button onClick={startGame}>
                Start Game
            </button>
        </div>
    );
}
