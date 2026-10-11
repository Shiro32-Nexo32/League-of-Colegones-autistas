import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scriptBlocks = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
assert.equal(scriptBlocks.length, 1, 'Debe haber un script principal.');
const source = scriptBlocks[0][1];

function getFunction(name) {
    const start = source.indexOf('    function ' + name + '(');
    assert.notEqual(start, -1, 'No se encuentra la función ' + name);
    const next = source.indexOf('\n    function ', start + 5);
    return source.slice(start, next === -1 ? source.length : next);
}

const historialPartidas = [
    {
        blue: ['Shiro', 'Ana'], red: ['Maku'], ganador: 'blue',
        blueData: [{ name: 'Shiro', champion: 'Ahri', image: null }, { name: 'Ana', champion: 'Lux', image: null }],
        redData: [{ name: 'Maku', champion: 'Garen', image: null }]
    },
    {
        blue: ['Ana'], red: ['Shiro', 'Maku'], ganador: 'red',
        blueData: [{ name: 'Ana', champion: 'Garen', image: null }],
        redData: [{ name: 'Shiro', champion: 'Ahri', image: null }, { name: 'Maku', champion: 'Lux', image: null }]
    },
    {
        blue: ['Shiro'], red: ['Ana', 'Maku'], ganador: 'red',
        blueData: [{ name: 'Shiro', champion: 'Lux', image: null }],
        redData: [{ name: 'Ana', champion: 'Ahri', image: null }, { name: 'Maku', champion: 'Garen', image: null }]
    }
];

const ranking = [
    { name: 'Shiro', pts: 25, w: 2, m: 1, games: 3, winRate: 66.666 },
    { name: 'Maku', pts: 15, w: 1, m: 1, games: 3, winRate: 33.333 },
    { name: 'Ana', pts: 10, w: 1, m: 0, games: 3, winRate: 33.333 }
];

const context = {
    historialPartidas,
    obtenerRankingOrdenado: () => ranking,
    urlImagenCampeonSegura: () => null
};

const functions = [
    'datosJugadoresDePartida',
    'obtenerEstadisticasRecientesJugador',
    'obtenerCampeonesGlobales',
    'normalizarPreguntaAnalisis',
    'generarRespuestaAnalisis'
].map(getFunction).join('\n');

runInNewContext(functions + '\nglobalThis.__stats = obtenerEstadisticasRecientesJugador("Shiro");\nglobalThis.__champions = obtenerCampeonesGlobales();\nglobalThis.__leaderAnswer = generarRespuestaAnalisis("¿Quién va liderando?");\nglobalThis.__championAnswer = generarRespuestaAnalisis("¿Qué campeón ha dado más victorias?");\nglobalThis.__mvpAnswer = generarRespuestaAnalisis("¿Quién tiene más MVP?");', context);

assert.equal(context.__stats.partidas, 3);
assert.equal(context.__stats.victorias, 2);
assert.equal(Math.round(context.__stats.winRate), 67);
assert.equal(context.__stats.masJugado.name, 'Ahri');
assert.equal(context.__stats.masJugado.played, 2);
assert.equal(context.__stats.masVictorias.name, 'Ahri');
assert.equal(context.__stats.masVictorias.wins, 2);
assert.ok(context.__champions.some(champion => champion.name === 'Ahri' && champion.played === 3 && champion.wins === 3));
assert.match(context.__leaderAnswer, /Shiro/);
assert.match(context.__championAnswer, /Ahri/);
assert.match(context.__mvpAnswer, /Shiro/);

console.log('OK: player statistics and local analysis tests passed.');
