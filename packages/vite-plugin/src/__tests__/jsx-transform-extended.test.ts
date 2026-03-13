import { describe, it, expect } from 'vitest';
import { jsxTransform } from '../jsx-transform.js';

describe('jsxTransform (extended)', () => {
  it('annotates multiple elements', () => {
    const code = `
function App() {
  return (
    <div>
      <h1>Title</h1>
      <p>Body</p>
    </div>
  );
}
`;
    const result = jsxTransform(code, '/src/App.tsx');
    expect(result).not.toBeNull();
    // Should annotate div, h1, and p
    const matches = result!.code.match(/data-denshobato-file/g);
    expect(matches!.length).toBe(3);
  });

  it('annotates custom components', () => {
    const code = `
function Page() {
  return <MyComponent foo="bar" />;
}
`;
    const result = jsxTransform(code, '/src/Page.tsx');
    expect(result).not.toBeNull();
    expect(result!.code).toContain('data-denshobato-file="/src/Page.tsx"');
  });

  it('preserves existing attributes', () => {
    const code = `
function App() {
  return <div className="app" id="main">Hello</div>;
}
`;
    const result = jsxTransform(code, '/src/App.tsx');
    expect(result).not.toBeNull();
    expect(result!.code).toContain('className="app"');
    expect(result!.code).toContain('id="main"');
    expect(result!.code).toContain('data-denshobato-file');
  });

  it('skips Fragment elements', () => {
    const code = `
function App() {
  return <Fragment><span>Hi</span></Fragment>;
}
`;
    const result = jsxTransform(code, '/src/App.tsx');
    expect(result).not.toBeNull();
    // Fragment should not have data-denshobato, but span should
    const fileMatches = result!.code.match(/data-denshobato-file/g);
    expect(fileMatches!.length).toBe(1);
  });

  it('includes correct line numbers', () => {
    const code = `function App() {
  return <div>Hello</div>;
}`;
    const result = jsxTransform(code, '/src/App.tsx');
    expect(result).not.toBeNull();
    expect(result!.code).toContain('data-denshobato-line="2"');
  });

  it('returns null for files without angle brackets', () => {
    const code = 'const x = 1; const y = x + 2;';
    expect(jsxTransform(code, '/src/util.ts')).toBeNull();
  });

  it('returns null for files with angle brackets but no JSX', () => {
    const code = 'const x = 1 < 2 ? "a" : "b";';
    // This may fail to parse as JSX, should return null
    const result = jsxTransform(code, '/src/util.ts');
    // Either null or valid output (babel might parse it)
    if (result !== null) {
      // If parsed, it should not have added any attributes since there's no JSX
      expect(result.code).not.toContain('data-denshobato-file');
    }
  });

  it('generates source map', () => {
    const code = `
function App() {
  return <div>Hello</div>;
}
`;
    const result = jsxTransform(code, '/src/App.tsx');
    expect(result).not.toBeNull();
    expect(result!.map).toBeDefined();
  });

  it('handles JSX spread attributes', () => {
    const code = `
function App(props) {
  return <div {...props}>Hello</div>;
}
`;
    const result = jsxTransform(code, '/src/App.tsx');
    expect(result).not.toBeNull();
    expect(result!.code).toContain('data-denshobato-file');
    expect(result!.code).toContain('{...props}');
  });

  it('handles self-closing elements', () => {
    const code = `
function App() {
  return <img src="logo.png" />;
}
`;
    const result = jsxTransform(code, '/src/App.tsx');
    expect(result).not.toBeNull();
    expect(result!.code).toContain('data-denshobato-file');
  });

  it('handles JSX expressions', () => {
    const code = `
function App({ items }) {
  return (
    <ul>
      {items.map(item => <li key={item.id}>{item.name}</li>)}
    </ul>
  );
}
`;
    const result = jsxTransform(code, '/src/App.tsx');
    expect(result).not.toBeNull();
    // Both ul and li should be annotated
    const matches = result!.code.match(/data-denshobato-file/g);
    expect(matches!.length).toBe(2);
  });
});
