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
        fecha: '12/10/2026, 19:00:00',
        blue: ['Shiro'], red: ['Ana'], ganador: 'blue', comodinAutista: ['Shiro'],
        blueData: [{ name: 'Shiro', champion: 'Yasuo', image: null }],
        redData: [{ name: 'Ana', champion: 'Ahri', image: null }]
    },
    {
        fecha: '12/10/2026, 18:00:00',
        blue: ['Shiro', 'Ana'], red: ['Maku'], ganador: 'blue',
        blueData: [{ name: 'Shiro', champion: 'Ahri', image: null }, { name: 'Ana', champion: 'Lux', image: null }],
        redData: [{ name: 'Maku', champion: 'Garen', image: null }]
    },
    {
        fecha: '12/10/2026, 17:00:00',
        blue: ['Ana'], red: ['Shiro', 'Maku'], ganador: 'red',
        blueData: [{ name: 'Ana', champion: 'Garen', image: null }],
        redData: [{ name: 'Shiro', champion: 'Ahri', image: null }, { name: 'Maku', champion: 'Lux', image: null }]
    },
    {
        fecha: '12/10/2026, 16:00:00',
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
    'escaparHTML',
    'datosJugadoresDePartida',
    'estaJugadorExentoEnPartida',
    'obtenerEstadisticasRecientesJugador',
    'obtenerHistorialCampeonesJugador',
    'renderPlayerStats',
    'obtenerCampeonesGlobales',
    'normalizarPreguntaAnalisis',
    'generarRespuestaAnalisis'
].map(getFunction).join('\n');

const jugadoresDb = {
    Shiro: { games: 3, w: 2, m: 1, level: 5 },
    Maku: { games: 3, w: 1, m: 1, level: 4 },
    Ana: { games: 3, w: 1, m: 0, level: 3 }
};
const htmlContainer = { innerHTML: '' };
context.db = jugadoresDb;
context.document = { getElementById: id => id === 'player-stats-list' ? htmlContainer : null };

runInNewContext(functions + '\nglobalThis.__stats = obtenerEstadisticasRecientesJugador("Shiro");\nglobalThis.__history = obtenerHistorialCampeonesJugador("Shiro");\nglobalThis.__champions = obtenerCampeonesGlobales();\nglobalThis.__leaderAnswer = generarRespuestaAnalisis("¿Quién va liderando?");\nglobalThis.__championAnswer = generarRespuestaAnalisis("¿Qué campeón ha dado más victorias?");\nglobalThis.__mvpAnswer = generarRespuestaAnalisis("¿Quién tiene más MVP?");\nrenderPlayerStats();', context);

assert.equal(context.__stats.partidas, 3);
assert.equal(context.__history.length, 3,
    'Las partidas con comodín activo deben excluirse del historial individual de campeones.');
assert.deepEqual(
    Array.from(context.__history, entry => [entry.champion, entry.resultado, entry.lado, entry.fecha]),
    [
        ['Ahri', 'Victoria', 'blue', '12/10/2026, 18:00:00'],
        ['Ahri', 'Victoria', 'red', '12/10/2026, 17:00:00'],
        ['Lux', 'Derrota', 'blue', '12/10/2026, 16:00:00']
    ],
    'El historial debe enumerar los campeones jugados, con la fecha, resultado y equipo, del más reciente al más antiguo.'
);

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

const renderedStatsFunction = getFunction('renderPlayerStats');
assert.doesNotMatch(renderedStatsFunction, /jugador\.winRate|jugador\.w|jugador\.m|jugador\.games|jugador\.pts/,
    'La vista Personajes no debe repetir estadísticas de la tabla de ranking.');
assert.match(htmlContainer.innerHTML, /Ahri/);
assert.match(htmlContainer.innerHTML, /Historial de campeones|campeones distintos/);
assert.match(htmlContainer.innerHTML, /champion-history-result win/);
assert.match(html, /esJugadorPermitidoComodin\(name\) \? '<button type="button" class="comodin-toggle-button"/,
    'El emote de comodín solo debe crearse para jugadores permitidos por el editor.');
assert.doesNotMatch(html, /<h2>Estadísticas de jugadores<\/h2>/,
    'La sección debe enfocarse en el historial de campeones y no en repetir estadísticas.');

console.log('OK: player champion history, non-duplicated stats, and local analysis tests passed.');
