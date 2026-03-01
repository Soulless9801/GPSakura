import { useEffect, useState, useRef } from "react";
import * as ShenJiTest from '/src/shengji/core/testcase';
import * as ShenJiCore from '/src/shengji/core/entities';

import GameRoom from "/src/shengji/components/GameRoom/GameRoom";
import Hand, { HandRef } from "/src/shengji/components/Hand/Hand";

import "./ShengJiApp.css";

export default function ShengJiApp() {
  
    const [testCase, setTestCase] = useState<ShenJiTest.TestCase | null>(null);

    const newTestCase = () => {
        setTestCase(ShenJiTest.genTestCase());
    };

    const [cards, setCards] = useState<ShenJiCore.Card[]>([]);
    const testCardRef = useRef<HandRef>(null);

    useEffect(() => {
        setCards(ShenJiCore.handToCards(testCase?.hand || ShenJiCore.initializeHand()));
    }, [testCase]);

    // Live Game

    const [tempId, setTempId] = useState<string>("");
    const [roomId, setRoomId] = useState<string | null>(null);

    const [username, setUsername] = useState<string>("");

    const joinRoom = () => {
        if (!tempId || !username) {
            alert("Please enter a username and room ID");
            return;
        }
        setRoomId(tempId);
    };

    return (
        <div className="sjWrapper">
            <button onClick={newTestCase}>Generate New Test Case</button>
            {testCase && (
                <div>
                    <hr />
                    <div>
                        <h3>Trump</h3>
                        <pre>{ShenJiCore.trumpToString(testCase.trump)}</pre>
                    </div>
                    <div>
                        <h3>Lead</h3>
                        <pre>{ShenJiCore.playToString(testCase.lead)}</pre>
                    </div>
                    <div>
                        <h3>Play</h3>
                        <pre>{ShenJiCore.playToString(testCase.play)}</pre>
                    </div>
                    <div>
                        <h3>Hand</h3>
                        <pre>{ShenJiCore.handToString(testCase.hand, testCase.trump)}</pre>
                    </div>
                    <div>
                        <h3>AI Thinks</h3>
                        <div>
                            <span>Valid? </span> <pre>{ShenJiCore.isPlayValid(testCase.play, testCase.lead, testCase.hand, testCase.trump) ? "Yes" : "No"}</pre>
                        </div>
                        <div>
                            <span>Bigger? </span> <pre>{ShenJiCore.isPlayBigger(testCase.play, testCase.lead, testCase.trump) ? "Yes" : "No"}</pre>
                        </div>
                    </div>
                </div>
            )}
            {testCase && (
                <div><Hand ref={testCardRef} cards={cards} /></div>
            )}
            <hr />
            {!roomId || !username ? (
                <div>
                    <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                    <input type="text" placeholder="Room ID" value={tempId} onChange={(e) => setTempId(e.target.value)} />
                    <button onClick={() => joinRoom()}>Join Room</button>
                </div>
            ) : (
                <GameRoom roomId={roomId} username={username} />
            )}
        </div>
    );
}
