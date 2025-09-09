import { useState } from "react";

import Fractal from "./Fractal.jsx";
import Select from "./Select.jsx";
import Slider from "./Slider.jsx";

import "./FractalDemo.css";

export default function FractalDemo() {

    const fractalOptions = [
        { value: 'sierpinski', label: 'Sierpinski Triangle' },
        { value: 'koch', label: 'Koch Snowflake' },
        { value: 'fern', label: 'Barnsley Fern' },
    ];

    const speedFractals = [
        'sierpinski',
        'fern',
    ];

    const depthFractals = [
        'koch',
    ];

    const [type, setType] = useState('sierpinski');
    const [depth, setDepth] = useState(3);
    const [speed, setSpeed] = useState(500);

    return (
        <div className='container-fluid fractalDemoWrapper'>
            <div className='row g-3 align-item-start'>
                <div className='col-12 col-md-6 col-xl-8'>
                    <div style={{ width: '100%', height: '60vh', position: 'relative' }}>
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
                                        defaultIndex={0}
                                        onChange={e => {
                                            const value = e.value;
                                            setType(value);
                                        }}
                                        className="fractalDemoSelect"
                                        id="fractalDemoSelect"
                                    />
                                </div>
                            </div>
                            <div className='row g-3'>
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