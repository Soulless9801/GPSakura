import { StrictMode } from 'react'

import '/src/index.css'

import 'jquery'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

import '@fortawesome/fontawesome-free/css/all.css'

import Navbar from '/src/components/Navbar.jsx'

import PageTitle from '/src/components/PageTitle.jsx'

import ParticleNetwork from '/src/components/ParticleNetwork.jsx';

export default function Home(){
    return (
        <StrictMode>
            <Navbar />
            <PageTitle title="Sakura" description="A project manifested"/>
            <ParticleNetwork numParticles={30} connectionDistance={90} width={"40vw"} height={"10vh"} style={{ maxWidth:"400px" }} />
        </StrictMode>
    )
}
