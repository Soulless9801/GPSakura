import { useState, useCallback } from "react";

import GameRoom from "/src/shengji/components/GameRoom/GameRoom";

import "./Join.css";

export default function Join() {

    // Live Game

    const [tempId, setTempId] = useState<string>("");
    const [roomId, setRoomId] = useState<string | null>(null);

    const [username, setUsername] = useState<string>("");

    const prevRoom = localStorage.getItem("sjRoomId");
    const prevUser = localStorage.getItem("sjUsername");

    const joinRoom = useCallback(() => {
        if (!tempId || !username) return;
        localStorage.setItem("sjRoomId", tempId);
        localStorage.setItem("sjUsername", username);
        setRoomId(tempId);
    }, [tempId, username]);

    const rejoinRoom = () => {
        if (!prevRoom || !prevUser) return;
        setTempId(prevRoom);
        setUsername(prevUser);
        setRoomId(prevRoom);
    };

    return (
        <div className="sjJoin">
            {!roomId || !username ? (   
                <div>
                    <div className="sjJoinForm">
                        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                        <input type="text" placeholder="Room ID" value={tempId} onChange={(e) => setTempId(e.target.value)} />
                        <button onClick={() => joinRoom()}>Join Room</button>
                        {prevRoom && prevUser && (
                            <button onClick={() => rejoinRoom()} className="sjRejoinCard">
                                Rejoin Room <strong>{prevRoom}</strong> as <strong>{prevUser}</strong>
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="sjGame">
                    <button onClick={() => setRoomId(null)}>Leave Room</button>
                    <GameRoom roomId={roomId} username={username} />
                </div>
            )}
        </div>
    );
}
