import { lazy, Suspense, type ComponentType } from 'react';
import { HashRouter, Routes, Route } from 'react-router';

import AppLayout from '/src/layouts/AppLayout';
import PageLoader from '/src/components/tools/PageLoader/PageLoader';

// Lazy load all page components for route-based code splitting
const Home = lazy(() => import('/src/pages/Home'));
const Codeforces = lazy(() => import('/src/pages/Coding/Codeforces'));
const USACO = lazy(() => import('/src/pages/Coding/USACO'));
const Blog = lazy(() => import('/src/pages/Blog'));
const Particle = lazy(() => import('/src/pages/Experiments/Particle'));
const CellAutomata = lazy(() => import('/src/pages/Experiments/CellAutomata'));
const Fractals = lazy(() => import('/src/pages/Experiments/Fractals'));
const Chaos = lazy(() => import('/src/pages/Experiments/Chaos'));
const Color = lazy(() => import('/src/pages/Games/Color'));
const Freq = lazy(() => import('/src/pages/Games/Freq'));
const ShengJi = lazy(() => import('/src/pages/Games/ShengJi'));
const ShengJiAdvisor = lazy(() => import('/src/pages/Games/ShengJiAdvisor'));
const TriD = lazy(() => import('/src/pages/Experiments/ThreeD'));
const BlackJack = lazy(() => import('/src/pages/Games/BJ'));

function lazyPage(Page: ComponentType) {
    return (
        <Suspense fallback={<PageLoader />}>
            <Page />
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
                    <Route path="shengji-advisor" element={lazyPage(ShengJiAdvisor)} />
                    <Route path="3d" element={lazyPage(TriD)} />
                    <Route path="blackjack" element={lazyPage(BlackJack)} />
                </Route>
            </Routes>
        </HashRouter>
    );
}