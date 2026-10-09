const OWNER = 'Dollars-Archive';
const REPO = 'Game-Localization-Discovery-Archive';
const BRANCH = 'main';
const RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/`;
const GITHUB_BASE = `https://github.com/${OWNER}/${REPO}/blob/${BRANCH}/`;
const WATCHLIST_BRANCH = 'watchlist-data';
const WATCHLIST_PATH = 'docs/data/watchlist.json';
const WATCHLIST_API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${WATCHLIST_PATH}`;
const WATCHLIST_STATIC = 'data/watchlist.json';
const HUB_DATA = 'https://dollars-archive.github.io/Dollars-Archive/data/patches.json';
const HUB_BASE = 'https://dollars-archive.github.io/Dollars-Archive/';
const TOKEN_KEY = 'discovery-watchlist-token-v1';
const CACHE_KEY = 'discovery-watchlist-cache-v1';
const Core = window.WatchlistCore;
const Exclusions = window.ExclusionCore;

const PLATFORMS = {
  ps2: { label: 'PLAYSTATION 2', short: 'PS2', path: 'platforms/ps2/README.md', rankingPath: 'platforms/ps2/recommendations.md' },
  psp: { label: 'PLAYSTATION PORTABLE', short: 'PSP', path: 'platforms/psp/README.md', rankingPath: 'platforms/psp/recommendations.md' },
  psvita: { label: 'PLAYSTATION VITA', short: 'PS Vita', path: 'platforms/psvita/README.md', rankingPath: 'platforms/psvita/recommendations.md' },
  ps3: { label: 'PLAYSTATION 3', short: 'PS3', path: 'platforms/ps3/README.md', reservePath: 'platforms/ps3/reserve.md' },
  dreamcast: { label: 'DREAMCAST', short: 'Dreamcast', path: 'platforms/dreamcast/README.md' },
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
  const m = String(value).match(/^\[(.+)\]\(([^)]+)\)$/);
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
function decodeBase64Utf8(value) {
  const binary = atob(String(value || '').replace(/\s+/g, ''));
  const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(String(value));
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

function gameKeyFromHref(href, platform) {
  if (!href) return '';
  return href.startsWith('games/') ? `platforms/${platform}/${href}` : href.replace(/^\.\//, '');
}

function hubGameId(repo) {
  return String(repo || '').replace(/-kr-patch$|-Korean-Localization$/i, '').toLowerCase().replace(/[^a-z0-9_.-]/g, '-');
}

function displayDate(value) {
  return typeof value === 'string' && value.length >= 10 ? value.slice(0, 10) : '';
}

function parseCompareDocument(markdown) {
  const table = extractMarkdownTable(markdown, '항목');
  const info = Object.fromEntries(table.map(row => [cleanText(row['항목']), cleanText(row['내용'])]));
  const quoted = {};
  for (const label of ['상태', '발굴 추천도', '한글화 우선도']) {
    const match = markdown.match(new RegExp(`^>\\s*${label}:\\s*(.+?)\\s*$`, 'm'));
    if (match) quoted[label] = cleanText(match[1]);
  }
  const heading = markdown.match(/^#\s+(.+?)\s*$/m);
  return { title: heading ? cleanText(heading[1]) : '', info, quoted };
}

async function initIndex() {
  const desktopLayout = typeof window.matchMedia === 'function'
    ? window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)')
    : null;
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
  const watchOnlyButton = document.getElementById('watch-only');
  const myListButton = document.getElementById('my-list-summary');
  const ps3Views = document.getElementById('ps3-views');
  const selectedButton = document.getElementById('ps3-selected');
  const reserveButton = document.getElementById('ps3-reserve');
  const recommendationViews = document.getElementById('recommendation-views');
  const recommendationButtons = [...document.querySelectorAll('.recommendation-view')];
  const reviewEvidenceSelect = document.getElementById('review-evidence');
  const settingsOpen = document.getElementById('settings-open');
  const settingsDialog = document.getElementById('settings-dialog');
  const tokenInput = document.getElementById('token-input');
  const tokenSave = document.getElementById('token-save');
  const tokenClear = document.getElementById('token-clear');
  const compareBar = document.getElementById('compare-bar');
  const compareCount = document.getElementById('compare-count');
  const compareOpen = document.getElementById('compare-open');
  const compareClear = document.getElementById('compare-clear');
  const compareDialog = document.getElementById('compare-dialog');
  const compareClose = document.getElementById('compare-close');
  const compareContent = document.getElementById('compare-content');
  const toast = document.getElementById('toast');
  const deletedOpen = document.getElementById('deleted-open');
  const deletedDialog = document.getElementById('deleted-dialog');
  const deletedContent = document.getElementById('deleted-content');
  const deletedClose = document.getElementById('deleted-close');
  const syncNotice = document.getElementById('deletion-sync-notice');
  const retrySync = document.getElementById('deletion-sync-retry');
  const tokenStatus = document.getElementById('token-status');

  const params = new URLSearchParams(location.search);
  let activePlatform = PLATFORMS[params.get('platform')] ? params.get('platform') : 'ps2';
  let reserveView = activePlatform === 'ps3' && params.get('view') === 'reserve';
  let recommendationView = ['active', 'reserve'].includes(params.get('view')) ? params.get('view') : 'all';
  let reviewEvidenceFilter = 'all';
  const reviewEvidenceLabels = { supported: '근거 충분', provisional: '잠정', held: '평가보류' };
  const hasPersonalScores = platform => platform === 'ps3' || Boolean(PLATFORMS[platform].rankingPath);
  const inCurrentView = row => !row.archived && (PLATFORMS[activePlatform].rankingPath
    ? recommendationView === 'all' || row.reserve === (recommendationView === 'reserve')
    : row.reserve === (activePlatform === 'ps3' && reserveView));
  let sortKey = hasPersonalScores(activePlatform) ? 'personal' : 'priority';
  let ascending = true;
  let watchOnly = false;
  let myList = params.get('view') === 'my-list';
  let watchlist = Core.normalizeWatchlist({});
  let lastSavedWatchlist = Core.cloneWatchlist(watchlist);
  let watchlistSha = '';
  let patches = new Map();
  const rowsByPlatform = new Map();
  const platformLoads = new Map();
  let renderVersion = 0;
  let comparisonVersion = 0;
  let comparisonHash = '';
  let compareKeys = new Set(Core.compareKeysFromHash(location.hash));
  const dirtyKeys = new Set();
  let orderDirty = false;
  let saveTimer = null;
  let saving = false;
  let mutationVersion = 0;
  let pendingMessages = [];
  let dragState = null;

  const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
  let ownerVerified = false;
  const hasToken = () => ownerVerified && Boolean(getToken());
  const verifyEditor = async () => {
    ownerVerified = false;
    const value = getToken();
    try { ownerVerified = await Exclusions.verifyOwner(fetch, value) && getToken() === value; } catch (_) {}
    tokenStatus.textContent = ownerVerified ? '소유자 확인 완료 · 찜 편집 및 후보 삭제 가능' : value ? '소유자 또는 쓰기 권한을 확인하지 못했습니다. 열쇠를 확인해 주세요.' : '열쇠 등록 후 소유자 계정을 확인합니다.';
  };
  const deletionStore = Exclusions.createStore({
    fetcher: fetch, storage: localStorage, decode: decodeBase64Utf8, encode: encodeBase64Utf8,
    token: getToken,
    knownKey: key => [...rowsByPlatform.values()].flat().some(row => row.key === key) || Boolean(deletionStore.data.entries[key]),
  });
  const notDeleted = key => !Exclusions.isDeleted(deletionStore.data, key);
  const visibleRows = rows => Exclusions.visible(rows, deletionStore.data);
  const loadDeletionState = async () => {
    const result = await deletionStore.load();
    syncNotice.hidden = result.ready;
    document.getElementById('deletion-sync-message').textContent = result.cached
      ? '삭제 목록을 동기화하지 못해 마지막 확인된 목록을 표시합니다. 삭제·복구는 잠시 사용할 수 없습니다.'
      : '삭제 목록을 확인하지 못해 원본 후보 목록을 표시합니다. 삭제·복구는 잠시 사용할 수 없습니다.';
  };

  const showToast = message => {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { toast.hidden = true; }, 2600);
  };

  const cacheWatchlist = value => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(Core.normalizeWatchlist(value))); } catch (_) {}
  };

  const readCachedWatchlist = () => {
    try {
      const value = localStorage.getItem(CACHE_KEY);
      return value ? Core.normalizeWatchlist(JSON.parse(value)) : null;
    } catch (_) {
      return null;
    }
  };

  const readWatchlistApi = async () => {
    const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (hasToken()) headers.Authorization = `Bearer ${getToken()}`;
    const res = await fetch(`${WATCHLIST_API}?ref=${encodeURIComponent(WATCHLIST_BRANCH)}&_=${Date.now()}`, {
      cache: 'no-store',
      headers,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    return { data: Core.normalizeWatchlist(JSON.parse(decodeBase64Utf8(payload.content))), sha: payload.sha || '' };
  };

  const loadWatchlist = async () => {
    try {
      const api = await readWatchlistApi();
      watchlistSha = api.sha;
      cacheWatchlist(api.data);
      return api.data;
    } catch (_) {
      const cached = readCachedWatchlist();
      try {
        const res = await fetch(`${WATCHLIST_STATIC}?_=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const staticData = Core.normalizeWatchlist(await res.json());
        if (Object.keys(staticData.items).length || !cached) {
          cacheWatchlist(staticData);
          return staticData;
        }
      } catch (_) {}
      return cached || Core.normalizeWatchlist({});
    }
  };

  const loadPatches = async () => {
    try {
      const res = await fetch(`${HUB_DATA}?_=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      patches = new Map((payload.patches || []).filter(patch => patch.discovery).map(patch => [patch.discovery, patch]));
    } catch (_) {
      patches = new Map();
    }
  };

  const parseRows = (markdown, platform, reserve = false) => {
    if (!hasMarkdownTable(markdown, '게임')) throw new Error('후보 표를 찾지 못했습니다.');
    return extractMarkdownTable(markdown, '게임').map((raw, index) => {
      const game = parseMdLink(raw['게임']);
      const key = gameKeyFromHref(game.href, platform);
      const patch = patches.get(key) || null;
      const reviewAssessment = Boolean(PLATFORMS[platform].rankingPath);
      const score = Number(cleanText(raw[reviewAssessment ? '리뷰 점수' : '개인 추천점수'] || ''));
      const rankText = cleanText(raw[reviewAssessment ? '리뷰 순위' : '개인 순위'] || '');
      const rank = reviewAssessment ? Number.parseInt(rankText, 10) : Number(rankText);
      return {
        key,
        platform,
        reserve: reserve || raw['목록 구분'] === '후보군',
        reserveReason: cleanText(raw['예비 사유'] || ''),
        personalScore: hasPersonalScores(platform) && Number.isFinite(score) && score >= 1 && score <= 10 ? score : null,
        // Reuse the existing sort without changing PS3 or watchlist ordering.
        personalRank: reviewAssessment ? index + 1 : Number.isInteger(rank) && rank > 0 ? rank : null,
        reviewRank: reviewAssessment && Number.isInteger(rank) && rank > 0 ? rank : null,
        sharedRank: reviewAssessment && rankText.includes('공동'),
        rationale: cleanText(raw[reviewAssessment ? '평가 근거' : '추천 근거'] || ''),
        scoreStatus: cleanText(raw['점수 구분'] || '') || (reviewAssessment ? '평가보류' : ''),
        title: cleanText(game.label),
        href: game.href,
        year: Number(cleanText(raw['발매'])) || 0,
        genre: cleanText(raw['장르']),
        rating: cleanText(raw['발굴 추천도']),
        ratingValue: ratingValue(raw['발굴 추천도']),
        priority: cleanText(raw['한글화 우선도']),
        priorityRank: priorityRank(raw['한글화 우선도']),
        versions: cleanText(raw['타 기종 / 다른 버전']),
        state: cleanText(raw['상태']),
        patch,
        patchStatus: patch ? patch.status : '',
      };
    });
  };

  const loadPlatformRows = async platform => {
    if (rowsByPlatform.has(platform)) return rowsByPlatform.get(platform);
    if (platformLoads.has(platform)) return platformLoads.get(platform);
    const config = PLATFORMS[platform];
    const pending = (async () => {
      const sources = [{ path: config.rankingPath || config.path, reserve: false }];
      if (config.reservePath) sources.push({ path: config.reservePath, reserve: true });
      const lists = await Promise.all(sources.map(async source =>
        parseRows(await fetchText(`${RAW_BASE}${source.path}`), platform, source.reserve)));
      const rows = lists.flat();
      const keys = new Set(rows.map(row => row.key));
      if (keys.size !== rows.length || keys.has('')) throw new Error('후보 목록에 중복되거나 빈 문서 경로가 있습니다.');
      if (config.rankingPath) {
        // Keep existing favorites/started records reachable without restoring passed games to rankings.
        const original = parseRows(await fetchText(`${RAW_BASE}${config.path}`), platform);
        for (const row of original) {
          if (!keys.has(row.key)) {
            const passed = /패스|기준 미달|등록선 미달|탈락|후보 종료|활성 후보 제외/.test(row.state);
            rows.push({ ...row, archived: passed, reserve: passed || /보류/.test(row.state), reserveReason: passed ? '명시 제외·조사 기록 보존' : '새 기록 · 개인 추천 미평가' });
          }
        }
      }
      rowsByPlatform.set(platform, rows);
      return rows;
    })();
    platformLoads.set(platform, pending);
    try { return await pending; }
    finally { platformLoads.delete(platform); }
  };

  const loadAllRows = async () => {
    await Promise.all(Object.keys(PLATFORMS).map(loadPlatformRows));
    return [...rowsByPlatform.values()].flat();
  };

  const updateStats = allRows => {
    const platformRows = visibleRows(rowsByPlatform.get(activePlatform) || []).filter(row => !row.archived);
    const rows = myList ? allRows : platformRows.filter(inCurrentView);
    const selectedCount = platformRows.filter(row => !row.reserve).length;
    const reserveCount = platformRows.filter(row => row.reserve).length;
    selectedButton.textContent = `선정 ${selectedCount}개`;
    reserveButton.textContent = `예비 ${reserveCount}개`;
    recommendationButtons.forEach(button => {
      const view = button.dataset.view;
      button.textContent = view === 'all' ? `전체 순위 ${platformRows.length}개` : view === 'active' ? `기존 목록 ${selectedCount}개` : `후보군 ${reserveCount}개`;
    });
    const countLabel = myList ? '내 목록' : PLATFORMS[activePlatform].rankingPath
      ? recommendationView === 'all' ? '전체 순위' : recommendationView === 'active' ? '기존 목록' : '후보군'
      : activePlatform === 'ps3' && reserveView ? '예비 기록' : '등록 후보';
    const aCount = rows.filter(row => row.priorityRank === 0).length;
    const bCount = rows.filter(row => row.priorityRank === 1).length;
    const cCount = rows.filter(row => row.priorityRank === 2).length;
    stats.innerHTML = `<span class="stat">${countLabel} <strong>${rows.length}</strong></span><span class="stat">🔥 A <strong>${aCount}</strong></span><span class="stat">B <strong>${bCount}</strong></span><span class="stat">C <strong>${cCount}</strong></span>`;
    const wipCount = [...patches.values()].filter(patch => patch.status === 'wip' && patch.discovery && notDeleted(patch.discovery)).length;
    myListButton.textContent = `★ 찜 ${Object.keys(watchlist.items).filter(notDeleted).length} · 🛠 착수 ${wipCount} (전체 기종)`;
    myListButton.setAttribute('aria-pressed', String(myList));
    myListButton.classList.toggle('active', myList);
    deletedOpen.hidden = !hasToken();
    deletedOpen.disabled = deletionStore.busy;
    const deletedCount = Object.values(deletionStore.data.entries).filter(entry => entry.deleted).length;
    deletedOpen.textContent = `삭제한 게임 (${deletedCount})`;
  };

  const patchMarkup = row => {
    const patch = row.patch;
    if (!patch) return '';
    if (patch.status === 'wip') {
      const recent = displayDate(patch.activity_at || patch.pushed_at);
      return `<span class="patch-line"><span class="patch-badge wip">🛠 착수</span> <a href="${escapeHtml(patch.url)}" target="_blank" rel="noreferrer">저장소</a>${recent ? ` · ${escapeHtml(recent)}` : ''}</span>`;
    }
    if (patch.status === 'released') {
      const version = patch.latest_release && patch.latest_release.tag ? ` ${escapeHtml(patch.latest_release.tag)}` : '';
      const href = `${HUB_BASE}#${hubGameId(patch.repo)}`;
      return `<span class="patch-line"><span class="patch-badge released">✓ 배포${version}</span> <a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">한글패치 받기</a> · ${Number(patch.downloads || 0).toLocaleString('ko-KR')}회</span>`;
    }
    return '';
  };

  const noteMarkup = row => {
    const item = watchlist.items[row.key];
    if (!item) return '';
    if (item.note) {
      return `<button type="button" class="note-line ${hasToken() ? 'note-edit' : 'note-readonly'}" data-key="${escapeHtml(row.key)}">✎ ${escapeHtml(item.note)}</button>`;
    }
    return hasToken()
      ? `<button type="button" class="note-line note-edit empty" data-key="${escapeHtml(row.key)}">✎ 메모 추가</button>`
      : '';
  };

  const actionMarkup = (row, desktop = false) => {
    const starred = Boolean(watchlist.items[row.key]);
    const star = hasToken()
      ? `<button type="button" class="star-toggle ${starred ? 'active' : ''}" data-key="${escapeHtml(row.key)}" aria-label="${starred ? '찜 해제' : '찜 추가'}" title="${starred ? '찜 해제' : '찜 추가'}">${starred ? '★' : '☆'}</button>`
      : (starred ? '<span class="star-readonly" title="찜">★</span>' : '');
    const compare = `<label class="compare-check-label"><input class="compare-check" type="checkbox" data-key="${escapeHtml(row.key)}" ${compareKeys.has(row.key) ? 'checked' : ''}> 비교</label>`;
    const remove = hasToken()
      ? `<button class="candidate-delete" type="button" data-key="${escapeHtml(row.key)}" ${!deletionStore.ready || deletionStore.busy ? 'disabled' : ''} aria-label="${escapeHtml(row.title)} 후보 목록에서 삭제" title="후보 목록에서 삭제">${desktop ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>' : '삭제'}</button>` : '';
    return `<div class="row-actions${desktop ? ' desktop-inline-actions' : ''}">${star}${compare}${remove}</div>`;
  };

  const rowMarkup = (row, groupName) => {
    const desktop = Boolean(desktopLayout && desktopLayout.matches);
    const starred = Boolean(watchlist.items[row.key]);
    const rank = starred ? watchlist.order.filter(notDeleted).indexOf(row.key) + 1 : 0;
    const reorderable = starred && hasToken() && (groupName === 'star' || myList);
    const rowClass = row.patchStatus === 'wip' ? 'wip-row' : row.patchStatus === 'released' ? 'released-row' : starred ? 'watch-row' : '';
    const handle = reorderable
      ? `<button class="drag-handle" type="button" data-key="${escapeHtml(row.key)}" aria-label="우선순위 이동" title="끌기 또는 ↑/↓ 키">⋮⋮</button>`
      : '';
    const moveMenu = reorderable
      ? `<div class="move-menu"><button type="button" data-move="up" data-key="${escapeHtml(row.key)}">위로</button><button type="button" data-move="down" data-key="${escapeHtml(row.key)}">아래로</button><button type="button" data-move="top" data-key="${escapeHtml(row.key)}">맨 위로</button></div>`
      : '';
    return `<tr class="${rowClass}" data-key="${escapeHtml(row.key)}" data-reorderable="${reorderable}">
      <td class="rank-cell" data-label="우선">${handle}${rank ? `<span class="rank-number">${rank}</span>` : ''}${moveMenu}${desktop ? actionMarkup(row, true) : ''}</td>
      <td data-label="게임"${PLATFORMS[row.platform].rankingPath ? ' class="recommendation-game"' : ''}><a class="game-link" href="${localizeGamePath(row.href, row.platform)}">${escapeHtml(row.title)}</a>${row.rationale ? `<p class="recommendation-rationale">${escapeHtml(row.rationale)}</p>` : ''}${noteMarkup(row)}${patchMarkup(row)}</td>
      <td data-label="발매">${row.year || ''}</td>
      <td data-label="장르">${escapeHtml(row.genre)}</td>
      <td data-label="${PLATFORMS[row.platform].rankingPath ? '리뷰 / 기존 평가' : hasPersonalScores(row.platform) ? '개인 / 작품성' : '발굴 추천도'}" class="rating">${PLATFORMS[row.platform].rankingPath
        ? `<span class="rating-details"><span class="personal-rating">리뷰 ${row.scoreStatus === '잠정' ? '<span class="provisional-score">잠정</span> ' : ''}${row.personalScore == null ? '<span class="held-score">평가보류</span>' : `${row.personalScore.toFixed(1)}/10`}${row.reviewRank ? ` · ${row.sharedRank ? '공동 ' : ''}${row.reviewRank}위` : ''}</span><span class="quality-rating">기존 평가 ${escapeHtml(row.rating)}</span></span>`
        : hasPersonalScores(row.platform)
        ? `<span class="rating-details"><span class="personal-rating">개인 ${row.scoreStatus === '잠정' ? '<span class="provisional-score">잠정</span> ' : ''}${row.personalScore == null ? '미평가' : `${row.personalScore.toFixed(1)}/10`}${row.personalRank ? ` · ${row.personalRank}위` : ''}</span><span class="quality-rating">작품성 ${escapeHtml(row.rating)}</span></span>`
        : escapeHtml(row.rating)}</td>
      <td data-label="한글화 우선도">${priorityBadge(row.priority)}</td>
      <td data-label="타 기종 / 다른 버전" class="meta-muted">${escapeHtml(row.versions)}</td>
      <td data-label="상태" class="state"><span>${escapeHtml(row.state)}${row.reserve ? `<span class="reserve-label">${PLATFORMS[row.platform].rankingPath ? '후보군' : '예비'}${row.reserveReason ? ` · ${escapeHtml(row.reserveReason)}` : ''}</span>` : ''}</span></td>
      <td data-label="관리">${desktop ? '' : actionMarkup(row)}</td>
    </tr>`;
  };

  const groupHeading = (label, count, cls) => count
    ? `<tr class="group-heading ${cls}"><th colspan="9">${label} <span>${count}</span></th></tr>`
    : '';

  const currentRows = async () => {
    if (myList) {
      const all = await loadAllRows();
      return visibleRows(all).filter(row => watchlist.items[row.key] || row.patchStatus === 'wip');
    }
    const rows = await loadPlatformRows(activePlatform);
    return visibleRows(rows).filter(inCurrentView);
  };

  const updateCompareBar = () => {
    const count = compareKeys.size;
    compareBar.hidden = count < 2;
    compareCount.textContent = `비교 ${count}개 선택`;
    compareOpen.textContent = `비교하기 (${count})`;
  };

  const render = async () => {
    const version = ++renderVersion;
    try {
      const all = await currentRows();
      if (version !== renderVersion) return;
      compareKeys = new Set([...compareKeys].filter(key => Exclusions.validKey(key) && notDeleted(key)));
      if (location.hash.startsWith('#compare=')) {
        history.replaceState(null, '', `${location.pathname}${location.search}${compareKeys.size >= 2 ? Core.compareHash([...compareKeys]) : ''}`);
      }
      if (compareKeys.size < 2) closeComparison();
      if (!hasToken() && deletedDialog.open) deletedDialog.close();
      const query = (search.value || '').trim().toLocaleLowerCase('ko');
      let filtered = all.filter(row => {
        const note = (watchlist.items[row.key] || {}).note || '';
        return `${row.title} ${row.genre} ${row.versions} ${row.state} ${row.priority} ${row.reserveReason} ${row.rationale} ${row.scoreStatus} ${note}`.toLocaleLowerCase('ko').includes(query);
      });
      if (watchOnly) filtered = filtered.filter(row => watchlist.items[row.key]);
      if (!myList && PLATFORMS[activePlatform].rankingPath && reviewEvidenceFilter !== 'all') {
        filtered = filtered.filter(row => row.scoreStatus === reviewEvidenceLabels[reviewEvidenceFilter]);
      }

      const grouped = Core.groupRows(filtered, watchlist, sortKey, ascending);
      if (!myList && PLATFORMS[activePlatform].rankingPath && sortKey === 'personal') {
        const compareReview = (a, b) => Number(a.personalScore == null) - Number(b.personalScore == null)
          || (ascending ? (b.personalScore || 0) - (a.personalScore || 0) : (a.personalScore || 0) - (b.personalScore || 0))
          || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
        grouped.started.sort(compareReview);
        grouped.rest.sort(compareReview);
      }
      const html = [
        groupHeading('🛠 착수', grouped.started.length, 'started'),
        ...grouped.started.map(row => rowMarkup(row, 'started')),
        groupHeading('★ 찜', grouped.star.length, 'starred'),
        ...grouped.star.map(row => rowMarkup(row, 'star')),
        ...grouped.rest.map(row => rowMarkup(row, 'rest')),
      ].join('');

      body.innerHTML = html || `<tr><td colspan="9" class="meta-muted empty-row">${filtered.length ? '표시할 항목이 없습니다.' : '검색 결과가 없습니다.'}</td></tr>`;
      platformButtons.forEach(button => button.classList.toggle('active', !myList && button.dataset.platform === activePlatform));
      platformEyebrow.textContent = myList ? 'MY WATCHLIST' : PLATFORMS[activePlatform].label;
      platformTitle.textContent = myList ? '내 목록' : activePlatform === 'ps3' ? (reserveView ? 'PS3 예비 목록' : 'PS3 선정 후보')
        : PLATFORMS[activePlatform].rankingPath ? `${PLATFORMS[activePlatform].short} ${recommendationView === 'all' ? '전체 작품 평가' : recommendationView === 'active' ? '기존 목록' : '후보군'}` : '현재 후보';
      ps3Views.hidden = myList || activePlatform !== 'ps3';
      recommendationViews.hidden = myList || !PLATFORMS[activePlatform].rankingPath;
      recommendationButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.view === recommendationView);
        button.setAttribute('aria-pressed', String(button.dataset.view === recommendationView));
      });
      selectedButton.classList.toggle('active', !reserveView);
      selectedButton.setAttribute('aria-pressed', String(!reserveView));
      reserveButton.classList.toggle('active', reserveView);
      reserveButton.setAttribute('aria-pressed', String(reserveView));
      sortButtons.forEach(button => {
        button.hidden = button.dataset.sort === 'personal' && (myList || !hasPersonalScores(activePlatform));
        button.classList.toggle('active', button.dataset.sort === sortKey);
        button.setAttribute('aria-pressed', String(button.dataset.sort === sortKey));
        if (button.dataset.sort === 'personal') button.dataset.label = PLATFORMS[activePlatform].rankingPath ? '리뷰 기반 작품 점수' : '개인 추천점수';
        const label = button.dataset.label || button.textContent;
        button.textContent = button.dataset.sort === sortKey ? `${label} ${ascending ? '↑' : '↓'}` : label;
      });
      sourceNote.innerHTML = myList
        ? '전체 기종의 <strong>★ 찜</strong>과 <strong>🛠 착수</strong> 항목을 모아 표시합니다. 각 기종의 후보군과 PS3 예비 기록도 포함하며 찜의 수동 순서를 유지합니다.'
        : activePlatform === 'ps3'
          ? `개인 추천점수(1–10)는 작품성(5점 만점)과 별개입니다. 한글화 후보 조건을 통과한 선정 후보와 예비 기록을 나눠 표시합니다. 개인 순위는 전체 기록 기준이며 찜의 수동 순서는 유지됩니다. <a href="${GITHUB_BASE}platforms/ps3/reassessments/2026-10-08-personal-top-30.md" target="_blank" rel="noreferrer">평가 근거와 선정 기준</a> · <a href="${GITHUB_BASE}${reserveView ? PLATFORMS.ps3.reservePath : PLATFORMS.ps3.path}" target="_blank" rel="noreferrer">${reserveView ? '예비 사유와 원본 보기' : '선정 원본 보기'}</a>`
        : PLATFORMS[activePlatform].rankingPath
          ? `리뷰 근거 기반 작품 평가(1–10)입니다. 원평점·표본 수·판본과 내용·진행 설계·음향/연출·완성도를 종합한 판단이며, 완전히 객관적인 지표는 아닙니다. 취향·한글화 가치·희소성은 점수에 반영하지 않습니다. 같은 점수는 공동 순위이며, 근거가 제한된 항목은 ‘잠정’, 부족한 항목은 점수와 순위 없이 ‘평가보류’로 표시합니다. 근거 필터로 따로 볼 수 있습니다. 기존 목록과 후보군 구분 및 찜의 수동 순서를 유지합니다. <a href="${GITHUB_BASE}platforms/${activePlatform}/reassessments/2026-10-08-review-assessments.md" target="_blank" rel="noreferrer">원평점·표본·판본·평가 근거</a> · <a href="${GITHUB_BASE}${PLATFORMS[activePlatform].rankingPath}" target="_blank" rel="noreferrer">평가 원본</a>`
          : `원본 데이터는 저장소의 <code>${escapeHtml(PLATFORMS[activePlatform].path)}</code>에서 실시간으로 읽습니다.`;
      status.hidden = true;
      wrap.hidden = false;
      updateStats(all);
      updateCompareBar();
    } catch (error) {
      if (version !== renderVersion) return;
      status.hidden = false;
      status.textContent = `목록을 불러오지 못했습니다: ${error.message}. 목록 버튼을 눌러 다시 시도해 주세요.`;
      wrap.hidden = true;
    }
  };

  const queueSave = (label, key, changedOrder = false) => {
    if (key) dirtyKeys.add(key);
    if (changedOrder) orderDirty = true;
    pendingMessages.push(label);
    mutationVersion += 1;
    cacheWatchlist(watchlist);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveWatchlist, 800);
  };

  const writeWatchlist = async (data, sha, message) => {
    const token = getToken();
    if (!hasToken()) throw new Error('편집 권한을 확인해 주세요.');
    const res = await fetch(WATCHLIST_API, {
      method: 'PUT',
      headers: {
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message,
        content: encodeBase64Utf8(JSON.stringify(Core.normalizeWatchlist(data), null, 2) + '\n'),
        sha: sha || undefined,
        branch: WATCHLIST_BRANCH,
      }),
    });
    if (res.status === 409) {
      const error = new Error('conflict');
      error.conflict = true;
      throw error;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  async function saveWatchlist() {
    if (!hasToken() || (!dirtyKeys.size && !orderDirty)) return;
    if (saving) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveWatchlist, 350);
      return;
    }
    saving = true;
    const version = mutationVersion;
    const snapshot = Core.cloneWatchlist(watchlist);
    const keys = [...dirtyKeys];
    const changedOrder = orderDirty;
    const labels = [...pendingMessages];
    const message = labels.length === 1 ? `chore(watchlist): ${labels[0]}` : 'chore(watchlist): 찜 목록 갱신';
    try {
      let sha = watchlistSha;
      if (!sha) {
        const remote = await readWatchlistApi();
        sha = remote.sha;
      }
      let toSave = snapshot;
      let result;
      try {
        result = await writeWatchlist(toSave, sha, message);
      } catch (error) {
        if (!error.conflict) throw error;
        const remote = await readWatchlistApi();
        toSave = Core.mergeWatchlists(remote.data, snapshot, keys, changedOrder);
        result = await writeWatchlist(toSave, remote.sha, message);
        if (version === mutationVersion) {
          watchlist = toSave;
          await render();
        }
      }
      watchlistSha = result.content && result.content.sha ? result.content.sha : watchlistSha;
      lastSavedWatchlist = Core.cloneWatchlist(toSave);
      cacheWatchlist(toSave);
      if (version === mutationVersion) {
        dirtyKeys.clear();
        orderDirty = false;
        pendingMessages = [];
      } else {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveWatchlist, 800);
      }
    } catch (_) {
      if (version === mutationVersion) {
        watchlist = Core.cloneWatchlist(lastSavedWatchlist);
        dirtyKeys.clear();
        orderDirty = false;
        pendingMessages = [];
        cacheWatchlist(watchlist);
        await render();
      }
      showToast('저장하지 못했어요. 열쇠를 확인해 주세요');
    } finally {
      saving = false;
    }
  }

  const toggleWatch = async key => {
    if (!hasToken()) return;
    const allRows = [...rowsByPlatform.values()].flat();
    const row = allRows.find(item => item.key === key);
    if (!row || !notDeleted(key)) return;
    if (watchlist.items[key]) {
      delete watchlist.items[key];
      watchlist.order = watchlist.order.filter(item => item !== key);
      queueSave(`☆ 해제 ${row.title}`, key, true);
    } else {
      watchlist.items[key] = { added: new Date().toISOString(), note: '' };
      watchlist.order.push(key);
      queueSave(`★ ${row.title}`, key, true);
    }
    await render();
  };

  const startNoteEdit = button => {
    if (!hasToken()) return;
    const key = button.dataset.key;
    const item = watchlist.items[key];
    if (!item || !notDeleted(key)) return;
    const old = item.note || '';
    const input = document.createElement('input');
    input.className = 'note-input';
    input.type = 'text';
    input.maxLength = 60;
    input.value = old;
    button.replaceWith(input);
    input.focus();
    input.select();
    let finished = false;
    const cancel = async () => {
      if (finished) return;
      finished = true;
      await render();
    };
    const save = async () => {
      if (finished) return;
      finished = true;
      const next = Core.cleanNote(input.value);
      item.note = next;
      const title = ([...rowsByPlatform.values()].flat().find(row => row.key === key) || {}).title || key;
      queueSave(`메모 ${title}`, key, false);
      await render();
    };
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); save(); }
      if (event.key === 'Escape') { event.preventDefault(); cancel(); }
    });
    input.addEventListener('blur', cancel, { once: true });
  };

  const visibleReorderKeys = () => [...body.querySelectorAll('tr[data-reorderable="true"]')].map(row => row.dataset.key);

  const applyVisibleOrder = async nextVisible => {
    watchlist.order = Core.reorderVisible(watchlist.order, nextVisible, nextVisible);
    queueSave('순서 변경', null, true);
    await render();
  };

  const moveKey = async (key, mode) => {
    const visible = visibleReorderKeys();
    const index = visible.indexOf(key);
    if (index < 0) return;
    let target = index;
    if (mode === 'up') target = Math.max(0, index - 1);
    if (mode === 'down') target = Math.min(visible.length - 1, index + 1);
    if (mode === 'top') target = 0;
    if (target === index) return;
    visible.splice(index, 1);
    visible.splice(target, 0, key);
    await applyVisibleOrder(visible);
  };

  const closeComparison = () => {
    comparisonVersion += 1;
    comparisonHash = '';
    if (compareDialog.open) compareDialog.close();
  };

  const openComparison = async () => {
    compareKeys = new Set([...compareKeys].filter(key => Exclusions.validKey(key) && notDeleted(key)));
    if (compareKeys.size < 2) return;
    const version = ++comparisonVersion;
    const keys = [...compareKeys].slice(0, 4);
    comparisonHash = Core.compareHash(keys);
    history.replaceState(null, '', `${location.pathname}${location.search}${comparisonHash}`);
    compareContent.innerHTML = '<p class="status">비교 정보를 불러오는 중…</p>';
    if (!compareDialog.open) compareDialog.showModal();
    try {
      const docs = await Promise.all(keys.map(async key => {
        const markdown = await fetchText(`${RAW_BASE}${key}`);
        return { key, ...parseCompareDocument(markdown) };
      }));
      if (version !== comparisonVersion || !compareDialog.open) return;
      const fields = [
        ['플랫폼', doc => doc.info['플랫폼']],
        ['발매일', doc => doc.info['발매일']],
        ['장르', doc => doc.info['장르']],
        ['발굴 추천도', doc => doc.quoted['발굴 추천도']],
        ['한글화 우선도', doc => doc.quoted['한글화 우선도']],
        ['예상 플레이타임', doc => doc.info['예상 플레이타임']],
        ['한글화 난이도', doc => doc.info['한글화 난이도']],
        ['제품번호', doc => doc.info['제품번호'] || doc.info['제품 번호'] || doc.info['Title ID']],
      ].filter(([, getter]) => docs.some(doc => getter(doc)));

      const ratingNumbers = docs.map(doc => {
        const text = doc.quoted['발굴 추천도'] || '';
        const number = text.match(/(\d+(?:\.\d+)?)\s*\/\s*5/);
        return number ? Number(number[1]) : ratingValue(text);
      });
      const bestRating = Math.max(...ratingNumbers);
      const priorityNumbers = docs.map(doc => priorityRank(doc.quoted['한글화 우선도'] || ''));
      const bestPriority = Math.min(...priorityNumbers);

      const head = `<thead><tr><th>항목</th>${docs.map(doc => {
        const starred = Boolean(watchlist.items[doc.key]);
        const topButton = hasToken() && starred ? `<button type="button" class="compare-top" data-key="${escapeHtml(doc.key)}">1순위로 올리기</button>` : '';
        return `<th>${escapeHtml(doc.title || doc.key)}${topButton}</th>`;
      }).join('')}</tr></thead>`;

      const rows = fields.map(([label, getter]) => {
        const values = docs.map((doc, index) => {
          const value = getter(doc) || '—';
          const best = label === '발굴 추천도' && ratingNumbers[index] === bestRating
            || label === '한글화 우선도' && priorityNumbers[index] === bestPriority;
          return `<td>${best && value !== '—' ? `<strong>${escapeHtml(value)}</strong>` : escapeHtml(value)}</td>`;
        }).join('');
        return `<tr><th>${escapeHtml(label)}</th>${values}</tr>`;
      });

      rows.push(`<tr><th>내 메모</th>${docs.map(doc => `<td>${escapeHtml((watchlist.items[doc.key] || {}).note || '—')}</td>`).join('')}</tr>`);
      rows.push(`<tr><th>진행 상태</th>${docs.map(doc => {
        const patch = patches.get(doc.key);
        const value = patch && patch.status === 'wip' ? '🛠 착수' : patch && patch.status === 'released' ? '✓ 배포' : watchlist.items[doc.key] ? '★ 찜' : '일반 후보';
        return `<td>${value}</td>`;
      }).join('')}</tr>`);

      compareContent.innerHTML = `<table class="compare-table">${head}<tbody>${rows.join('')}</tbody></table>`;
    } catch (error) {
      if (version !== comparisonVersion || !compareDialog.open) return;
      compareContent.innerHTML = `<p class="status">비교 정보를 불러오지 못했습니다: ${escapeHtml(error.message)}</p>`;
    }
  };

  const renderDeleted = () => {
    const entries = Object.entries(deletionStore.data.entries).filter(([, entry]) => entry.deleted);
    deletedContent.innerHTML = entries.length ? entries.map(([key, entry]) => {
      const platform = key.split('/')[1];
      return `<div class="deleted-game"><div><strong>${escapeHtml(entry.title)}</strong><span>${escapeHtml(PLATFORMS[platform]?.short || platform)} · ${escapeHtml(displayDate(entry.updated))}</span></div><button class="secondary-btn candidate-restore" type="button" data-key="${escapeHtml(key)}" ${!deletionStore.ready || deletionStore.busy ? 'disabled' : ''}>복구</button></div>`;
    }).join('') : '<p class="modal-copy">삭제한 게임이 없습니다.</p>';
  };
  const changeDeleted = async (key, deleted) => {
    if (!hasToken() || !deletionStore.ready || deletionStore.busy) return;
    const row = [...rowsByPlatform.values()].flat().find(item => item.key === key)
      || (deletionStore.data.entries[key] ? { key, title: deletionStore.data.entries[key].title, platform: key.split('/')[1] } : null);
    if (!row) return;
    const platform = PLATFORMS[row.platform]?.short || row.platform;
    if (!window.confirm(deleted
      ? `${row.title} (${platform})\n공개 후보 목록에서 삭제할까요?\n원본 문서와 찜·메모는 남으며 ‘삭제한 게임’에서 복구할 수 있습니다.`
      : `${row.title} (${platform})\n후보 목록으로 복구할까요?`)) return;
    const operation = deletionStore.change(row, deleted);
    await render();
    renderDeleted();
    try {
      await operation;
      showToast(deleted ? '후보 목록에서 삭제했습니다' : '후보 목록으로 복구했습니다');
      if (compareDialog.open) {
        compareKeys = new Set([...compareKeys].filter(key => Exclusions.validKey(key) && notDeleted(key)));
        if (compareKeys.size < 2) closeComparison();
        else await openComparison();
      }
    } catch (_) {
      await verifyEditor();
      showToast('저장하지 못했습니다. 열쇠·네트워크를 확인한 뒤 다시 시도해 주세요.');
    }
    await render();
    renderDeleted();
  };
  deletedOpen.addEventListener('click', () => {
    if (!hasToken()) return;
    renderDeleted();
    deletedDialog.showModal();
  });
  deletedClose.addEventListener('click', () => deletedDialog.close());
  deletedContent.addEventListener('click', event => {
    const button = event.target.closest('.candidate-restore');
    if (button) changeDeleted(button.dataset.key, false);
  });
  retrySync.addEventListener('click', async () => {
    retrySync.disabled = true;
    await verifyEditor();
    await loadDeletionState();
    await render();
    renderDeleted();
    retrySync.disabled = false;
  });

  const restoreComparison = () => {
    compareKeys = new Set(Core.compareKeysFromHash(location.hash).filter(key => Exclusions.validKey(key) && notDeleted(key)));
    if (compareKeys.size < 2) { closeComparison(); return; }
    const hash = Core.compareHash([...compareKeys]);
    // popstate and hashchange can describe the same history entry.
    if (compareDialog.open && comparisonHash === hash) return;
    return openComparison();
  };

  body.addEventListener('click', event => {
    const remove = event.target.closest('.candidate-delete');
    if (remove) { changeDeleted(remove.dataset.key, true); return; }
    const star = event.target.closest('.star-toggle');
    if (star) { toggleWatch(star.dataset.key); return; }
    const note = event.target.closest('.note-edit');
    if (note) { startNoteEdit(note); return; }
    const move = event.target.closest('[data-move]');
    if (move) { moveKey(move.dataset.key, move.dataset.move); }
  });

  body.addEventListener('change', event => {
    const input = event.target.closest('.compare-check');
    if (!input) return;
    const key = input.dataset.key;
    if (!notDeleted(key)) return;
    if (input.checked) {
      if (compareKeys.size >= 4 && !compareKeys.has(key)) {
        input.checked = false;
        showToast('비교는 최대 4개까지 선택할 수 있어요');
        return;
      }
      compareKeys.add(key);
    } else {
      compareKeys.delete(key);
    }
    if (compareKeys.size >= 2) history.replaceState(null, '', `${location.pathname}${location.search}${Core.compareHash([...compareKeys])}`);
    else if (location.hash.startsWith('#compare=')) history.replaceState(null, '', `${location.pathname}${location.search}`);
    updateCompareBar();
  });

  body.addEventListener('keydown', event => {
    const handle = event.target.closest('.drag-handle');
    if (!handle || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    moveKey(handle.dataset.key, event.key === 'ArrowUp' ? 'up' : 'down');
  });

  body.addEventListener('pointerdown', event => {
    const handle = event.target.closest('.drag-handle');
    if (!handle) return;
    const start = () => {
      const row = handle.closest('tr[data-key]');
      if (!row || !notDeleted(key)) return;
      dragState = { handle, row, pointerId: event.pointerId, active: true };
      row.classList.add('dragging');
      try { handle.setPointerCapture(event.pointerId); } catch (_) {}
    };
    if (event.pointerType === 'touch') {
      dragState = { handle, row: handle.closest('tr[data-key]'), pointerId: event.pointerId, active: false, timer: setTimeout(start, 360) };
    } else {
      start();
    }
  });

  body.addEventListener('pointermove', event => {
    if (!dragState || dragState.pointerId !== event.pointerId || !dragState.active) return;
    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const row = target && target.closest('tr[data-reorderable="true"]');
    if (!row || row === dragState.row || row.parentElement !== body) return;
    const box = row.getBoundingClientRect();
    body.insertBefore(dragState.row, event.clientY < box.top + box.height / 2 ? row : row.nextSibling);
  });

  const finishDrag = async event => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    if (dragState.timer) clearTimeout(dragState.timer);
    if (dragState.active) {
      dragState.row.classList.remove('dragging');
      const next = visibleReorderKeys();
      watchlist.order = Core.reorderVisible(watchlist.order, next, next);
      queueSave('순서 변경', null, true);
      await render();
    }
    dragState = null;
  };
  body.addEventListener('pointerup', finishDrag);
  body.addEventListener('pointercancel', finishDrag);

  search.addEventListener('input', render);
  reviewEvidenceSelect.addEventListener('change', async () => {
    reviewEvidenceFilter = reviewEvidenceLabels[reviewEvidenceSelect.value] ? reviewEvidenceSelect.value : 'all';
    await render();
  });

  sortButtons.forEach(button => {
    button.dataset.label = button.textContent.replace(/\s[↑↓]$/, '');
    button.addEventListener('click', async () => {
      const nextKey = button.dataset.sort;
      if (sortKey === nextKey) ascending = !ascending;
      else { sortKey = nextKey; ascending = true; }
      sortButtons.forEach(item => {
        item.classList.toggle('active', item === button);
        item.textContent = item.dataset.label;
      });
      button.textContent = `${button.dataset.label} ${ascending ? '↑' : '↓'}`;
      await render();
    });
  });

  const syncLocation = () => {
    closeComparison();
    const url = new URL(location.href);
    url.searchParams.set('platform', activePlatform);
    if (myList) url.searchParams.set('view', 'my-list');
    else if (reserveView && activePlatform === 'ps3') url.searchParams.set('view', 'reserve');
    else if (PLATFORMS[activePlatform].rankingPath && recommendationView !== 'all') url.searchParams.set('view', recommendationView);
    else url.searchParams.delete('view');
    url.hash = '';
    if (url.href !== location.href) history.pushState(null, '', url);
  };

  const setPlatformSort = () => {
    if (!myList && hasPersonalScores(activePlatform)) { sortKey = 'personal'; ascending = true; }
    else if (sortKey === 'personal') { sortKey = 'priority'; ascending = true; }
  };

  platformButtons.forEach(button => button.addEventListener('click', async () => {
    myList = false;
    activePlatform = button.dataset.platform;
    reserveView = false;
    recommendationView = 'all';
    reviewEvidenceFilter = 'all';
    reviewEvidenceSelect.value = 'all';
    setPlatformSort();
    search.value = '';
    syncLocation();
    await render();
  }));

  const selectPs3View = async reserve => {
    myList = false;
    activePlatform = 'ps3';
    reserveView = reserve;
    setPlatformSort();
    search.value = '';
    syncLocation();
    await render();
  };
  selectedButton.addEventListener('click', () => selectPs3View(false));
  reserveButton.addEventListener('click', () => selectPs3View(true));
  recommendationButtons.forEach(button => button.addEventListener('click', async () => {
    recommendationView = button.dataset.view;
    setPlatformSort();
    search.value = '';
    syncLocation();
    await render();
  }));

  window.addEventListener('popstate', async () => {
    const next = new URLSearchParams(location.search);
    activePlatform = PLATFORMS[next.get('platform')] ? next.get('platform') : 'ps2';
    reserveView = activePlatform === 'ps3' && next.get('view') === 'reserve';
    recommendationView = ['active', 'reserve'].includes(next.get('view')) ? next.get('view') : 'all';
    myList = next.get('view') === 'my-list';
    setPlatformSort();
    search.value = '';
    const comparison = restoreComparison();
    await render();
    await comparison;
  });

  watchOnlyButton.addEventListener('click', async () => {
    watchOnly = !watchOnly;
    watchOnlyButton.classList.toggle('active', watchOnly);
    watchOnlyButton.setAttribute('aria-pressed', String(watchOnly));
    await render();
  });

  myListButton.addEventListener('click', async () => {
    myList = !myList;
    setPlatformSort();
    syncLocation();
    await render();
  });

  settingsOpen.addEventListener('click', () => {
    tokenInput.value = getToken();
    settingsDialog.showModal();
  });
  tokenSave.addEventListener('click', async () => {
    const value = tokenInput.value.trim();
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
    settingsDialog.close();
    await verifyEditor();
    await loadDeletionState();
    showToast(hasToken() ? '소유자 확인 완료 · 열쇠를 저장했습니다' : value ? '열쇠의 계정과 권한을 확인해 주세요' : '편집 열쇠를 비웠습니다');
    await render();
  });
  tokenClear.addEventListener('click', async () => {
    localStorage.removeItem(TOKEN_KEY);
    tokenInput.value = '';
    settingsDialog.close();
    ownerVerified = false;
    showToast('이 기기의 편집 열쇠를 지웠습니다');
    await render();
  });

  compareClear.addEventListener('click', async () => {
    closeComparison();
    compareKeys.clear();
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    await render();
  });
  compareOpen.addEventListener('click', openComparison);
  compareClose.addEventListener('click', closeComparison);
  compareDialog.addEventListener('cancel', closeComparison);
  compareContent.addEventListener('click', async event => {
    const button = event.target.closest('.compare-top');
    if (!button || !hasToken() || !notDeleted(button.dataset.key)) return;
    const key = button.dataset.key;
    watchlist.order = [key, ...watchlist.order.filter(item => item !== key)];
    queueSave('순서 변경', null, true);
    await render();
    await openComparison();
  });

  window.addEventListener('hashchange', async () => {
    const comparison = restoreComparison();
    await render();
    await comparison;
  });

  status.hidden = false;
  status.textContent = '후보 목록과 찜 상태를 불러오는 중…';
  wrap.hidden = true;
  await verifyEditor();
  await Promise.all([loadDeletionState(), loadPatches(), loadWatchlist().then(value => { watchlist = value; lastSavedWatchlist = Core.cloneWatchlist(value); })]);
  compareKeys = new Set([...compareKeys].filter(key => Exclusions.validKey(key) && notDeleted(key)));
  if (myList) setPlatformSort();
  await render();
  if (compareKeys.size >= 2) await openComparison();
  desktopLayout?.addEventListener?.('change', () => { render(); });
}

function resolveRelativeMarkdownLink(currentFile, href) {
  if (/^(https?:|mailto:|#)/i.test(href)) return href;
  const fragmentAt = href.indexOf('#');
  const markdownHref = fragmentAt < 0 ? href : href.slice(0, fragmentAt);
  const fragment = fragmentAt < 0 ? '' : href.slice(fragmentAt);
  if (!markdownHref.endsWith('.md')) return href;
  const base = currentFile.split('/').slice(0, -1);
  for (const part of markdownHref.split('/')) {
    if (part === '..') base.pop();
    else if (part !== '.' && part) base.push(part);
  }
  const target = base.join('/');
  if (/^platforms\/[a-z0-9-]+\/reassessments\/[a-z0-9-]+\.md$/i.test(target)) return `${GITHUB_BASE}${target}${fragment}`;
  return `game.html?file=${encodeURIComponent(target)}${fragment}`;
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
