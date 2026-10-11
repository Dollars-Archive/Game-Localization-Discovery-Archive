const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, readRows, createFixtures, createHarness } = require('./helpers/index-harness.cjs');
const platform = 'dreamcast';
const date = '2026-10-09';
const reportPath = `platforms/${platform}/reassessments/${date}-review-assessments.json`;
const rankingPath = `platforms/${platform}/recommendations.md`;
const labels = { supported: '근거 충분', provisional: '잠정', held: '평가보류' };
const keyOf = row => `platforms/${platform}/` + row['게임'].match(/\]\(([^)]+)\)/)[1];

// Synthetic scores exercise every evidence state independently of editorial findings.
// They exist only inside the local test harness, never in published ranking data.
function syntheticFixtures() {
  const fixtures = createFixtures();
  const original = readRows(fixtures.data[`platforms/${platform}/README.md`]);
  const rows = original.slice(0, 4).sort((a, b) => keyOf(a).localeCompare(keyOf(b), 'en'));
  const headers = [...Object.keys(rows[0]), '목록 구분', '예비 사유', '리뷰 점수', '리뷰 순위', '평가 근거', '점수 구분'];
  const states = ['근거 충분', '잠정', '잠정', '평가보류'];
  const score = [8, 7.5, 7.5, '평가보류'];
  const ranks = ['1', '2 (공동)', '2 (공동)', '—'];
  fixtures.data[rankingPath] = '| ' + headers.join(' | ') + ' |\n| ' + headers.map(() => '---').join(' | ') + ' |\n'
    + rows.map((row, i) => '| ' + headers.map(h => ({ ...row, '목록 구분': '기존 목록', '예비 사유': '', '리뷰 점수': score[i], '리뷰 순위': ranks[i], '평가 근거': `합성 검증 근거 ${i}`, '점수 구분': states[i] }[h])).join(' | ') + ' |').join('\n');
  // Limit README to the same synthetic scope so the living-record fallback stays separate.
  const oldHeaders = Object.keys(rows[0]);
  fixtures.data[`platforms/${platform}/README.md`] = '| ' + oldHeaders.join(' | ') + ' |\n| ' + oldHeaders.map(() => '---').join(' | ') + ' |\n'
    + rows.map(row => '| ' + oldHeaders.map(h => row[h]).join(' | ') + ' |').join('\n');
  fixtures.watchlist = { version: 1, order: [], items: {} };
  fixtures.patches = { patches: [] };
  return { fixtures, keys: rows.map(keyOf) };
}

test('Dreamcast review UI sorts scores, keeps equal scores tied and held entries last in both directions', async () => {
  const { fixtures, keys } = syntheticFixtures();
  const h = await createHarness({ fixtures, query: '?platform=dreamcast' });
  assert.deepEqual(h.keys(), keys);
  assert.match(h.elements['candidate-body'].innerHTML, /리뷰 8\.0\/10 · 1위/);
  assert.match(h.elements['candidate-body'].innerHTML, /공동 2위/);
  assert.match(h.elements['candidate-body'].innerHTML, /기존 평가/);
  assert.match(h.elements['source-note'].innerHTML, /dreamcast\/reassessments\/2026-10-09-review-assessments\.md/);
  assert.doesNotMatch(h.elements['source-note'].innerHTML, /dreamcast\/reassessments\/2026-10-08/);
  assert.equal(h.elements['ps3-views'].hidden, true);
  assert.equal(h.elements['recommendation-views'].hidden, false);
  await h.sort('personal');
  assert.deepEqual(h.keys(), [keys[1], keys[2], keys[0], keys[3]]);
  await h.sort('personal');
  assert.deepEqual(h.keys(), keys);
  h.elements['review-evidence'].value = 'held';
  await h.elements['review-evidence'].fire('change');
  assert.deepEqual(h.keys(), [keys[3]]);
  assert.doesNotMatch(h.elements['candidate-body'].innerHTML, /\/10|공동 \d+위/);
  h.elements['review-evidence'].value = 'provisional';
  await h.elements['review-evidence'].fire('change');
  assert.deepEqual(h.keys(), [keys[1], keys[2]]);
  assert.ok(h.calls.every(call => call.method === 'GET'));
});

