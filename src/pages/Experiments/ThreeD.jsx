import { StrictMode } from 'react'

import '/src/index.css'

import 'jquery'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

import '@fortawesome/fontawesome-free/css/all.css'

import Navbar from '/src/components/tools/Navbar/Navbar.jsx'

import PageTitle from '/src/components/tools/PageTitle/PageTitle.jsx'

// import TriD from '/src/components/experiments/ThreeD/ThreeD.jsx'

export default function TriD(){
    return (
        <StrictMode>
            <Navbar />
            <PageTitle title="3D Playground" description="A space of chance"/>
        </StrictMode>
    );
}
