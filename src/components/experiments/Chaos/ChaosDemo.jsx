import { useState, useEffect } from "react";
import { loadValue } from "/src/utils/storage.js";
import { convertToPixels } from '/src/utils/resize.js';

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
            scaleFactor: 8,
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

    const [type, setType] = useState(() => loadValue(typeKey, 'lorenz'));
    const [speed, setSpeed] = useState(() => loadValue(speedKey, 10));

    useEffect(() => localStorage.setItem(typeKey, JSON.stringify(type)), [type]);
    useEffect(() => localStorage.setItem(speedKey, JSON.stringify(speed)), [speed]);
    
    return (
        <div className='container-fluid chaosDemoWrapper'>
            <div className='row g-3 align-items-center'>
                <div className='col-12 col-md-6 col-xl-8'>
                    <div style={{ width: '100%', height: convertToPixels('70vh'), position: 'relative' }}>
                        <Chaos
                            attractor={attractors[type]}
                            width={"100%"}
                            height={"100%"}
                            speed={speed}
                            //style={{ borderRadius: 'var(--table-border-radius-secondary)', border: '1px solid var(--primary-color)', transition: 'var(--transition-timers)' }}
                        />
                    </div>
                </div>
                <div className='col-12 col-md-6 col-xl-4 d-flex'>
                    <div className='p-3 chaosControls'>
                        <div className='container-fluid chaosControlsSliders'>
                            <div className='row g-3'>
                                <div className='col-12'>
                                    <label htmlFor="chaosDemoSelect" className="chaosDemoLabel">Type</label>
                                    <Select
                                        options={chaosOptions}
                                        defaultValue={type}
                                        onChange={e => {
                                            const value = e.value;
                                            setType(value);
                                        }}
                                        className="chaosDemoSelect"
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
                            </div>    
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};