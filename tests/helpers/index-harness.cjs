const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const core = require(path.join(root, 'docs/assets/watchlist-core.js'));
const exclusionCore = require(path.join(root, 'docs/assets/exclusion-core.js'));
const app = fs.readFileSync(path.join(root, 'docs/assets/app.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'docs/index.html'), 'utf8');
const baseContext = { document: { body: { dataset: {} } }, window: { WatchlistCore: core, ExclusionCore: exclusionCore }, URL, URLSearchParams };
vm.createContext(baseContext);
vm.runInContext(app, baseContext);
const readRows = markdown => Array.from(baseContext.extractMarkdownTable(markdown), row => ({ ...row }));

// Synthetic scores and selection only. Never use these fixtures as editorial data.
function createFixtures(sourceRoot = root) {
  const data = {};
  for (const platform of ['ps2', 'psp', 'psvita', 'ps3', 'dreamcast']) {
    const name = `platforms/${platform}/README.md`;
    data[name] = fs.readFileSync(path.join(sourceRoot, name), 'utf8');
    const ranking = `platforms/${platform}/recommendations.md`;
    if (fs.existsSync(path.join(sourceRoot, ranking))) data[ranking] = fs.readFileSync(path.join(sourceRoot, ranking), 'utf8');
  }
  const reservePath = path.join(sourceRoot, 'platforms/ps3/reserve.md');
  const original = [...readRows(data['platforms/ps3/README.md']), ...(fs.existsSync(reservePath) ? readRows(fs.readFileSync(reservePath, 'utf8')) : [])];
  const headers = [...new Set([...Object.keys(original[0]), '개인 추천점수', '개인 순위', '예비 사유'])];
  const table = rows => '# LOCAL TEST FIXTURE: NOT AN EDITORIAL RANKING\n\n'
    + '| ' + headers.join(' | ') + ' |\n| ' + headers.map(() => '---').join(' | ') + ' |\n'
    + rows.map(({ row, i }) => '| ' + headers.map(h => {
      if (h === '개인 추천점수') return (10 - i / 10).toFixed(1);
      if (h === '개인 순위') return i + 1;
      if (h === '예비 사유') return i === 0 ? '테스트: 한국어 대안 확인 보류' : i > 30 ? '테스트: 선정 외 예비' : '';
      return row[h];
    }).join(' | ') + ' |').join('\n') + '\n';
  const indexed = original.map((row, i) => ({ row, i }));
  data['platforms/ps3/README.md'] = table(indexed.filter(({ i }) => i > 0 && i <= 30));
  data['platforms/ps3/reserve.md'] = table(indexed.filter(({ i }) => i === 0 || i > 30));
  const keys = original.map(row => 'platforms/ps3/' + baseContext.parseMdLink(row['게임']).href);
  for (const key of keys) data[key] = '# Local test fixture\n> 발굴 추천도: ⭐⭐⭐½☆\n> 한글화 우선도: B\n\n| 항목 | 내용 |\n|---|---|\n| 플랫폼 | PS3 fixture |\n';
  const ps2Key = row => 'platforms/ps2/' + baseContext.parseMdLink(row['게임']).href;
  const ps2 = readRows(data['platforms/ps2/README.md']);
  const item = note => ({ added: '2026-10-08T00:00:00Z', note });
  const favorites = [keys[34], ps2Key(ps2[0]), keys[33], keys[3]];
  const watchlist = core.normalizeWatchlist({ order: favorites, items: Object.fromEntries(favorites.map(key => [key, item('local fixture memo')])) });
  const patches = { patches: [
    { discovery: keys[32], status: 'wip', url: 'https://example.invalid/local-fixture', repo: 'local-fixture-kr-patch', activity_at: '2026-10-08' },
    { discovery: ps2Key(ps2[1]), status: 'wip', url: 'https://example.invalid/local-fixture', repo: 'local-fixture-2-kr-patch' },
  ] };
  return { data, original, keys, watchlist, patches, exclusions: exclusionCore.empty() };
}

class Element {
  constructor(id = '', dataset = {}, text = '') {
    this.id = id; this.dataset = dataset; this.textContent = text; this.innerHTML = ''; this.value = ''; this.hidden = false;
    this.listeners = {}; this.attributes = {}; this.classes = new Set();
    this.classList = { toggle: (key, flag) => flag ? this.classes.add(key) : this.classes.delete(key), add: key => this.classes.add(key), remove: key => this.classes.delete(key) };
  }
  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return this.attributes[key]; }
  addEventListener(key, callback) { (this.listeners[key] ||= []).push(callback); }
  async fire(key, event = {}) { await Promise.all((this.listeners[key] || []).map(callback => callback({ target: this, ...event }))); }
  querySelectorAll() { return []; }
  showModal() { this.open = true; }
  close() { this.open = false; }
}

async function createHarness({ query = '?platform=ps3', fixtures = createFixtures(), beforeFetch } = {}) {
  const ids = [...index.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
  const elements = Object.fromEntries(ids.map(id => [id, new Element(id)]));
  const platforms = ['ps2', 'psp', 'psvita', 'ps3', 'dreamcast'].map(p => new Element('', { platform: p }));
  const sorts = ['personal', 'priority', 'rating', 'year', 'title'].map(p => new Element('', { sort: p }, p));
  const views = ['all', 'active', 'reserve'].map(view => Object.assign(elements[`recommendations-${view}`], { dataset: { view } }));
  const document = { body: { dataset: {} }, getElementById: id => elements[id], querySelectorAll: selector => selector === '.platform-btn' ? platforms : selector === '.recommendation-view' ? views : sorts };
  const events = new Element();
  const window = { WatchlistCore: core, ExclusionCore: exclusionCore, addEventListener: (...args) => events.addEventListener(...args) };
  const location = new URL('http://localhost:8763/' + query);
  const history = { entries: [location.href], index: 0,
    pushState(_, __, url) { this.entries = this.entries.slice(0, this.index + 1); this.entries.push(String(url)); this.index++; location.href = String(url); },
    replaceState(_, __, url) { location.href = new URL(url, location.href); this.entries[this.index] = location.href; },
    async restore(index) {
      const oldHash = location.hash;
      location.href = this.entries[this.index = index];
      const restored = events.fire('popstate');
      if (location.hash !== oldHash) await Promise.all([restored, events.fire('hashchange')]);
      else await restored;
    },
    async back() { if (this.index > 0) await this.restore(this.index - 1); },
    async forward() { if (this.index < this.entries.length - 1) await this.restore(this.index + 1); },
  };
  const calls = [];
  const fetch = async (url, options = {}) => {
    const method = options.method || 'GET';
    calls.push({ url, method });
    if (method !== 'GET') throw new Error('Mutating request forbidden in read-only tests');
    if (beforeFetch) await beforeFetch(url);
    if (url.includes('excluded-games.json')) return { ok: true, status: 200, json: async () => ({ content: Buffer.from(JSON.stringify(fixtures.exclusions)).toString('base64'), sha: 'local-exclusion-fixture' }) };
    if (url.includes('api.github.com')) return { ok: true, json: async () => ({ content: Buffer.from(JSON.stringify(fixtures.watchlist)).toString('base64'), sha: 'local-fixture' }) };
    if (url.includes('patches.json')) return { ok: true, json: async () => fixtures.patches };
    const resource = url.split('/main/')[1]?.split('?')[0];
    return { ok: resource in fixtures.data, status: resource in fixtures.data ? 200 : 404, text: async () => fixtures.data[resource] };
  };
  const context = { document, window, location, history, fetch, URL, URLSearchParams, TextEncoder, TextDecoder, atob, btoa, Uint8Array, setTimeout, clearTimeout,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, console };
  vm.createContext(context);
  vm.runInContext(app, context);
  await vm.runInContext('initIndex()', context);
  return { context, elements, platforms, sorts, history, location, calls, fixtures,
    keys: () => [...elements['candidate-body'].innerHTML.matchAll(/<tr class="[^"]*" data-key="([^"]+)"/g)].map(match => match[1]),
    async click(id) { await elements[id].fire('click'); },
    async hash(value) { location.hash = value; await events.fire('hashchange'); },
    async platform(p) { await platforms.find(item => item.dataset.platform === p).fire('click'); },
    async sort(p) { await sorts.find(item => item.dataset.sort === p).fire('click'); },
    async search(value) { elements.search.value = value; await elements.search.fire('input'); },
  };
}
module.exports = { root, readRows, createFixtures, createHarness };
