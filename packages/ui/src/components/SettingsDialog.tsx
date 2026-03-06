import React, { useEffect, useState } from 'react';
import { useStore } from '../store.js';
import { studioStyles as s } from '../styles.js';
import { getCopy, type Language } from '../i18n.js';

export function SettingsDialog() {
  const { settingsOpen, setSettingsOpen, apiKey, setApiKey, language, setLanguage } = useStore();
  const [draftApiKey, setDraftApiKey] = useState(apiKey);
  const [draftLanguage, setDraftLanguage] = useState<Language>(language);
  const copy = getCopy(draftLanguage);

  useEffect(() => {
    if (!settingsOpen) return;
    setDraftApiKey(apiKey);
    setDraftLanguage(language);
  }, [settingsOpen, apiKey, language]);

  const handleSave = () => {
    setApiKey(draftApiKey);
    setLanguage(draftLanguage);
    setSettingsOpen(false);
  };

  if (!settingsOpen) return null;

  return (
    <div style={s.dialogOverlay} onClick={() => setSettingsOpen(false)}>
      <div style={s.dialog} onClick={(event) => event.stopPropagation()}>
        <div style={s.dialogTitle}>{copy.settingsTitle}</div>
        <div style={s.dialogDescription}>{copy.settingsDescription}</div>

        <div style={s.dialogField}>
          <label style={s.dialogLabel}>{copy.apiKeyLabel}</label>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            style={s.dialogInput}
            value={draftApiKey}
            onChange={(event) => setDraftApiKey(event.target.value)}
            placeholder={copy.apiKeyPlaceholder}
          />
          <div style={s.dialogHelp}>{copy.apiKeyHelp}</div>
        </div>

        <div style={s.dialogField}>
          <label style={s.dialogLabel}>{copy.languageLabel}</label>
          <div style={s.segmentedControl}>
            {(['ja', 'en'] as const).map((nextLanguage) => (
              <button
                key={nextLanguage}
                type="button"
                style={draftLanguage === nextLanguage ? s.segmentBtnActive : s.segmentBtn}
                onClick={() => setDraftLanguage(nextLanguage)}
                aria-pressed={draftLanguage === nextLanguage}
              >
                {copy.languageName[nextLanguage]}
              </button>
            ))}
          </div>
        </div>

        <div style={s.dialogActions}>
          <button style={s.btn} onClick={() => setSettingsOpen(false)}>
            {copy.cancel}
          </button>
          <button style={s.btnAccent} onClick={handleSave}>
            {copy.saveSettings}
          </button>
        </div>
      </div>
    </div>
  );
}
