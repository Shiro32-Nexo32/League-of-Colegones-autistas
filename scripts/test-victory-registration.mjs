import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('    function registrarVictoria(equipo) {');
const end = html.indexOf('    function abrirHistorial()', start);

assert.notEqual(start, -1, 'No se encontró registrarVictoria en index.html.');
assert.notEqual(end, -1, 'No se encontró el final de registrarVictoria.');
const functionSource = html.slice(start, end);

function runRegistration(winner) {
    let updates = 0;
    const context = {
        partidaPendiente: true,
        equiposActuales: { blue: ['Ana', 'Biel'], red: ['Carla', 'Dani'] },
        db: {
            Ana: { w: 2, m: 1, games: 5, level: 4 },
            Biel: { w: 1, m: 0, games: 4, level: 3 },
            Carla: { w: 0, m: 2, games: 3, level: 2 },
            Dani: { w: 3, m: 1, games: 6, level: 5 },
        },
        mvpActual: { blue: 'Ana', red: 'Carla' },
        historialPartidas: [],
        campeonesActuales: {
            blue: { Ana: { name: 'Ahri', image: null } },
            red: { Carla: { name: 'Lux', image: null } },
        },
        enteroNoNegativo(value) {
            const number = Number.parseInt(value, 10);
            return Number.isFinite(number) ? Math.max(0, number) : 0;
        },
        document: { getElementById: () => ({ style: { display: 'block' } }) },
        actualizarInterfaz() {
            updates += 1;
        },
        alert() {},
    };

    runInNewContext(functionSource + '\nglobalThis.__registrarVictoria = registrarVictoria;', context);
    context.__registrarVictoria(winner);
    context.__getUpdates = () => updates;
    return context;
}

const expectedGames = { Ana: 6, Biel: 5, Carla: 4, Dani: 7 };
const expectedWins = {
    blue: { Ana: 3, Biel: 2, Carla: 0, Dani: 3 },
    red: { Ana: 2, Biel: 1, Carla: 1, Dani: 4 },
};
const expectedMvp = { Ana: 2, Biel: 0, Carla: 3, Dani: 1 };
const expectedPoints = {
    blue: { Ana: 40, Biel: 20, Carla: 15, Dani: 35 },
    red: { Ana: 30, Biel: 10, Carla: 25, Dani: 45 },
};

for (const winner of ['blue', 'red']) {
    const context = runRegistration(winner);

    for (const name of Object.keys(expectedGames)) {
        assert.equal(context.db[name].games, expectedGames[name],
            name + ' debe sumar una partida, gane o pierda.');
        assert.equal(context.db[name].w, expectedWins[winner][name],
            name + ' solo debe sumar una victoria si pertenece al equipo ganador.');
        assert.equal(context.db[name].m, expectedMvp[name],
            name + ' debe recibir MVP únicamente si ha sido seleccionado.');
        assert.equal(context.db[name].w * 10 + context.db[name].m * 5, expectedPoints[winner][name],
            'La puntuación debe ser 10 por victoria y 5 por MVP para ' + name + '.');
    }

    assert.equal(context.historialPartidas.length, 1);
    assert.equal(context.historialPartidas[0].ganador, winner);
    assert.equal(context.historialPartidas[0].mvpBlue, 'Ana');
    assert.equal(context.historialPartidas[0].mvpRed, 'Carla');
    assert.equal(context.__getUpdates(), 1);
    assert.equal(context.partidaPendiente, false);

    const firstSnapshot = JSON.stringify({
        db: context.db,
        history: context.historialPartidas,
    });
    context.__registrarVictoria(winner);
    assert.equal(JSON.stringify({
        db: context.db,
        history: context.historialPartidas,
    }), firstSnapshot, 'Un segundo clic no debe sumar la misma victoria dos veces.');
}

console.log('OK: victorias, partidas, MVP, puntos, historial y protección contra doble registro.');
