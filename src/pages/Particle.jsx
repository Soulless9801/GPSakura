import { StrictMode } from 'react'

import '/src/index.css'

import 'jquery'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

import '@fortawesome/fontawesome-free/css/all.css'

import Navbar from '/src/components/Navbar.jsx'

import PageTitle from '/src/components/PageTitle.jsx'

import ParticleNetworkDemo from '/src/components/ParticleNetworkDemo.jsx';

export default function Particle(){
    return (
        <StrictMode>
            <Navbar />
            <PageTitle title="Particle Network" description="An experimental particle network"/>
            <ParticleNetworkDemo />
        </StrictMode>
    )
}
