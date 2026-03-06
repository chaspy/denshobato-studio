import React from 'react';
import { useStore } from '../store.js';
import { studioStyles as s } from '../styles.js';
import { getCopy } from '../i18n.js';

export function ModeBar() {
  const { language, setSettingsOpen } = useStore();
  const copy = getCopy(language);

  return (
    <div style={s.topBar}>
      <div style={s.brandLockup}>
        <div style={s.brandMark} aria-hidden="true">
          D
        </div>
        <div style={s.brandText}>
          <div style={s.brandName}>{copy.appTitle}</div>
          <div style={s.brandSubtle}>{copy.aiOverlayLabel}</div>
        </div>
      </div>

      <button type="button" style={s.iconBtn} onClick={() => setSettingsOpen(true)} title={copy.settings}>
        &#9881;
      </button>
    </div>
  );
}
