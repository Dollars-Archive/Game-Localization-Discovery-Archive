const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../docs/assets/exclusion-core.js');
const W = require('../docs/assets/watchlist-core.js');
const a = 'platforms/ps2/games/a.md';
const b = 'platforms/psp/games/b.md';
const entry = (deleted = true, title = '게임') => ({ deleted, title, updated: '2026-10-08T01:00:00Z' });
const response = (status, payload = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => payload });
const encode = s => Buffer.from(s).toString('base64');
const decode = s => Buffer.from(s, 'base64').toString();
function fixture(options = {}) {
  let remote = options.remote || E.empty();
  let exists = options.exists !== false;
  let sha = 's1';
  let puts = 0;
  const cache = new Map();
  const calls = [];
  let currentToken = 'test-token';
  const fetcher = async (url, init = {}) => {
    calls.push([url, init]);
    if (options.offline) throw new Error('offline');
    if (url.endsWith('/user')) return response(options.authStatus || 200, { id: options.userId || 314692476 });
    if (url.endsWith('/Game-Localization-Discovery-Archive')) return response(200, { permissions: { push: options.push !== false } });
    if (url.includes('/branches/')) return response(options.branchMissing ? 404 : 200);
    if (init.method === 'PUT') {
      puts++;
      assert.match(url, /\/contents\/docs\/data\/excluded-games\.json$/);
      const body = JSON.parse(init.body);
      assert.equal(body.branch, 'watchlist-data');
      if (options.conflict && puts === 1) {
        remote = E.withChange(remote, b, entry()); exists = true; sha = 's2';
        return response(options.conflict, { message: 'sha was not supplied' });
      }
      if (options.writeStatus) return response(options.writeStatus);
      assert.equal(body.sha, exists ? sha : undefined);
      remote = JSON.parse(decode(body.content)); exists = true; sha = `s${puts + 2}`;
      return response(200, { content: { sha } });
    }
    if (options.readStatus) return response(options.readStatus);
    return exists ? response(200, { content: encode(JSON.stringify(remote)), sha }) : response(404);
  };
  const store = E.createStore({ fetcher, storage: { getItem: k => cache.get(k), setItem: (k, v) => cache.set(k, v) },
    token: () => currentToken, encode, decode, knownKey: key => [a,b].includes(key) });
  return { store, cache, calls, setToken: v => { currentToken = v; }, get remote() { return remote; }, get puts() { return puts; } };
}
test('deletion affects visible candidates and comparison while preserving watchlist and notes', () => {
  const wl = W.normalizeWatchlist({ order: [a,b], items: { [a]: { note: '보존' }, [b]: {} } });
  const snapshot = JSON.stringify(wl);
  const deleted = E.withChange(E.empty(), a, entry());
  assert.deepEqual(E.visible([{key:a},{key:b}], deleted), [{key:b}]);
  assert.deepEqual(E.selection([a,b], wl, deleted), [b]);
  assert.equal(JSON.stringify(wl), snapshot);
  const restored = E.withChange(deleted, a, entry(false));
  assert.deepEqual(E.selection([a,b], wl, restored), [a,b]);
  assert.equal(wl.items[a].note, '보존');
});
test('invalid paths, malformed entries and future schema fail rather than clear deletion data', () => {
  for (const data of [{}, {version:2,entries:{}}, {version:1,entries:[]},
    {version:1,entries:{'../../README.md':entry()}}, {version:1,entries:{[a]:{...entry(),deleted:'true'}}}]) {
    assert.throws(() => E.normalize(data));
  }
});
test('owner, other account, missing token, insufficient permissions and expired token', async () => {
  assert.equal(await E.verifyOwner(fixture().store ? async url => response(200, url.endsWith('/user') ? {id:314692476} : {permissions:{push:true}}) : null, 'token'), true);
  assert.equal(await E.verifyOwner(async () => response(200,{id:1}), 'token'), false);
  assert.equal(await E.verifyOwner(async () => { throw Error('must not call'); }, ''), false);
  for (const options of [{userId:1}, {push:false}, {authStatus:401}]) {
    const f=fixture(options); await f.store.load();
    await assert.rejects(f.store.change({key:a,title:'A'},true));
    assert.equal(f.puts,0);
  }
});
test('existing file deletion and restoration store only exclusions', async () => {
  const f=fixture(); await f.store.load();
  await f.store.change({key:a,title:'한글 A'},true);
  assert.equal(E.isDeleted(f.remote,a),true);
  await f.store.change({key:a,title:'한글 A'},false);
  assert.equal(E.isDeleted(f.remote,a),false);
  assert.equal(f.remote.entries[a].title,'한글 A');
  assert.ok(f.calls.every(([url]) => !url.includes('watchlist.json')));
});
for (const code of [409,422]) test(`initial creation ${code} conflict preserves another device's deletion`, async () => {
  const f=fixture({exists:false,conflict:code}); await f.store.load();
  await f.store.change({key:a,title:'A'},true);
  assert.equal(f.puts,2);
  assert.equal(E.isDeleted(f.remote,a),true);
  assert.equal(E.isDeleted(f.remote,b),true);
});
test('read-before-write preserves newer unrelated remote changes without conflict', async () => {
  const f=fixture({remote:E.withChange(E.empty(),b,entry(false))});await f.store.load();
  await f.store.change({key:a,title:'A'},true);
  assert.equal(f.remote.entries[b].deleted,false);
});
test('write permission failure leaves local data unchanged, permits a later retry', async () => {
  const f=fixture({writeStatus:403}); await f.store.load();
  await assert.rejects(f.store.change({key:a,title:'A'},true));
  assert.equal(E.isDeleted(f.store.data,a),false);
  assert.equal(f.store.busy,false);
});
test('offline reads use cache, report unavailable and block modifications', async () => {
  const f=fixture({offline:true});
  f.cache.set('discovery-excluded-games-cache-v1',JSON.stringify(E.withChange(E.empty(),a,entry())));
  assert.deepEqual(await f.store.load(),{ready:false,cached:true});
  assert.equal(E.isDeleted(f.store.data,a),true);
  await assert.rejects(f.store.change({key:b,title:'B'},true));
  assert.equal(f.puts,0);
});
test('missing file only means empty data when its storage branch exists', async () => {
  const f=fixture({exists:false,branchMissing:true});
  assert.deepEqual(await f.store.load(),{ready:false,cached:false});
  await assert.rejects(f.store.change({key:a,title:'A'},true));
});
test('unknown keys never trigger network writes', async () => {
  const f=fixture(); await f.store.load();
  await assert.rejects(f.store.change({key:'platforms/ps2/games/unknown.md',title:'X'},true));
  assert.equal(f.puts,0);
});
