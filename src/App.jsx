import { HashRouter, Routes, Route } from 'react-router-dom';

import Home from '/src/pages/Home.jsx';
import Codeforces from '/src/pages/Coding/Codeforces.jsx';
import USACO from '/src/pages/Coding/USACO.jsx';
import Blog from '/src/pages/Blog.jsx';
import Particle from '/src/pages/Experiments/Particle.jsx';
import CellAutomata from '/src/pages/Experiments/CellAutomata.jsx';
import Fractals from '/src/pages/Experiments/Fractals.jsx';

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
                <Route path="fractals" element={<Fractals />} />
            </Routes>
        </HashRouter>
    </div>
  );
}
