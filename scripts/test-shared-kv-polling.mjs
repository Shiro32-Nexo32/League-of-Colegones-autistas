import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(html, /let sharedQueryInFlight = false;/,
    'Debe existir una protección contra consultas solapadas al ranking.');
assert.match(html, /if \(sharedQueryInFlight\) return;/,
    'Una consulta no debe arrancar si ya hay otra en marcha.');
assert.match(html, /finally \{\s*sharedQueryInFlight = false;/,
    'La protección debe liberarse incluso cuando falla la petición.');

const start = html.indexOf('    function iniciarSincronizacionCompartida() {');
const end = html.indexOf('    async function init()', start);
assert.notEqual(start, -1, 'No se encontró iniciarSincronizacionCompartida.');
assert.notEqual(end, -1, 'No se encontró el final de la función de sincronización.');
const source = html.slice(start, end);

assert.match(source, /setInterval\(\(\) => \{\s*if \(document\.visibilityState === 'visible'\) \{\s*void consultarRankingCompartido\(\);\s*\}\s*\}, 60000\)/,
    'El intervalo periódico debe ser de 60 segundos y solo ejecutarse con la pestaña visible.');
assert.match(source, /document\.addEventListener\('visibilitychange',[\s\S]*?if \(document\.visibilityState === 'visible'\) \{\s*void consultarRankingCompartido\(\);/,
    'Al volver a una pestaña visible debe comprobar cambios remotos.');
assert.doesNotMatch(source, /15000/,
    'No debe mantenerse el sondeo frecuente anterior de 15 segundos.');

console.log('OK: sincronización compartida con sondeo de 60 s, pausado en segundo plano y consultas sin solapamiento.');
