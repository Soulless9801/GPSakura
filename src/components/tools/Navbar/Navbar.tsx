import { Link, useNavigate, useLocation } from 'react-router';
import { useState } from 'react';
import { getTheme, isDarkTheme, themeImage, toggleTheme } from '/src/services/theme';

import { getNextTheme } from '../../../services/registry';

import Select, { type SelectOption } from '/src/components/tools/Select/Select';

import './Navbar.css';

export default function Navbar() {
    const [theme, setTheme] = useState(getTheme);

    const brand = themeImage();

    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const closeMenu = () => { setMenuOpen(false); };
    const selectPage = (option: SelectOption) => {
        if (option.to) { void navigate(option.to); closeMenu(); }
    };

    return (
        <section className="navbar-wrapper">
            <nav className="navbar navbar-expand-md navbar-custom">
                <div className="container-fluid">
                    <Link className="navbar-brand" to="/" onClick={closeMenu}><img src={brand} data-theme-asset alt="Sakura home" className="me-2 navbar-logo" id="navIcon" /></Link>
                    <div className="navbar-actions">
                        <button
                            id="darkModeToggle"
                            type="button"
                            className="theme-toggle"
                            aria-label={`Switch to ${getNextTheme(theme).label} theme`}
                            onClick={() => { void toggleTheme(setTheme); }}
                            onMouseDown={e => { e.preventDefault(); }}
                        >
                            <i id="darkModeIcon" className={`navbar-icon fa-regular ${isDarkTheme() ? 'fa-moon' : 'fa-sun'}`} />
                        </button>
                        <button className="navbar-toggler" type="button" onClick={() => { setMenuOpen(open => !open); }} aria-controls="navbarNav" aria-expanded={menuOpen}>
                            <span className="navbarLabel">Menu</span>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" id="navbarIcon">
                                <rect y="4" width="24" height="2" rx="1" fill="currentColor" />
                                <rect y="11" width="24" height="2" rx="1" fill="currentColor" />
                                <rect y="18" width="24" height="2" rx="1" fill="currentColor" />
                            </svg>
                        </button>
                    </div>
                    <div className={`navbar-collapse${menuOpen ? " show" : ""}`} id="navbarNav">
                        <div className="navbar-menu-content">
                            <ul className="navbar-nav">
                                <li className="nav-item"><div className="nav-link-wrapper"><Link className="nav-link" to="/" onClick={closeMenu}>Home</Link></div></li>
                                <li className="nav-item"><div className="nav-link-wrapper"><Link className="nav-link" to="/blog" onClick={closeMenu}>Blog</Link></div></li>
                                <li className="nav-item">
                                    <Select
                                        key={pathname}
                                        id="codingMenu"
                                        options={[
                                            { value: 'USACO', label: 'USACO', to: '/usaco' },
                                            { value: 'Codeforces', label: 'Codeforces', to: '/cf' },
                                        ]}
                                        onChange={selectPage}
                                        fixedSelect={true}
                                        placeholder="Coding"
                                        className="nav-dropdown"
                                    />
                                </li>
                                <li className="nav-item">
                                    <Select
                                        key={pathname}
                                        id="experimentMenu"
                                        options={[
                                            { value: 'Particle', label: 'Particle Network', to: '/particle' },
                                            { value: 'Cell', label: 'Cell Automata', to: '/cell' },
                                            { value: 'Fractal', label: 'Fractals', to: '/fractals' },
                                            { value: 'Chaos', label: 'Chaotic Attractors', to: '/chaos' },
                                            { value: '3D', label: '3D Graphics', to: '/3d' },
                                        ]}
                                        onChange={selectPage}
                                        fixedSelect={true}
                                        placeholder="Experiments"
                                        className="nav-dropdown"
                                    />
                                </li>
                                <li className="nav-item">
                                    <Select
                                        key={pathname}
                                        id="gamesMenu"
                                        options={[
                                            { value: 'ShengJi', label: '升级', to: '/shengji' },
                                            { value: 'ShengJiAdvisor', label: '升级 Advisor', to: '/shengji-advisor' },
                                            { value: 'Color', label: 'Color Picker', to: '/color' },
                                            { value: 'Freq', label: 'Frequency Guesser', to: '/freq' },
                                            { value: 'BlackJack', label: 'Black Jack', to: '/blackjack' },
                                        ]}
                                        onChange={selectPage}
                                        fixedSelect={true}
                                        placeholder="Games"
                                        className="nav-dropdown"
                                    />
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </nav>
        </section>
    )
}
