import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useMatch } from 'react-router';
import en from './i18n/en.js';
import gu from './i18n/gu.js';
import JoinQueue from './JoinQueue.jsx';
import QueueStatus from './QueueStatus.jsx';
import Reception from './Reception.jsx';
import StaffLogin from './StaffLogin.jsx';
import TvDisplay from './TvDisplay.jsx';
import './styles.css';

const messages = { en, gu };
const languageKey = 'salon-language';
const themeKey = 'salon-theme';
const screens = [
  { key: 'home', path: '/' },
  { key: 'join', path: '/join' },
  { key: 'status', path: '/status/:id', preview: '/status/preview' },
  { key: 'reception', path: '/reception' },
  { key: 'barber', path: '/barber/:name', preview: '/barber/ravi' },
  { key: 'display', path: '/display' },
  { key: 'admin', path: '/admin' },
];

function Screen({ screen, copy }) {
  const { title, description } = copy[screen];
  return (
    <section className="panel">
      <h1 className="text-4xl leading-tight font-semibold md:text-6xl">{title}</h1>
      <p className="screen-description mt-4 max-w-xl text-lg">{description}</p>
      <p className="placeholder mt-8 w-fit rounded-full px-4 py-2 text-sm font-medium">
        {copy.placeholder}
      </p>
      {screen === 'home' && (
        <Link className="primary-link mt-8" to="/join">{copy.join.link}</Link>
      )}
    </section>
  );
}

function App() {
  const { key: locationKey } = useLocation();
  const tvRoute = useMatch('/display');
  const menuToggle = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [language, setLanguage] = useState(() =>
    localStorage.getItem(languageKey) === 'gu' ? 'gu' : 'en',
  );
  const [dark, setDark] = useState(() => {
    const preference = localStorage.getItem(themeKey);
    return preference ? preference === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const copy = messages[language];
  const languageSwitch = (
    <div className="language-switch" role="group" aria-label={copy.language}>
      <button type="button" lang="en" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>
        English
      </button>
      <button type="button" lang="gu" aria-pressed={language === 'gu'} onClick={() => setLanguage('gu')}>
        ગુજરાતી
      </button>
    </div>
  );

  useEffect(() => {
    setMenuOpen(false);
  }, [locationKey]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = copy.brand;
    localStorage.setItem(languageKey, language);
  }, [copy.brand, language]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem(themeKey, dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <div className={tvRoute ? 'tv-shell' : 'mx-auto max-w-6xl px-4 pb-10 sm:px-8'} onKeyDown={(event) => {
      if (event.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
        menuToggle.current?.focus();
      }
    }}>
      <header className="site-header flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] py-5">
        <Link to="/" className="brand-link inline-flex min-h-11 items-center gap-3 text-xl font-semibold">
          <span aria-hidden="true" className="brand-mark">✦</span>
          {copy.brand}
        </Link>
        {!tvRoute && (
          <div className="site-preferences flex flex-wrap items-center gap-2">
            {languageSwitch}
            <button type="button" className="theme-toggle" aria-pressed={dark} onClick={() => setDark(!dark)}>
              <span aria-hidden="true">☾</span> {copy.darkMode}
            </button>
          </div>
        )}
        <button className="mobile-nav-toggle" type="button" ref={menuToggle}
          aria-label={copy.menu} aria-controls="site-navigation" aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}>
          <span className="mobile-nav-icon" aria-hidden="true"><span /><span /><span /></span>
        </button>
      </header>
      <nav className="site-navigation flex flex-wrap gap-1 py-4" id="site-navigation"
        aria-label={copy.navigation} data-open={menuOpen}>
        {screens.map(({ key, path, preview }) => (
          <NavLink key={key} className="screen-link" to={preview ?? path} end onClick={() => setMenuOpen(false)}>
            {copy[key].link}
          </NavLink>
        ))}
      </nav>
      <main>
        <Routes>
          <Route path="/join" element={<JoinQueue copy={copy} language={language} />} />
          <Route path="/status/:id" element={<QueueStatus copy={copy} language={language} />} />
          <Route path="/reception" element={<Reception copy={copy} language={language} />} />
          <Route path="/login" element={<StaffLogin copy={copy} />} />
          <Route path="/display" element={<TvDisplay copy={copy} language={language} languageSwitch={languageSwitch} />} />
          {screens.filter(({ key }) => !['join', 'status', 'reception', 'display'].includes(key)).map(({ key, path }) => (
            <Route key={key} path={path} element={<Screen screen={key} copy={copy} />} />
          ))}
          <Route path="*" element={(
            <section className="panel">
              <h1 className="text-4xl font-semibold">{copy.missing.title}</h1>
              <Link className="primary-link mt-8" to="/">{copy.backHome}</Link>
            </section>
          )} />
        </Routes>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
