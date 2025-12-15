import { useMemo, useState } from "react";
import { generateTimeArray, composeSignal, randomComponent } from "/src/entities/signal.js";

import Form from '/src/components/tools/Form/Form.jsx';

import FreqGuesser from "./FreqGuesser.jsx";

const COMPONENT_COUNT = 2;

export default function FreqGuesserDemo() {
    const t = useMemo(() => generateTimeArray(512, 1), []);

    const [target] = useState(() =>
        Array.from({ length: COMPONENT_COUNT }, randomComponent)
    );

    const [guesses, setGuesses] = useState(() =>
        Array.from({ length: COMPONENT_COUNT }, () => ({ a: 1, f: 1 }))
    );

    const targetSignal = useMemo(
        () => composeSignal(target, t),
        [target, t]
    );

    const guessSignal = useMemo(
        () => composeSignal(guesses, t),
        [guesses, t]
    );

    const checkExactMatch = () => {
        return guesses.every(g =>
            target.some(tg => tg.a === g.a && tg.f === g.f)
        );
    };

    const update = (idx, key, value) => {
        setGuesses(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [key]: Number(value) };
            return next;
        });
    };

    return (
        <div style={{ maxWidth: 600 }}>
            <h3>Target Signal</h3>
            <FreqGuesser signal={targetSignal} width={"100%"} height={"100%"} />

            <h3>Your Reconstruction</h3>
            <FreqGuesser signal={guessSignal} width={"100%"} height={"100%"} />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {guesses.map((g, i) => (
                    <div key={i} style={{ display: "flex", gap: 8 }}>
                        <label>
                            a:
                            <Form
                                min={1}
                                max={3}
                                init={g.a}
                                onChange={e => update(i, "a", e)}
                            />
                        </label>
                        <label>
                            f:
                            <Form
                                min={1}
                                max={10}
                                init={g.f}
                                onChange={e => update(i, "f", e)}
                            />
                        </label>
                    </div>
                ))}
            </div>

            <button
                style={{ marginTop: 12 }}
                onClick={() => {
                    const ok = checkExactMatch();
                    alert(ok ? "Correct!" : "Incorrect");
                }}
            >
                Submit Guess
            </button>
        </div>
    );
}
