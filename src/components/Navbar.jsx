import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

import Select from './Select.jsx'

import './Navbar.css';

export default function Navbar() {
    const [theme, setTheme] = useState(localStorage.theme || 'light');
    const navigate = useNavigate();

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        window.dispatchEvent(new Event('themeStorage'));
        localStorage.theme = theme;

        const icon = document.getElementById('darkModeIcon');
        const navImg = document.getElementById('navIcon');
        const websisteIcon = document.getElementById('websiteIcon');

        if (theme === 'dark') {
            icon.classList.replace('fa-sun', 'fa-moon');
            navImg.src = '/favicom.png';
            websisteIcon.to = '/favicom.png';
        } else {
            icon.classList.replace('fa-moon', 'fa-sun');
            navImg.src = '/favicon.png';
            websisteIcon.to = '/favicon.png';
        }
    }, [theme]);

    useEffect(() => {
        const items = document.querySelectorAll('.nav-item.dropdown');

        const onEnter = (el) => {
            el.classList.add('show');
            el.querySelector('.dropdown-menu')?.classList.add('show');
        };
        const onLeave = (el) => {
            if (!el.dataset.openLocked) {
                el.classList.remove('show');
                el.querySelector('.dropdown-menu')?.classList.remove('show');
            }
        };

        const onToggleClick = (el, ev) => {
            ev.stopPropagation();
            const locked = el.dataset.openLocked === 'true';
            if (locked) {
                delete el.dataset.openLocked;
                onLeave(el);
            } else {
                el.dataset.openLocked = 'true';
                onEnter(el);
            }
        };
        
        const onDocClick = () => {
            items.forEach(el => {
                if (el.dataset.openLocked) {
                    delete el.dataset.openLocked;
                    onLeave(el);
                }
            });
        };

        items.forEach(el => {
            const clickHandler = ev => onToggleClick(el, ev);

            el.addEventListener('mouseenter', () => onEnter(el));
            el.addEventListener('mouseleave', () => onLeave(el));
            el.addEventListener('click', clickHandler);

            el._clickHandler = clickHandler;
        });
        document.addEventListener('click', onDocClick);

        return () => {
            items.forEach(el => {
                el.removeEventListener('mouseenter', () => onEnter(el));
                el.removeEventListener('mouseleave', () => onLeave(el));
                el.removeEventListener('click', el._clickHandler);
            });
            document.removeEventListener('click', onDocClick);
            };
    }, []);

    return (
        <div className="navbar-wrapper">
            <nav className="navbar navbar-expand-md navbar-custom">
                <div className="container-fluid">
                    <Link className="navbar-brand ms-3 d-none d-md-block" to="/"><img src="/favicon.png" alt="Logo" className="me-2 navbar-logo" id="navIcon"/></Link>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false">
                        Menu{' '}
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <rect y="4" width="24" height="2" rx="1" fill="currentColor" />
                            <rect y="11" width="24" height="2" rx="1" fill="currentColor" />
                            <rect y="18" width="24" height="2" rx="1" fill="currentColor" />
                        </svg>
                    </button>
                    <div className="collapse navbar-collapse justify-content-center" id="navbarNav">
                        <ul className="navbar-nav gap-3">
                            <li className="nav-item"><Link className="nav-link" to="/">Home</Link></li>
                            <li className="nav-item"><Link className="nav-link" to="/blog">Blog</Link></li>
                            <li className="nav-item">
                                <Select
                                    id="codingMenu"
                                    options={[
                                        { value: 'Coding', label: 'USACO', to: '/usaco' },
                                        { value: 'Coding ', label: 'Codeforces', to: '/cf' },
                                    ]}
                                    defaultIndex='0'
                                    onChange={e => navigate(e.to)}
                                    fixedSelect={true}
                                    placeholder="Coding"
                                    className="nav-dropdown"
                                />
                            </li>
                            <li className="nav-item">
                                <Select
                                    id="experimentMenu"
                                    options={[
                                        { value: 'Experiments', label: 'Particle Network', to: '/particle' },
                                    ]}
                                    defaultIndex='0'
                                    onChange={e => navigate(e.to)}
                                    fixedSelect={true}
                                    placeholder="Experiment"
                                    className="nav-dropdown"
                                />
                            </li>
                        </ul>
                        <button
                            id="darkModeToggle"
                            className="btn"
                            onClick={() => setTheme((curr) => (curr === 'light' ? 'dark' : 'light'))}
                            onMouseDown={e => e.preventDefault()}
                        >
                            <i id="darkModeIcon" className={`navbar-icon fa-regular ${theme === 'dark' ? 'fa-moon' : 'fa-sun'}`}/>
                        </button>
                    </div>
                </div>
            </nav>
        </div>
    )
}
