(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ExclusionCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const OWNER_ID = 314692476;
  const REPO_API = 'https://api.github.com/repos/Dollars-Archive/Game-Localization-Discovery-Archive';
  const BRANCH = 'watchlist-data';
  const PATH = 'docs/data/excluded-games.json';
  const CACHE_KEY = 'discovery-excluded-games-cache-v1';
  const validKey = key => /^platforms\/[a-z0-9-]+\/games\/[a-z0-9-]+\.md$/.test(key);
  function normalize(input) {
    if (!input || input.version !== 1 || !input.entries || typeof input.entries !== 'object' || Array.isArray(input.entries)) {
      throw new Error('삭제 목록 형식을 확인할 수 없습니다.');
    }
    const entries = {};
    for (const [key, value] of Object.entries(input.entries)) {
      if (!validKey(key) || !value || typeof value.deleted !== 'boolean' || typeof value.updated !== 'string'
        || !Number.isFinite(Date.parse(value.updated)) || typeof value.title !== 'string') {
        throw new Error('삭제 목록의 항목을 확인할 수 없습니다.');
      }
      entries[key] = { deleted: value.deleted, updated: value.updated, title: value.title.slice(0, 300) };
    }
    return { version: 1, entries };
  }
  const empty = () => ({ version: 1, entries: {} });
  const isDeleted = (data, key) => Boolean(data.entries[key] && data.entries[key].deleted);
  const visible = (rows, data) => rows.filter(row => !isDeleted(data, row.key));
  const selection = (keys, watchlist, data) => [...keys].filter(key => watchlist.items[key] && !isDeleted(data, key));
  function withChange(remote, key, value) {
    return normalize({ version: 1, entries: { ...normalize(remote).entries, [key]: value } });
  }
  async function verifyOwner(fetcher, token) {
    if (!token) return false;
    const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` };
    const user = await fetcher('https://api.github.com/user', { headers, cache: 'no-store' });
    if (!user.ok || (await user.json()).id !== OWNER_ID) return false;
    const repo = await fetcher(REPO_API, { headers, cache: 'no-store' });
    return Boolean(repo.ok && (await repo.json()).permissions?.push);
  }
  function createStore({ fetcher, storage, decode, encode, token, knownKey, now = () => new Date().toISOString() }) {
    let data = empty();
    let ready = false;
    let busy = false;
    const cache = () => { try { storage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (_) {} };
    const read = async () => {
      // Public reads do not depend on a stored token's validity.
      const res = await fetcher(`${REPO_API}/contents/${PATH}?ref=${BRANCH}&_=${Date.now()}`, {
        headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store',
      });
      if (res.status === 404) {
        const branch = await fetcher(`${REPO_API}/branches/${BRANCH}`, { cache: 'no-store' });
        if (!branch.ok) throw new Error('삭제 목록 저장 브랜치를 확인할 수 없습니다.');
        return { data: empty(), sha: undefined };
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      return { data: normalize(JSON.parse(decode(payload.content))), sha: payload.sha };
    };
    async function load() {
      ready = false;
      try {
        data = (await read()).data;
        ready = true;
        cache();
        return { ready: true, cached: false };
      } catch (_) {
        let cached = false;
        try {
          const value = storage.getItem(CACHE_KEY);
          if (value) { data = normalize(JSON.parse(value)); cached = true; }
        } catch (_) {}
        return { ready: false, cached };
      }
    }
    async function change(row, deleted) {
      if (!ready || busy || !row || !knownKey(row.key) || !validKey(row.key)) throw new Error('삭제 목록이 준비되지 않았습니다.');
      busy = true;
      const key = row.key;
      const currentToken = token();
      try {
        if (!await verifyOwner(fetcher, currentToken) || token() !== currentToken) throw new Error('편집 권한을 확인해 주세요.');
        const value = { deleted, updated: now(), title: row.title };
        for (let attempt = 0; attempt < 2; attempt += 1) {
          // Re-read and merge only this operation, preserving other devices' games.
          const latest = await read();
          const next = withChange(latest.data, key, value);
          if (token() !== currentToken) throw new Error('열쇠가 변경되었습니다.');
          const res = await fetcher(`${REPO_API}/contents/${PATH}`, {
            method: 'PUT',
            headers: { Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
            body: JSON.stringify({ branch: BRANCH, sha: latest.sha,
              message: `chore(candidates): ${deleted ? '목록 삭제' : '목록 복구'} ${String(row.title).replace(/[\r\n]/g, ' ').slice(0, 150)}`,
              content: encode(JSON.stringify(next, null, 2) + '\n') }),
          });
          if (res.status === 409 && attempt === 0) continue;
          if (res.status === 422 && attempt === 0 && !latest.sha) {
            const error = await res.json();
            if (/sha|already exists/i.test(error.message || '')) continue;
          }
          if (!res.ok) throw new Error(`저장하지 못했습니다 (HTTP ${res.status}).`);
          data = next;
          cache();
          return data;
        }
        throw new Error('다른 기기의 변경 후 다시 시도해 주세요.');
      } finally { busy = false; }
    }
    return { load, change, get data() { return data; }, get ready() { return ready; }, get busy() { return busy; } };
  }
  return { normalize, empty, isDeleted, visible, selection, withChange, verifyOwner, createStore, validKey };
});
