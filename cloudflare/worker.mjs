const ALLOWED_ORIGINS = new Set([
  "https://shiro32-nexo32.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000"
]);

const STATE_KEY = "shared-state:v1";
const MAX_BODY_BYTES = 512 * 1024;

function jsonResponse(body, status = 200, origin = "") {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function normalizeState(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  if (!input.players || typeof input.players !== "object" || Array.isArray(input.players)) return null;
  if (!Array.isArray(input.history)) return null;

  const players = {};
  const entries = Object.entries(input.players);
  if (entries.length > 100) return null;

  for (const [rawName, rawPlayer] of entries) {
    const name = String(rawName).trim();
    if (!name || name.length > 80 || !rawPlayer || typeof rawPlayer !== "object" || Array.isArray(rawPlayer)) return null;

    const nonNegativeInteger = value => {
      const number = Number(value);
      return Number.isFinite(number) ? Math.max(0, Math.min(1_000_000, Math.trunc(number))) : 0;
    };
    const rawLevel = Number(rawPlayer.level);
    players[name] = {
      ...rawPlayer,
      games: nonNegativeInteger(rawPlayer.games),
      m: nonNegativeInteger(rawPlayer.m),
      w: nonNegativeInteger(rawPlayer.w),
      level: Number.isFinite(rawLevel) ? Math.max(0, Math.min(5, rawLevel)) : 3
    };
  }

  const history = input.history
    .filter(match => match && typeof match === "object" &&
      Array.isArray(match.blue) && Array.isArray(match.red) &&
      ["blue", "red"].includes(match.ganador))
    .slice(0, 20);

  return { players, history };
}

async function readState(env) {
  if (!env.COLEGONES_STATE) throw new Error("Falta la vinculación KV COLEGONES_STATE.");
  return await env.COLEGONES_STATE.get(STATE_KEY, "json");
}

async function writeState(env, state) {
  // KV no ofrece transacciones compare-and-swap: la revisión detecta muchos
  // conflictos, pero dos guardados exactamente simultáneos aún podrían competir.
  await env.COLEGONES_STATE.put(STATE_KEY, JSON.stringify(state));
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return jsonResponse({ ok: false, error: "Origen no permitido." }, 403);
    }

    if (request.method === "OPTIONS") {
      const headers = new Headers({
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Accept, Content-Type",
        "Access-Control-Max-Age": "86400",
        "Cache-Control": "no-store"
      });
      if (origin) {
        headers.set("Access-Control-Allow-Origin", origin);
        headers.set("Vary", "Origin");
      }
      return new Response(null, { status: 204, headers });
    }

    if (url.pathname !== "/api/league/state") {
      return jsonResponse({ ok: false, error: "Ruta no encontrada." }, 404, origin);
    }

    if (request.method === "GET") {
      try {
        const state = await readState(env);
        return jsonResponse({ ok: true, initialized: Boolean(state), state: state || null }, 200, origin);
      } catch (error) {
        return jsonResponse({ ok: false, error: error.message || "No se pudo leer el estado." }, 503, origin);
      }
    }

    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "Método no permitido." }, 405, origin);
    }

    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return jsonResponse({ ok: false, error: "La petición es demasiado grande." }, 413, origin);
    }

    let body;
    try {
      const text = await request.text();
      if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
        return jsonResponse({ ok: false, error: "La petición es demasiado grande." }, 413, origin);
      }
      body = JSON.parse(text);
    } catch {
      return jsonResponse({ ok: false, error: "El cuerpo debe ser JSON válido." }, 400, origin);
    }

    const safeState = normalizeState(body?.state);
    if (!safeState) {
      return jsonResponse({ ok: false, error: "El ranking o historial no tiene un formato válido." }, 400, origin);
    }

    try {
      const current = await readState(env);

      if (body.action === "initialize") {
        if (current) {
          return jsonResponse({
            ok: false,
            error: "El ranking compartido ya está inicializado.",
            state: current
          }, 409, origin);
        }
        const state = { ...safeState, revision: 1, updatedAt: new Date().toISOString() };
        await writeState(env, state);
        return jsonResponse({ ok: true, initialized: true, state }, 201, origin);
      }

      if (body.action === "save") {
        if (!current) {
          return jsonResponse({
            ok: false,
            error: "Todavía no se ha inicializado el ranking compartido."
          }, 409, origin);
        }
        if (!Number.isInteger(body.revision) || body.revision !== current.revision) {
          return jsonResponse({
            ok: false,
            error: "La revisión del ranking ha cambiado.",
            state: current
          }, 409, origin);
        }
        const state = {
          ...safeState,
          revision: current.revision + 1,
          updatedAt: new Date().toISOString()
        };
        await writeState(env, state);
        return jsonResponse({ ok: true, initialized: true, state }, 200, origin);
      }

      return jsonResponse({ ok: false, error: "Acción no válida." }, 400, origin);
    } catch (error) {
      return jsonResponse({ ok: false, error: error.message || "No se pudo guardar el estado." }, 503, origin);
    }
  }
};
