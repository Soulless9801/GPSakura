import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { loadValue } from '/src/utils/storage.js';
import { rgbToCss, readColor } from '/src/utils/colors.js';
import { generateTimeArray, composeSignal, randomComponent } from "/src/entities/signal.js";

import Form from '/src/components/tools/Form/Form.jsx';
import Modal from '/src/components/tools/Modal/Modal.jsx';
import FreqGuesser from "./FreqGuesser.jsx";

import './FreqGuesserDemo.css';

export default function FreqGuesserDemo() {

    const componentsKey = "freqGuesserComponents";

    const [components, setComponents] = useState(loadValue(componentsKey, 2));

    useEffect(() => localStorage.setItem(componentsKey, JSON.stringify(components)), [components]);

    const t = useMemo(() => generateTimeArray(512, 1), []);

    const [targetFreq, setTargetFreq] = useState(() =>
        Array.from({ length: components }, randomComponent)
    );

    const [guessFreq, setGuessFreq] = useState(() =>
        Array.from({ length: components }, () => ({ a: 1, f: 1 }))
    );

    const [cachedFreq, setCachedFreq] = useState(guessFreq);

    useEffect(() => {
        setCachedFreq(guessFreq);
    }, [guessFreq]);

    const targetSignal = useMemo(
        () => composeSignal(targetFreq, t),
        [targetFreq, t]
    );

    const guessSignal = useMemo(
        () => composeSignal(guessFreq, t),
        [guessFreq, t]
    );

    const [guesses, setGuesses] = useState(0);

    const guessesRef = useRef(guesses);

    useEffect(() => {
        guessesRef.current = guesses;
    }, [guesses]);

    const [win, setWin] = useState(false);

    const sumKey = "freqGuesserSum";
    const countKey = "freqGuesserCount";
    const giveUpKey = "freqGuesserGiveUp";

    const [sum, setSum] = useState(loadValue(sumKey, 0));
    const [count, setCount] = useState(loadValue(countKey, 0));
    const [giveUp, setGiveUp] = useState(loadValue(giveUpKey, 0));

    useEffect(() => localStorage.setItem(sumKey, JSON.stringify(sum)), [sum]);
    useEffect(() => localStorage.setItem(countKey, JSON.stringify(count)), [count]);
    useEffect(() => localStorage.setItem(giveUpKey, JSON.stringify(giveUp)), [giveUp]);

    const [primary, setPrimary] = useState([0, 0, 0]);

    useEffect(() => {
        const col = readColor();
        setPrimary(col[0]);
        const onStorage = () => {
            const col = readColor();
            setPrimary(col[0]);
        };
        window.addEventListener("themeStorage", onStorage);
        return () => window.removeEventListener("themeStorage", onStorage);
    }, []);

    const chk = useCallback(() => {
        let targetStrings = [];
        let cachedStrings = [];
        for (const { a, f } of targetFreq) targetStrings.push(`${a}_${f}`);
        for (const { a, f } of cachedFreq) cachedStrings.push(`${a}_${f}`);
        targetStrings.sort();
        cachedStrings.sort();
        for (let i = 0; i < components; i++) if (targetStrings[i] !== cachedStrings[i]) return false;
        return true;
    }, [cachedFreq, targetFreq, components]);

    const reset = useCallback(() => {
        if (!win) setGiveUp(prev => prev + 1);
        setTargetFreq(Array.from({ length: components }, randomComponent));
        setGuessFreq(Array.from({ length: components }, () => ({ a: 1, f: 1 })));
        setGuesses(0);
        setWin(false);
    }, [win, components]);

    const guess = useCallback(() => {
        if (win) return;
        setGuesses(prev => prev + 1);
        setGuessFreq(cachedFreq);
        if (chk()) setWin(true);
        else setWin(false);
    }, [cachedFreq, targetFreq, win]);

    useEffect(() => {
        if (win) {
            setSum(prev => prev + guessesRef.current);
            setCount(prev => prev + 1);
        }
    }, [win]);

    useEffect(() => {
        reset();
    }, [components]);
    
    const update = (idx, key, value) => {
        setCachedFreq(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [key]: Number(value) };
            return next;
        });
    };

    const ruleDescription = `
        Guess the component frequencies of the target signal displayed at the top!
        \\n
        After each guess, the signal you guessed will be displayed below the target signal.
        \\n
        Use this feedback to adjust your guess and try to find the exact frequencies!
    `;

    const statDescription = `
        Total Games Completed: ${count}
        \\n
        Average Guesses: ${count === 0 ? 0 : (sum / count).toFixed(2)}
        \\n
        Total Games Given Up: ${giveUp}
    `;


    return (
        <div className='container-fluid freqDemoWrapper'>
            <div className='row g-3 align-items-center'>
                <div className='col-12 col-md-6 col-xl-8'>
                    <div className="row gy-3">
                        <div className="col-12">
                            <FreqGuesser signal={targetSignal} width={"100%"} height={"30vh"} components={components} />
                        </div>
                        <div className="col-12">
                            <FreqGuesser signal={guessSignal} width={"100%"} height={"30vh"} components={components} />
                        </div>
                    </div>
                </div>
                {/* TODO: add controls */}
                <div className='col-12 col-md-6 col-xl-4 d-flex'>
                    <div className='p-3 freqControls'>
                        <div className='container-fluid freqInputs'>
                            <div className='row g-3'>
                                <Modal title={"Rules"} description={ruleDescription} buttonText={"Rules"}/>
                            </div>
                            <div>
                                <label className="freqLabelR">Number of Components</label>
                                <Form
                                    min={2}
                                    max={5}
                                    init={components}
                                    onChange={e => setComponents(e)}
                                />  
                            </div>
                            <div className='row g-3 freqRow'>
                                {guessFreq.map((g, i) => (
                                    <div key={i} className="row g-2">
                                        <div className="col-6">
                                            <label className="freqLabelR">a</label>
                                            <Form
                                                min={1}
                                                max={3}
                                                init={g.a}
                                                onChange={e => update(i, "a", e)}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="freqLabelR">f</label>
                                            <Form
                                                min={1}
                                                max={10}
                                                init={g.f}
                                                onChange={e => update(i, "f", e)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className='row g-3 freqRow'>
                                <div className='col-6'>
                                    <button className='freqButton' onClick={() => guess()}>
                                        Guess
                                    </button>
                                </div>
                                <div className='col-6'>
                                    <span className="freqText" style={{ color: win ? "#00ff00" : rgbToCss(primary) }}>Guesses: {guesses}</span>
                                </div>
                            </div>
                            <div className='row g-3 freqRow'>
                                <div className='col-6'>
                                    <button className='freqButton' onClick={() => reset()} >
                                        Randomize
                                    </button>
                                </div>
                                <div className='col-6'>
                                    <Modal title={"Statistics"} description={statDescription} buttonText={"Statistics"} buttonClassName='freqButton'/>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
