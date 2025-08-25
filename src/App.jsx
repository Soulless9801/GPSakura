import { HashRouter, Routes, Route } from 'react-router-dom';

import Home from './pages/Home.jsx';
import Codeforces from './pages/Codeforces.jsx';
import USACO from './pages/USACO.jsx';
import Blog from './pages/Blog.jsx';
import Particle from './pages/Particle.jsx';
import CellAutomata from './pages/CellAutomata.jsx';

export default function App() {
  return (
    <div>
        <HashRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="cf" element={<Codeforces />} />
                <Route path="usaco" element={<USACO />} />
                <Route path="blog" element={<Blog />} />
                <Route path="particle" element={<Particle />} />
                <Route path="cell" element={<CellAutomata />} />
            </Routes>
        </HashRouter>
    </div>
  );
}
