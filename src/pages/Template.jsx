import { StrictMode } from 'react'

import '/src/index.css'

import 'jquery'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

import '@fortawesome/fontawesome-free/css/all.css'

import Navbar from '/src/components/Navbar.jsx'

import PageTitle from '/src/components/PageTitle.jsx'

export default function Home(){
    return (
        <StrictMode>
            <Navbar />
            <PageTitle title="Template" description="Description"/>
        </StrictMode>
    )
}
