import type { Message } from './store.js';

export function deriveSessionTitle(messages: Array<Pick<Message, 'role' | 'content'>>): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== 'user') continue;

    const normalized = message.content.replace(/\s+/g, ' ').trim();
    if (!normalized) continue;

    return normalized.length > 48
      ? `${normalized.slice(0, 45).trimEnd()}...`
      : normalized;
  }

  return null;
}
