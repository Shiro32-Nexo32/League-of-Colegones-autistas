import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('    function registrarVictoria(equipo) {');
const end = html.indexOf('    function abrirHistorial()', start);
assert.notEqual(start, -1, 'No se encontró registrarVictoria.');
assert.notEqual(end, -1, 'No se encontró el final de registrarVictoria.');
const functionSource = html.slice(start, end);

function runRegistration(winner, comodinJugador = 'gordi') {
    const context = {
        partidaPendiente: true,
        comodinAutistaActivo: true,
        comodinAutistaJugador: comodinJugador,
        comodinPermitidos: [comodinJugador],
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
    assert.equal(context.comodinAutistaJugador, null, 'El jugador que usó el comodín debe limpiarse tras registrar.');
    assert.equal(context.partidaPendiente, false);
}

const otroJugador = runRegistration('blue', 'Ana');
assert.deepEqual(
    { w: otroJugador.db.Ana.w, m: otroJugador.db.Ana.m, games: otroJugador.db.Ana.games },
    { w: 4, m: 1, games: 10 },
    'Un jugador autorizado desde el editor también debe quedar exento de sus estadísticas individuales.'
);
assert.equal(otroJugador.historialPartidas[0].comodinAutista, 'Ana');
assert.equal(otroJugador.db.gordi.m, 6, 'El MVP de un jugador distinto al exento debe seguir sumando.');

const htmlRemakeStart = html.indexOf('    function remakePartida() {');
const htmlRemakeEnd = html.indexOf('    function registrarMVP(', htmlRemakeStart);
assert.notEqual(htmlRemakeStart, -1, 'Debe existir la función de remake.');
assert.notEqual(htmlRemakeEnd, -1, 'No se encontró el final de remakePartida.');
const remakeSource = html.slice(htmlRemakeStart, htmlRemakeEnd);
const remakeContext = {
    partidaPendiente: true,
    sorteoEnCurso: false,
    mvpElegido: { blue: true, red: true },
    mvpActual: { blue: 'Ana', red: 'Biel' },
    document: { getElementById: () => ({ style: { display: 'block' } }) },
    lanzamientos: 0,
    lanzarSorteoSequencial() { this.lanzamientos += 1; return 'started'; }
};
runInNewContext(remakeSource + '\nglobalThis.__remake = remakePartida;', remakeContext);
assert.equal(remakeContext.__remake(), 'started');
assert.equal(remakeContext.partidaPendiente, false, 'El remake descarta el sorteo sin registrar el resultado.');
assert.equal(remakeContext.mvpElegido.blue, false, 'El remake debe limpiar el MVP azul anterior.');
assert.equal(remakeContext.mvpElegido.red, false, 'El remake debe limpiar el MVP rojo anterior.');
assert.equal(remakeContext.lanzamientos, 1, 'El remake debe iniciar otro sorteo.');

console.log('OK: el comodín es configurable por jugador y Remake vuelve a sortear sin registrar la partida anterior.');
