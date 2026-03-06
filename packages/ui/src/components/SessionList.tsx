import React, { useEffect } from 'react';
import { useStore } from '../store.js';
import { studioStyles as s } from '../styles.js';
import { getCopy } from '../i18n.js';

export function SessionList() {
  const { sessions, loadSessions, createSession, openSession, language, apiKey, setSettingsOpen } = useStore();
  const copy = getCopy(language);
  const hasApiKey = apiKey.trim().length > 0;

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return (
    <>
      <div style={s.header}>
        <span style={s.sectionTitle}>{copy.sessionsTitle}</span>
        <button style={s.btnAccent} onClick={createSession}>
          {copy.newSession}
        </button>
      </div>

      {!hasApiKey && (
        <div style={s.setupCard}>
          <div style={s.setupCardTitle}>{copy.apiKeyRequiredTitle}</div>
          <div style={s.setupCardDescription}>{copy.apiKeyRequiredDescription}</div>
          <button style={s.btnAccent} onClick={() => setSettingsOpen(true)}>
            {copy.openSettings}
          </button>
        </div>
      )}

      {sessions.length === 0 ? (
        <div style={s.emptyState}>
          <div style={{ fontSize: '32px' }}>&#x1f54a;</div>
          <div>{copy.emptySessionsTitle}</div>
          <div style={{ fontSize: '12px' }}>{copy.emptySessionsDescription}</div>
        </div>
      ) : (
        <div style={s.sessionsList}>
          {sessions.map((session) => (
            <div
              key={session.id}
              style={s.sessionItem}
              onClick={() => openSession(session.id)}
            >
              <div style={s.sessionItemTitle}>
                {session.title || copy.sessionLabel(session.id.slice(0, 8))}
              </div>
              <div style={s.sessionItemMeta}>
                {copy.sessionMeta(session.messageCount, session.changeCount, session.updatedAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
