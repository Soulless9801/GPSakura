import { StrictMode } from 'react'

import '/src/index.css'

import 'jquery'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

import '@fortawesome/fontawesome-free/css/all.css'

import Navbar from '/src/components/tools/Navbar/Navbar.jsx'

import PageTitle from '/src/components/tools/PageTitle/PageTitle.jsx'

import ParticleNetwork from '/src/components/experiments/ParticleNetwork/ParticleNetwork.jsx';

export default function Home(){
    return (
        <StrictMode>
            <Navbar />
            <PageTitle title="Sakura" description="A project manifested"/>
            <ParticleNetwork numParticles={30} connectionDistance={90} width={"40vw"} height={"10vh"} style={{ maxWidth:"400px", marginLeft: "auto", marginRight: "auto" }} />
        </StrictMode>
    )
}
