import assert from "node:assert/strict";
import worker from "../cloudflare/worker.mjs";

function makeEnv() {
  const values = new Map();
  return {
    COLEGONES_STATE: {
      async get(key, type) {
        const value = values.get(key);
        if (value === undefined) return null;
        return type === "json" ? JSON.parse(value) : value;
      },
      async put(key, value) {
        values.set(key, value);
      }
    }
  };
}

const origin = "https://shiro32-nexo32.github.io";
const request = (method, body, url = "https://colegones-worker.test/api/league/state", headers = {}) =>
  new Request(url, {
    method,
    headers: { Origin: origin, ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });

const env = makeEnv();
let response = await worker.fetch(request("GET"), env);
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), { ok: true, initialized: false, state: null });

const initial = { players: { Shiro: { w: 1, m: 0, games: 2, level: 5 } }, history: [] };
response = await worker.fetch(request("POST", { action: "initialize", state: initial }), env);
assert.equal(response.status, 201);
let payload = await response.json();
assert.equal(payload.state.revision, 1);
assert.equal(payload.state.players.Shiro.w, 1);

response = await worker.fetch(request("POST", { action: "initialize", state: initial }), env);
assert.equal(response.status, 409);

const updated = { players: { Shiro: { w: 2, m: 1, games: 3, level: 5 } }, history: [] };
response = await worker.fetch(request("POST", { action: "save", revision: 1, state: updated }), env);
assert.equal(response.status, 200);
payload = await response.json();
assert.equal(payload.state.revision, 2);
assert.equal(payload.state.players.Shiro.w, 2);

response = await worker.fetch(request("POST", { action: "save", revision: 1, state: initial }), env);
assert.equal(response.status, 409);
payload = await response.json();
assert.equal(payload.state.revision, 2);

response = await worker.fetch(request("GET", undefined, "https://colegones-worker.test/not-found"), env);
assert.equal(response.status, 404);

response = await worker.fetch(
  new Request("https://colegones-worker.test/api/league/state", {
    method: "GET",
    headers: { Origin: "https://evil.example" }
  }),
  env
);
assert.equal(response.status, 403);

console.log("OK: Cloudflare Worker tests passed.");
