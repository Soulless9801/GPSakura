import { StrictMode } from 'react'

import '/src/index.css'

import 'jquery'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

import '@fortawesome/fontawesome-free/css/all.css'

import Navbar from '/src/components/tools/Navbar/Navbar.jsx'

import PageTitle from '/src/components/tools/PageTitle/PageTitle.jsx'

import ShengJiApp from '/src/components/games/ShengJi/ShengJiApp.tsx';

export default function ShengJi(){
    return (
        <StrictMode>
            <Navbar />
            <PageTitle title="升级" description="Tractor Testing Grounds"/>
            <ShengJiApp />
        </StrictMode>
    )
}
