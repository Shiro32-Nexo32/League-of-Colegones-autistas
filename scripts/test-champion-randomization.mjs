import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('    function obtenerCampeonesDisponiblesEnPartida(');
const end = html.indexOf('    function animarPareja(', start);

assert.notEqual(start, -1, 'No se encontró obtenerCampeonesDisponiblesEnPartida en index.html.');
assert.notEqual(end, -1, 'No se encontró el final de la función de disponibilidad.');
const source = html.slice(start, end);

const champions = ['A', 'B', 'C', 'D'].map(name => ({ name }));

function disponibles(blue, red, excluirEquipo = null, excluirJugador = null) {
    const context = {
        CHAMPIONS: champions,
        campeonesActuales: { blue, red }
    };

    runInNewContext(
        source + '\nglobalThis.testDisponibles = obtenerCampeonesDisponiblesEnPartida;',
        context
    );

    return JSON.stringify(Array.from(context.testDisponibles(excluirEquipo, excluirJugador), champion => champion.name));
}

assert.equal(
    disponibles({}, {}),
    '["A","B","C","D"]',
    'Al empezar la partida, todos los campeones deben estar disponibles.'
);
assert.equal(
    disponibles({ Alicia: { name: 'A' } }, { Bruno: { name: 'B' } }),
    '["C","D"]',
    'Un campeón usado por cualquiera de los dos equipos debe quedar excluido del sorteo.'
);
assert.equal(
    disponibles({ Alicia: { name: 'A' }, Carla: { name: 'C' } }, { Bruno: { name: 'B' }, Diego: { name: 'D' } }),
    '[]',
    'Cuando todos los campeones están usados, no debe quedar ninguno disponible.'
);
assert.equal(
    disponibles({ Alicia: { name: 'A' }, Carla: { name: 'C' } }, { Bruno: { name: 'B' } }, 'blue', 'Alicia'),
    '["A","D"]',
    'Al cambiar un campeón individual, deben quedar libres el campeón anterior del jugador y todos los que aún no se han asignado.'
);

assert.match(
    html,
    /const campeonesDisponibles = obtenerCampeonesDisponiblesEnPartida\(\);/,
    'La animación debe usar la lista de campeones disponibles para toda la partida.'
);
assert.match(
    html,
    /seleccionados\.length > CHAMPIONS\.length/,
    'No debe comenzar una partida si no hay suficientes campeones distintos para todos.'
);
assert.match(
    html,
    /class="champion-remake-button" data-equipo=/,
    'Cada jugador debe tener un botón para rehacer su campeón individual.'
);
assert.match(
    html,
    /function remakeCampeon\(equipo, nombre\)/,
    'Debe existir la función que vuelve a sortear un único campeón.'
);
assert.match(
    html,
    /botonRemakeCampeon\.dataset\.equipo, botonRemakeCampeon\.dataset\.player/,
    'El evento debe volver a sortear solo el campeón del jugador seleccionado.'
);


const championRemakeStart = html.indexOf('    function obtenerCampeonesDisponiblesEnPartida(');
const championRemakeEnd = html.indexOf('    function animarPareja(', championRemakeStart);
const championRemakeSource = html.slice(championRemakeStart, championRemakeEnd);
const players = ['Alicia', 'Carla', 'Bruno', 'Diego'];
const assigned = {
    blue: { Alicia: { name: 'A', image: 'old-A.png' }, Carla: { name: 'C', image: 'old-C.png' } },
    red: { Bruno: { name: 'B', image: 'old-B.png' }, Diego: { name: 'D', image: 'old-D.png' } }
};
const image = { src: '', alt: '', style: {} };
const championText = { textContent: '' };
const slot = {
    classList: { add() {} },
    querySelector(selector) {
        if (selector === 'img') return image;
        if (selector === '.champ-name') return championText;
        if (selector === '.mvp-button') return { dataset: { player: 'Alicia' } };
        return null;
    }
};
const container = { querySelectorAll: () => [slot] };
const remakeBehaviorContext = {
    CHAMPIONS: ['A', 'B', 'C', 'D', 'E'].map(name => ({ name, id: name })),
    campeonesActuales: assigned,
    equiposActuales: { blue: ['Alicia', 'Carla'], red: ['Bruno', 'Diego'] },
    db: Object.fromEntries(players.map(name => [name, {}])),
    partidaPendiente: true,
    sorteoEnCurso: false,
    VERSION: 'test-version',
    document: { getElementById: () => container },
    playBoom() {},
    alert(message) { throw new Error(message); }
};
runInNewContext(championRemakeSource + '\\nglobalThis.__remakeCampeon = remakeCampeon;', remakeBehaviorContext);
remakeBehaviorContext.__remakeCampeon('blue', 'Alicia');
assert.equal(assigned.blue.Alicia.name, 'E', 'Debe reasignar solo el campeón del jugador elegido.');
assert.equal(assigned.blue.Carla.name, 'C', 'No debe cambiar el campeón de otro jugador del mismo equipo.');
assert.equal(assigned.red.Bruno.name, 'B', 'No debe cambiar ningún campeón del equipo contrario.');
assert.equal(assigned.red.Diego.name, 'D', 'No debe cambiar otros campeones asignados.');
assert.match(image.src, /\\/E\\.png$/, 'La imagen debe actualizarse al nuevo campeón.');
assert.equal(championText.textContent, 'E', 'El texto del campeón debe actualizarse.');

console.log('OK: ningún campeón asignado puede repetirse entre equipos durante la misma partida.');
