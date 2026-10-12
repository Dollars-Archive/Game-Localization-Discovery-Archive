const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, readRows, createHarness } = require('./helpers/index-harness.cjs');

const slug = 'platforms/switch/games/astral-takers.md';
const mamiya = 'platforms/switch/games/mamiya-a-shared-illusion-of-the-worlds-end.md';

test('Switch preserves an eligible MAMIYA and a below-threshold Astral Takers review', () => {
  const readme = fs.readFileSync(path.join(root, 'platforms/switch/README.md'), 'utf8');
  const rows = readRows(readme);
  assert.ok(rows.some(r => r['게임'].includes('mamiya-a-shared-illusion')));
  const astral = rows.find(r => r['게임'].includes('games/astral-takers.md'));
  assert.ok(astral, 'Astral Takers must remain reviewable in the Switch list');
  assert.match(astral['발굴 추천도'], /3.0\/5/);
  assert.match(astral['상태'], /패스/);
  assert.equal(astral['한글화 우선도'], '미부여');
  const rejectedCount = rows.filter(r => /패스/.test(r['상태'])).length;
  assert.ok(rejectedCount >= 1);
  assert.ok(readme.includes('기준 미달 평가 기록: **' + rejectedCount + '개**'));
  const detail = fs.readFileSync(path.join(root, slug), 'utf8');
  assert.match(detail, /한국어 미지원/);
  assert.match(detail, /3.0\/5/);
  assert.match(detail, /3.5\/5/);
  assert.match(detail, /MAMIYA/);
});

test('Switch web list displays rejected evaluation but labels the counter as reviews', async () => {
  const h = await createHarness({ query: '?platform=switch' });
  assert.ok(h.keys().includes(slug));
  assert.ok(h.keys().includes(mamiya));
  assert.match(h.elements['stats'].innerHTML, /평가 기록/);
  assert.match(h.elements['source-note'].innerHTML, /정식 후보 수에 포함하지 않습니다/);
  assert.match(h.elements['candidate-body'].innerHTML, /Astral Takers/);
});
