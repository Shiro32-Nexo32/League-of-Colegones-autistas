import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('    function crearCombinaciones(array, cantidad) {');
const end = html.indexOf('    let seleccionados = [];', start);

assert.notEqual(start, -1, 'No se encontró crearCombinaciones en index.html.');
assert.notEqual(end, -1, 'No se encontró el final del bloque de sorteo.');
const source = html.slice(start, end);

const levels = { A: 3, B: 3, C: 3, D: 3, E: 3 };
let randomCalls = 0;
const math = {
    floor: Math.floor,
    abs: Math.abs,
    random: () => ((randomCalls++ % 101) / 101)
};
const context = {
    Math: math,
    nivelJugador: name => levels[name]
};
runInNewContext(
    source + '\nglobalThis.testPrepararEquiposImpares = prepararEquiposImpares;',
    context
);

const players = ['A', 'B', 'C', 'D', 'E'];
const observedPairs = new Set();

for (let i = 0; i < 250; i++) {
    const teams = context.testPrepararEquiposImpares(players);
    assert.equal(teams.blue.length + teams.red.length, players.length);
    assert.deepEqual(
        [teams.blue.length, teams.red.length].sort(),
        [2, 3],
        'Con cinco jugadores, un equipo debe tener dos jugadores y el otro tres.'
    );
    assert.equal(new Set([...teams.blue, ...teams.red]).size, players.length, 'No debe duplicar jugadores.');

    const smallTeam = teams.blue.length === 2 ? teams.blue : teams.red;
    observedPairs.add([...smallTeam].sort().join('|'));
}

assert.equal(
    observedPairs.size,
    10,
    'Con cinco jugadores de idéntico nivel, las diez parejas son igual de óptimas y deben poder elegirse.'
);

const balancedLevels = { A: 5, B: 5, C: 4, D: 3, E: 1 };
for (const [name, level] of Object.entries(balancedLevels)) levels[name] = level;

const observedOptimalPairs = new Set();
randomCalls = 0;
for (let i = 0; i < 100; i++) {
    const teams = context.testPrepararEquiposImpares(players);
    const smallTeam = teams.blue.length === 2 ? teams.blue : teams.red;
    observedOptimalPairs.add([...smallTeam].sort().join('|'));
}

assert.deepEqual(
    [...observedOptimalPairs].sort(),
    ['A|C', 'B|C'],
    'Si existe un empate óptimo de diferencia cero, se deben elegir ambas combinaciones y no otras.'
);

console.log('OK: el sorteo impar conserva equipos disjuntos y explora todos los empates óptimos.');
