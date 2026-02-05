import { useState } from "react";
import * as ShenJiTest from '/src/shengji/core/testcase';
import * as ShenJiCore from '/src/shengji/core/entities';

import "./ShengJiApp.css";

export default function ShengJiApp() {
  
    const [testCase, setTestCase] = useState<ShenJiTest.TestCase | null>(null);

    const newTestCase = () => {
        setTestCase(ShenJiTest.genTestCase());
    };

    return (
        <div className="shengjiWrapper">
            <button onClick={newTestCase}>Generate New Test Case</button>
            {testCase && (
                <div>
                    <hr />
                    <div>
                        <h3>Trump:</h3>
                        <pre>{ShenJiCore.trumpToString(testCase.trump)}</pre>
                    </div>
                    <div>
                        <h3>Lead:</h3>
                        <pre>{ShenJiCore.playToString(testCase.lead)}</pre>
                    </div>
                    <div>
                        <h3>Play:</h3>
                        <pre>{ShenJiCore.playToString(testCase.play)}</pre>
                    </div>
                    <div>
                        <h3>Hand:</h3>
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
        </div>
    );
}
