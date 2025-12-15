import { useState, useCallback, useEffect, useRef } from "react";
import { convertToPixels } from '/src/utils/resize.js';
import { readColor, rgbToCss } from '/src/utils/colors.js';
import { loadValue } from '/src/utils/storage.js';
import { randomColor } from '/src/entities/color.js';

import Form from '/src/components/tools/Form/Form.jsx';

import ColorPicker from "./ColorPicker.jsx";
import Modal from '/src/components/tools/Modal/Modal.jsx';

import './ColorPickerDemo.css';

export default function ColorPickerDemo() {

    const [targetColor, setTargetColor] = useState(randomColor());
    
    const [cachedColor, setCachedColor] = useState([0, 0, 0]);
    const [guessColor, setGuessColor] = useState(cachedColor);

    useEffect(() => {
        setCachedColor(guessColor);
    }, [guessColor]);

    const [rgbD, setRgbD] = useState([-1, -1, -1]);

    const [guesses, setGuesses] = useState(0);
    const [win, setWin] = useState(false);

    const guessesRef = useRef(guesses);

    const sumKey = "colorPickerSum";
    const countKey = "colorPickerCount";
    const giveUpKey = "colorPickerGiveUp";

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

    const colorFromDistance = useCallback((d) => {
        if (d < 0) return rgbToCss(primary);
        if (d === 0) return "#00ff00";
        if (d < 10) return "#ffff00";
        if (d < 100) return "#ffa500";
        return "#ff0000";
    }, [primary]);

    const guess = useCallback(() => {
        if (win) return;
        const res = [0, 0, 0];
        for (let i = 0; i < 3; i++) res[i] = Math.abs(targetColor[i] - cachedColor[i]);
        setRgbD(res);
        setGuesses(prev => prev + 1);
        setGuessColor(cachedColor);
        if (res[0] === 0 && res[1] === 0 && res[2] === 0) setWin(true);
        else setWin(false);
    }, [targetColor, cachedColor, guesses, win]);

    useEffect(() => {
        guessesRef.current = guesses;
    }, [guesses]);

    useEffect(() => {
        if (win) {
            setSum(prev => prev + guessesRef.current);
            setCount(prev => prev + 1);
        }
    }, [win]);

    const gen = useCallback(() => {
        if (!win) setGiveUp(prev => prev + 1);
        else setWin(false);
        setTargetColor(randomColor());
        setGuessColor([0, 0, 0]);
        setRgbD([-1, -1, -1]);
        setGuesses(0);
    }, [win]);

    const ruleDescription = `
        Guess the RGB values for the color on the left!
        \\n
        After each guess, you'll receive feedback on how close each of your RGB components is to the target color. Additionally, the color you guessed will be displayed to the right of the target color.
        \\n
        Feedback Legend:
        \\n
        - Green: Exact match (plus or minus 0)
        \\n
        - Yellow: Very close (plus or minus 10)
        \\n
        - Orange: Close (plus or minus 100)
        \\n
        - Red: Far off (anything else)
        \\n
        Use this feedback to adjust your guesses and try to find the exact color!

    `;

    const statDescription = `
        Total Games Completed: ${count}
        \\n
        Average Guesses: ${count === 0 ? 0 : (sum / count).toFixed(2)}
        \\n
        Total Games Given Up: ${giveUp}
    `;

    return (
        <div className='container-fluid colorDemoWrapper'>
            <div className='row g-3 align-items-center'>
                <div className='col-12 col-md-6 col-xl-8'>
                    <div className="row">
                        <div className="col-6" style={{}}>
                            <ColorPicker
                                width="100%"
                                height="60vh"
                                color={targetColor}
                            />
                        </div>
                        <div className="col-6">
                            <ColorPicker
                                width="100%"
                                height="60vh"
                                color={guessColor}
                            />
                        </div>
                    </div>
                </div>
                <div className='col-12 col-md-6 col-xl-4 d-flex'>
                    <div className='p-3 colorControls'>
                        <div className='container-fluid colorInputs'>
                            <div className='row g-3'>
                                <Modal title={"Rules"} description={ruleDescription} buttonText={"Rules"}/>
                            </div>    
                            <div className='row g-3 colorRow'>
                                <div className='col-4 colorLabel'>
                                    <span>R</span>
                                    <Form init={guessColor[0]} min={0} max={255} onChange={e => setCachedColor(prev => [e, prev[1], prev[2]])} style={{ borderColor: colorFromDistance(rgbD[0]) }} />
                                </div>
                                <div className='col-4 colorLabel'>
                                    <span>G</span>
                                    <Form init={guessColor[1]} min={0} max={255} onChange={e => setCachedColor(prev => [prev[0], e, prev[2]])} style={{ borderColor: colorFromDistance(rgbD[1]) }} />
                                </div>
                                <div className='col-4 colorLabel'>
                                    <span>B</span>
                                    <Form init={guessColor[2]} min={0} max={255} onChange={e => setCachedColor(prev => [prev[0], prev[1], e])} style={{ borderColor: colorFromDistance(rgbD[2]) }} />
                                </div>
                            </div>
                            <div className='row g-3 colorRow'>
                                <div className='col-6'>
                                    <button className='colorButton' onClick={() => guess()}>
                                        Guess
                                    </button>
                                </div>
                                <div className='col-6'>
                                    <span className="colorText" style={{ color: win ? "#00ff00" : rgbToCss(primary) }}>Guesses: {guesses}</span>
                                </div>
                            </div>
                            <div className='row g-3 colorRow'>
                                <div className='col-6'>
                                    <button className='colorButton' onClick={() => gen()} >
                                        Randomize
                                    </button>
                                </div>
                                <div className='col-6'>
                                    <Modal title={"Statistics"} description={statDescription} buttonText={"Statistics"} buttonClassName='colorButton'/>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};