import { StrictMode } from 'react'

import '/src/index.css'

import 'jquery'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

import '@fortawesome/fontawesome-free/css/all.css'

import Navbar from '/src/components/tools/Navbar/Navbar.jsx'

import PageTitle from '/src/components/tools/PageTitle/PageTitle.jsx'

import ChaosDemo from '/src/components/experiments/Chaos/ChaosDemo.jsx';

export default function Chaos(){
    return (
        <StrictMode>
            <Navbar />
            <PageTitle title="Chaotic Attractors" description="I'm going to break my monitor, I sware!"/>
            <ChaosDemo />
        </StrictMode>
    )
}
