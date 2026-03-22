import { useEffect, useState, useRef } from "react";
import * as SJTest from '/src/shengji/core/testcase';
import * as SJCore from '/src/shengji/core/entities';
import * as SJComp from '/src/shengji/core/comparison';
import * as SJConv from '/src/shengji/core/convert';

import Hand, { HandRef } from "/src/shengji/components/Hand/Hand";

import "./Test.css";

export default function Test() {
  
    const [testCase, setTestCase] = useState<SJTest.TestCase | null>(null);

    const newTestCase = () => {
        setTestCase(SJTest.genTestCase());
    };

    const [cards, setCards] = useState<SJCore.Card[]>([]);
    const testCardRef = useRef<HandRef>(null);

    useEffect(() => {
        setCards(SJConv.handToCards(testCase?.ihand.hand || SJCore.initializeHand(), testCase?.trump || null));
    }, [testCase]);

    return (
        <div className="sjTest">
            <div className="sjTestForm">
                <button onClick={newTestCase}>Generate Testcase</button>
                <button onClick={() => setTestCase(null)}>Clear Testcase</button>
            </div>
            {testCase && (
                <div>
                    <hr />
                    <div>
                        <h3>Trump</h3>
                        <pre>{SJConv.trumpToString(testCase.trump)}</pre>
                    </div>
                    <div>
                        <h3>Lead</h3>
                        <pre>{SJConv.playToString(testCase.ilead.play)}</pre>
                    </div>
                    <div>
                        <h3>Play</h3>
                        <pre>{SJConv.playToString(testCase.iplay.play)}</pre>
                    </div>
                    <div>
                        <h3>Hand</h3>
                        <pre>{SJConv.handToString(testCase.ihand.hand, testCase.trump)}</pre>
                    </div>
                    <div>
                        <h3>AI Thinks</h3>
                        <div>
                            <span>Valid? </span> <pre>{SJComp.isPlayValid(testCase.iplay, testCase.ilead, testCase.ihand, testCase.trump) ? "Yes" : "No"}</pre>
                        </div>
                        <div>
                            <span>Bigger? </span> <pre>{SJComp.isPlayBigger(testCase.iplay, testCase.ilead, testCase.trump) ? "Yes" : "No"}</pre>
                        </div>
                    </div>
                </div>
            )}
            {testCase && (
                <div><Hand ref={testCardRef} cards={cards} /></div>
            )}
        </div>
    );
}
