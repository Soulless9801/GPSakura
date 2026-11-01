import { Outlet } from 'react-router';

import Navbar from '/src/components/tools/Navbar/Navbar';
import RequestErrors from '/src/components/tools/RequestErrors/RequestErrors';

export default function AppLayout() {
    return (
        <div className="app-shell">
            <Navbar />
            <main className="page-shell"><Outlet /></main>
            <RequestErrors />
        </div>
    );
}
