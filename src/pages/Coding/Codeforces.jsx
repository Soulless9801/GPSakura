import { StrictMode } from 'react'

import '/src/index.css'

import 'jquery'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

import '@fortawesome/fontawesome-free/css/all.css'

import Navbar from '/src/components/tools/Navbar/Navbar.jsx'

import PageTitle from '/src/components/tools/PageTitle/PageTitle.jsx'

import CodeforcesTable from '/src/components/tables/CodeforcesTable/CodeforcesTable.jsx'

export default function Home(){
    return (
        <StrictMode>
            <Navbar />
            <PageTitle title="Codeforces" description="Thoughts on problems"/>
            <CodeforcesTable />
        </StrictMode>
    )
}
