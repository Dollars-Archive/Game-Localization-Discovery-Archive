const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, readRows, createFixtures, createHarness } = require('./helpers/index-harness.cjs');
const platforms = { ps2: 69, psp: 123, psvita: 51 };
const data = p => JSON.parse(fs.readFileSync(path.join(root, `platforms/${p}/reassessments/2026-10-08-review-assessments.json`), 'utf8'));
const labels = { supported: '근거 충분', provisional: '잠정', held: '평가보류' };

for (const [platform, total] of Object.entries(platforms)) {
  test(`${platform}: review assessment coverage, evidence limits, shared ranks and held records are coherent`, () => {
    const record = data(platform);
    const previous = JSON.parse(fs.readFileSync(path.join(root, `platforms/${platform}/reassessments/2026-10-08-personal-recommendations.json`), 'utf8'));
    assert.equal(record.games.length, total);
    assert.equal(new Set(record.games.map(g => g.slug)).size, total);
    assert.deepEqual(record.scope, previous.scope);
    const pools = xs => xs.map(g => `${g.slug}:${g.pool}`).sort();
    assert.deepEqual(pools(record.games), pools(previous.games));
    assert.equal(record.scoring.method, 'review-evidence-editorial-synthesis');
    assert.equal(record.scoring.weights, undefined);
    const sorted = [...record.games].sort((a, b) => Number(a.reviewScore == null) - Number(b.reviewScore == null)
      || (b.reviewScore || 0) - (a.reviewScore || 0) || a.slug.localeCompare(b.slug, 'en'));
    assert.deepEqual(record.games.map(g => g.slug), sorted.map(g => g.slug));
    const rows = readRows(fs.readFileSync(path.join(root, `platforms/${platform}/recommendations.md`), 'utf8'));
    assert.equal(rows.length, total);
    for (const [i, game] of record.games.entries()) {
      assert.ok(labels[game.scoreStatus]);
      assert.equal(game.personalScore, undefined);
      assert.equal(game.components, undefined);
      assert.ok(game.rationale && game.evidenceLimits && game.sourcePaths.length);
      assert.doesNotMatch(game.rationale, /취향|한글화|한국어|희소|독점/);
      const prose = [game.rationale, ...Object.values(game.assessmentAxes), game.editionNotes,
        ...game.reviewEvidence.map(e => e.findings)].join(' ');
      assert.doesNotMatch(prose, /정체|결말|반전|복선|배신|진범|흑막|떡밥/);
      if (game.scoreStatus === 'held') {
        assert.equal(game.reviewScore, null);
        assert.equal(game.reviewRank, null);
        assert.equal(game.sharedRank, false);
        assert.equal(rows[i]['리뷰 점수'], '평가보류');
        assert.equal(rows[i]['리뷰 순위'], '—');
      } else {
        assert.ok(game.reviewScore >= 1 && game.reviewScore <= 10);
        assert.ok(Math.abs(game.reviewScore * 10 - Math.round(game.reviewScore * 10)) < 1e-8);
        if (game.scoreStatus === 'provisional') assert.ok(Number.isInteger(game.reviewScore * 2));
        if (game.scoreStatus === 'supported') {
          assert.ok(game.independentTargetAuthors >= 2, game.slug);
          assert.ok(game.substantiveReviewBasis, game.slug);
        }
        const higher = record.games.filter(g => g.reviewScore != null && g.reviewScore > game.reviewScore).length;
        assert.equal(game.reviewRank, higher + 1);
        const tied = record.games.filter(g => g.reviewScore === game.reviewScore).length > 1;
        assert.equal(game.sharedRank, tied);
        assert.equal(Number(rows[i]['리뷰 점수']), game.reviewScore);
        assert.equal(parseInt(rows[i]['리뷰 순위'], 10), game.reviewRank);
        assert.equal(rows[i]['리뷰 순위'].includes('공동'), tied);
      }
      assert.equal(rows[i]['점수 구분'], labels[game.scoreStatus]);
      assert.ok(rows[i]['게임'].includes(`games/${game.slug}.md`));
      assert.ok(fs.existsSync(path.join(root, game.path)));
      for (const e of game.reviewEvidence) {
        assert.ok(e.source && e.edition && e.sampleKind);
        assert.ok(e.originalRating == null || typeof e.originalRating === 'string');
        assert.ok(e.sampleSize == null || Number.isInteger(e.sampleSize) && e.sampleSize >= 0);
        assert.ok(['archived', 'live'].includes(e.verification));
        assert.equal(e.auditedAt, '2026-10-08');
      }
      const document = fs.readFileSync(path.join(root, game.path), 'utf8');
      assert.match(document, /## 2026-10-08 리뷰 근거 기반 작품 평가/);
      assert.doesNotMatch(document, /## 2026-10-08 개인 추천과 전체 순위/);
    }
  });

  test(`${platform}: held records stay visible, searchable and favoriteable without invented numeric scores`, async () => {
    const record = data(platform);
    const held = record.games.filter(g => g.scoreStatus === 'held');
    const fixtures = createFixtures();
    fixtures.watchlist = { version: 1, order: [], items: {} };
    fixtures.patches = { patches: [] };
    const h = await createHarness({ fixtures, query: `?platform=${platform}` });
    assert.match(h.elements['source-note'].innerHTML, /원평점·표본 수·판본/);
    assert.match(h.sorts.find(x => x.dataset.sort === 'personal').textContent, /리뷰 기반 작품 점수/);
    assert.doesNotMatch(h.elements['candidate-body'].innerHTML, /개인 /);
    await h.sort('personal');
    const reversed = [...record.games].sort((a, b) => Number(a.reviewScore == null) - Number(b.reviewScore == null)
      || (a.reviewScore || 0) - (b.reviewScore || 0) || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
    assert.deepEqual(h.keys(), reversed.map(g => g.path));
    h.elements['review-evidence'].value = 'held';
    await h.elements['review-evidence'].fire('change');
    assert.deepEqual(h.keys(), held.map(g => g.path));
    if (held.length) {
      const key = held[0].path;
      fixtures.watchlist = { version: 1, order: [key], items: { [key]: { added: '2026-10-08T00:00:00Z', note: 'held evidence note' } } };
      const favorite = await createHarness({ fixtures, query: `?platform=${platform}` });
      await favorite.click('my-list-summary');
      assert.deepEqual(favorite.keys(), [key]);
      assert.match(favorite.elements['candidate-body'].innerHTML, /held evidence note/);
      assert.match(favorite.elements['candidate-body'].innerHTML, /held-score">평가보류/);
      assert.doesNotMatch(favorite.elements['candidate-body'].innerHTML, /\/10|공동 \d+위/);
      assert.ok(favorite.calls.every(call => call.method === 'GET'));
    }
  });
}

test('PS3 keeps its personal recommendation label and score contract after platform switches', async () => {
  const h = await createHarness({ query: '?platform=ps2' });
  await h.platform('ps3');
  assert.match(h.sorts.find(x => x.dataset.sort === 'personal').textContent, /개인 추천점수/);
  assert.match(h.elements['candidate-body'].innerHTML, /개인 9\.9\/10 · 2위/);
  assert.doesNotMatch(h.elements['source-note'].innerHTML, /리뷰 근거 기반 작품 평가/);
});
