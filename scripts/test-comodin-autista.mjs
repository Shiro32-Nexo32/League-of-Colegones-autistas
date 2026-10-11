import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('    function registrarVictoria(equipo) {');
const end = html.indexOf('    function abrirHistorial()', start);
assert.notEqual(start, -1, 'No se encontró registrarVictoria.');
assert.notEqual(end, -1, 'No se encontró el final de registrarVictoria.');
const functionSource = html.slice(start, end);

function runRegistration(winner, jugadoresEtiquetados = ['gordi']) {
    const context = {
        partidaPendiente: true,
        comodinPermitidos: [...jugadoresEtiquetados],
        esJugadorPermitidoComodin: nombre => jugadoresEtiquetados.includes(nombre),
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
    runInNewContext(functionSource + '\\nglobalThis.__register = registrarVictoria;', context);
    context.__register(winner);
    return context;
}

for (const winner of ['blue', 'red']) {
    const context = runRegistration(winner);

    assert.deepEqual(
        { w: context.db.gordi.w, m: context.db.gordi.m, games: context.db.gordi.games },
        { w: 2, m: 5, games: 8 },
        'La etiqueta interna debe dejar intactas todas las estadísticas de Gordi tanto si gana como si pierde.'
    );
    assert.equal(context.db.Ana.games, 11);
    assert.equal(context.db.Biel.games, 10);
    assert.equal(context.db.Carla.games, 13);
    assert.equal(context.db.Carla.m, 5, 'El MVP de los jugadores sin etiqueta sí debe contar.');
    assert.equal(context.db.Ana.w, 4 + (winner === 'blue' ? 1 : 0));
    assert.equal(context.db.Carla.w, 6 + (winner === 'red' ? 1 : 0));
    assert.equal(context.historialPartidas.length, 1);
    assert.deepEqual([...context.historialPartidas[0].comodinAutista], ['gordi']);
    assert.equal(context.historialPartidas[0].mvpBlue, null, 'Un jugador etiquetado no debe contar como MVP.');
    assert.equal(context.historialPartidas[0].mvpRed, 'Carla');
    assert.equal(context.partidaPendiente, false);
}

// Se pueden etiquetar varios jugadores y sus exclusiones son invisibles en la UI.
const variosEtiquetados = runRegistration('blue', ['Ana', 'Carla']);
assert.deepEqual(
    { w: variosEtiquetados.db.Ana.w, m: variosEtiquetados.db.Ana.m, games: variosEtiquetados.db.Ana.games },
    { w: 4, m: 1, games: 10 },
    'Todos los jugadores etiquetados deben quedar fuera de sus estadísticas individuales.'
);
assert.deepEqual(
    { w: variosEtiquetados.db.Carla.w, m: variosEtiquetados.db.Carla.m, games: variosEtiquetados.db.Carla.games },
    { w: 6, m: 4, games: 12 },
    'La etiqueta se aplica también si el jugador etiquetado está en el equipo perdedor.'
);
assert.equal(variosEtiquetados.db.gordi.games, 9, 'Los jugadores sin etiqueta deben contar normalmente.');
assert.equal(variosEtiquetados.db.gordi.m, 6, 'El MVP sin etiqueta debe contar normalmente.');
assert.deepEqual([...variosEtiquetados.historialPartidas[0].comodinAutista], ['Ana', 'Carla']);
assert.equal(variosEtiquetados.historialPartidas[0].mvpBlue, 'gordi');
assert.equal(variosEtiquetados.historialPartidas[0].mvpRed, null);

// Names/labels must not appear in the public gameplay or history UI.
assert.doesNotMatch(html, /id="comodin-autista-options"/);
assert.doesNotMatch(html, /comodin-tag|comodin-history-note/);
assert.match(html, /Etiqueta interna: excluir estadísticas individuales/);

const htmlRemakeStart = html.indexOf('    function remakePartida() {');
const htmlRemakeEnd = html.indexOf('    function registrarMVP(', htmlRemakeStart);
assert.notEqual(htmlRemakeStart, -1, 'Debe existir la función de remake.');
assert.notEqual(htmlRemakeEnd, -1, 'No se encontró el final de remakePartida.');
const remakeSource = html.slice(htmlRemakeStart, htmlRemakeEnd);
let launchCount = 0;
const remakeContext = {
    partidaPendiente: true,
    sorteoEnCurso: false,
    mvpElegido: { blue: true, red: true },
    mvpActual: { blue: 'Ana', red: 'Biel' },
    document: { getElementById: () => ({ style: { display: 'block' } }) },
    lanzarSorteoSequencial() { launchCount += 1; return 'started'; }
};
runInNewContext(remakeSource + '\\nglobalThis.__remake = remakePartida;', remakeContext);
assert.equal(remakeContext.__remake(), 'started');
assert.equal(remakeContext.partidaPendiente, false, 'El remake descarta el sorteo sin registrar el resultado.');
assert.equal(remakeContext.mvpElegido.blue, false, 'El remake debe limpiar el MVP azul anterior.');
assert.equal(remakeContext.mvpElegido.red, false, 'El remake debe limpiar el MVP rojo anterior.');
assert.equal(launchCount, 1, 'El remake debe iniciar otro sorteo.');

console.log('OK: el comodín es configurable por jugador y Remake vuelve a sortear sin registrar la partida anterior.');
