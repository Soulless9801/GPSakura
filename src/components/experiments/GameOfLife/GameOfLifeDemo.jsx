import { useState, useEffect, useRef } from "react";
import { loadValue } from "/src/utils/storage.js";
import { convertToPixels } from '/src/utils/resize.js';
import { toggleVal } from '/src/utils/list.js';

import GameOfLife from "./GameOfLife.jsx";
import Slider from "/src/components/tools/Slider/Slider.jsx"

import "./GameOfLifeDemo.css";

export default function GameOfLifeDemo() {

    const options = [1, 2, 3, 4, 5, 6, 7, 8];

    const interactiveKey = 'cellAutomataDemoInteractive';
    const showGridKey = 'cellAutomataDemoShowGrid';
    const speedKey = 'cellAutomataDemoSpeed';
    const zoomKey = 'cellAutomataDemoZoom';
    const rulesKey = 'cellAutomataDemoRules';

    const [interactive, setInteractive] = useState(() => loadValue(interactiveKey, true));
    const [running, setRunning] = useState(false);
    const [showGrid, setShowGrid] = useState(() => loadValue(showGridKey, true));

    const [speed, setSpeed] = useState(() => loadValue(speedKey, 8));
    const [zoom, setZoom] = useState(() => loadValue(zoomKey, 100));

    const minZoom = useRef(25);
    const maxZoom = useRef(300);

    const [rules, setRules] = useState(() => loadValue(rulesKey, {
        survive: [2, 3],
		birth: [3]
	}));

    useEffect(() => {
        localStorage.setItem(interactiveKey, JSON.stringify(interactive));
        localStorage.setItem(showGridKey, JSON.stringify(showGrid));
        localStorage.setItem(speedKey, JSON.stringify(speed));
        localStorage.setItem(zoomKey, JSON.stringify(zoom));
        localStorage.setItem(rulesKey, JSON.stringify(rules));
    }, [interactive, showGrid, speed, zoom, rules]);

    const gameRef = useRef(null);

    return (
        <div className='container-fluid cellDemoWrapper'>
			<div className='row g-3 align-items-center'>
				<div className='col-12 col-md-6 col-xl-8'>
                    <div style={{ width: '100%', height: convertToPixels('70vh'), position: 'relative' }}>
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
				<div className='col-12 col-md-6 col-xl-4 d-flex' id='cellControls'>
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
                            <div className='row cellOptionButtonRow'>
                                <div className='col-4 cellOptionLabel'>Survive</div>
                                <div className="row g-1 col-8">
                                    {options.map(option => (
                                        <div className='col-3' key={option}>
                                            <button className={`cellOptionButton ${rules.survive.includes(option) ? "active" : ""}`} onClick={() => {
                                                setRules(prev => ({
                                                    ...prev,
                                                    survive: toggleVal(prev.survive, option)
                                                }));
                                            }}>
                                                {option}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <hr/>
                            <div className='row cellOptionButtonRow'>
                                <div className='col-4 cellOptionLabel'>Birth</div>
                                <div className="row g-1 col-8">
                                    {options.map(option => (
                                        <div className='col-3' key={option}>
                                            <button className={`cellOptionButton ${rules.birth.includes(option) ? "active" : ""}`} onClick={() => {
                                                setRules(prev => ({
                                                    ...prev,
                                                    birth: toggleVal(prev.birth, option)
                                                }));
                                            }}>
                                                {option}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};