import React from 'react';
import { useStore } from '../store.js';
import { studioStyles as s } from '../styles.js';
import { getCopy } from '../i18n.js';

export function ModeBar() {
  const { language, setLanguage, thinkingMode, setThinkingMode } = useStore();
  const copy = getCopy(language);

  return (
    <div style={s.modeBar}>
      <div style={s.modeBarCopy}>
        <div style={s.modeEyebrow}>{copy.modeLabel}</div>
        <div style={s.modeTitle}>{copy.modeBadgeLabel[thinkingMode]}</div>
        <div style={s.modeDescription}>{copy.modeDescription[thinkingMode]}</div>
      </div>

      <div style={s.modeControls}>
        <div style={s.segmentGroup}>
          <span style={s.segmentLabel}>{copy.modeToggleLabel}</span>
          <div style={s.segmentedControl}>
            {(['standard', 'deep'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                style={thinkingMode === mode ? s.segmentBtnActive : s.segmentBtn}
                onClick={() => setThinkingMode(mode)}
                aria-pressed={thinkingMode === mode}
              >
                {copy.modeBadgeLabel[mode]}
              </button>
            ))}
          </div>
        </div>

        <div style={s.segmentGroup}>
          <span style={s.segmentLabel}>{copy.languageLabel}</span>
          <div style={s.segmentedControl}>
            {(['ja', 'en'] as const).map((nextLanguage) => (
              <button
                key={nextLanguage}
                type="button"
                style={language === nextLanguage ? s.segmentBtnActive : s.segmentBtn}
                onClick={() => setLanguage(nextLanguage)}
                aria-pressed={language === nextLanguage}
              >
                {copy.languageName[nextLanguage]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
