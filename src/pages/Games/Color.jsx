import { StrictMode } from 'react'

import '/src/index.css'

import 'jquery'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

import '@fortawesome/fontawesome-free/css/all.css'

import Navbar from '/src/components/tools/Navbar/Navbar.jsx'

import PageTitle from '/src/components/tools/PageTitle/PageTitle.jsx'

import ColorPickerDemo from '/src/components/games/ColorPicker/ColorPickerDemo.jsx';

export default function Color(){
    return (
        <StrictMode>
            <Navbar />
            <PageTitle title="Color Picker" description="Guess the color"/>
            <ColorPickerDemo />
        </StrictMode>
    )
}
