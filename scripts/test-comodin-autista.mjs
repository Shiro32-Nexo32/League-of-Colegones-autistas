import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('    function registrarVictoria(equipo) {');
const end = html.indexOf('    function abrirHistorial()', start);
assert.notEqual(start, -1, 'No se encontró registrarVictoria.');
assert.notEqual(end, -1, 'No se encontró el final de registrarVictoria.');
const registrationSource = html.slice(start, end);

function runRegistration(winner, jugadoresActivos = ['gordi'], jugadoresPermitidos = ['gordi']) {
    const equiposActuales = { blue: ['gordi', 'Ana'], red: ['Biel', 'Carla'] };
    const context = {
        partidaPendiente: true,
        comodinesActivosPartida: [...jugadoresActivos],
        esJugadorPermitidoComodin: nombre => jugadoresPermitidos.includes(nombre),
        comodinAplicaEnPartidaActual: nombre =>
            jugadoresPermitidos.includes(nombre) &&
            jugadoresActivos.includes(nombre) &&
            [...equiposActuales.blue, ...equiposActuales.red].includes(nombre),
        equiposActuales,
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
    runInNewContext(registrationSource + '\nglobalThis.__register = registrarVictoria;', context);
    context.__register(winner);
    return context;
}

for (const winner of ['blue', 'red']) {
    const context = runRegistration(winner);

    assert.deepEqual(
        { w: context.db.gordi.w, m: context.db.gordi.m, games: context.db.gordi.games },
        { w: 2, m: 5, games: 8 },
        'El comodín activado debe excluir las estadísticas personales tanto si gana como si pierde.'
    );
    assert.equal(context.db.Ana.games, 11);
    assert.equal(context.db.Biel.games, 10);
    assert.equal(context.db.Carla.games, 13);
    assert.equal(context.db.Carla.m, 5, 'El MVP de los jugadores sin comodín sí debe contar.');
    assert.equal(context.db.Ana.w, 4 + (winner === 'blue' ? 1 : 0));
    assert.equal(context.db.Carla.w, 6 + (winner === 'red' ? 1 : 0));
    assert.equal(context.historialPartidas.length, 1);
    assert.deepEqual([...context.historialPartidas[0].comodinAutista], ['gordi']);
    assert.equal(context.historialPartidas[0].mvpBlue, null, 'Una persona que activó el comodín no debe contar como MVP.');
    assert.equal(context.historialPartidas[0].mvpRed, 'Carla');
    assert.deepEqual([...context.comodinesActivosPartida], [], 'El comodín debe desactivarse automáticamente al registrar el resultado.');
    assert.equal(context.partidaPendiente, false);
}

// Tener permiso en el editor no excluye estadísticas hasta que se activa el comodín.
const permisoSinActivar = runRegistration('blue', [], ['gordi']);
assert.deepEqual(
    { w: permisoSinActivar.db.gordi.w, m: permisoSinActivar.db.gordi.m, games: permisoSinActivar.db.gordi.games },
    { w: 3, m: 6, games: 9 },
    'Un jugador autorizado que no activa el comodín debe contar normalmente.'
);
assert.deepEqual([...permisoSinActivar.historialPartidas[0].comodinAutista], []);
assert.equal(permisoSinActivar.historialPartidas[0].mvpBlue, 'gordi');

// Se pueden activar varios comodines en una misma partida; solo se excluyen los activados.
const variosActivos = runRegistration('blue', ['Ana', 'Carla'], ['Ana', 'Carla']);
assert.deepEqual(
    { w: variosActivos.db.Ana.w, m: variosActivos.db.Ana.m, games: variosActivos.db.Ana.games },
    { w: 4, m: 1, games: 10 },
    'La activación debe excluir las estadísticas del jugador activado.'
);
assert.deepEqual(
    { w: variosActivos.db.Carla.w, m: variosActivos.db.Carla.m, games: variosActivos.db.Carla.games },
    { w: 6, m: 4, games: 12 },
    'La exclusión también debe aplicarse al jugador activado del equipo perdedor.'
);
assert.equal(variosActivos.db.gordi.games, 9, 'Un jugador que no activó el comodín debe contar normalmente.');
assert.equal(variosActivos.db.gordi.m, 6, 'El MVP sin comodín debe contar normalmente.');
assert.deepEqual([...variosActivos.historialPartidas[0].comodinAutista], ['Ana', 'Carla']);
assert.equal(variosActivos.historialPartidas[0].mvpBlue, 'gordi');
assert.equal(variosActivos.historialPartidas[0].mvpRed, null);

// Test activation/deactivation and eligibility without exposing an allowlist or visible tag.
const comodinStart = html.indexOf('    function comodinAplicaEnPartidaActual(nombre) {');
const comodinEnd = html.indexOf('    function renderSelector()', comodinStart);
assert.notEqual(comodinStart, -1, 'No se encontró la lógica de activación del comodín.');
assert.notEqual(comodinEnd, -1, 'No se encontró el final de la lógica del comodín.');
const comodinSource = html.slice(comodinStart, comodinEnd);

function runActivation(nombreEntrada, permitidos, activos = []) {
    const alerts = [];
    const equiposActuales = { blue: ['gordi', 'Ana'], red: ['Biel', 'Carla'] };
    const context = {
        partidaPendiente: true,
        sorteoEnCurso: false,
        equiposActuales,
        seleccionados: [...equiposActuales.blue, ...equiposActuales.red],
        db: { gordi: {}, Ana: {}, Biel: {}, Carla: {} },
        comodinesActivosPartida: [...activos],
        esJugadorPermitidoComodin: nombre => permitidos.includes(nombre),
        mvpElegido: { blue: false, red: false },
        mvpActual: { blue: null, red: null },
        prompt: () => nombreEntrada,
        alert: message => alerts.push(message),
        document: { querySelectorAll: () => [] }
    };
    runInNewContext(comodinSource + '\nglobalThis.__manage = gestionarComodinPartida;', context);
    context.__manage();
    return { context, alerts };
}

const activacion = runActivation('Ana', ['Ana']);
assert.deepEqual([...activacion.context.comodinesActivosPartida], ['Ana']);
assert.equal(activacion.alerts.at(-1), 'Comodín activado para esta partida.');
assert.doesNotMatch(activacion.alerts.join(' '), /Ana/, 'Los avisos no deben revelar el nombre activado.');

const desactivacion = runActivation('Ana', ['Ana'], ['Ana']);
assert.deepEqual([...desactivacion.context.comodinesActivosPartida], []);
assert.equal(desactivacion.alerts.at(-1), 'Comodín desactivado para esta partida.');

const noAutorizado = runActivation('Biel', ['Ana']);
assert.deepEqual([...noAutorizado.context.comodinesActivosPartida], []);
assert.equal(noAutorizado.alerts.at(-1), 'Ese jugador no puede optar al comodín en esta partida.');

assert.match(html, /<button type="button" class="comodin-activation-button" onclick="gestionarComodinPartida\(\)">🎭 GESTIONAR COMODÍN<\/button>/);
assert.match(html, /function gestionarComodinPartida\(\)/);
assert.match(html, /Estar marcado aquí no excluye automáticamente sus estadísticas/);
assert.doesNotMatch(html, /Etiqueta interna: excluir estadísticas individuales/);
assert.doesNotMatch(html, /comodin-tag|comodin-history-note/);
assert.doesNotMatch(html, /class="comodin-activation-button"[^>]*data-player=/,
    'El control no debe colocar una etiqueta de comodín junto a un jugador concreto.');

// Remake must discard active comodins without recording anything.
const htmlRemakeStart = html.indexOf('    function remakePartida() {');
const htmlRemakeEnd = html.indexOf('    function registrarMVP(', htmlRemakeStart);
assert.notEqual(htmlRemakeStart, -1, 'Debe existir la función de remake.');
assert.notEqual(htmlRemakeEnd, -1, 'No se encontró el final de remakePartida.');
const remakeSource = html.slice(htmlRemakeStart, htmlRemakeEnd);
let launchCount = 0;
const remakeContext = {
    partidaPendiente: true,
    sorteoEnCurso: false,
    comodinesActivosPartida: ['Ana'],
    mvpElegido: { blue: true, red: true },
    mvpActual: { blue: 'Ana', red: 'Biel' },
    document: { getElementById: () => ({ style: { display: 'block' } }) },
    lanzarSorteoSequencial() { launchCount += 1; return 'started'; }
};
runInNewContext(remakeSource + '\nglobalThis.__remake = remakePartida;', remakeContext);
assert.equal(remakeContext.__remake(), 'started');
assert.equal(remakeContext.partidaPendiente, false, 'El remake descarta el sorteo sin registrar el resultado.');
assert.deepEqual([...remakeContext.comodinesActivosPartida], [], 'El remake debe limpiar las activaciones anteriores.');
assert.equal(remakeContext.mvpElegido.blue, false, 'El remake debe limpiar el MVP azul anterior.');
assert.equal(remakeContext.mvpElegido.red, false, 'El remake debe limpiar el MVP rojo anterior.');
assert.equal(launchCount, 1, 'El remake debe iniciar otro sorteo.');

console.log('OK: el comodín requiere permiso y activación por partida; la activación permanece oculta en el historial público.');
