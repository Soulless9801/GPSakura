import { Outlet } from 'react-router-dom';

import Navbar from '/src/components/tools/Navbar/Navbar.jsx';

export default function AppLayout() {
    return (
        <div>
            <Navbar />
            <Outlet />
        </div>
    );
}
