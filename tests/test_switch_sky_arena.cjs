const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, readRows, createHarness } = require('./helpers/index-harness.cjs');

const sky = 'platforms/switch/games/touhou-sky-arena-matsuri-climax.md';

test('Touhou Sky Arena is a qualified Switch candidate; existing entries remain intact', () => {
  const index = fs.readFileSync(path.join(root, 'platforms/switch/README.md'), 'utf8');
  const rows = readRows(index);
  const skyRow = rows.find(r => r['게임'].includes('games/touhou-sky-arena-matsuri-climax.md'));
  assert.ok(skyRow);
  assert.match(skyRow['발굴 추천도'], /3.5\/5/);
  assert.equal(skyRow['한글화 우선도'], 'C');
  assert.match(skyRow['상태'], /후보/);
  for (const slug of ['mamiya-a-shared-illusion-of-the-worlds-end', 'wizards-symphony', 'astral-takers']) {
    assert.ok(rows.some(r => r['게임'].includes('games/' + slug + '.md')));
  }
  assert.equal(rows.filter(r => !/패스|보류/.test(r['상태'])).length, 3);
  assert.match(index, /등록 후보: \*\*3개\*\*/);
  assert.ok(fs.existsSync(path.join(root, sky)));
  const game = fs.readFileSync(path.join(root, sky), 'utf8');
  assert.match(game, /2019/);
  assert.match(game, /2020/);
  assert.match(game, /한국어 미지원/);
  assert.match(game, /DLC/);
  const main = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.match(main, /\| Nintendo Switch \| 3 \| 1 \| 0 \|/);
});

test('Switch UI shows the new Touhou game along with original candidates and pass record', async () => {
  const h = await createHarness({ query: '?platform=switch' });
  assert.ok(h.keys().includes(sky));
  assert.ok(h.keys().includes('platforms/switch/games/mamiya-a-shared-illusion-of-the-worlds-end.md'));
  assert.ok(h.keys().includes('platforms/switch/games/wizards-symphony.md'));
  assert.ok(h.keys().includes('platforms/switch/games/astral-takers.md'));
});
