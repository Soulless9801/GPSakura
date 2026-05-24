import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';

import AppLayout from '/src/layouts/AppLayout.jsx';
import PageLoader from '/src/components/tools/PageLoader/PageLoader.jsx';

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
const TriD = lazy(() => import('/src/pages/Experiments/ThreeD.jsx'));
const BlackJack = lazy(() => import('/src/pages/Games/BJ.jsx'));

function lazyPage(Page) {
    const PageComponent = Page;
    return (
        <Suspense fallback={<PageLoader />}>
            <PageComponent />
        </Suspense>
    );
}
    
export default function App() {
    return (
        <HashRouter>
            <Routes>
                <Route element={<AppLayout />}>
                    <Route path="/" element={lazyPage(Home)} />
                    <Route path="cf" element={lazyPage(Codeforces)} />
                    <Route path="usaco" element={lazyPage(USACO)} />
                    <Route path="blog" element={lazyPage(Blog)} />
                    <Route path="particle" element={lazyPage(Particle)} />
                    <Route path="cell" element={lazyPage(CellAutomata)} />
                    <Route path="fractals" element={lazyPage(Fractals)} />
                    <Route path="chaos" element={lazyPage(Chaos)} />
                    <Route path="color" element={lazyPage(Color)} />
                    <Route path="freq" element={lazyPage(Freq)} />
                    <Route path="shengji" element={lazyPage(ShengJi)} />
                    <Route path="3d" element={lazyPage(TriD)} />
                    <Route path="blackjack" element={lazyPage(BlackJack)} />
                </Route>
            </Routes>
        </HashRouter>
    );
}