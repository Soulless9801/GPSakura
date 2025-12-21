import { useState, useEffect } from 'react';
import { loadValue } from "/src/utils/storage.js";

import ExperimentDemo from '/src/components/experiments/ExperimentDemo.jsx';

import ParticleNetwork from './ParticleNetwork.jsx';
import Slider from '/src/components/tools/Slider/Slider.jsx';

import './ParticleNetworkDemo.css';

export default function ParticleNetworkDemo() {

	const numParticlesKey = 'particleNetworkDemoNumParticles';
	const particleRadiusKey = 'particleNetworkDemoParticleRadius';
	const connectionDistanceKey = 'particleNetworkDemoConnectionDistance';
	const speedKey = 'particleNetworkDemoSpeed';
	const mouseRadiusKey = 'particleNetworkDemoMouseRadius';
	const mouseStrengthKey = 'particleNetworkDemoMouseStrength';
	const interactiveKey = 'particleNetworkDemoInteractive';

	const [numParticles, setNumParticles] = useState(() => loadValue(numParticlesKey, 100));
	const [particleRadius, setParticleRadius] = useState(() => loadValue(particleRadiusKey, 2));
	const [connectionDistance, setConnectionDistance] = useState(() => loadValue(connectionDistanceKey, 120));
	const [speed, setSpeed] = useState(() => loadValue(speedKey, 0.5));
	const [mouseRadius, setMouseRadius] = useState(() => loadValue(mouseRadiusKey, 60));
	const [mouseStrength, setMouseStrength] = useState(() => loadValue(mouseStrengthKey, 0.3));
	const [interactive, setInteractive] = useState(() => loadValue(interactiveKey, true));

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

	useEffect(() => localStorage.setItem(numParticlesKey, JSON.stringify(numParticles)), [numParticles]);
	useEffect(() => localStorage.setItem(particleRadiusKey, JSON.stringify(particleRadius)), [particleRadius]);
	useEffect(() => localStorage.setItem(connectionDistanceKey, JSON.stringify(connectionDistance)), [connectionDistance]);
	useEffect(() => localStorage.setItem(speedKey, JSON.stringify(speed)), [speed]);
	useEffect(() => localStorage.setItem(mouseRadiusKey, JSON.stringify(mouseRadius)), [mouseRadius]);
	useEffect(() => localStorage.setItem(mouseStrengthKey, JSON.stringify(mouseStrength)), [mouseStrength]);
	useEffect(() => localStorage.setItem(interactiveKey, JSON.stringify(interactive)), [interactive]);

	const display = (
		<ParticleNetwork
			numParticles={numParticles}
			connectionDistance={connectionDistance}
			width="100%"
			height="100%"
			particleRadius={particleRadius}
			speed={speed}
			mouseRadius={mouseRadius}
			mouseStrength={mouseStrength}
			interactive={interactive}
			style={{ borderRadius: 'var(--table-border-radius-secondary)', border: '1px solid var(--primary-color)', transition: 'var(--transition-timers)' }}
		/>
	);

	const controls = (
		<>
			<div className="row g-3">
				<Slider min={minParticles} max={maxParticles} value={numParticles} onChange={e => setNumParticles(e)} label="Particles"/>
				<Slider min={minRadius} max={maxRadius} value={particleRadius} onChange={e => setParticleRadius(e)} label="Size" />
				<Slider min={minDist} max={maxDist} value={connectionDistance} onChange={e => setConnectionDistance(e)} label="Distance" />
				<Slider min={minSpeed} max={maxSpeed} step={0.01} places={2} value={speed} onChange={e => setSpeed(e)} label="Speed" />
				<hr/>
				<div>
					<button onClick={() => {
						setInteractive(prev => !prev);
					}}>
						Interactive
					</button>
				</div>
				<Slider min={minMouseRadius} max={maxMouseRadius} value={mouseRadius} onChange={e => setMouseRadius(e)} label="Mouse Radius" disabled={!interactive}/>
				<Slider min={minMouseStr} max={maxMouseStr} step={0.01} places={2} value={mouseStrength} onChange={e => setMouseStrength(e)} label="Mouse Str" disabled={!interactive}/>
			</div>
		</>
	);

	return (
		<ExperimentDemo display={display} controls={controls} />
	);
}
