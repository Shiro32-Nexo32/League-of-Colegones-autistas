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
            this.updated = (this.updated || 0) + 1;
        },
        alert(message) {
            this.lastAlert = message;
        },
    };

    runInNewContext(functionSource + '\nglobalThis.__registrarVictoria = registrarVictoria;', context);
    context.__registrarVictoria(winner);
    return context;
}

for (const winner of ['blue', 'red']) {
    const context = runRegistration(winner);
    const stats = context.db;

    for (const name of ['Ana', 'Biel', 'Carla', 'Dani']) {
        assert.equal(stats[name].games, ({ Ana: 6, Biel: 5, Carla: 4, Dani: 7 })[name],
            'Cada participante debe sumar exactamente una partida.');
    }

    const winners = context.equiposActuales[winner];
    const losers = context.equiposActuales[winner === 'blue' ? 'red' : 'blue'];
    for (const name of winners) assert.equal(stats[name].w, ({ Ana: 3, Biel: 2, Carla: 0, Dani: 3 })[name] + (['Ana', 'Biel'].includes(name) && winner === 'red' ? 0 : 0) ,
        'placeholder');
}
