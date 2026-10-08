const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../docs/assets/watchlist-core.js');
const { root, readRows, createFixtures, createHarness } = require('./helpers/index-harness.cjs');

const otherPlatforms = ['ps2', 'psp', 'psvita', 'dreamcast'];

test('PS3 active/reserve is exactly 30/25, union preserves all 55 document keys', async () => {
  const h = await createHarness();
  assert.equal(h.keys().length, 30);
  assert.match(h.elements.stats.innerHTML, /등록 후보 <strong>30</);
  const active = h.keys();
  assert.ok(!active.includes(h.fixtures.keys[0]), 'higher-score eligibility hold is not forced into selected list');
  await h.click('ps3-reserve');
  assert.equal(h.keys().length, 25);
  assert.match(h.elements.stats.innerHTML, /예비 기록 <strong>25</);
  assert.equal(h.elements['ps3-reserve'].attributes['aria-pressed'], 'true');
  assert.equal(new Set([...active, ...h.keys()]).size, 55);
  assert.deepEqual([...active, ...h.keys()].sort(), [...h.fixtures.keys].sort());
});

test('PS3 controls remain exclusive while scored platforms expose personal sorting', async () => {
  const h = await createHarness({ query: '?platform=ps2' });
  for (const platform of otherPlatforms) {
    const count = readRows(h.fixtures.data[`platforms/${platform}/${platform === 'dreamcast' ? 'README.md' : 'recommendations.md'}`]).length;
    await h.platform(platform);
    assert.equal(h.keys().length, count);
    assert.equal(h.elements['ps3-views'].hidden, true);
    assert.equal(h.sorts.find(x => x.dataset.sort === 'personal').hidden, platform === 'dreamcast');
    assert.equal(h.elements['recommendation-views'].hidden, platform === 'dreamcast');
  }
  await h.sort('title');
  await h.sort('title');
  await h.platform('psp');
  assert.ok(h.sorts.find(x => x.dataset.sort === 'personal').classes.has('active'));
});

test('direct reserve URL, repeated reserve clicks, platform switch and history restoration', async () => {
  const h = await createHarness({ query: '?platform=ps3&view=reserve' });
  assert.equal(h.keys().length, 25);
  await h.click('ps3-reserve'); await h.click('ps3-reserve');
  assert.equal(h.history.entries.length, 1);
  await h.click('ps3-selected');
  assert.equal(h.keys().length, 30);
  assert.equal(h.location.searchParams.has('view'), false);
  await h.platform('psp');
  assert.equal(h.keys().length, readRows(h.fixtures.data['platforms/psp/recommendations.md']).length);
  assert.equal(h.location.searchParams.get('platform'), 'psp');
  await h.history.back();
  assert.equal(h.elements['platform-title'].textContent, 'PS3 선정 후보');
  await h.history.back();
  assert.equal(h.keys().length, 25);
  assert.equal(h.elements['platform-title'].textContent, 'PS3 예비 목록');
  await h.history.forward();
  assert.equal(h.keys().length, 30);
});

test('personal and quality scores are independent; personal score sort never reorders favorites', () => {
  const rows = [
    { key: 'a', title: 'A', personalScore: 9, personalRank: 2, ratingValue: 3.5 },
    { key: 'b', title: 'B', personalScore: 7, personalRank: 4, ratingValue: 5 },
    { key: 'c', title: 'C', personalScore: 9, personalRank: 1, ratingValue: 3 },
    { key: 'd', title: 'D', personalScore: 8, personalRank: 3, ratingValue: 4 },
  ];
  assert.deepEqual(core.groupRows(rows, {}, 'personal', true).rest.map(x => x.key), ['c', 'a', 'd', 'b']);
  assert.deepEqual(core.groupRows(rows, {}, 'personal', false).rest.map(x => x.key), ['b', 'd', 'a', 'c']);
  assert.deepEqual(core.groupRows(rows, {}, 'rating', true).rest.map(x => x.key), ['b', 'd', 'a', 'c']);
  const wl = { order: ['b', 'a'], items: { a: {}, b: {} } };
  assert.deepEqual(core.groupRows(rows, wl, 'personal', true).star.map(x => x.key), ['b', 'a']);
  assert.deepEqual(core.groupRows(rows, wl, 'personal', false).star.map(x => x.key), ['b', 'a']);
});

