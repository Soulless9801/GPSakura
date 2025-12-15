import { StrictMode } from 'react'

import '/src/index.css'

import 'jquery'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

import '@fortawesome/fontawesome-free/css/all.css'

import Navbar from '/src/components/tools/Navbar/Navbar.jsx'

import PageTitle from '/src/components/tools/PageTitle/PageTitle.jsx'

import FreqGuesserDemo from '/src/components/games/FreqGuesser/FreqGuesserDemo.jsx';

export default function Freq(){
    return (
        <StrictMode>
            <Navbar />
            <PageTitle title="Frequency Guesser" description="Guess the frequency"/>
            <FreqGuesserDemo />
        </StrictMode>
    )
}
