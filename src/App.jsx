import { HashRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Lazy load all page components for route-based code splitting
const Home = lazy(() => import('/src/pages/Home.jsx'));
const Codeforces = lazy(() => import('/src/pages/Coding/Codeforces.jsx'));
const USACO = lazy(() => import('/src/pages/Coding/USACO.jsx'));
const Blog = lazy(() => import('/src/pages/Blog.jsx'));
const Particle = lazy(() => import('/src/pages/Experiments/Particle.jsx'));
const CellAutomata = lazy(() => import('/src/pages/Experiments/CellAutomata.jsx'));
const Fractals = lazy(() => import('/src/pages/Experiments/Fractals.jsx'));
const Chaos = lazy(() => import('/src/pages/Experiments/Chaos.jsx'));
const Color = lazy(() => import('/src/pages/Games/Color.jsx'));
const Freq = lazy(() => import('/src/pages/Games/Freq.jsx'));
const ShengJi = lazy(() => import('/src/pages/Games/ShengJi.jsx'));
const TriD = lazy(() => import('./pages/Experiments/ThreeD'));

// Minimal loading fallback
const LoadingFallback = () => <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><div>Loading...</div></div>;

export default function App() {
	return (
		<div>
			<HashRouter>
				<Suspense fallback={<LoadingFallback />}>
					<Routes>  
						<Route path="/" element={<Home />} />
						<Route path="cf" element={<Codeforces />} />
						<Route path="usaco" element={<USACO />} />
						<Route path="blog" element={<Blog />} />
						<Route path="particle" element={<Particle />} />
						<Route path="cell" element={<CellAutomata />} />
						<Route path="fractals" element={<Fractals />} />
						<Route path="chaos" element={<Chaos />} />
						<Route path="color" element={<Color />} />
						<Route path="freq" element={<Freq />} />
						<Route path="shengji" element={<ShengJi />} />
						<Route path="3d" element={<TriD />} />
					</Routes>
				</Suspense>
			</HashRouter>
		</div>
	);
}
