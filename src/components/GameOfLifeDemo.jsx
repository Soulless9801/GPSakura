import { useState, useRef, forwardRef } from "react";

import GameOfLife from "./GameOfLife.jsx";
import Slider from "./Slider.jsx"

import "./GameOfLifeDemo.css";

export default function GameOfLifeDemo() {

    const [interactive, setInteractive] = useState(true);
    const [running, setRunning] = useState(true);
    const [wrap, setWrap] = useState(true);
    const [showGrid, setShowGrid] = useState(true);

    const [speed, setSpeed] = useState(8);

    const gameRef = useRef(null);

    return (
        <div className='container-fluid cellDemoWrapper'>
			<div className='row g-3 align-item-start'>
				<div className='col-12 col-md-6 col-lg-8'>
                    <div style={{ width: '100%', height: '60vh', position: 'relative' }}>
                        <GameOfLife
                            ref={gameRef}
                            width={"100%"}
                            height={"100%"}
                            speed={speed}
                            interactive={interactive}
                            running={running}
                            wrap={wrap}
                            showGrid={showGrid}
                            style={{ borderRadius: 'var(--table-border-radius-secondary)', border: '1px solid var(--primary-color)', transition: 'var(--transition-timers)' }}
                        />
                    </div>
				</div>
				<div className='col-12 col-md-6 col-lg-4 d-flex'>
					<div className='p-3 cellControls'>
						<div className='cellControlsSliders'>
                            <button className="cellButton" onClick={() => {
                                setRunning(prev => !prev);
                            }}>
                                {running ? "Stop" : "Start"}
                            </button>
                            <button className="cellButton" onClick={() => {
                                if (gameRef.current) gameRef.current.clear();
                            }}>
                                Clear
                            </button>
                            <button className="cellButton" onClick={() => {
                                if (gameRef.current) gameRef.current.step();
                            }}>
                                Step
                            </button>
                            <Slider min={1} max={100} value={speed} onChange={e => setSpeed(e)} label="Speed"/>
                            <button className="cellButton" onClick={() => {
                                setInteractive(prev => !prev);
                            }}>
                                Interactive
                            </button>
                            <button className="cellButton" onClick={() => {
                                setWrap(prev => !prev);
                            }}>
                                {wrap ? "No Wrap" : "Wrap"}
                            </button>
                            <button className="cellButton" onClick={() => {
                                setShowGrid(prev => !prev);
                            }}>
                                {showGrid ? "Hide Grid" : "Show Grid"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};