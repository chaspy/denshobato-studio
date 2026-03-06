import React, { useEffect } from 'react';
import { useStore } from '../store.js';
import { studioStyles as s } from '../styles.js';
import { getCopy } from '../i18n.js';

export function SessionList() {
  const { sessions, loadSessions, createSession, openSession, language } = useStore();
  const copy = getCopy(language);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return (
    <>
      <div style={s.header}>
        <span style={s.logo}>{copy.appTitle}</span>
        <button style={s.btnAccent} onClick={createSession}>
          {copy.newSession}
        </button>
      </div>

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
                {copy.sessionLabel(session.id.slice(0, 8))}
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
