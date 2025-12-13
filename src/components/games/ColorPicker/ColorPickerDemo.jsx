import { useState, useCallback, useEffect, useRef } from "react";
import { convertToPixels } from '/src/utils/resize.js';
import { readColor, rgbToCss } from '/src/utils/colors.js';

import Form from '/src/components/tools/Form/Form.jsx';

import ColorPicker from "./ColorPicker.jsx";
import Modal from '/src/components/tools/Modal/Modal.jsx';

import './ColorPickerDemo.css';

export default function ColorPickerDemo() {

    const gameRef = useRef(null);

    const [rgb, setRgb] = useState([0, 0, 0]);

    const [rgbD, setRgbD] = useState([-1, -1, -1]);

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
        if (gameRef.current){
            const res = gameRef.current.guess(rgb);
            setRgbD(res);
            // TODO: Win/Lose Logic
            if (res[0] === 0 && res[1] === 0 && res[2] === 0) console.log("yay");
            else console.log("no");
        }
    }, [rgb]);

    const ruleDescription = `
        Guess the Color!
        \\n
        You need to guess the RGB values of a randomly generated color.
        After each guess, you'll receive feedback on how close each of your RGB components (Red, Green, Blue) is to the target color.
        \\n
        Feedback Legend:
        \\n
        - Green: Exact match (0 distance)
        \\n
        - Yellow: Very close (less than 10 distance)
        \\n
        - Orange: Close (less than 100 distance)
        \\n
        - Red: Far off (100 or more distance)
        \\n
        Use this feedback to adjust your guesses and try to find the exact color!
    `;

    return (
        <div className='container-fluid colorDemoWrapper'>
            <div className='row g-3 align-items-center'>
                <div className='col-12 col-md-6 col-xl-8'>
                    <div style={{ width: '100%', height: convertToPixels('70vh'), position: 'relative' }}>
                        <ColorPicker
                            width="100%"
                            height="100%"
                            ref={gameRef}
                        />
                    </div>
                </div>
                {/* TODO: add controls */}
                <div className='col-12 col-md-6 col-xl-4 d-flex'>
                    <div className='p-3 colorControls'>
                        <div className='container-fluid colorInputs'>
                            <div className='row g-3'>
                                <Modal title={"Rules"} description={ruleDescription} buttonText={"Rules"}/>
                            </div>    
                            <div className='row g-3'>
                                <div className='col-4 colorLabel'>
                                    <span>R</span>
                                    <Form init={rgb[0]} min={0} max={255} onChange={e => setRgb(prev => [e, prev[1], prev[2]])} style={{ borderColor: colorFromDistance(rgbD[0]) }} />
                                </div>
                                <div className='col-4 colorLabel'>
                                    <span>G</span>
                                    <Form init={rgb[1]} min={0} max={255} onChange={e => setRgb(prev => [prev[0], e, prev[2]])} style={{ borderColor: colorFromDistance(rgbD[1]) }} />
                                </div>
                                <div className='col-4 colorLabel'>
                                    <span>B</span>
                                    <Form init={rgb[2]} min={0} max={255} onChange={e => setRgb(prev => [prev[0], prev[1], e])} style={{ borderColor: colorFromDistance(rgbD[2]) }} />
                                </div>
                            </div>
                            <div className='row g-3'>
                                <div className='col-6'>
                                    <button className='colorButton' onClick={() => guess()}>
                                        Guess
                                    </button>
                                </div>
                                <div className='col-6'>
                                    <button className='colorButton' onClick={() => {
                                        if (gameRef.current) {
                                            gameRef.current.gen();
                                            setRgbD([-1, -1, -1]);
                                            setRgb([0, 0, 0]);
                                        }
                                    }}>
                                        Randomize
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};