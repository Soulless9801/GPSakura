import { StrictMode } from 'react'

import '/src/index.css'

import 'jquery'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

import '@fortawesome/fontawesome-free/css/all.css'

import Navbar from '/src/components/Navbar.jsx'

import PageTitle from '/src/components/PageTitle.jsx'

import FractalDemo from '/src/components/FractalDemo.jsx';

export default function Fractals(){
    return (
        <StrictMode>
            <Navbar />
            <PageTitle title="Fractals" description="I'm going to break my monitor, I sware!"/>
            <FractalDemo />
        </StrictMode>
    )
}
