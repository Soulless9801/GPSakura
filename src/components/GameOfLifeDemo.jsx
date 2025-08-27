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
    const [zoom, setZoom] = useState(100);

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
                            zoom={zoom}
                            interactive={interactive}
                            running={running}
                            wrap={wrap}
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
                                        setWrap(prev => !prev);
                                    }}>
                                        {wrap ? "No Wrap" : "Wrap"}
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
                            <Slider min={50} max={300} value={zoom} onChange={e => setZoom(e)} label="Zoom"/>
                            <div className='row g-1'>
                                <div className='col-6'>
                                    <button className="cellButton" onClick={() => setZoom(prev => Math.min(Number(prev) + 10, 300))}>
                                        Zoom In
                                    </button>
                                </div>
                                <div className='col-6'>
                                    <button className="cellButton" onClick={() => setZoom(prev => Math.max(Number(prev) - 10, 50))}>
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