test('reserve favorites, notes and started entries remain accessible through read-only My list', async () => {
  const h = await createHarness();
  const initial = JSON.stringify(h.fixtures.watchlist);
  await h.click('my-list-summary');
  assert.equal(h.elements['platform-title'].textContent, '내 목록');
  for (const key of h.fixtures.watchlist.order) assert.ok(h.keys().includes(key), key);
  for (const patch of h.fixtures.patches.patches) assert.ok(h.keys().includes(patch.discovery), patch.discovery);
  const starPositions = h.fixtures.watchlist.order.map(key => h.keys().indexOf(key));
  assert.deepEqual([...starPositions].sort((a, b) => a - b), starPositions);
  const html = h.elements['candidate-body'].innerHTML;
  assert.match(html, /local fixture memo/);
  assert.match(html, /note-readonly/);
  assert.match(html, /reserve-label/);
  assert.match(html, /patch-badge wip/);
  assert.doesNotMatch(html, /class="star-toggle|note-edit|drag-handle/);
  assert.equal(JSON.stringify(h.fixtures.watchlist), initial);
  assert.ok(h.calls.every(call => call.method === 'GET'));
  await h.click('watch-only');
  assert.equal(h.keys().length, 4);
});

test('search matches reserve reason and notes; platform reset restores unfiltered rows', async () => {
  const h = await createHarness({ query: '?platform=ps3&view=reserve' });
  await h.search('한국어 대안');
  assert.deepEqual(h.keys(), [h.fixtures.keys[0]]);
  await h.search('local fixture memo');
  assert.equal(h.keys().length, 2);
  await h.search('definitely no matching title');
  assert.equal(h.keys().length, 0);
  assert.match(h.elements['candidate-body'].innerHTML, /검색 결과가 없습니다/);
  await h.platform('ps3');
  assert.equal(h.keys().length, 30);
});

test('PS3 default sort displays descending personal scores, global rank gaps, and separate stars', async () => {
  const h = await createHarness();
  const keysWithoutStars = h.keys().filter(key => !h.fixtures.watchlist.items[key]);
  assert.deepEqual(keysWithoutStars, h.fixtures.keys.slice(1, 31).filter(key => !h.fixtures.watchlist.items[key]));
  assert.match(h.elements['candidate-body'].innerHTML, /개인 9\.9\/10 · 2위/);
  assert.match(h.elements['candidate-body'].innerHTML, /quality-rating">작품성 .*3\.5\/5/);
  assert.doesNotMatch(h.elements['candidate-body'].innerHTML, /\/5\s*\/\s*5/);
  await h.sort('personal');
  assert.deepEqual(h.keys().filter(key => !h.fixtures.watchlist.items[key]), [...keysWithoutStars].reverse());
});

test('failed reserve fetch is visible and retryable, never silently hides reserve favorites', async () => {
  let fail = true;
  const h = await createHarness({ beforeFetch: async url => { if (fail && url.includes('/ps3/reserve.md')) throw new Error('fixture network failure'); } });
  assert.equal(h.elements['table-wrap'].hidden, true);
  assert.match(h.elements.status.textContent, /fixture network failure/);
  fail = false;
  await h.platform('ps3');
  assert.equal(h.keys().length, 30);
  assert.equal(h.elements.status.hidden, true);
  await h.click('my-list-summary');
  assert.ok(h.keys().includes(h.fixtures.keys[34]));
});

test('overlapping platform navigation renders only the most recent selection', async () => {
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  const h = await createHarness({ beforeFetch: async url => { if (url.includes('/psvita/README.md')) await wait; } });
  const first = h.platform('psvita');
  await h.platform('dreamcast');
  const expectedCount = readRows(h.fixtures.data['platforms/dreamcast/README.md']).length;
  assert.equal(h.keys().length, expectedCount);
  release(); await first;
  assert.equal(h.elements['platform-eyebrow'].textContent, 'DREAMCAST');
  assert.equal(h.keys().length, expectedCount);
});

test('data contract rejects duplicate active/reserve keys and renders unavailable scores honestly', async () => {
  const fixtures = createFixtures();
  const lines = fixtures.data['platforms/ps3/README.md'].split('\n');
  const row = lines.find(line => line.startsWith('| [')).split('|');
  row[row.length - 4] = ' '; row[row.length - 3] = ' ';
  lines[lines.findIndex(line => line.startsWith('| ['))] = row.join('|');
  fixtures.data['platforms/ps3/README.md'] = lines.join('\n');
  const h = await createHarness({ fixtures });
  assert.match(h.elements['candidate-body'].innerHTML, /개인 미평가/);
  fixtures.data['platforms/ps3/reserve.md'] += lines.find(line => line.startsWith('| [')) + '\n';
  const invalid = await createHarness({ fixtures });
  assert.match(invalid.elements.status.textContent, /중복되거나 빈 문서 경로/);
});

test('read-only comparison deep links include reserved favorites and stable detail URLs', async () => {
  const fixtures = createFixtures();
  const keys = [fixtures.keys[33], fixtures.keys[34]];
  const h = await createHarness({ fixtures, query: '?platform=ps3&view=reserve' + core.compareHash(keys) });
  assert.equal(h.elements['compare-dialog'].open, true);
  assert.match(h.elements['compare-content'].innerHTML, /PS3 fixture/);
  assert.match(h.elements['compare-content'].innerHTML, /local fixture memo/);
  assert.doesNotMatch(h.elements['compare-content'].innerHTML, /class="compare-top"/);
  const detail = 'game.html?file=' + encodeURIComponent(keys[0]);
  assert.ok(h.elements['candidate-body'].innerHTML.includes(detail));
  assert.ok(h.calls.every(call => call.method === 'GET'));
  await h.click('compare-close');
  assert.equal(h.elements['compare-dialog'].open, false);
});

test('direct My list URL includes reserve favorites and returns to selected PS3', async () => {
  const h = await createHarness({ query: '?platform=ps3&view=my-list' });
  assert.equal(h.elements['platform-title'].textContent, '내 목록');
  assert.ok(h.keys().includes(h.fixtures.keys[34]));
  assert.equal(h.elements['ps3-views'].hidden, true);
  await h.platform('ps3');
  assert.equal(h.keys().length, 30);
  assert.equal(h.elements['ps3-views'].hidden, false);
});

test('authored display rules explicitly preserve hidden PS3 controls on other platforms', () => {
  const css = fs.readFileSync(path.join(root, 'docs/assets/style.css'), 'utf8');
  assert.match(css, /\.ps3-views\[hidden\],\s*\.sort-btn\[hidden\]\s*\{\s*display:\s*none;\s*\}/);
});

test('Back restores a reserve comparison; Forward closes it when compare hash is absent', async () => {
  const fixtures = createFixtures();
  const keys = [fixtures.keys[33], fixtures.keys[34]];
  const h = await createHarness({ fixtures, query: '?platform=ps3&view=reserve' + core.compareHash(keys) });
  assert.equal(h.elements['compare-dialog'].open, true);
  await h.click('compare-close');
  await h.click('ps3-selected');
  assert.equal(h.location.hash, '');
  await h.history.back();
  assert.equal(h.elements['compare-dialog'].open, true);
  assert.equal(h.elements['platform-title'].textContent, 'PS3 예비 목록');
  await h.history.forward();
  assert.equal(h.location.hash, '');
  assert.equal(h.elements['compare-dialog'].open, false);
  assert.equal(h.elements['compare-bar'].hidden, true);
  assert.equal(h.elements['platform-title'].textContent, 'PS3 선정 후보');
  const comparisonReads = h.calls.filter(call => keys.some(key => call.url.includes('/main/' + key)));
  assert.equal(comparisonReads.length, 4, 'popstate plus hashchange must not duplicate comparison fetches');
});

test('late comparison responses are discarded after Forward dismisses pending comparison', async () => {
  const fixtures = createFixtures();
  const keys = [fixtures.keys[33], fixtures.keys[34]];
  let delayed = false; let release;
  const gate = new Promise(resolve => { release = resolve; });
  const h = await createHarness({ fixtures, query: '?platform=ps3&view=reserve' + core.compareHash(keys), beforeFetch: async url => {
    if (delayed && keys.some(key => url.includes('/main/' + key))) await gate;
  } });
  await h.click('compare-close');
  await h.click('ps3-selected');
  delayed = true;
  const restoring = h.history.back();
  assert.equal(h.elements['compare-dialog'].open, true);
  await h.history.forward();
  assert.equal(h.elements['compare-dialog'].open, false);
  const closedContent = h.elements['compare-content'].innerHTML;
  release(); await restoring;
  assert.equal(h.elements['compare-dialog'].open, false);
  assert.equal(h.elements['compare-content'].innerHTML, closedContent);
  assert.equal(h.elements['platform-title'].textContent, 'PS3 선정 후보');
});

test('removing or invalidating a comparison hash dismisses its modal', async () => {
  const fixtures = createFixtures();
  const keys = [fixtures.keys[33], fixtures.keys[34]];
  const h = await createHarness({ fixtures, query: '?platform=ps3&view=reserve' + core.compareHash(keys) });
  await h.hash('#compare=not-a-favorite,also-invalid');
  assert.equal(h.elements['compare-dialog'].open, false);
  assert.equal(h.elements['compare-bar'].hidden, true);
  await h.hash(core.compareHash(keys));
  assert.equal(h.elements['compare-dialog'].open, true);
  await h.hash('');
  assert.equal(h.elements['compare-dialog'].open, false);
});

test('My list statistics use all favorite/started records, including reserves', async () => {
  const h = await createHarness();
  assert.match(h.elements.stats.innerHTML, /등록 후보 <strong>30</);
  await h.click('my-list-summary');
  assert.equal(h.keys().length, 6);
  assert.match(h.elements.stats.innerHTML, /내 목록 <strong>6</);
  await h.search('definitely no matching title');
  assert.equal(h.keys().length, 0);
  assert.match(h.elements.stats.innerHTML, /내 목록 <strong>6</, 'stats represent the complete My list before search');
  await h.platform('ps3');
  assert.match(h.elements.stats.innerHTML, /등록 후보 <strong>30</);
});

test('PS3 exclusion filtering respects both selected/reserve and My-list favorites/started rows', async () => {
  const fixtures = createFixtures();
  const excluded = [fixtures.keys[3], fixtures.keys[34], fixtures.keys[32]];
  fixtures.exclusions = { version: 1, entries: Object.fromEntries(excluded.map(key => [key, { deleted: true, title: 'Synthetic exclusion fixture', updated: '2026-10-08T00:00:00Z' }])) };
  const watchlistBefore = JSON.stringify(fixtures.watchlist);
  const h = await createHarness({ fixtures });
  assert.equal(h.keys().length, 29);
  assert.equal(h.elements['ps3-selected'].textContent, '선정 29개');
  assert.equal(h.elements['ps3-reserve'].textContent, '예비 23개');
  assert.match(h.elements.stats.innerHTML, /등록 후보 <strong>29</);
  await h.click('ps3-reserve');
  assert.equal(h.keys().length, 23);
  await h.click('my-list-summary');
  assert.equal(h.keys().length, 3);
  assert.match(h.elements.stats.innerHTML, /내 목록 <strong>3</);
  assert.match(h.elements['my-list-summary'].textContent, /찜 2 · 🛠 착수 1/);
  for (const key of excluded) assert.ok(!h.keys().includes(key));
  assert.equal(h.elements['deleted-open'].hidden, true);
  assert.doesNotMatch(h.elements['candidate-body'].innerHTML, /candidate-delete/);
  assert.equal(JSON.stringify(fixtures.watchlist), watchlistBefore);
  assert.ok(h.calls.every(call => call.method === 'GET'));
  // Simulate another client restoring records in its response, without invoking a write.
  for (const entry of Object.values(fixtures.exclusions.entries)) entry.deleted = false;
  await h.click('deletion-sync-retry');
  assert.equal(h.keys().length, 6);
  assert.match(h.elements['candidate-body'].innerHTML, /local fixture memo/);
  await h.platform('ps3');
  assert.equal(h.keys().length, 30);
  assert.equal(h.elements['ps3-reserve'].textContent, '예비 25개');
  assert.equal(JSON.stringify(fixtures.watchlist), watchlistBefore);
  assert.ok(h.calls.every(call => call.method === 'GET'));
});

test('excluded reserve favorites cannot reopen through a comparison deep link', async () => {
  const fixtures = createFixtures();
  const keys = [fixtures.keys[33], fixtures.keys[34]];
  fixtures.exclusions = { version: 1, entries: { [keys[1]]: { deleted: true, title: 'Synthetic exclusion fixture', updated: '2026-10-08T00:00:00Z' } } };
  const h = await createHarness({ fixtures, query: '?platform=ps3&view=reserve' + core.compareHash(keys) });
  assert.notEqual(h.elements['compare-dialog'].open, true);
  assert.equal(h.location.hash, '');
  assert.equal(h.elements['compare-bar'].hidden, true);
  assert.ok(!h.keys().includes(keys[1]));
  assert.ok(!h.calls.some(call => call.url.includes('/main/' + keys[1])));
});

test('final PS3 editorial tables render exactly 30/25 with real personal scores', async () => {
  const fixtures = createFixtures();
  for (const filename of ['README.md', 'reserve.md']) fixtures.data[`platforms/ps3/${filename}`] = fs.readFileSync(path.join(root, `platforms/ps3/${filename}`), 'utf8');
  fixtures.watchlist = { version: 1, items: {}, order: [] };
  fixtures.patches = { patches: [] };
  const key = row => 'platforms/ps3/' + row['게임'].match(/\]\(([^)]+)\)$/)[1];
  const expected = file => readRows(fixtures.data[`platforms/ps3/${file}`]).sort((a,b) => Number(b['개인 추천점수']) - Number(a['개인 추천점수']) || Number(a['개인 순위']) - Number(b['개인 순위'])).map(key);
  const h = await createHarness({ fixtures });
  assert.equal(h.keys().length, 30);
  assert.deepEqual(h.keys(), expected('README.md'));
  const active = h.keys();
  await h.click('ps3-reserve');
  assert.equal(h.keys().length, 25);
  assert.deepEqual(h.keys(), expected('reserve.md'));
  assert.equal(new Set([...active, ...h.keys()]).size, 55);
  assert.doesNotMatch(h.elements['candidate-body'].innerHTML, /개인 미평가/);
});
