import React from 'react';
import { useStore } from '../store.js';
import { studioStyles as s } from '../styles.js';
import { SessionList } from './SessionList.js';
import { ChatPane } from './ChatPane.js';
import { PreviewPane } from './PreviewPane.js';
import { PRDialog } from './PRDialog.js';
import { ModeBar } from './ModeBar.js';
import { SettingsDialog } from './SettingsDialog.js';

export function DenshobatoStudio() {
  const { view, prDialogOpen, settingsOpen } = useStore();

  return (
    <div style={s.root}>
      {/* Left pane */}
      <div style={s.leftPane}>
        <ModeBar />
        {view === 'sessions' ? <SessionList /> : <ChatPane />}
      </div>

      {/* Right pane - Preview */}
      <PreviewPane />

      {/* PR Dialog */}
      {prDialogOpen && <PRDialog />}
      {settingsOpen && <SettingsDialog />}
    </div>
  );
}
