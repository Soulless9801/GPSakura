import { Link, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import lightImage from '/favicon.png';
import darkImage from '/favicom.png';

import Select, { type SelectOption } from '/src/components/tools/Select/Select';

import './Navbar.css';

interface NavItem extends HTMLElement {
    enterHandler?: () => void;
    leaveHandler?: () => void;
    clickHandler?: (event: MouseEvent) => void;
}

export default function Navbar() {
    const [theme, setTheme] = useState<string>(localStorage.getItem('theme') ?? 'light');

    const [brand, setBrand] = useState(lightImage);

    const navigate = useNavigate();

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        window.dispatchEvent(new Event('themeStorage'));
        localStorage.setItem('theme', theme);

        const icon = document.getElementById('darkModeIcon');
        const websiteIcon = document.getElementById('websiteIcon') as HTMLLinkElement | null;

        if (theme === 'dark') {
            icon?.classList.replace('fa-sun', 'fa-moon');
            setBrand(darkImage);
            if (websiteIcon) {websiteIcon.href = darkImage;}
        } else {
            icon?.classList.replace('fa-moon', 'fa-sun');
            setBrand(lightImage);
            if (websiteIcon) {websiteIcon.href = lightImage;}
        }
    }, [theme]);

    useEffect(() => {
        const items = document.querySelectorAll<NavItem>('.nav-item.dropdown');

        const onEnter = (el: HTMLElement) => {
            el.classList.add('show');
            el.querySelector('.dropdown-menu')?.classList.add('show');
        };
        const onLeave = (el: HTMLElement) => {
            if (!el.dataset.openLocked) {
                el.classList.remove('show');
                el.querySelector('.dropdown-menu')?.classList.remove('show');
            }
        };

        const onToggleClick = (el: HTMLElement, ev: MouseEvent) => {
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
            const enterHandler = () => { onEnter(el); };
            const leaveHandler = () => { onLeave(el); };
            const clickHandler = (ev: MouseEvent) => { onToggleClick(el, ev); };

            el.addEventListener('mouseenter', enterHandler);
            el.addEventListener('mouseleave', leaveHandler);
            el.addEventListener('click', clickHandler);

            el.enterHandler = enterHandler;
            el.leaveHandler = leaveHandler;
            el.clickHandler = clickHandler;
        });
        document.addEventListener('click', onDocClick);

        return () => {
            items.forEach(el => {
                if (el.enterHandler) {el.removeEventListener('mouseenter', el.enterHandler);}
                if (el.leaveHandler) {el.removeEventListener('mouseleave', el.leaveHandler);}
                if (el.clickHandler) {el.removeEventListener('click', el.clickHandler);}
            });
            document.removeEventListener('click', onDocClick);
            };
    }, []);

    return (
        <section className="navbar-wrapper">
            <nav className="navbar navbar-expand-md navbar-custom">
                <div className="container-fluid">
                    <Link className="navbar-brand ms-3 d-none d-md-block" to="/"><img src={brand} alt="Logo" className="me-2 navbar-logo" id="navIcon"/></Link>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false">
                        <label htmlFor="navbarIcon" className="navbarLabel">Menu</label>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" id="navbarIcon">
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
                                        { value: 'USACO', label: 'USACO', to: '/usaco' },
                                        { value: 'Codeforces', label: 'Codeforces', to: '/cf' },
                                    ]}
                                    onChange={(option: SelectOption) => { if (option.to) { void navigate(option.to); } }}
                                    fixedSelect={true}
                                    placeholder="Coding"
                                    className="nav-dropdown"
                                />
                            </li>
                            <li className="nav-item">
                                <Select
                                    id="experimentMenu"
                                    options={[
                                        { value: 'Particle', label: 'Particle Network', to: '/particle' },
                                        { value: 'Cell', label: 'Cell Automata', to: '/cell' },
                                        { value: 'Fractal', label: 'Fractals', to: '/fractals' },
                                        { value: 'Chaos', label: 'Chaotic Attractors', to: '/chaos' },
                                        { value: '3D', label: '3D Graphics', to: '/3d' },
                                    ]}
                                    onChange={(option: SelectOption) => { if (option.to) { void navigate(option.to); } }}
                                    fixedSelect={true}
                                    placeholder="Experiments"
                                    className="nav-dropdown"
                                />
                            </li>
                            <li className="nav-item">
                                <Select
                                    id="gamesMenu"
                                    options={[
                                        { value: 'ShengJi', label: '升级', to: '/shengji' },
                                        { value: 'ShengJiAdvisor', label: '升级 Advisor', to: '/shengji-advisor' },
                                        { value: 'Color', label: 'Color Picker', to: '/color' },
                                        { value: 'Freq', label: 'Frequency Guesser', to: '/freq' },
                                        { value: 'BlackJack', label: 'Black Jack', to: '/blackjack' },
                                    ]}
                                    onChange={(option: SelectOption) => { if (option.to) { void navigate(option.to); } }}
                                    fixedSelect={true}
                                    placeholder="Games"
                                    className="nav-dropdown"
                                />
                            </li>
                        </ul>
                        <button
                            id="darkModeToggle"
                            className="btn"
                            onClick={() => { setTheme((curr: string) => (curr === 'light' ? 'dark' : 'light')); }}
                            onMouseDown={e => { e.preventDefault(); }}
                        >
                            <i id="darkModeIcon" className={`navbar-icon fa-regular ${theme === 'dark' ? 'fa-moon' : 'fa-sun'}`}/>
                        </button>
                    </div>
                </div>
            </nav>
        </section>
    )
}
