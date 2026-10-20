const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const W = require('../docs/assets/watchlist-core.js');
const E = require('../docs/assets/exclusion-core.js');
const key = 'platforms/psp/games/misshitsu-no-sacrifice.md';
const other = 'platforms/ps2/games/other.md';
const response = (status, data) => ({ ok: status < 300, status, json: async () => data });
class Element {
  constructor() { this.disabled = false; this.hidden = true; this.value = ''; this.textContent = ''; this.listeners = {}; this.attrs = {}; this.classList = { toggle() {} }; }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  setAttribute(name, value) { this.attrs[name] = value; }
}
async function fixture({ token = 'test-token', owner = E.OWNER_ID || 314692476, offline = false, failWrite = false, conflict = false } = {}) {
  const elements = new Map();
  const el = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const storage = new Map(token ? [['discovery-watchlist-token-v1', token]] : []);
  const data = { watchlist: W.normalizeWatchlist({ items: { [other]: { added: '2026-10-20', note: 'keep' } }, order: [other] }), excluded: E.empty(), writes: [], conflict };
  const fetcher = async (url, init = {}) => {
    if (url.endsWith('/user')) return response(200, { id: owner });
    if (url.endsWith('/Game-Localization-Discovery-Archive')) return response(200, { permissions: { push: true } });
    const name = url.includes('excluded-games.json') ? 'excluded' : 'watchlist';
    if (offline && init.method !== 'PUT') throw Error('offline');
    if (init.method === 'PUT') {
      const body = JSON.parse(init.body);
      data.writes.push({ name, body });
      if (failWrite) return response(403, {});
      if (data.conflict && name === 'watchlist') {
        data.conflict = false;
        data.watchlist.items[other].note = 'changed on mobile';
        return response(409, {});
      }
      data[name] = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
      return response(200, { content: { sha: 'saved' } });
    }
    return response(200, { content: Buffer.from(JSON.stringify(data[name])).toString('base64'), sha: 'latest' });
  };
  const events = {};
  const context = { console, Date, fetch: fetcher,
    window: { WatchlistCore: W, ExclusionCore: E, confirm: () => true, addEventListener(type, fn) { events[type] = fn; } },
    document: { getElementById: el },
    localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
    decodeBase64Utf8: s => Buffer.from(s, 'base64').toString('utf8'),
    encodeBase64Utf8: s => Buffer.from(s).toString('base64'),
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../docs/assets/game-actions.js'), 'utf8'), context);
  await context.initGameActions({ key, title: '밀실의 새크리파이스' });
  return { el, data, storage, events, click: id => el(id).listeners.click() };
}
test('detail stars and unstars via shared GitHub file, preserving unrelated notes/order and cache', async () => {
  const f = await fixture();
  assert.equal(f.el('game-star').disabled, false);
  await f.click('game-star');
  assert.ok(f.data.watchlist.items[key]);
  assert.equal(f.data.watchlist.items[other].note, 'keep');
  assert.deepEqual(f.data.watchlist.order, [other, key]);
  assert.match(f.el('game-action-status').textContent, /GitHubに|GitHub에 저장/);
  assert.ok(JSON.parse(f.storage.get('discovery-watchlist-cache-v1')).items[key]);
  assert.equal(f.data.writes[0].body.branch, 'watchlist-data');
  await f.click('game-star');
  assert.equal(f.data.watchlist.items[key], undefined);
  assert.deepEqual(f.data.watchlist.order, [other]);
});
test('conflict rereads latest remote changes before retrying only the current game', async () => {
  const f = await fixture({ conflict: true });
  await f.click('game-star');
  assert.ok(f.data.watchlist.items[key]);
  assert.equal(f.data.watchlist.items[other].note, 'changed on mobile');
  assert.equal(f.data.writes.length, 2);
});
test('delete and restore use shared exclusion store without erasing favorites', async () => {
  const f = await fixture();
  await f.click('game-star');
  await f.click('game-delete');
  assert.equal(f.data.excluded.entries[key].deleted, true);
  assert.ok(f.data.watchlist.items[key]);
  assert.equal(f.el('game-star').disabled, true);
  assert.match(f.el('game-delete').textContent, /복구/);
  await f.click('game-delete');
  assert.equal(f.data.excluded.entries[key].deleted, false);
  assert.equal(f.el('game-star').disabled, false);
});
test('failed save keeps previous state and does not claim success', async () => {
  const f = await fixture({ failWrite: true });
  await f.click('game-star');
  assert.equal(f.data.watchlist.items[key], undefined);
  assert.equal(f.el('game-star').attrs['aria-pressed'], 'false');
  assert.match(f.el('game-action-status').textContent, /저장 실패/);
});
test('visitors, wrong accounts and offline state cannot mutate', async () => {
  for (const options of [{ token: '' }, { owner: 123 }, { offline: true }]) {
    const f = await fixture(options);
    assert.equal(f.el('game-star').disabled, true);
    assert.equal(f.el('game-delete').disabled, true);
    await f.click('game-star');
    await f.click('game-delete');
    assert.equal(f.data.writes.length, 0);
  }
});
test('detail can register and remove the same key used by the index', async () => {
  const f = await fixture({ token: '' });
  f.el('game-token').value = 'test-token';
  await f.click('game-token-save');
  assert.equal(f.storage.get('discovery-watchlist-token-v1'), 'test-token');
  assert.equal(f.el('game-token').value, '');
  assert.equal(f.el('game-star').disabled, false);
  await f.click('game-token-clear');
  assert.equal(f.storage.has('discovery-watchlist-token-v1'), false);
  assert.equal(f.el('game-star').disabled, true);
});
