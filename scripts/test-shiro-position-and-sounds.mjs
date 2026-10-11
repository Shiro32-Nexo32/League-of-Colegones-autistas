import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('    function colocarJugadorEnPrimerasLineas(');
const end = html.indexOf('    let seleccionados = [];', start);
assert.notEqual(start, -1, 'No se encontró la función que prioriza la línea de Shiro.');
assert.notEqual(end, -1, 'No se encontró el final de la función para ordenar a Shiro.');

let randomCalls = 0;
const math = {
    floor: Math.floor,
    random: () => ((randomCalls++ % 101) / 101)
};
const context = { Math: math };
runInNewContext(
    html.slice(start, end) + '\nglobalThis.testColocarShiro = colocarJugadorEnPrimerasLineas;',
    context
);

const posicionesObservadas = new Set();
const equipoBase = ['A', 'B', 'Shiro', 'C', 'D'];
for (let i = 0; i < 200; i++) {
    const equipo = Array.from(context.testColocarShiro(equipoBase));
    const posicion = equipo.indexOf('Shiro');
    assert.notEqual(posicion, -1, 'Shiro no debe desaparecer del equipo.');
    assert.ok(posicion < equipo.length - 1, 'Shiro nunca debe quedar en la última línea si el equipo tiene más de un jugador.');
    assert.deepEqual(
        equipo.filter(nombre => nombre !== 'Shiro'),
        ['A', 'B', 'C', 'D'],
        'Mover a Shiro no debe alterar el orden relativo de sus compañeros.'
    );
    posicionesObservadas.add(posicion);
}
assert.deepEqual([...posicionesObservadas].sort(), [0, 1, 2, 3],
    'La posición de Shiro debe variar aleatoriamente por las primeras líneas, excluyendo la última.');

assert.deepEqual(
    Array.from(context.testColocarShiro(['A', 'Shiro'])),
    ['Shiro', 'A'],
    'Con dos jugadores, Shiro debe ir en la primera línea.'
);
assert.deepEqual(
    Array.from(context.testColocarShiro(['A', 'B'])),
    ['A', 'B'],
    'Si Shiro no participa, el orden del equipo no debe cambiar.'
);
assert.deepEqual(
    Array.from(context.testColocarShiro(['Shiro'])),
    ['Shiro'],
    'Un equipo de una sola persona conserva su única línea posible.'
);

const sorteoStart = html.indexOf('    async function lanzarSorteoSequencial() {');
const sorteoEnd = html.indexOf('    function remakePartida()', sorteoStart);
assert.notEqual(sorteoStart, -1);
const sorteoSource = html.slice(sorteoStart, sorteoEnd);
assert.match(sorteoSource, /blueSide = colocarJugadorEnPrimerasLineas\(blueSide, 'Shiro'\);/);
assert.match(sorteoSource, /redSide = colocarJugadorEnPrimerasLineas\(redSide, 'Shiro'\);/);

assert.doesNotMatch(html, /assets\.mixkit\.co\/active_storage\/sfx/,
    'El sorteo ya no debe reproducir los efectos externos estridentes.');
assert.match(html, /function reproducirTonoSuave\(/);
assert.match(html, /function playTick\(\)[\s\S]*?reproducirTonoSuave\(440 \+ Math\.random\(\) \* 55, 0\.04, 0\.006\)/);
assert.match(html, /function playBoom\(\)[\s\S]*?reproducirTonoSuave\(523\.25, 0\.13, 0\.018\)/);
assert.match(html, /prepararSonidosSuaves\(\);[\s\S]*?sorteoEnCurso = true;/);

console.log('OK: Shiro se sortea entre las primeras líneas y los sonidos del draft son tonos suaves.');
