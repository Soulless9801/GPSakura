import { StrictMode } from 'react'

import '/src/index.css'

import 'jquery'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

import '@fortawesome/fontawesome-free/css/all.css'

import Navbar from '/src/components/tools/Navbar/Navbar.jsx'

import PageTitle from '/src/components/tools/PageTitle/PageTitle.jsx'

import GameOfLifeDemo from '/src/components/experiments/GameOfLife/GameOfLifeDemo.jsx';

export default function Particle(){
    return (
        <StrictMode>
            <Navbar />
            <PageTitle title="Cell Automata" description="A game of life"/>
            <GameOfLifeDemo />
        </StrictMode>
    )
}
