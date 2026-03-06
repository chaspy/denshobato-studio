import { describe, it, expect } from 'vitest';
import { jsxTransform } from '../jsx-transform.js';

describe('jsxTransform', () => {
  it('adds data-denshobato attributes to JSX elements', () => {
    const code = `
import React from 'react';
function App() {
  return <div className="app"><h1>Hello</h1></div>;
}
`;
    const result = jsxTransform(code, '/src/App.tsx');
    expect(result).not.toBeNull();
    expect(result!.code).toContain('data-denshobato-file="/src/App.tsx"');
    expect(result!.code).toContain('data-denshobato-line=');
  });

  it('skips files without JSX', () => {
    const code = 'const x = 1;';
    const result = jsxTransform(code, '/src/utils.ts');
    expect(result).toBeNull();
  });

  it('does not add duplicate attributes', () => {
    const code = `
function App() {
  return <div data-denshobato-file="already-set">Hello</div>;
}
`;
    const result = jsxTransform(code, '/src/App.tsx');
    // The div already has the attribute, so it should be skipped
    // But other elements would still be processed
    expect(result).toBeNull();
  });

  it('handles TypeScript JSX', () => {
    const code = `
interface Props { name: string }
function Greeting({ name }: Props) {
  return <span>{name}</span>;
}
`;
    const result = jsxTransform(code, '/src/Greeting.tsx');
    expect(result).not.toBeNull();
    expect(result!.code).toContain('data-denshobato-file');
  });
});