test('Dreamcast all/active/empty-reserve views, repeated clicks and history restore retain scope', async () => {
  const { fixtures, keys } = syntheticFixtures();
  const h = await createHarness({ fixtures, query: '?platform=dreamcast&view=reserve' });
  assert.deepEqual(h.keys(), []);
  await h.click('recommendations-reserve');
  assert.deepEqual(h.keys(), []);
  await h.click('recommendations-active');
  assert.deepEqual(h.keys(), keys);
  await h.history.back();
  assert.deepEqual(h.keys(), []);
  await h.click('recommendations-all');
  assert.deepEqual(h.keys(), keys);
  await h.search('합성 검증 근거 3');
  assert.deepEqual(h.keys(), [keys[3]]);
});

test('Dreamcast favorites, held scores, notes and exclusions remain independent of score sorting', async () => {
  const { fixtures, keys } = syntheticFixtures();
  fixtures.watchlist = { version: 1, order: [keys[3], keys[0]], items: {
    [keys[3]]: { added: `${date}T00:00:00Z`, note: 'Dreamcast retained memo' },
    [keys[0]]: { added: `${date}T00:00:00Z`, note: 'second memo' },
  } };
  const snapshot = JSON.stringify(fixtures.watchlist);
  const h = await createHarness({ fixtures, query: '?platform=dreamcast' });
  await h.click('my-list-summary');
  assert.deepEqual(h.keys(), [keys[3], keys[0]]);
  await h.sort('personal');
  assert.deepEqual(h.keys(), [keys[3], keys[0]]);
  assert.match(h.elements['candidate-body'].innerHTML, /Dreamcast retained memo/);
  assert.match(h.elements['candidate-body'].innerHTML, /held-score/);
  assert.equal(JSON.stringify(fixtures.watchlist), snapshot);
  fixtures.exclusions.entries[keys[0]] = { deleted: true, updated: `${date}T00:00:00Z`, title: 'local fixture only' };
  const excluded = await createHarness({ fixtures, query: '?platform=dreamcast&my=1' });
  await excluded.click('my-list-summary');
  assert.ok(!excluded.keys().includes(keys[0]));
  assert.equal(JSON.stringify(fixtures.watchlist), snapshot);
  assert.ok([...h.calls, ...excluded.calls].every(call => call.method === 'GET'));
});

test('switching away from Dreamcast preserves established platform score labels and report dates', async () => {
  const { fixtures } = syntheticFixtures();
  const h = await createHarness({ fixtures, query: '?platform=dreamcast' });
  for (const p of ['ps2', 'psp', 'psvita']) {
    await h.platform(p);
    assert.match(h.elements['source-note'].innerHTML, new RegExp(`${p}/reassessments/2026-10-08-review-assessments`));
    assert.match(h.sorts.find(x => x.dataset.sort === 'personal').textContent, /리뷰 기반 작품 점수/);
  }
  await h.platform('ps3');
  assert.match(h.sorts.find(x => x.dataset.sort === 'personal').textContent, /개인 추천점수/);
  assert.doesNotMatch(h.elements['source-note'].innerHTML, /리뷰 근거 기반 작품 평가/);
  await h.platform('dreamcast');
  assert.match(h.elements['source-note'].innerHTML, /2026-10-09-review-assessments/);
});

