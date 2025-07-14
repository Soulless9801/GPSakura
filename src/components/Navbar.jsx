import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './Navbar.css';

export default function Navbar() {
  const [theme, setTheme] = useState(localStorage.theme || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
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
      el.classList.remove('show');
      el.querySelector('.dropdown-menu')?.classList.remove('show');
    };

    items.forEach((el) => {
      el.addEventListener('mouseenter', () => onEnter(el));
      el.addEventListener('mouseleave', () => onLeave(el));
    });

    return () => {
      items.forEach((el) => {
        el.removeEventListener('mouseenter', () => onEnter(el));
        el.removeEventListener('mouseleave', () => onLeave(el));
      });
    };
  }, []);
  return (
    <div className="navbar-wrapper">
      <nav className="navbar navbar-expand-lg navbar-custom">
        <div className="container-fluid">
          <Link className="navbar-brand ms-3 d-none d-lg-block" to="/">
            <img src="/favicon.png" alt="Logo" className="me-2 navbar-logo" id="navIcon"/>
          </Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation"><span className="navbar-toggler-icon" /></button>
          <div className="collapse navbar-collapse justify-content-center" id="navbarNav">
            <ul className="navbar-nav gap-3">
              <li className="nav-item"><Link className="nav-link" to="/">Home</Link></li>
              <li className="nav-item dropdown"><Link className="nav-link dropdown-toggle" to="/" id="codingMenu" role="button" aria-expanded="false">Coding</Link>
                <ul className="dropdown-menu hover-dropdown" aria-labelledby="codingMenu">
                  <li><Link className="dropdown-item" to="/usaco">USACO</Link></li>
                  <li><Link className="dropdown-item" to="/cf">Codeforces</Link></li>
                </ul>
              </li>
            </ul>
            <button id="darkModeToggle" className="btn" onClick={() => setTheme((curr) => (curr === 'light' ? 'dark' : 'light'))}>
              <i id="darkModeIcon" className={`navbar-icon fa-regular ${theme === 'dark' ? 'fa-moon' : 'fa-sun'}`}/>
            </button>
          </div>
        </div>
      </nav>
    </div>
  )
}
