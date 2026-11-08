import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const parser = require('@babel/parser');

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'android', 'ios', 'dist', 'build'].includes(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

const issues = [];
let currentFile = '';

function visit(node, ancestors = []) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const n of node) visit(n, ancestors);
    return;
  }
  if (node.type === 'AwaitExpression') {
    let fn = null;
    for (let i = ancestors.length - 1; i >= 0; i--) {
      const a = ancestors[i];
      if (
        a.type === 'FunctionDeclaration' ||
        a.type === 'FunctionExpression' ||
        a.type === 'ArrowFunctionExpression' ||
        a.type === 'ObjectMethod' ||
        a.type === 'ClassMethod' ||
        a.type === 'ClassPrivateMethod'
      ) {
        fn = a;
        break;
      }
    }
    if (!fn) {
      issues.push({
        file: currentFile,
        line: node.loc?.start.line,
        kind: 'top-level-await',
        detail: 'await outside any function',
      });
    } else if (!fn.async) {
      const name =
        fn.id?.name || fn.key?.name || (fn.type === 'ArrowFunctionExpression' ? '<arrow>' : fn.type);
      issues.push({
        file: currentFile,
        line: node.loc?.start.line,
        kind: 'await-in-sync',
        detail: `await inside non-async ${fn.type} (${name})`,
      });
    }
  }
  const next = ancestors.concat(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'range' || key === 'errors') continue;
    const val = node[key];
    if (val && typeof val === 'object') visit(val, next);
  }
}

const root = path.resolve('src');
for (const file of walk(root)) {
  currentFile = file;
  const code = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'classProperties', 'decorators-legacy'],
      errorRecovery: true,
    });
  } catch (e) {
    issues.push({ file, line: e.loc?.line, kind: 'parse-error', detail: e.message });
    continue;
  }
  for (const err of ast.errors || []) {
    issues.push({ file, line: err.loc?.line, kind: 'parse-error', detail: err.message });
  }
  visit(ast.program, []);
}

for (const i of issues) {
  console.log(`${i.kind}\t${i.file}:${i.line || '?'}\t${i.detail}`);
}
console.log(`TOTAL\t${issues.length}`);
