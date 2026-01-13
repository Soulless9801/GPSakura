import { StrictMode } from 'react'

import '/src/index.css'

import 'jquery'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

import '@fortawesome/fontawesome-free/css/all.css'

import Navbar from '/src/components/tools/Navbar/Navbar.jsx'

import PageTitle from '/src/components/tools/PageTitle/PageTitle.jsx'

import USACOTable from '/src/components/tables/USACOTable/USACOTable.jsx'

export default function USACO(){
    return (
        <StrictMode>
            <Navbar />
            <PageTitle title="USACO" description="The cow says moo"/>
            <USACOTable />
        </StrictMode>
    );
}
