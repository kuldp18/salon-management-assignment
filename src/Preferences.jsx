export default function Preferences({ copy, language, dark, onLanguage, onTheme }) {
  const languageLabel = language === 'en' ? copy.switchGujarati : copy.switchEnglish;
  const themeLabel = dark ? copy.lightMode : copy.darkMode;

  return (
    <div className="preference-controls">
      <button className="preference-button" type="button" aria-label={languageLabel} title={languageLabel}
        onClick={() => onLanguage(language === 'en' ? 'gu' : 'en')}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 5h12M8 3v2M4 5c1 4 4 7 8 9M12 5c-1 5-5 8-9 10m10 6 4-9 4 9m-6.8-3h5.6" />
        </svg>
        <span aria-hidden="true">{copy.languageMark}</span>
      </button>
      <button className="preference-button theme-toggle" type="button" aria-label={themeLabel} title={themeLabel}
        onClick={onTheme}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          {dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>
            : <path d="M20.8 14.2A8.8 8.8 0 0 1 9.8 3.1a8.9 8.9 0 1 0 11 11.1Z" />}
        </svg>
      </button>
    </div>
  );
}
