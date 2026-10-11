import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('    function registrarVictoria(equipo) {');
const end = html.indexOf('    function abrirHistorial()', start);
assert.notEqual(start, -1, 'No se encontró registrarVictoria.');
assert.notEqual(end, -1, 'No se encontró el final de registrarVictoria.');
const functionSource = html.slice(start, end);

function runRegistration(winner) {
    const context = {
        partidaPendiente: true,
        comodinAutistaActivo: true,
        equiposActuales: { blue: ['gordi', 'Ana'], red: ['Biel', 'Carla'] },
        db: {
            gordi: { w: 2, m: 5, games: 8, level: 1 },
            Ana: { w: 4, m: 1, games: 10, level: 4 },
            Biel: { w: 3, m: 2, games: 9, level: 3 },
            Carla: { w: 6, m: 4, games: 12, level: 5 }
        },
        mvpActual: { blue: 'gordi', red: 'Carla' },
        mvpElegido: { blue: true, red: true },
        campeonesActuales: {
            blue: { gordi: { name: 'Ahri', image: null }, Ana: { name: 'Lux', image: null } },
            red: { Biel: { name: 'Garen', image: null }, Carla: { name: 'Jinx', image: null } }
        },
        historialPartidas: [],
        enteroNoNegativo(value) {
            const number = Number.parseInt(value, 10);
            return Number.isFinite(number) ? Math.max(0, number) : 0;
        },
        document: { getElementById: () => ({ style: { display: 'block' } }) },
        actualizarInterfaz() {},
        alert() {}
    };
    runInNewContext(functionSource + '\nglobalThis.__register = registrarVictoria;', context);
    context.__register(winner);
    return context;
}

for (const winner of ['blue', 'red']) {
    const context = runRegistration(winner);

    assert.deepEqual(
        { w: context.db.gordi.w, m: context.db.gordi.m, games: context.db.gordi.games },
        { w: 2, m: 5, games: 8 },
        'El comodín debe dejar intactas todas las estadísticas de Gordi tanto si gana como si pierde.'
    );
    assert.equal(context.db.Ana.games, 11);
    assert.equal(context.db.Biel.games, 10);
    assert.equal(context.db.Carla.games, 13);
    assert.equal(context.db.Carla.m, 5, 'El MVP del otro jugador sí debe contar.');
    assert.equal(context.db.Ana.w, 4 + (winner === 'blue' ? 1 : 0));
    assert.equal(context.db.Carla.w, 6 + (winner === 'red' ? 1 : 0));
    assert.equal(context.historialPartidas.length, 1);
    assert.equal(context.historialPartidas[0].comodinAutista, 'gordi');
    assert.equal(context.historialPartidas[0].mvpBlue, null, 'Gordi no debe quedar registrado como MVP de esa partida.');
    assert.equal(context.historialPartidas[0].mvpRed, 'Carla');
    assert.equal(context.comodinAutistaActivo, false, 'El comodín debe reiniciarse después de registrar la partida.');
    assert.equal(context.partidaPendiente, false);
}

console.log('OK: el Comodin de Autista excluye a Gordi de partidas, victorias y MVP sin afectar al resto.');
