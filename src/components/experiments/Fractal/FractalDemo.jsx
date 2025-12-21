import { useState, useEffect } from "react";
import { loadValue } from "/src/utils/storage.js";

import ExperimentDemo from "/src/components/experiments/ExperimentDemo.jsx";

import Fractal from "./Fractal.jsx";
import Select from "/src/components/tools/Select/Select.jsx";
import Slider from "/src/components/tools/Slider/Slider.jsx";

import "./FractalDemo.css";

export default function FractalDemo() {

    const fractalOptions = [
        { value: 'sierpinski', label: 'Sierpinski Triangle' },
        { value: 'koch', label: 'Koch Snowflake' },
        { value: 'fern', label: 'Barnsley Fern' },
        { value: 'dragon', label: 'Dragon Curve' },
        { value: 'pythagoras', label: 'Pythagoras Tree' },
    ];
    
    const speedFractals = [
        'sierpinski',
        'fern',
    ];

    const depthFractals = [
        'koch',
        'dragon',
        'pythagoras',
    ];

    const angleFractals = [
        'pythagoras',
    ];

    const depthMax = {
        'koch': 7,
        'dragon': 15,
        'pythagoras': 12,
    };

    const typeKey = 'fractalDemoType';
    const depthKey = 'fractalDemoDepth';
    const speedKey = 'fractalDemoSpeed';
    const angleKey = 'fractalDemoAngle';

    const [type, setType] = useState(() => loadValue(typeKey, 'sierpinski'));
    const [depth, setDepth] = useState(() => loadValue(depthKey, 3));
    const [maxDepth, setMaxDepth] = useState(() => depthMax[type] || 7);
    const [speed, setSpeed] = useState(() => loadValue(speedKey, 100));
    const [angle, setAngle] = useState(() => loadValue(angleKey, 90));

    useEffect(() => localStorage.setItem(typeKey, JSON.stringify(type)), [type]);
    useEffect(() => localStorage.setItem(depthKey, JSON.stringify(depth)), [depth]);
    useEffect(() => localStorage.setItem(speedKey, JSON.stringify(speed)), [speed]);
    useEffect(() => localStorage.setItem(angleKey, JSON.stringify(angle)), [angle]);

    const display = (
        <Fractal
            type={type}
            width={"100%"}
            height={"100%"}
            depth={depth}
            speed={speed}
            angle={angle}
            //style={{ borderRadius: 'var(--table-border-radius-secondary)', border: '1px solid var(--primary-color)', transition: 'var(--transition-timers)' }}
        />
    );

    const controls = (
        <>
            <div className='row g-3'>
                <div className='col-12'>
                    <Select
                        options={fractalOptions}
                        defaultValue={type}
                        onChange={e => {
                            const value = e.value;
                            setType(value);
                            if (depthFractals.findIndex(item => item === value) === -1) return;

                            const newMaxDepth = depthMax[value];

                            setMaxDepth(newMaxDepth);
                            setDepth(prev => {
                                return Math.min(prev, newMaxDepth);
                            });
                        }}
                        labelL={"Type"}
                        id="fractalDemoSelect"
                    />
                </div>
                <hr/>
                <div className='col-12'>
                    <Slider 
                        min={1} 
                        max={maxDepth} 
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
                <div className='col-12'>
                    <Slider 
                        min={0} 
                        max={180} 
                        value={angle} 
                        onChange={e => setAngle(e)} 
                        label="Angle"
                        disabled={angleFractals.findIndex(item => item === type) === -1}
                    />
                </div>
            </div> 
        </>
    );

    return (
        <ExperimentDemo display={display} controls={controls} />
    );
};