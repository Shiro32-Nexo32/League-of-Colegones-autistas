import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const blocks = [...html.matchAll(/<script\\b[^>]*>([\\s\\S]*?)<\\/script>/gi)];

if (blocks.length !== 1) {
  throw new Error(`Expected one inline script in index.html, found ${blocks.length}.`);
}

new Script(blocks[0][1], { filename: 'index-inline.js' });
console.log('OK: inline JavaScript syntax is valid.');
