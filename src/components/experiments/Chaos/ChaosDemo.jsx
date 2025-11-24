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
        },

        "clifford": {
            dims: 2,
            params: { a: -1.4, b: 1.6, c: 1.0, d: 0.7 },
            step: (x, y, p) => {
            const x2 = Math.sin(p.a * y) + p.c * Math.cos(p.a * x);
            const y2 = Math.sin(p.b * x) + p.d * Math.cos(p.b * y);
            return [x2 - x, y2 - y]; // treat as delta for consistency
            },
        },

        "ikeda": {
            dims: 2,
            params: { u: 0.918 },
            step: (x, y, p) => {
            const t = 0.4 - (6 / (1 + x * x + y * y));
            const x2 = 1 + p.u * (x * Math.cos(t) - y * Math.sin(t));
            const y2 = p.u * (x * Math.sin(t) + y * Math.cos(t));
            return [x2 - x, y2 - y];
            },
        },
    };

    const chaosOptions = [
        { value: 'lorenz', label: 'Lorenz' },
        { value: 'aizawa', label: 'Aizawa' },
        { value: 'halvorsen', label: 'Halvorsen' },
        { value: 'clifford', label: 'Clifford' },
        { value: 'ikeda', label: 'Ikeda' },
    ];

    const chaosSpeedFactors = {
        'lorenz': 1,
        'aizawa': 10,
        'halvorsen': 2,
        'clifford': 10,
        'ikeda': 10,
    };

    const [type, setType] = useState('lorenz');
    
    return (
        <div className='container-fluid chaosDemoWrapper'>
            <div className='row g-3 align-items-center'>
                <div className='col-12 col-md-6 col-xl-8'>
                    <div style={{ width: '100%', height: convertToPixels('70vh'), position: 'relative' }}>
                        <Chaos
                            attractor={attractors[type]}
                            width={"100%"}
                            height={"100%"}
                            speedFactor={chaosSpeedFactors[type]}
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
                            </div>    
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};