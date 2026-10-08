const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = { window: {}, document: { body: { dataset: {} } } };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../docs/assets/app.js'), 'utf8'), context);
const resolve = context.resolveRelativeMarkdownLink;
const current = 'platforms/ps3/games/ar-nosurge-umareizuru-hoshi-e-inoru-uta.md';

test('relative reassessment Markdown links use the public GitHub report instead of the game-only reader', () => {
  const report = 'platforms/ps3/reassessments/2026-10-08-personal-top-30.md';
  assert.equal(resolve(current, '../reassessments/2026-10-08-personal-top-30.md'),
    `https://github.com/Dollars-Archive/Game-Localization-Discovery-Archive/blob/main/${report}`);
});

test('same-platform and cross-platform game Markdown links keep the existing game reader', () => {
  for (const [href, target] of [
    ['./another-game.md', 'platforms/ps3/games/another-game.md'],
    ['../../ps2/games/another-game.md', 'platforms/ps2/games/another-game.md'],
  ]) assert.equal(resolve(current, href), `game.html?file=${encodeURIComponent(target)}`);
});

test('external, mail, fragment, and non-Markdown links remain unchanged', () => {
  for (const href of ['https://example.com/report.md', 'mailto:example@example.com', '#review', '../images/screen.png']) {
    assert.equal(resolve(current, href), href);
  }
});
