import { useState, useEffect } from "react";
import { loadValue } from "/src/utils/storage";

import ExperimentDemo from "/src/components/experiments/ExperimentDemo";

import Fractal, { type FractalType } from "./Fractal";
import Select from "/src/components/tools/Select/Select";
import Slider from "/src/components/tools/Slider/Slider";

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

    const depthFractals: FractalType[] = [
        'koch',
        'dragon',
        'pythagoras',
    ];

    const angleFractals = [
        'pythagoras',
    ];

    const depthMax: Partial<Record<FractalType, number>> = {
        'koch': 7,
        'dragon': 15,
        'pythagoras': 12,
    };

    const typeKey = 'fractalDemoType';
    const depthKey = 'fractalDemoDepth';
    const speedKey = 'fractalDemoSpeed';
    const angleKey = 'fractalDemoAngle';

    const isFractalType = (value: string): value is FractalType => fractalOptions.some(option => option.value === value);
    const [type, setType] = useState<FractalType>(() => loadValue<FractalType>(typeKey, 'sierpinski'));
    const [depth, setDepth] = useState<number>(() => loadValue(depthKey, 3));
    const [maxDepth, setMaxDepth] = useState<number>(() => depthMax[type] ?? 7);
    const [speed, setSpeed] = useState<number>(() => loadValue(speedKey, 100));
    const [angle, setAngle] = useState<number>(() => loadValue(angleKey, 90));

    useEffect(() => { localStorage.setItem(typeKey, JSON.stringify(type)); }, [type]);
    useEffect(() => { localStorage.setItem(depthKey, JSON.stringify(depth)); }, [depth]);
    useEffect(() => { localStorage.setItem(speedKey, JSON.stringify(speed)); }, [speed]);
    useEffect(() => { localStorage.setItem(angleKey, JSON.stringify(angle)); }, [angle]);

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
                            if (typeof value !== "string" || !isFractalType(value)) {return;}
                            setType(value);
                            if (depthFractals.findIndex(item => item === value) === -1) {return;}

                            const newMaxDepth = depthMax[value] ?? 7;

                            setMaxDepth(newMaxDepth);
                            setDepth(prev => Math.min(prev, newMaxDepth));
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
                        onChange={e => { setDepth(e); }} 
                        label="Depth"
                        disabled={depthFractals.findIndex(item => item === type) === -1}
                    />
                </div>
                <div className='col-12'>
                    <Slider 
                        min={10} 
                        max={1000} 
                        value={speed} 
                        onChange={e => { setSpeed(e); }} 
                        label="Speed"
                        disabled={speedFractals.findIndex(item => item === type) === -1}
                    />
                </div>
                <div className='col-12'>
                    <Slider 
                        min={0} 
                        max={180} 
                        value={angle} 
                        onChange={e => { setAngle(e); }} 
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