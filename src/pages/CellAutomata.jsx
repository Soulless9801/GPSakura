import { StrictMode } from 'react'

import '/src/index.css'

import 'jquery'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

import '@fortawesome/fontawesome-free/css/all.css'

import Navbar from '/src/components/Navbar.jsx'

import PageTitle from '/src/components/PageTitle.jsx'

import GameOfLifeDemo from '/src/components/GameOfLifeDemo.jsx';

export default function Particle(){
    return (
        <StrictMode>
            <Navbar />
            <PageTitle title="Cell Automata" description="A game of life"/>
            <GameOfLifeDemo />
        </StrictMode>
    )
}
