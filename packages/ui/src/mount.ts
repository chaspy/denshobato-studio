import React from 'react';
import { createRoot } from 'react-dom/client';
import { DenshobatoStudio } from './components/DenshobatoStudio.js';

export function mountDenshobatoStudio(container?: HTMLElement): void {
  const target = container || document.getElementById('root');
  if (!target) {
    console.error('[denshobato] No mount target found');
    return;
  }

  const root = createRoot(target);
  root.render(React.createElement(DenshobatoStudio));
}
