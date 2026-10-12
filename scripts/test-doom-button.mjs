import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(
    html,
    /<a class="nav-link doom-nav-link" href="https:\/\/danborden1\.github\.io\/doom-web\/" target="_blank" rel="noopener noreferrer"/,
    'Debe existir un enlace estilizado como botón que abra el port de Doom en una pestaña nueva.'
);
assert.match(html, /<span class="nav-symbol">🎮<\/span><span>Jugar al Doom<\/span>/,
    'El botón debe llamarse exactamente «Jugar al Doom».');
assert.match(html, /https:\/\/danborden1\.github\.io\/doom-web\//,
    'El botón debe dirigir a la demo web de Doom.')
assert.match(html, /doom-nav-link[\s\S]*?Chocolate Doom y Freedoom/,
    'Debe identificar el port y sus datos de juego libres.');
assert.match(html, /href="https:\/\/github\.com\/danborden1\/doom-web"/,
    'El sitio debe facilitar el acceso al código fuente original.');

console.log('OK: el botón Jugar al Doom apunta a un port de navegador de código abierto.');
