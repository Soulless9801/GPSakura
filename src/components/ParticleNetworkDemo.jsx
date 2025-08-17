import { useState } from 'react';
import ParticleNetwork from './ParticleNetwork.jsx';

import './ParticleNetworkDemo.css';

export default function ParticleNetworkDemo() {
	const [numParticles, setNumParticles] = useState(100);
	const [particleRadius, setParticleRadius] = useState(2);
	const [connectionDistance, setConnectionDistance] = useState(120);
	const [speed, setSpeed] = useState(0.5);
	const [mouseRadius, setMouseRadius] = useState(60);
	const [mouseStrength, setMouseStrength] = useState(0.3);
	const [interactive, setInteractive] = useState(true);

	const minParticles = 10;
	const maxParticles = 200;
	const minRadius = 1;
	const maxRadius = 8;
	const minDist = 40;
	const maxDist = 240;
	const minSpeed = 0.1;
	const maxSpeed = 3;
	const minMouseRadius = 10;
	const maxMouseRadius = 200;
	const minMouseStr = 0;
	const maxMouseStr = 2;

	const getSliderFill = (value, min, max) => ({ "--val": ((value - min) / (max - min)) * 100 });

	return (
		<div className='container-fluid particleDemoWrapper'>
			<div className='row g-3 align-item-start'>
				<div className='col-12 col-md-6 col-lg-8'>
					<div style={{ width: '100%', position: 'relative' }}>
						<ParticleNetwork
							numParticles={numParticles}
							particleRadius={particleRadius}
							connectionDistance={connectionDistance}
							speed={speed}
							mouseRadius={mouseRadius}
							mouseStrength={mouseStrength}
							interactive={interactive}
							width="100%"
							height="60vh"
							style={{ borderRadius: 'var(--table-border-radius-secondary)', border: '1px solid var(--primary-color)', transition: 'var(--transition-timers)' }}
						/>
					</div>
				</div>
				<div className='col-12 col-md-6 col-lg-4 d-flex'>
					<div className='p-3 particleControls'>
						<div className='particleControlsSliders'>
							<label className='particleSliderLabel'>
								Particles: {numParticles}
								<input type="range" className="particleSlider" min={minParticles} max={maxParticles} value={numParticles} style={getSliderFill(numParticles, minParticles, maxParticles)} onChange={e => setNumParticles(Number(e.target.value))} />
							</label>
							<label className='particleSliderLabel'>
								Particle Size: {particleRadius}
								<input type="range" className="particleSlider" min={minRadius} max={maxRadius} value={particleRadius} style={getSliderFill(particleRadius, minRadius, maxRadius)} onChange={e => setParticleRadius(Number(e.target.value))} />
							</label>
							<label className='particleSliderLabel'>
								Distance: {connectionDistance}
								<input type="range" className="particleSlider" min={minDist} max={maxDist} value={connectionDistance} style={getSliderFill(connectionDistance, minDist, maxDist)} onChange={e => setConnectionDistance(Number(e.target.value))} />
							</label>
							<label className='particleSliderLabel'>
								Speed: {speed}
								<input type="range" className="particleSlider" min={minSpeed} max={maxSpeed} step="0.01" value={speed} style={getSliderFill(speed, minSpeed, maxSpeed)} onChange={e => setSpeed(Number(e.target.value))} />
							</label>
							<div>
								<button className="particleButton" onClick={() => {
									setInteractive(prev => !prev);
								}}>
									Interactive
								</button>
							</div>
							<label className={`particleSliderLabel${interactive ? '' : ' disabled'}`}>
								Radius: {mouseRadius}
								<input type="range" className="particleSlider" min={minMouseRadius} max={maxMouseRadius} value={mouseRadius} style={getSliderFill(mouseRadius, minMouseRadius, maxMouseRadius)} onChange={e => setMouseRadius(Number(e.target.value))} />
							</label>
							<label className={`particleSliderLabel${interactive ? '' : ' disabled'}`}>
								Acceleration: {mouseStrength}
								<input type="range" className="particleSlider" min={minMouseStr} max={maxMouseStr} step="0.01" value={mouseStrength} style={getSliderFill(mouseStrength, minMouseStr, maxMouseStr)} onChange={e => setMouseStrength(Number(e.target.value))} />
							</label>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