test('Dreamcast final editorial coverage, evidence, original qualifications and shared ranks are coherent', () => {
  const record = JSON.parse(fs.readFileSync(path.join(root, reportPath), 'utf8'));
  const rows = readRows(fs.readFileSync(path.join(root, rankingPath), 'utf8'));
  const original = readRows(fs.readFileSync(path.join(root, 'platforms/dreamcast/README.md'), 'utf8'));
  const originalByKey = new Map(original.map(row => [keyOf(row), row]));
  assert.equal(record.games.length, 33);
  assert.equal(rows.length, 33);
  assert.equal(record.counts.active, 33);
  assert.equal(record.counts.reserve, 0);
  assert.equal(record.scoring.method, 'review-evidence-editorial-synthesis');
  assert.equal(record.scoring.weights, undefined);
  assert.deepEqual(record.games.map(g => g.path).sort(), [...originalByKey.keys()].sort());
  assert.deepEqual(record.games.map(g => g.slug), [...record.games].sort((a, b) => Number(a.reviewScore == null) - Number(b.reviewScore == null)
    || (b.reviewScore || 0) - (a.reviewScore || 0) || a.slug.localeCompare(b.slug, 'en')).map(g => g.slug));
  for (const [i, g] of record.games.entries()) {
    const row = rows[i];
    const old = originalByKey.get(g.path);
    assert.equal(g.pool, 'active');
    assert.equal(row['목록 구분'], '기존 목록');
    for (const h of Object.keys(old)) assert.equal(row[h], old[h], `${g.slug}:${h}`);
    assert.equal(row['점수 구분'], labels[g.scoreStatus]);
    assert.ok(g.rationale && g.evidenceLimits && g.editionNotes && g.sourcePaths.length);
    assert.deepEqual(Object.keys(g.assessmentAxes).sort(), ['content', 'execution', 'presentation', 'systems']);
    assert.doesNotMatch(g.rationale, /취향|한글화|한국어|희소|독점/);
    const prose = [g.rationale, ...Object.values(g.assessmentAxes), g.editionNotes, ...g.reviewEvidence.map(e => e.findings)].join(' ');
    assert.doesNotMatch(prose, /정체|결말|반전|복선|배신|진범|흑막|떡밥/);
    if (g.scoreStatus === 'held') {
      assert.equal(g.reviewScore, null);
      assert.equal(g.reviewRank, null);
      assert.equal(g.sharedRank, false);
      assert.equal(row['리뷰 점수'], '평가보류');
      assert.equal(row['리뷰 순위'], '—');
    } else {
      assert.ok(g.reviewScore >= 1 && g.reviewScore <= 10);
      if (g.scoreStatus === 'provisional') assert.ok(Number.isInteger(g.reviewScore * 2));
      if (g.scoreStatus === 'supported') assert.ok(g.independentTargetAuthors >= 2 && g.substantiveReviewBasis);
      const higher = record.games.filter(other => other.reviewScore != null && other.reviewScore > g.reviewScore).length;
      assert.equal(g.reviewRank, higher + 1);
      assert.equal(g.sharedRank, record.games.filter(other => other.reviewScore === g.reviewScore).length > 1);
      assert.equal(Number(row['리뷰 점수']), g.reviewScore);
      assert.equal(parseInt(row['리뷰 순위'], 10), g.reviewRank);
      assert.equal(row['리뷰 순위'].includes('공동'), g.sharedRank);
    }
    assert.ok(g.reviewEvidence.length);
    for (const e of g.reviewEvidence) {
      assert.ok(e.source && e.url && e.edition && e.sampleKind && e.findings);
      assert.equal(e.auditedAt, date);
      assert.ok(['live', 'archived'].includes(e.verification));
      assert.ok(e.originalRating == null || typeof e.originalRating === 'string');
      assert.ok(e.sampleSize == null || Number.isInteger(e.sampleSize) && e.sampleSize >= 0);
    }
    const document = fs.readFileSync(path.join(root, g.path), 'utf8');
    assert.match(document, /## 2026-10-09 리뷰 근거 기반 작품 평가/);
    assert.match(document, /기존 5점 평가/);
    assert.ok(document.indexOf('## 2026-10-09 리뷰 근거 기반 작품 평가') < document.indexOf('## 한눈에 보기'));
  }
});
