import { useEffect, useState } from "react";
import * as ShenJiTest from '/src/shengji/core/testcase';
import * as ShenJiCore from '/src/shengji/core/entities';

import GameRoom from "/src/shengji/components/GameRoom/GameRoom";
import Hand from "/src/shengji/components/Hand/Hand";

import "./ShengJiApp.css";

export default function ShengJiApp() {
  
    const [testCase, setTestCase] = useState<ShenJiTest.TestCase | null>(null);

    const newTestCase = () => {
        setTestCase(ShenJiTest.genTestCase());
    };

    const [cards, setCards] = useState<ShenJiCore.Card[]>([]);

    useEffect(() => {
        setCards(ShenJiCore.handToCards(testCase?.hand || ShenJiCore.initializeHand()));
    }, [testCase]);

    return (
        <div className="shengjiWrapper">
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
            <hr />
            {testCase && (
                <div><Hand cards={cards} /></div>
            )}
        </div>
    );
}
