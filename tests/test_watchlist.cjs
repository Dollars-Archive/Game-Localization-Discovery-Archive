const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../docs/assets/watchlist-core.js');

const item = note => ({ added: '2026-10-07T00:00:00Z', note: note || '' });

test('group order is started, starred, then rest and released stays in rest', () => {
  const rows = [
    { key: 'released', title: 'Released', patchStatus: 'released', priorityRank: 0, ratingValue: 5 },
    { key: 'wip', title: 'WIP', patchStatus: 'wip', priorityRank: 2, ratingValue: 1 },
    { key: 'star', title: 'Star', patchStatus: '', priorityRank: 1, ratingValue: 3 },
    { key: 'rest', title: 'Rest', patchStatus: '', priorityRank: 0, ratingValue: 4 },
  ];
  const wl = { version: 1, order: ['star', 'released'], items: { star: item(), released: item() } };
  const grouped = core.groupRows(rows, wl, 'priority', true);
  assert.deepEqual(grouped.started.map(x => x.key), ['wip']);
  assert.deepEqual(grouped.star.map(x => x.key), ['star']);
  assert.deepEqual(grouped.rest.map(x => x.key), ['released', 'rest']);
});

test('409 style merge keeps remote additions and local changed keys', () => {
  const remote = { version: 1, order: ['a', 'b'], items: { a: item('remote'), b: item('new elsewhere') } };
  const local = { version: 1, order: ['a', 'c'], items: { a: item('mine'), c: item('local') } };
  const merged = core.mergeWatchlists(remote, local, ['a', 'c'], true);
  assert.equal(merged.items.a.note, 'mine');
  assert.ok(merged.items.b);
  assert.ok(merged.items.c);
  assert.deepEqual(merged.order, ['a', 'c', 'b']);
});

test('visible platform reorder preserves hidden positions', () => {
  const full = ['ps2-a', 'psp-a', 'ps2-b', 'ps3-a', 'ps2-c'];
  const next = core.reorderVisible(full, ['ps2-a', 'ps2-b', 'ps2-c'], ['ps2-c', 'ps2-a', 'ps2-b']);
  assert.deepEqual(next, ['ps2-c', 'psp-a', 'ps2-a', 'ps3-a', 'ps2-b']);
});

test('note strips newlines and limits to 60 characters', () => {
  const value = core.cleanNote('a\nb' + 'x'.repeat(80));
  assert.equal(value.includes('\n'), false);
  assert.equal(value.length, 60);
});

test('compare hash restores unique keys and caps at four', () => {
  const keys = ['platforms/ps2/games/a.md', 'b', 'c', 'd'];
  const hash = core.compareHash(keys);
  assert.deepEqual(core.compareKeysFromHash(hash), keys);
  assert.equal(core.compareKeysFromHash('#compare=a,a,b,c,d,e').length, 4);
});
