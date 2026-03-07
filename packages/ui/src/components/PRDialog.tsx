import React, { useEffect, useState } from 'react';
import { useStore } from '../store.js';
import { studioStyles as s, colors } from '../styles.js';
import { getCopy } from '../i18n.js';

function createDefaultBranchName(sessionId: string | null): string {
  const suffix = sessionId ? sessionId.slice(0, 8) : `${Date.now()}`;
  return `denshobato/${suffix}`;
}

export function PRDialog() {
  const { setPRDialogOpen, createPR, loading, error, clearError, language, sessionId, sessions } = useStore();
  const activeSession = sessions.find((session) => session.id === sessionId);
  const [branchName, setBranchName] = useState(activeSession?.gitBranch || createDefaultBranchName(sessionId));
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const copy = getCopy(language);

  useEffect(() => {
    setBranchName(activeSession?.gitBranch || createDefaultBranchName(sessionId));
  }, [activeSession?.gitBranch, sessionId]);

  const handleSubmit = async () => {
    if (!title.trim() || !branchName.trim()) return;
    try {
      const url = await createPR({ title, body, branchName });
      setPrUrl(url);
    } catch {
      // handled in store
    }
  };

  return (
    <div style={s.dialogOverlay} onClick={() => setPRDialogOpen(false)}>
      <div style={s.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={s.dialogTitle}>{copy.createPR}</div>

        {prUrl ? (
          <div>
            <div style={{ color: colors.success, marginBottom: '12px' }}>{copy.prCreated}</div>
            <a href={prUrl} target="_blank" rel="noopener noreferrer" style={{ color: colors.accent }}>
              {prUrl}
            </a>
            <div style={s.dialogActions}>
              <button
                style={s.btnAccent}
                onClick={() => { setPRDialogOpen(false); setPrUrl(null); }}
              >
                {copy.close}
              </button>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div style={s.error}>
                <span>{error}</span>
                <button onClick={clearError} style={{ background: 'none', border: 'none', color: colors.danger, cursor: 'pointer' }}>&#x2715;</button>
              </div>
            )}

            <div style={s.dialogField}>
              <label style={s.dialogLabel}>{copy.branchName}</label>
              <input style={s.dialogInput} value={branchName} onChange={(e) => setBranchName(e.target.value)} />
            </div>
            <div style={s.dialogField}>
              <label style={s.dialogLabel}>{copy.title}</label>
              <input style={s.dialogInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={copy.prTitlePlaceholder} />
            </div>
            <div style={s.dialogField}>
              <label style={s.dialogLabel}>{copy.description}</label>
              <textarea style={s.dialogTextarea} value={body} onChange={(e) => setBody(e.target.value)} placeholder={copy.prBodyPlaceholder} />
            </div>

            <div style={s.dialogActions}>
              <button style={s.btn} onClick={() => setPRDialogOpen(false)}>{copy.cancel}</button>
              <button
                style={{ ...s.btnAccent, opacity: loading || !title.trim() ? 0.5 : 1 }}
                onClick={handleSubmit}
                disabled={loading || !title.trim()}
              >
                {loading ? copy.creating : copy.createPR}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
