import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useMatch } from 'react-router';
import en from './i18n/en.js';
import gu from './i18n/gu.js';
import JoinQueue from './JoinQueue.jsx';
import Home from './Home.jsx';
import BarberView from './BarberView.jsx';
import OwnerSettings from './OwnerSettings.jsx';
import Preferences from './Preferences.jsx';
import QueueStatus from './QueueStatus.jsx';
import SavedQueueLinks from './SavedQueueLinks.jsx';
import Reception from './Reception.jsx';
import StaffLogin from './StaffLogin.jsx';
import StaffSetup from './StaffSetup.jsx';
import TvDisplay from './TvDisplay.jsx';
import { isSavedLinksEvent, loadSavedLinks, setSavedLink } from './savedQueueLinks.js';
import './styles.css';

const messages = { en, gu };
const languageKey = 'salon-language';
const themeKey = 'salon-theme';
const screens = [
  { key: 'home', path: '/' },
  { key: 'join', path: '/join' },
  { key: 'status', path: '/status' },
  { key: 'reception', path: '/reception' },
  { key: 'barber', path: '/barber' },
  { key: 'display', path: '/display' },
  { key: 'admin', path: '/admin' },
];

function preference(key, value) {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    else return localStorage.getItem(key);
  } catch {
    // Keep preferences usable in the current tab when storage is blocked.
  }
  return null;
}

function App() {
  const { key: locationKey } = useLocation();
  const tvRoute = useMatch('/display');
  const menuToggle = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [savedLinks, setSavedLinks] = useState(loadSavedLinks);
  const [language, setLanguage] = useState(() =>
    preference(languageKey) === 'gu' ? 'gu' : 'en',
  );
  const [dark, setDark] = useState(() => {
    const saved = preference(themeKey);
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const copy = messages[language];
  const preferences = (
    <Preferences copy={copy} language={language} dark={dark}
      onLanguage={setLanguage} onTheme={() => setDark((enabled) => !enabled)} />
  );

  function changeSavedLink(id, token, save) {
    try {
      setSavedLinks(setSavedLink(id, token, save));
      return true;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    function refreshLinks(event) {
      if (isSavedLinksEvent(event)) setSavedLinks(loadSavedLinks());
    }
    window.addEventListener('storage', refreshLinks);
    return () => window.removeEventListener('storage', refreshLinks);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [locationKey]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = copy.brand;
    preference(languageKey, language);
  }, [copy.brand, language]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    preference(themeKey, dark ? 'dark' : 'light');
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
        {!tvRoute && <div className="site-preferences">{preferences}</div>}
        <button className="mobile-nav-toggle" type="button" ref={menuToggle}
          aria-label={copy.menu} aria-controls="site-navigation" aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}>
          <span className="mobile-nav-icon" aria-hidden="true"><span /><span /><span /></span>
        </button>
      </header>
      <nav className="site-navigation flex flex-wrap gap-1 py-4" id="site-navigation"
        aria-label={copy.navigation} data-open={menuOpen}>
        {screens.map(({ key, path }) => (
          <NavLink key={key} className="screen-link" to={path} end={!['barber', 'status'].includes(key)} onClick={() => setMenuOpen(false)}>
            {copy[key].link}
          </NavLink>
        ))}
        <div className="mobile-preferences">{preferences}</div>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Home copy={copy} language={language} />} />
          <Route path="/join" element={<JoinQueue copy={copy} language={language} />} />
          <Route path="/status" element={<SavedQueueLinks links={savedLinks}
            onRemove={(id) => changeSavedLink(id, null, false)} copy={copy} language={language} />} />
          <Route path="/status/:id" element={<QueueStatus copy={copy} language={language}
            links={savedLinks} onSave={changeSavedLink} />} />
          <Route path="/reception" element={<Reception copy={copy} language={language} />} />
          <Route path="/barber/:name?" element={<BarberView copy={copy} language={language} />} />
          <Route path="/login" element={<StaffLogin copy={copy} />} />
          <Route path="/setup/:token" element={<StaffSetup copy={copy} />} />
          <Route path="/display" element={<TvDisplay copy={copy} language={language} preferences={preferences} />} />
          <Route path="/admin" element={<OwnerSettings copy={copy} language={language} />} />
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
