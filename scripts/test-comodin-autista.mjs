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

// Test activation/deactivation using the clown square directly beside each name.
const toggleStart = html.indexOf('    function toggleComodinJugadorPartida(nombre) {');
const toggleEnd = html.indexOf('    function renderSelector()', toggleStart);
assert.notEqual(toggleStart, -1, 'No se encontró la función de alternar el comodín por jugador.');
assert.notEqual(toggleEnd, -1, 'No se encontró el final de la función del comodín.');
const toggleSource = html.slice(toggleStart, toggleEnd);

function runToggle(nombre, permitidos, activos = [], mvpNombre = null) {
    const alerts = [];
    let updates = 0;
    const equiposActuales = { blue: ['gordi', 'Ana'], red: ['Biel', 'Carla'] };
    const context = {
        partidaPendiente: true,
        sorteoEnCurso: false,
        equiposActuales,
        db: { gordi: {}, Ana: {}, Biel: {}, Carla: {} },
        comodinesActivosPartida: [...activos],
        esJugadorPermitidoComodin: jugador => permitidos.includes(jugador),
        mvpElegido: { blue: Boolean(mvpNombre), red: false },
        mvpActual: { blue: mvpNombre, red: null },
        actualizarBotonesMVPComodin() { updates += 1; },
        alert: message => alerts.push(message)
    };
    runInNewContext(toggleSource + '\nglobalThis.__toggle = toggleComodinJugadorPartida;', context);
    context.__toggle(nombre);
    return { context, alerts, getUpdates: () => updates };
}

const activacion = runToggle('Ana', ['Ana']);
assert.deepEqual([...activacion.context.comodinesActivosPartida], ['Ana']);
assert.equal(activacion.alerts.length, 0, 'La activación debe hacerse con un clic, sin pedir que se escriba el nombre.');
assert.equal(activacion.getUpdates(), 1);

const desactivacion = runToggle('Ana', ['Ana'], ['Ana']);
assert.deepEqual([...desactivacion.context.comodinesActivosPartida], []);
assert.equal(desactivacion.alerts.length, 0, 'La desactivación también debe hacerse con un clic.');

const noAutorizado = runToggle('Biel', ['Ana']);
assert.deepEqual([...noAutorizado.context.comodinesActivosPartida], []);
assert.equal(noAutorizado.alerts.at(-1), 'Este jugador no tiene permiso para usar el comodín. Se configura desde el modo editor.');
assert.equal(noAutorizado.getUpdates(), 0, 'Un jugador no autorizado no puede activar el comodín.');

const mvpActivado = runToggle('Ana', ['Ana'], [], 'Ana');
assert.deepEqual([...mvpActivado.context.comodinesActivosPartida], ['Ana']);
assert.equal(mvpActivado.context.mvpElegido.blue, false, 'Al activar el comodín, se debe quitar su selección previa como MVP.');
assert.equal(mvpActivado.context.mvpActual.blue, null, 'Un jugador con comodín activo no puede seguir siendo el MVP seleccionado.');

assert.match(html, /class="comodin-toggle-button" data-player=/,
    'Cada jugador de los equipos debe tener un cuadrado de payaso junto a su nombre.');
assert.match(html, /esJugadorPermitidoComodin\(name\) \? '<button type="button" class="comodin-toggle-button"/,
    'El cuadrado de payaso solo debe renderizarse para jugadores autorizados desde el editor.');
assert.ok(html.includes('slot-player-name"><b>${escaparHTML(name)}</b>${esJugadorPermitidoComodin(name) ?'),
    'El emote debe estar junto al nombre, dentro de la condición de autorización del editor.');
assert.match(html, /onclick="toggleComodinJugadorPartida\(this\.dataset\.player\)"/,
    'El cuadrado debe llamar directamente a la función al pulsarlo.');
assert.doesNotMatch(html, /const botonComodin = event\.target\.closest\('\.comodin-toggle-button'\)/,
    'No debe quedar un segundo manejador que alterne el comodín dos veces.');

const updateStart = html.indexOf('    function actualizarBotonesMVPComodin() {');
const updateEnd = html.indexOf('    function toggleComodinJugadorPartida(nombre)', updateStart);
assert.notEqual(updateStart, -1, 'No se encontró el actualizador de botones del comodín.');
assert.notEqual(updateEnd, -1, 'No se encontró el final del actualizador de botones.');
const updateSource = html.slice(updateStart, updateEnd);
const botonPrueba = {
    dataset: { player: 'Ana' },
    disabled: true,
    classList: { toggle() {} },
    setAttribute() {},
    title: '',
    innerText: ''
};
const estadoBotones = {
    partidaPendiente: true,
    sorteoEnCurso: false,
    mvpElegido: { blue: false, red: false },
    mvpActual: { blue: null, red: null },
    comodinesActivosPartida: [],
    comodinAplicaEnPartidaActual: () => false,
    document: {
        querySelectorAll(selector) {
            return selector.endsWith('.mvp-button') ? [] : [botonPrueba];
        }
    }
};
runInNewContext(updateSource + '\\nglobalThis.__updateButtons = actualizarBotonesMVPComodin;', estadoBotones);
estadoBotones.__updateButtons();
assert.equal(botonPrueba.disabled, false,
    'La casilla debe activarse al terminar el sorteo cuando hay una partida pendiente.');
estadoBotones.sorteoEnCurso = true;
estadoBotones.__updateButtons();
assert.equal(botonPrueba.disabled, true,
    'La casilla debe permanecer desactivada mientras se realiza el sorteo.');
estadoBotones.sorteoEnCurso = false;
estadoBotones.partidaPendiente = false;
estadoBotones.__updateButtons();
assert.equal(botonPrueba.disabled, true,
    'La casilla debe desactivarse al terminar o descartar la partida.');
assert.match(html, /Permiso para optar al comodín/);
assert.doesNotMatch(html, /function gestionarComodinPartida\(\)/,
    'No debe quedar el antiguo método que pedía escribir un nombre.');
assert.doesNotMatch(html, /GESTIONAR COMODÍN/,
    'No debe quedar el botón general de gestión del comodín.');
assert.doesNotMatch(html, /Escribe el nombre del jugador que quiere optar al comodín/,
    'El comodín no debe requerir escribir el nombre.');

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
