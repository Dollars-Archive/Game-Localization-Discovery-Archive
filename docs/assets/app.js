const OWNER = 'Dollars-Archive';
const REPO = 'Game-Localization-Discovery-Archive';
const BRANCH = 'main';
const RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/`;
const GITHUB_BASE = `https://github.com/${OWNER}/${REPO}/blob/${BRANCH}/`;
const PLATFORMS = {
  ps2: { label: 'PLAYSTATION 2', short: 'PS2', path: 'platforms/ps2/README.md' },
  psp: { label: 'PLAYSTATION PORTABLE', short: 'PSP', path: 'platforms/psp/README.md' },
};

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
function splitMarkdownRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(v => v.trim());
}
function extractMarkdownTable(markdown, firstHeader = '게임') {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex(line => line.trim().startsWith(`| ${firstHeader} |`));
  if (start < 0 || !lines[start + 1]) return [];
  const headers = splitMarkdownRow(lines[start]);
  const rows = [];
  for (let i = start + 2; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) break;
    const cells = splitMarkdownRow(line);
    if (cells.length !== headers.length) continue;
    rows.push(Object.fromEntries(headers.map((h, idx) => [h, cells[idx] ?? ''])));
  }
  return rows;
}
function hasMarkdownTable(markdown, firstHeader = '게임') {
  return markdown.split(/\r?\n/).some(line => line.trim().startsWith(`| ${firstHeader} |`));
}
function parseMdLink(value) {
  const m = String(value).match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  return m ? { label: m[1], href: m[2] } : { label: value, href: '' };
}
function cleanText(value) {
  return String(value).replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '').replace(/<[^>]+>/g, '').trim();
}
function priorityRank(value) {
  const v = cleanText(value).replace('🔥', '').trim().toUpperCase();
  if (v === 'A') return 0;
  if (v === 'B') return 1;
  if (v === 'C') return 2;
  return 9;
}
function ratingValue(value) {
  const s = cleanText(value);
  const stars = (s.match(/⭐/g) || []).length;
  return stars + (s.includes('½') ? 0.5 : 0);
}
function localizeGamePath(href, platform) {
  if (!href) return '#';
  const normalized = href.startsWith('games/') ? `platforms/${platform}/${href}` : href.replace(/^\.\//, '');
  return `game.html?file=${encodeURIComponent(normalized)}`;
}
function priorityBadge(value) {
  const rank = priorityRank(value);
  const label = rank === 0 ? '🔥 A' : rank === 1 ? 'B' : rank === 2 ? 'C' : cleanText(value);
  const cls = rank === 0 ? 'priority-a' : rank === 1 ? 'priority-b' : 'priority-c';
  return `<span class="priority ${cls}">${escapeHtml(label)}</span>`;
}
async function fetchText(url) {
  const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}
async function initIndex() {
  const status = document.getElementById('status');
  const wrap = document.getElementById('table-wrap');
  const body = document.getElementById('candidate-body');
  const search = document.getElementById('search');
  const stats = document.getElementById('stats');
  const platformEyebrow = document.getElementById('platform-eyebrow');
  const platformTitle = document.getElementById('platform-title');
  const sourceNote = document.getElementById('source-note');
  const platformButtons = [...document.querySelectorAll('.platform-btn')];
  const sortButtons = [...document.querySelectorAll('.sort-btn[data-sort]')];
  const params = new URLSearchParams(location.search);
  let activePlatform = PLATFORMS[params.get('platform')] ? params.get('platform') : 'ps2';
  let rows = [];
  let sortKey = 'priority';
  let ascending = true;

  const updateStats = () => {
    const aCount = rows.filter(r => r.priorityRank === 0).length;
    const bCount = rows.filter(r => r.priorityRank === 1).length;
    const cCount = rows.filter(r => r.priorityRank === 2).length;
    stats.innerHTML = `<span class="stat">등록 후보 <strong>${rows.length}</strong></span><span class="stat">🔥 A <strong>${aCount}</strong></span><span class="stat">B <strong>${bCount}</strong></span><span class="stat">C <strong>${cCount}</strong></span>`;
  };

  const render = () => {
    const q = (search.value || '').trim().toLocaleLowerCase('ko');
    const filtered = rows.filter(row => `${row.title} ${row.genre} ${row.versions} ${row.state} ${row.priority}`.toLocaleLowerCase('ko').includes(q));
    const sorted = [...filtered].sort((a, b) => {
      let result = 0;
      if (sortKey === 'priority') result = a.priorityRank - b.priorityRank || b.ratingValue - a.ratingValue || a.title.localeCompare(b.title, 'ko');
      if (sortKey === 'rating') result = b.ratingValue - a.ratingValue || a.priorityRank - b.priorityRank || a.title.localeCompare(b.title, 'ko');
      if (sortKey === 'year') result = a.year - b.year || a.title.localeCompare(b.title, 'ko');
      if (sortKey === 'title') result = a.title.localeCompare(b.title, 'ko');
      return ascending ? result : -result;
    });

    if (!sorted.length) {
      const message = rows.length ? '검색 결과가 없습니다.' : `아직 등록된 ${PLATFORMS[activePlatform].short} 후보가 없습니다.`;
      body.innerHTML = `<tr><td colspan="7" class="meta-muted">${escapeHtml(message)}</td></tr>`;
    } else {
      body.innerHTML = sorted.map(row => `
        <tr>
          <td><a class="game-link" href="${localizeGamePath(row.href, activePlatform)}">${escapeHtml(row.title)}</a></td>
          <td>${row.year || ''}</td>
          <td>${escapeHtml(row.genre)}</td>
          <td class="rating">${escapeHtml(row.rating)}</td>
          <td>${priorityBadge(row.priority)}</td>
          <td class="meta-muted">${escapeHtml(row.versions)}</td>
          <td class="state">${escapeHtml(row.state)}</td>
        </tr>`).join('');
    }
    status.hidden = true;
    wrap.hidden = false;
  };

  const loadPlatform = async platform => {
    activePlatform = PLATFORMS[platform] ? platform : 'ps2';
    const config = PLATFORMS[activePlatform];
    platformButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.platform === activePlatform));
    platformEyebrow.textContent = config.label;
    platformTitle.textContent = '현재 후보';
    sourceNote.innerHTML = `원본 데이터는 저장소의 <code>${escapeHtml(config.path)}</code>에서 실시간으로 읽습니다. README가 갱신되면 이 화면도 자동으로 따라갑니다.`;
    search.value = '';
    status.hidden = false;
    status.textContent = '후보 목록을 불러오는 중…';
    wrap.hidden = true;

    const url = new URL(location.href);
    url.searchParams.set('platform', activePlatform);
    history.replaceState(null, '', url);

    try {
      const markdown = await fetchText(`${RAW_BASE}${config.path}`);
      if (!hasMarkdownTable(markdown, '게임')) throw new Error('후보 표를 찾지 못했습니다.');
      const rawRows = extractMarkdownTable(markdown, '게임');
      rows = rawRows.map(row => {
        const game = parseMdLink(row['게임']);
        return {
          title: cleanText(game.label), href: game.href,
          year: Number(cleanText(row['발매'])) || 0,
          genre: cleanText(row['장르']),
          rating: cleanText(row['발굴 추천도']), ratingValue: ratingValue(row['발굴 추천도']),
          priority: cleanText(row['한글화 우선도']), priorityRank: priorityRank(row['한글화 우선도']),
          versions: cleanText(row['타 기종 / 다른 버전']), state: cleanText(row['상태']),
        };
      });
      updateStats();
      render();
    } catch (err) {
      rows = [];
      updateStats();
      wrap.hidden = true;
      status.hidden = false;
      status.textContent = `후보 목록을 불러오지 못했습니다: ${err.message}`;
    }
  };

  search.addEventListener('input', render);
  sortButtons.forEach(btn => btn.addEventListener('click', () => {
    const nextKey = btn.dataset.sort;
    if (sortKey === nextKey) ascending = !ascending;
    else { sortKey = nextKey; ascending = true; }
    sortButtons.forEach(b => b.classList.toggle('active', b === btn));
    sortButtons.forEach(b => { b.textContent = b.textContent.replace(/\s[↑↓]$/, ''); });
    btn.textContent = `${btn.textContent} ${ascending ? '↑' : '↓'}`;
    render();
  }));
  platformButtons.forEach(btn => btn.addEventListener('click', () => loadPlatform(btn.dataset.platform)));

  await loadPlatform(activePlatform);
}
function resolveRelativeMarkdownLink(currentFile, href) {
  if (/^(https?:|mailto:|#)/i.test(href)) return href;
  if (!href.endsWith('.md')) return href;
  const base = currentFile.split('/').slice(0, -1);
  for (const part of href.split('/')) {
    if (part === '..') base.pop();
    else if (part !== '.' && part) base.push(part);
  }
  return `game.html?file=${encodeURIComponent(base.join('/'))}`;
}
async function initGame() {
  const params = new URLSearchParams(location.search);
  const file = params.get('file') || '';
  const status = document.getElementById('reader-status');
  const reader = document.getElementById('reader');
  const source = document.getElementById('source-link');
  const safePath = /^platforms\/[a-z0-9-]+\/games\/[a-z0-9-]+\.md$/i.test(file);
  if (!safePath) { status.textContent = '올바른 게임 문서 경로가 아닙니다.'; return; }
  source.href = `${GITHUB_BASE}${file}`;
  try {
    const markdown = await fetchText(`${RAW_BASE}${file}`);
    if (!window.marked) throw new Error('Markdown 렌더러를 불러오지 못했습니다.');
    marked.setOptions({ gfm: true, breaks: false });
    reader.innerHTML = marked.parse(markdown);
    reader.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      a.setAttribute('href', resolveRelativeMarkdownLink(file, href));
      if (/^https?:/i.test(a.getAttribute('href'))) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noreferrer'); }
    });
    reader.querySelectorAll('img').forEach(img => { img.loading = 'lazy'; img.decoding = 'async'; });
    const h1 = reader.querySelector('h1');
    if (h1) document.title = `${h1.textContent} · Localization Discovery Archive`;
    status.hidden = true;
    reader.hidden = false;
  } catch (err) {
    status.textContent = `문서를 불러오지 못했습니다: ${err.message}`;
  }
}
const page = document.body.dataset.page;
if (page === 'index') initIndex();
if (page === 'game') initGame();
