import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store.js';
import { studioStyles as s, colors } from '../styles.js';
import { getCopy } from '../i18n.js';

export function ChatPane() {
  const {
    messages, loading, error, selectedElement, sessionId,
    sendMessage, clearError, setView,
    clearSelectedElement, revertMessage, setPRDialogOpen, language, thinkingMode,
    setThinkingMode, apiKey, setSettingsOpen,
  } = useStore();
  const copy = getCopy(language);
  const hasApiKey = apiKey.trim().length > 0;

  const [input, setInput] = useState('');
  const [showModeInfo, setShowModeInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!hasApiKey) return;
    inputRef.current?.focus();
  }, [selectedElement, hasApiKey]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    if (!hasApiKey) {
      setSettingsOpen(true);
      return;
    }
    setInput('');
    sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasChanges = messages.some((m) => m.patches && m.patches.length > 0);

  return (
    <>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button style={s.backBtn} onClick={() => setView('sessions')} title={copy.backToSessions}>
            &#8592;
          </button>
          <span style={s.logo}>
            {sessionId ? copy.sessionLabel(sessionId.slice(0, 8)) : copy.newSessionTitle}
          </span>
        </div>
        <div style={s.headerActions}>
          {hasChanges && (
            <button style={s.btn} onClick={() => setPRDialogOpen(true)}>
              {copy.createPR}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={s.error}>
          <span>{error}</span>
          <button onClick={clearError} style={{ background: 'none', border: 'none', color: colors.danger, cursor: 'pointer' }}>
            &#x2715;
          </button>
        </div>
      )}

      {/* Messages */}
      <div style={s.messages}>
        {messages.length === 0 && !loading && (
          <div style={s.emptyState}>
            <div style={{ fontSize: '24px' }}>&#x1f4ac;</div>
            <div>{copy.emptyChatTitle}</div>
            <div style={{ fontSize: '12px' }}>
              {copy.emptyChatDescription}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.context && (
              <div style={msg.role === 'user' ? { ...s.msgContext, alignSelf: 'flex-end', textAlign: 'right' as const } : s.msgContext}>
                &#x1f4cd; {msg.context.tagName} &mdash; {msg.context.file}:{msg.context.line}
              </div>
            )}
            <div style={msg.role === 'user' ? s.userMsg : s.assistantMsg}>
              {msg.content}
              {msg.patches && msg.patches.length > 0 && (
                <div style={s.msgPatches}>
                  {msg.patches.map((p, i) => (
                    <div key={i}>&#x1f4dd; {p.file}</div>
                  ))}
                  <button
                    style={s.msgRevert}
                    onClick={() => revertMessage(msg.id)}
                    disabled={loading}
                  >
                    {copy.revert}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={s.loading}>{copy.thinking[thinkingMode]}</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Selected element badge */}
      {selectedElement && (
        <div style={s.selectedBadge}>
          <span style={{ flex: 1 }}>
            &#x1f4cd; {copy.selectedElement}: {copy.selectedContext(
              selectedElement.tagName,
              selectedElement.file,
              selectedElement.line,
            )}
          </span>
          <button
            onClick={clearSelectedElement}
            style={{ background: 'none', border: 'none', color: colors.accent, cursor: 'pointer', fontSize: '14px' }}
          >
            &#x2715;
          </button>
        </div>
      )}

      {/* Input */}
      {!hasApiKey && (
        <div style={s.lockedNotice}>
          <div style={s.lockedNoticeTitle}>{copy.apiKeyRequiredTitle}</div>
          <div style={s.lockedNoticeDescription}>{copy.apiKeyRequiredDescription}</div>
          <button style={s.btnAccent} onClick={() => setSettingsOpen(true)}>
            {copy.openSettings}
          </button>
        </div>
      )}

      <div style={s.inputArea}>
        <textarea
          ref={inputRef}
          style={s.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !hasApiKey
              ? copy.chatLockedPlaceholder
              : selectedElement
                ? copy.describeSelectedElement
                : copy.describeChange
          }
          disabled={loading || !hasApiKey}
          rows={1}
        />
        <button
          type="button"
          style={thinkingMode === 'deep' ? s.modeIconBtnActive : s.modeIconBtn}
          onClick={() => setThinkingMode(thinkingMode === 'deep' ? 'standard' : 'deep')}
          title={copy.modeInfoTitle}
          aria-pressed={thinkingMode === 'deep'}
        >
          &#129504;
        </button>
        <div style={s.infoWrap}>
          <button
            type="button"
            style={s.modeInfoBtn}
            onClick={() => setShowModeInfo((value) => !value)}
            title={copy.info}
            aria-pressed={showModeInfo}
            aria-label={copy.info}
          >
            &#9432;
          </button>
          {showModeInfo && (
            <div style={s.modeInfoPopover}>
              <div style={s.modeInfoPopoverTitle}>{copy.modeInfoTitle}</div>
              <div style={s.modeInfoPopoverBody}>{copy.modeInfoDescription[thinkingMode]}</div>
            </div>
          )}
        </div>
        <button
          style={{ ...s.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1 }}
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          {copy.send}
        </button>
      </div>
    </>
  );
}
