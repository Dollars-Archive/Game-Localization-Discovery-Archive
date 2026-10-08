const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, readRows, createFixtures, createHarness } = require('./helpers/index-harness.cjs');
const expected = { ps2: [69, 40, 29], psp: [123, 30, 93], psvita: [51, 26, 25] };
const data = p => JSON.parse(fs.readFileSync(path.join(root, `platforms/${p}/reassessments/2026-10-08-personal-recommendations.json`), 'utf8'));
const currentData = p => JSON.parse(fs.readFileSync(path.join(root, `platforms/${p}/reassessments/2026-10-08-review-assessments.json`), 'utf8'));
const slugOf = entry => typeof entry === 'string' ? entry : entry.slug;

for (const [platform, [total, active, reserve]] of Object.entries(expected)) {
  test(`${platform}: superseded personal recommendation data remains intact as history`, () => {
    const record = data(platform);
    assert.equal(record.games.length, total);
    assert.equal(record.games.filter(g => g.pool === 'active').length, active);
    assert.equal(record.games.filter(g => g.pool === 'reserve').length, reserve);
    const slugs = record.games.map(g => g.slug);
    assert.equal(new Set(slugs).size, total);
    const scope = record.scope;
    const targets = scope.targets || [...scope.active, ...scope.reserve];
    assert.deepEqual([...targets.map(slugOf)].sort(), [...slugs].sort());
    const excluded = new Set(scope.excluded.map(slugOf));
    assert.ok(slugs.every(slug => !excluded.has(slug)));
    for (const [i, game] of record.games.entries()) {
      assert.equal(game.personalRank, i + 1);
      const c = game.components;
      for (const value of Object.values(c)) {
        assert.ok(value >= 1 && value <= 10);
        assert.ok(Math.abs(value * 10 - Math.round(value * 10)) < 1e-8);
      }
      const units = Math.round(c.experience * 10) * 4 + Math.round(c.personalFit * 10) * 3
        + Math.round(c.localizationValue * 10) * 2 + Math.round(c.platformValue * 10);
      assert.equal(game.rawScore, units / 100);
      assert.equal(game.personalScore, Math.floor((units + 5) / 10) / 10);
      assert.ok(game.personalScore >= 1 && game.personalScore <= 10);
      assert.ok(game.rationale && game.evidenceLimits && game.sourcePaths.length);
      assert.doesNotMatch(game.rationale, /정체|결말|반전|복선|최종장|범인|진상|배신/);
      assert.ok(['reviewed', 'provisional'].includes(game.scoreStatus));
      if (game.quality == null) assert.equal(game.scoreStatus, 'provisional');
      assert.ok(fs.existsSync(path.join(root, game.path)), game.path);
      for (const source of game.sourcePaths) assert.ok(fs.existsSync(path.join(root, source)), source);
    }
    const sorted = [...record.games].sort((a, b) => b.rawScore - a.rawScore
      || b.components.localizationValue - a.components.localizationValue
      || b.components.personalFit - a.components.personalFit
      || b.components.experience - a.components.experience
      || b.components.platformValue - a.components.platformValue
      || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
    assert.deepEqual(slugs, sorted.map(g => g.slug));
    assert.equal(record.historical, true);
    assert.equal(record.supersededBy, '2026-10-08-review-assessments.json');
  });

  test(`${platform}: all/active/reserve views, provisional search, favorites and exclusions survive`, async () => {
    const record = currentData(platform);
    const fixtures = createFixtures();
    fixtures.watchlist = { version: 1, order: [], items: {} };
    fixtures.patches = { patches: [] };
    const h = await createHarness({ fixtures, query: `?platform=${platform}` });
    assert.deepEqual(h.keys(), record.games.map(g => g.path));
    assert.equal(h.elements['ps3-views'].hidden, true);
    assert.equal(h.elements['recommendation-views'].hidden, false);
    assert.doesNotMatch(h.elements['candidate-body'].innerHTML, /개인 /);
    await h.click('recommendations-reserve');
    assert.deepEqual(h.keys(), record.games.filter(g => g.pool === 'reserve').map(g => g.path));
    assert.equal(h.location.searchParams.get('view'), 'reserve');
    await h.click('recommendations-active');
    assert.equal(h.keys().length, active);
    await h.history.back();
    assert.equal(h.keys().length, reserve);
    await h.click('recommendations-all');
    await h.search('잠정');
    for (const game of record.games.filter(g => g.scoreStatus === 'provisional')) assert.ok(h.keys().includes(game.path));
    if (record.games.some(g => g.scoreStatus === 'provisional')) assert.match(h.elements['candidate-body'].innerHTML, /provisional-score/);
    const candidates = record.games.filter(g => g.pool === 'reserve');
    const keys = [candidates[1].path, candidates[0].path];
    fixtures.watchlist = { version: 1, order: keys, items: Object.fromEntries(keys.map(key => [key, { added: '2026-10-08T00:00:00Z', note: 'preserved candidate memo' }])) };
    fixtures.exclusions.entries[keys[0]] = { deleted: true, updated: '2026-10-08T00:00:00Z', title: 'Excluded fixture' };
    const initial = JSON.stringify(fixtures.watchlist);
    const starred = await createHarness({ fixtures, query: `?platform=${platform}&view=reserve` });
    assert.ok(starred.keys().includes(keys[1]));
    assert.ok(!starred.keys().includes(keys[0]));
    assert.match(starred.elements['candidate-body'].innerHTML, /preserved candidate memo/);
    await starred.click('my-list-summary');
    assert.deepEqual(starred.keys(), [keys[1]]);
    assert.equal(JSON.stringify(fixtures.watchlist), initial);
    assert.ok(starred.calls.every(call => call.method === 'GET'));
  });
}

test('previously visible passed records stay accessible in My list without returning to rankings', async () => {
  const fixtures = createFixtures();
  const key = 'platforms/psp/games/hayate-no-gotoku-nightmare-paradise.md';
  fixtures.watchlist = { version: 1, order: [key], items: { [key]: { added: '2026-10-08T00:00:00Z', note: 'retained historical note' } } };
  fixtures.patches = { patches: [] };
  const h = await createHarness({ fixtures, query: '?platform=psp' });
  assert.ok(!h.keys().includes(key));
  await h.click('my-list-summary');
  assert.deepEqual(h.keys(), [key]);
  assert.match(h.elements['candidate-body'].innerHTML, /retained historical note/);
  assert.ok(h.calls.every(call => call.method === 'GET'));
});

test('a new living README record remains visible while awaiting review evidence', async () => {
  const fixtures = createFixtures();
  const name = 'platforms/psp/README.md';
  const lines = fixtures.data[name].split('\n');
  const first = lines.findIndex(line => line.startsWith('| ['));
  lines.splice(first, 0, lines[first].replace(/\]\(games\/[^)]+\)/, '](games/new-living-fixture.md)'));
  fixtures.data[name] = lines.join('\n');
  const h = await createHarness({ fixtures, query: '?platform=psp' });
  assert.ok(h.keys().includes('platforms/psp/games/new-living-fixture.md'));
  assert.match(h.elements['candidate-body'].innerHTML, /평가보류/);
  assert.equal(h.keys().length, 124);
});
