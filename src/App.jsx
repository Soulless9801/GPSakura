import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Codeforces from './pages/Codeforces.jsx';
import USACO from './pages/USACO.jsx';

export default function App() {
  return (
    <div>
        <HashRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="cf" element={<Codeforces />} />
                <Route path="usaco" element={<USACO />} />
            </Routes>
        </HashRouter>
    </div>
  );
}
