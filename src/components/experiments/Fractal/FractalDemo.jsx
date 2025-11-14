import { useState, useEffect } from "react";
import { loadValue } from "/src/utils/storage.js";
import { convertToPixels } from '/src/utils/resize.js';

import Fractal from "./Fractal.jsx";
import Select from "/src/components/tools/Select/Select.jsx";
import Slider from "/src/components/tools/Slider/Slider.jsx";

import "./FractalDemo.css";

export default function FractalDemo() {

    const fractalOptions = [
        { value: 'sierpinski', label: 'Sierpinski Triangle' },
        { value: 'koch', label: 'Koch Snowflake' },
        { value: 'fern', label: 'Barnsley Fern' },
    ];
    //
    const speedFractals = [
        'sierpinski',
        'fern',
    ];

    const depthFractals = [
        'koch',
    ];

    const typeKey = 'fractalDemoType';
    const depthKey = 'fractalDemoDepth';
    const speedKey = 'fractalDemoSpeed';

    const [type, setType] = useState(() => loadValue(typeKey, 'sierpinski'));
    const [depth, setDepth] = useState(() => loadValue(depthKey, 3));
    const [speed, setSpeed] = useState(() => loadValue(speedKey, 100));

    useEffect(() => {
        localStorage.setItem(typeKey, JSON.stringify(type));
        localStorage.setItem(depthKey, JSON.stringify(depth));
        localStorage.setItem(speedKey, JSON.stringify(speed));
    }, [type, depth, speed]);

    return (
        <div className='container-fluid fractalDemoWrapper'>
            <div className='row g-3 align-items-center'>
                <div className='col-12 col-md-6 col-xl-8'>
                    <div style={{ width: '100%', height: convertToPixels('60vh'), position: 'relative' }}>
                        <Fractal
                            type={type}
                            width={"100%"}
                            height={"100%"}
                            depth={depth}
                            speed={speed}
                            //style={{ borderRadius: 'var(--table-border-radius-secondary)', border: '1px solid var(--primary-color)', transition: 'var(--transition-timers)' }}
                        />
                    </div>
                </div>
                <div className='col-12 col-md-6 col-xl-4 d-flex'>
                    <div className='p-3 fractalControls'>
                        <div className='container-fluid fractalControlsSliders'>
                            <div className='row g-3'>
                                <div className='col-12'>
                                    <label htmlFor="fractalDemoSelect" className="fractalDemoLabel">Type</label>
                                    <Select
                                        options={fractalOptions}
                                        defaultValue={type}
                                        onChange={e => {
                                            const value = e.value;
                                            setType(value);
                                        }}
                                        className="fractalDemoSelect"
                                        id="fractalDemoSelect"
                                    />
                                </div>
                                <div className='col-12'>
                                    <Slider 
                                        min={1} 
                                        max={7} 
                                        value={depth} 
                                        onChange={e => setDepth(e)} 
                                        label="Depth"
                                        disabled={depthFractals.findIndex(item => item === type) === -1}
                                    />
                                </div>
                                <div className='col-12'>
                                    <Slider 
                                        min={10} 
                                        max={1000} 
                                        value={speed} 
                                        onChange={e => setSpeed(e)} 
                                        label="Speed"
                                        disabled={speedFractals.findIndex(item => item === type) === -1}
                                    />
                                </div>
                            </div> 
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};