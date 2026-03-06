import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
import * as t from '@babel/types';
import { relative } from 'node:path';

// Handle CJS/ESM interop for babel packages
const traverse = (typeof _traverse === 'function' ? _traverse : (_traverse as { default: typeof _traverse }).default) as typeof _traverse;
const generate = (typeof _generate === 'function' ? _generate : (_generate as { default: typeof _generate }).default) as typeof _generate;

export function jsxTransform(
  code: string,
  id: string,
): { code: string; map?: unknown } | null {
  // Skip if no JSX
  if (!code.includes('<')) return null;

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      sourceFilename: id,
    });

    let modified = false;

    traverse(ast, {
      JSXOpeningElement(path) {
        // Skip fragments
        if (t.isJSXIdentifier(path.node.name) && path.node.name.name === 'Fragment') {
          return;
        }
        // Skip if already has denshobato attributes
        const hasAttr = path.node.attributes.some(
          (attr) =>
            t.isJSXAttribute(attr) &&
            t.isJSXIdentifier(attr.name) &&
            attr.name.name.startsWith('data-denshobato'),
        );
        if (hasAttr) return;

        // Only annotate user-defined components (capitalized) and HTML elements
        const name = t.isJSXIdentifier(path.node.name) ? path.node.name.name : null;
        if (!name) return;

        const loc = path.node.loc;
        if (!loc) return;

        // Add data-denshobato-file attribute
        path.node.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier('data-denshobato-file'),
            t.stringLiteral(id),
          ),
        );

        // Add data-denshobato-line attribute
        path.node.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier('data-denshobato-line'),
            t.stringLiteral(String(loc.start.line)),
          ),
        );

        modified = true;
      },
    });

    if (!modified) return null;

    const output = generate(ast, {
      sourceMaps: true,
      sourceFileName: id,
    }, code);

    return { code: output.code, map: output.map };
  } catch {
    // If parsing fails, return original code
    return null;
  }
}
