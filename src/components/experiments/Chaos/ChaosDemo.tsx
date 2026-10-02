import { useState, useEffect } from "react";
import { loadValue } from "/src/utils/storage";

import ExperimentDemo from "/src/components/experiments/ExperimentDemo";

import Chaos from "./Chaos";
import type { ChaosAttractor } from "./Chaos";
import { Chaos3D } from "/src/components/experiments/ThreeD/ThreeD";
import Select from "/src/components/tools/Select/Select";
import Slider from "/src/components/tools/Slider/Slider";

import ColorSelector from "/src/components/tools/ColorSelector/ColorSelector";

import "./ChaosDemo.css";

export default function ChaosDemo() {

    type ChaosType = "lorenz" | "aizawa" | "halvorsen";
    const attractors: Record<ChaosType, ChaosAttractor> = {

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
            view: { x: -30, y: 30, z: 0 },
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
            view: { x: 2, y: 2, z: 0 },
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
            view: { x: 20, y: 20, z: 0 },
        }
    };

    const isChaosType = (value: string): value is ChaosType => value in attractors;

    const chaosOptions = [
        { value: 'lorenz', label: 'Lorenz' },
        { value: 'aizawa', label: 'Aizawa' },
        { value: 'halvorsen', label: 'Halvorsen' },
    ];

    const typeKey = 'chaosDemoType';
    const speedKey = 'chaosDemoSpeed';
    const pitchKey = 'chaosDemoPitch';
    const yawKey = 'chaosDemoYaw';
    const dimKey = 'chaosDemoDim';
    const depthKey = 'chaosDemoDepth';

    const scKey = 'chaosDemoStartColor';
    const ecKey = 'chaosDemoEndColor';

    const [type, setType] = useState<ChaosType>(() => loadValue<ChaosType>(typeKey, 'lorenz'));
    const [speed, setSpeed] = useState<number>(() => loadValue(speedKey, 10));
    const [pitch, setPitch] = useState<number>(() => loadValue(pitchKey, 0));
    const [yaw, setYaw] = useState<number>(() => loadValue(yawKey, 0));
    const [dim, setDim] = useState<number>(() => loadValue(dimKey, 2));
    const [depth, setDepth] = useState<number>(() => loadValue(depthKey, 10000));

    const [sc, setSc] = useState(() => loadValue(scKey, "#0000ff"));
    const [ec, setEc] = useState(() => loadValue(ecKey, "#ff0000"));

    const [refresh, setRefresh] = useState(false);

    useEffect(() => { localStorage.setItem(typeKey, JSON.stringify(type)); }, [type]);
    useEffect(() => { localStorage.setItem(speedKey, JSON.stringify(speed)); }, [speed]);
    useEffect(() => { localStorage.setItem(pitchKey, JSON.stringify(pitch)); }, [pitch]);
    useEffect(() => { localStorage.setItem(yawKey, JSON.stringify(yaw)); }, [yaw]);
    useEffect(() => { localStorage.setItem(dimKey, JSON.stringify(dim)); }, [dim]);
    useEffect(() => { localStorage.setItem(depthKey, JSON.stringify(depth)); }, [depth]);

    useEffect(() => { localStorage.setItem(scKey, JSON.stringify(sc)); }, [sc]);
    useEffect(() => { localStorage.setItem(ecKey, JSON.stringify(ec)); }, [ec]);

    const display = (
        <>
            {dim === 2 && (
                <Chaos
                    attractor={attractors[type]}
                    width={"100%"}
                    height={"100%"}
                    speed={speed}
                    pitch={pitch * (Math.PI / 180)}
                    yaw={yaw * (Math.PI / 180)}
                    refresh={refresh}
                    //style={{ borderRadius: 'var(--table-border-radius-secondary)', border: '1px solid var(--primary-color)', transition: 'var(--transition-timers)' }}
                />
            )}
            {dim === 3 && (
                <Chaos3D 
                    attractor={attractors[type]} 
                    width={"100%"}
                    height={"100%"}
                    speed={speed}
                    maxdepth={depth}
                    refresh={refresh}
                    startColor={sc}
                    endColor={ec}
                />
            )}
        </>
    );

    const controls = (
        <>
            <div className='row g-3'>
                <div className='col-12 chaosDemoSelects'>
                    <button
                        onClick={() => { setRefresh(!refresh); }}
                    >
                        Refresh
                    </button>
                    <Select
                        options={chaosOptions}
                        defaultValue={type}
                        onChange={e => {
                            const value = e.value;
                            if (typeof value === "string" && isChaosType(value)) {setType(value);}
                        }}
                        className="chaosDemoSelect"
                        labelL="Type"
                        id="chaosDemoSelect"
                    />
                    <Select
                        options={[
                            { value: 2, label: '2D' },
                            { value: 3, label: '3D' },
                        ]}
                        defaultValue={dim}
                        onChange={e => {
                            const value = e.value;
                            if (typeof value === "number") {setDim(value);}
                        }}
                        className="chaosDemoSelect"
                        labelL="Dimensions"
                        id="chaosDemoDimSelect"
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
                        onChange={e => { setSpeed(e); }} 
                        label="Speed"
                    />
                </div>
                {dim === 2 && (
                    <>
                        <div className='col-12'>
                            <Slider 
                                min={-180} 
                                max={180} 
                                value={pitch}
                                onChange={e => { setPitch(e); }} 
                                label="Pitch"
                            />
                        </div>
                        <div className='col-12'>
                            <Slider 
                                min={-180} 
                                max={180} 
                                value={yaw}
                                onChange={e => { setYaw(e); }} 
                                label="Yaw"
                            />
                        </div>
                    </>
                )}
                {dim === 3 && (
                    <>
                        <hr />
                        <div className='col-12'>
                            <Slider 
                                min={1000} 
                                max={50000} 
                                value={depth}
                                step={1000}
                                onChange={e => { setDepth(e); }} 
                                label="Max Points"
                            />
                        </div>
                        <div className='chaosDemoColors col-12'>
                            <ColorSelector value={sc} onChange={(newColor) => { setSc(newColor); }} label="Gradient Start"/>
                            <ColorSelector value={ec} onChange={(newColor) => { setEc(newColor); }} label="Gradient End"/>
                        </div>
                    </>
                )}
            </div>
        </>
    );
    
    return (
        <ExperimentDemo display={display} controls={controls} />
    );
};