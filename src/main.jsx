import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router';
import en from './i18n/en.js';
import gu from './i18n/gu.js';
import JoinQueue from './JoinQueue.jsx';
import QueueStatus from './QueueStatus.jsx';
import Reception from './Reception.jsx';
import StaffLogin from './StaffLogin.jsx';
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
  const display = screen === 'display';

  return (
    <section className={display ? 'panel panel-tv' : 'panel'}>
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
  const [language, setLanguage] = useState(() =>
    localStorage.getItem(languageKey) === 'gu' ? 'gu' : 'en',
  );
  const [dark, setDark] = useState(() => {
    const preference = localStorage.getItem(themeKey);
    return preference ? preference === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const copy = messages[language];

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
    <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] py-5">
        <Link to="/" className="brand-link inline-flex min-h-11 items-center gap-3 text-xl font-semibold">
          <span aria-hidden="true" className="brand-mark">✦</span>
          {copy.brand}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <div className="language-switch" role="group" aria-label={copy.language}>
            <button type="button" lang="en" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>
              English
            </button>
            <button type="button" lang="gu" aria-pressed={language === 'gu'} onClick={() => setLanguage('gu')}>
              ગુજરાતી
            </button>
          </div>
          <button type="button" className="theme-toggle" aria-pressed={dark} onClick={() => setDark(!dark)}>
            <span aria-hidden="true">☾</span> {copy.darkMode}
          </button>
        </div>
      </header>
      <nav className="flex flex-wrap gap-1 py-4" aria-label={copy.navigation}>
        {screens.map(({ key, path, preview }) => (
          <NavLink key={key} className="screen-link" to={preview ?? path} end>
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
          {screens.filter(({ key }) => !['join', 'status', 'reception'].includes(key)).map(({ key, path }) => (
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
