import { Outlet } from 'react-router';

import Navbar from '/src/components/tools/Navbar/Navbar';

export default function AppLayout() {
    return (
        <div className="app-shell">
            <Navbar />
            <main className="page-shell"><Outlet /></main>
        </div>
    );
}
