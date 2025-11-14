import { useState, useEffect } from 'react';
import { loadValue } from "/src/utils/storage.js";
import { convertToPixels } from '/src/utils/resize.js';

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

	useEffect(() => {
		localStorage.setItem(numParticlesKey, JSON.stringify(numParticles));
		localStorage.setItem(particleRadiusKey, JSON.stringify(particleRadius));
		localStorage.setItem(connectionDistanceKey, JSON.stringify(connectionDistance));
		localStorage.setItem(speedKey, JSON.stringify(speed));
		localStorage.setItem(mouseRadiusKey, JSON.stringify(mouseRadius));
		localStorage.setItem(mouseStrengthKey, JSON.stringify(mouseStrength));
		localStorage.setItem(interactiveKey, JSON.stringify(interactive));
	}, [numParticles, particleRadius, connectionDistance, speed, mouseRadius, mouseStrength, interactive]);

	return (
		<div className='container-fluid particleDemoWrapper'>
			<div className='row g-3 align-item-start'>
				<div className='col-12 col-md-6 col-lg-8'>
					<div style={{ width: '100%', height: convertToPixels('60vh'), position: 'relative' }}>
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
					</div>
				</div>
				<div className='col-12 col-md-6 col-lg-4 d-flex'>
					<div className='p-3 particleControls'>
						<div className='particleControlsSliders'>
							<Slider min={minParticles} max={maxParticles} value={numParticles} onChange={e => setNumParticles(e)} label="Particles"/>
							<Slider min={minRadius} max={maxRadius} value={particleRadius} onChange={e => setParticleRadius(e)} label="Size" />
							<Slider min={minDist} max={maxDist} value={connectionDistance} onChange={e => setConnectionDistance(e)} label="Distance" />
							<Slider min={minSpeed} max={maxSpeed} step={0.01} places={2} value={speed} onChange={e => setSpeed(e)} label="Speed" />
							<div>
								<button className="particleButton" onClick={() => {
									setInteractive(prev => !prev);
								}}>
									Interactive
								</button>
							</div>
							<Slider min={minMouseRadius} max={maxMouseRadius} value={mouseRadius} onChange={e => setMouseRadius(e)} label="Mouse Radius" disabled={!interactive}/>
							<Slider min={minMouseStr} max={maxMouseStr} step={0.01} places={2} value={mouseStrength} onChange={e => setMouseStrength(e)} label="Mouse Str" disabled={!interactive}/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
