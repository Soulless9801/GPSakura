import { useState, useEffect } from "react";
import { loadValue } from "/src/utils/storage.js";

import ExperimentDemo from "/src/components/experiments/ExperimentDemo.jsx";

import Chaos from "./Chaos.jsx";
import Select from "/src/components/tools/Select/Select.jsx";
import Slider from "/src/components/tools/Slider/Slider.jsx";

import "./ChaosDemo.css";

export default function ChaosDemo() {

    const attractors = {

        "lorenz" : {
            dims: 3,
            params: { sigma: 10, rho: 28, beta: 8 / 3 },
            step: (x, y, z, p) => {
                const dx = p.sigma * (y - x);
                const dy = x * (p.rho - z) - y;
                const dz = x * y - p.beta * z;
                return [dx, dy, dz];
            },
            speedFactor: 5000,
            scaleFactor: 5,
            start: { x: 0.1, y: 0.1, z: 0.1 },
        },

        "aizawa": {
            dims: 3,
            params: { a: 0.95, b: 0.7, c: 0.6, d: 3.5, e: 0.25, f: 0.1 },
            step: (x, y, z, p) => {
                const dx = (z - p.b) * x - p.d * y;
                const dy = p.d * x + (z - p.b) * y;
                const dz =
                    p.c +
                    p.a * z -
                    (z ** 3) / 3 -
                    (x ** 2 + y ** 2) * (1 + p.e * z) +
                    p.f * z * (x ** 3);
                return [dx, dy, dz];
            },
            speedFactor: 1000,
            scaleFactor: 100,
            start: { x: 0.1, y: 0, z: 0 },
        },

        "halvorsen": {
            dims: 3,
            params: { a: 1.4 },
            step: (x, y, z, p) => {
                const dx = -p.a * x - 4 * y - 4 * z - y * y;
                const dy = -p.a * y - 4 * z - 4 * x - z * z;
                const dz = -p.a * z - 4 * x - 4 * y - x * x;
                return [dx, dy, dz];
            },
            speedFactor: 5000,
            scaleFactor: 15,
            start: { x: -6.4, y: 0, z: 0 },
        }
    };

    const chaosOptions = [
        { value: 'lorenz', label: 'Lorenz' },
        { value: 'aizawa', label: 'Aizawa' },
        { value: 'halvorsen', label: 'Halvorsen' },
    ];

    const typeKey = 'chaosDemoType';
    const speedKey = 'chaosDemoSpeed';
    const pitchKey = 'chaosDemoPitch';
    const yawKey = 'chaosDemoYaw';

    const [type, setType] = useState(() => loadValue(typeKey, 'lorenz'));
    const [speed, setSpeed] = useState(() => loadValue(speedKey, 10));
    const [pitch, setPitch] = useState(() => loadValue(pitchKey, 0));
    const [yaw, setYaw] = useState(() => loadValue(yawKey, 0));

    useEffect(() => localStorage.setItem(typeKey, JSON.stringify(type)), [type]);
    useEffect(() => localStorage.setItem(speedKey, JSON.stringify(speed)), [speed]);
    useEffect(() => localStorage.setItem(pitchKey, JSON.stringify(pitch)), [pitch]);
    useEffect(() => localStorage.setItem(yawKey, JSON.stringify(yaw)), [yaw]);

    const display = (
        <Chaos
            attractor={attractors[type]}
            width={"100%"}
            height={"100%"}
            speed={speed}
            pitch={pitch * (Math.PI / 180)}
            yaw={yaw * (Math.PI / 180)}
            //style={{ borderRadius: 'var(--table-border-radius-secondary)', border: '1px solid var(--primary-color)', transition: 'var(--transition-timers)' }}
        />
    );

    const controls = (
        <>
            <div className='row g-3'>
                <div className='col-12'>
                    <Select
                        options={chaosOptions}
                        defaultValue={type}
                        onChange={e => {
                            const value = e.value;
                            setType(value);
                        }}
                        className="chaosDemoSelect"
                        labelL={"Type"}
                        id="chaosDemoSelect"
                    />
                </div>
                <hr/>
                <div className='col-12'>
                    <Slider 
                        min={0.01} 
                        max={0.1} 
                        value={speed}
                        step={0.01}
                        places={2}
                        onChange={e => setSpeed(e)} 
                        label="Speed"
                    />
                </div>
                <div className='col-12'>
                    <Slider 
                        min={-180} 
                        max={180} 
                        value={pitch}
                        onChange={e => setPitch(e)} 
                        label="Pitch"
                    />
                </div>
                <div className='col-12'>
                    <Slider 
                        min={-180} 
                        max={180} 
                        value={yaw}
                        onChange={e => setYaw(e)} 
                        label="Yaw"
                    />
                </div>
            </div>
        </>
    );
    
    return (
        <ExperimentDemo display={display} controls={controls} />
    );
};