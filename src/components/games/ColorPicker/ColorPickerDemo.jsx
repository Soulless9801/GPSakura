import { useState, useCallback, useRef } from "react";
import { convertToPixels } from '/src/utils/resize.js';

import Form from '/src/components/tools/Form/Form.jsx';

import ColorPicker from "./ColorPicker.jsx";

import './ColorPickerDemo.css';

function colorFromDistance(d){
    if (d < 10) return "#"
}

export default function ColorPickerDemo() {

    const gameRef = useRef(null);

    const [rgb, setRgb] = useState([0, 0, 0]);

    const [rgbD, setRgbD] = useState([-1, -1, -1]);

    const guess = useCallback(() => {
        if (gameRef.current){
            const res = gameRef.current.guess(rgb);
            setRgbD(res);
            // TODO: Win/Lose Logic
            if (res[0] === 0 && res[1] === 0 && res[2] === 0) console.log("yay");
            else console.log("no");
        }
    }, [rgb]);

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
                                <div className='col-4 colorLabel'>
                                    <span>R</span>
                                    <Form init={rgb[0]} min={0} max={255} onChange={e => setRgb(prev => [e, prev[1], prev[2]])} />
                                </div>
                                <div className='col-4 colorLabel'>
                                    <span>G</span>
                                    <Form init={rgb[1]} min={0} max={255} onChange={e => setRgb(prev => [prev[0], e, prev[2]])} />
                                </div>
                                <div className='col-4 colorLabel'>
                                    <span>B</span>
                                    <Form init={rgb[2]} min={0} max={255} onChange={e => setRgb(prev => [prev[0], prev[1], e])} />
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
                                        if (gameRef.current) gameRef.current.gen();
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