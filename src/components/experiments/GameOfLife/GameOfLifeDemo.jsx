import { useState, useEffect, useRef } from "react";

import GameOfLife from "./GameOfLife.jsx";
import Slider from "/src/components/tools/Slider/Slider.jsx"

import "./GameOfLifeDemo.css";

function loadValue(key, defaultValue) {
    const raw = localStorage.getItem(key);
    const val = (raw !== null ? JSON.parse(raw) : defaultValue);
    if (typeof defaultValue === "number") return Number(val);
    if (typeof defaultValue === "boolean") return Boolean(val);
    return val;
}

export default function GameOfLifeDemo() {

    const options = [1, 2, 3, 4, 5, 6, 7, 8];

    const interactiveKey = 'cellAutomataDemoInteractive';
    const runningKey = 'cellAutomataDemoRunning';
    const showGridKey = 'cellAutomataDemoShowGrid';
    const speedKey = 'cellAutomataDemoSpeed';
    const zoomKey = 'cellAutomataDemoZoom';

    const [interactive, setInteractive] = useState(() => loadValue(interactiveKey, true));
    const [running, setRunning] = useState(() => loadValue(runningKey, false));
    const [showGrid, setShowGrid] = useState(() => loadValue(showGridKey, true));

    const [speed, setSpeed] = useState(() => loadValue(speedKey, 8));
    const [zoom, setZoom] = useState(() => loadValue(zoomKey, 100));

    const minZoom = useRef(25);
    const maxZoom = useRef(300);

    const [rules, setRules] = useState({
        survive: [2, 3],
		birth: [3]
	})

    useEffect(() => {
        localStorage.setItem(interactiveKey, JSON.stringify(interactive));
        localStorage.setItem(runningKey, JSON.stringify(running));
        localStorage.setItem(showGridKey, JSON.stringify(showGrid));
        localStorage.setItem(speedKey, JSON.stringify(speed));
        localStorage.setItem(zoomKey, JSON.stringify(zoom));
    }, [interactive, running, showGrid, speed, zoom]);

    const gameRef = useRef(null);

    return (
        <div className='container-fluid cellDemoWrapper'>
			<div className='row g-3 align-item-start'>
				<div className='col-12 col-md-6 col-xl-8'>
                    <div style={{ width: '100%', height: '60vh', position: 'relative' }}>
                        <GameOfLife
                            ref={gameRef}
                            width={"100%"}
                            height={"100%"}
                            speed={speed}
                            rules={rules}
                            zoom={zoom}
                            interactive={interactive}
                            running={running}
                            showGrid={showGrid}
                        />
                    </div>
				</div>
				<div className='col-12 col-md-6 col-xl-4 d-flex'>
					<div className='p-3 cellControls'>
						<div className='container-fluid cellControlsSliders'>
                            <div className='row g-1'>
                                <div className='col-4'>
                                    <button className="cellButton col-4" onClick={() => {
                                        setRunning(prev => !prev);
                                    }}>
                                        {running ? "Stop" : "Start"}
                                    </button>
                                </div>
                                <div className='col-4'>
                                    <button className="cellButton" onClick={() => {
                                        if (gameRef.current) gameRef.current.clear();
                                    }}>
                                        Clear
                                    </button>
                                </div>
                                <div className='col-4'>
                                    <button className="cellButton col-4" onClick={() => {
                                        if (gameRef.current) gameRef.current.step();
                                    }}>
                                        Step
                                    </button>
                                </div>
                            </div>
                            <Slider min={1} max={100} value={speed} onChange={e => setSpeed(e)} label="Speed"/>
                            <div className='row g-1'>
                                <div className='col-4'>
                                    <button className="cellButton" onClick={() => {
                                        setInteractive(prev => !prev);
                                    }}>
                                        Interactive
                                    </button>
                                </div>
                                <div className='col-4'>
                                    <button className="cellButton" onClick={() => {
                                        if (gameRef.current) gameRef.current.randomize();
                                    }}>
                                        Random
                                    </button>
                                </div>
                                <div className='col-4'>
                                    <button className="cellButton" onClick={() => {
                                        setShowGrid(prev => !prev);
                                    }}>
                                        Gridview
                                    </button>
                                </div>
                            </div>
                            <Slider min={minZoom.current} max={maxZoom.current} value={zoom} unit={"%"} onChange={e => setZoom(e)} label="Zoom"/>
                            <div className='row g-1'>
                                <div className='col-6'>
                                    <button className="cellButton" onClick={() => setZoom(prev => Math.min(Number(prev) + 10, maxZoom.current))}>
                                        Zoom In
                                    </button>
                                </div>
                                <div className='col-6'>
                                    <button className="cellButton" onClick={() => setZoom(prev => Math.max(Number(prev) - 10, minZoom.current))}>
                                        Zoom Out
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