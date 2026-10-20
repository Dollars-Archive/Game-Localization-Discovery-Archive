// Detail-page controls share the index's token, cache, branch and data formats.
async function initGameActions(row) {
  const W = window.WatchlistCore;
  const E = window.ExclusionCore;
  const el = id => document.getElementById(id);
  const panel = el('game-actions');
  if (!panel || !W || !E || !E.validKey(row.key)) return;
  const star = el('game-star');
  const remove = el('game-delete');
  const status = el('game-action-status');
  const tokenKey = 'discovery-watchlist-token-v1';
  const cacheKey = 'discovery-watchlist-cache-v1';
  const api = 'https://api.github.com/repos/Dollars-Archive/Game-Localization-Discovery-Archive/contents/docs/data/watchlist.json';
  const branch = 'watchlist-data';
  const token = () => { try { return localStorage.getItem(tokenKey) || ''; } catch (_) { return ''; } };
  let watchlist = W.normalizeWatchlist({});
  let verifiedToken = '';
  let ready = false;
  let busy = false;
  const exclusions = E.createStore({ fetcher: fetch, storage: localStorage,
    decode: decodeBase64Utf8, encode: encodeBase64Utf8, token,
    knownKey: key => key === row.key });
  const cache = () => { try { localStorage.setItem(cacheKey, JSON.stringify(watchlist)); } catch (_) {} };
  const headers = value => ({ Accept: 'application/vnd.github+json', ...(value ? { Authorization: `Bearer ${value}` } : {}) });
  const read = async () => {
    const res = await fetch(`${api}?ref=${branch}&_=${Date.now()}`, { cache: 'no-store', headers: headers('') });
    if (!res.ok) throw new Error(`찜 불러오기 실패 (HTTP ${res.status})`);
    const payload = await res.json();
    if (!payload.sha || typeof payload.content !== 'string') throw new Error('찜 저장 파일을 확인할 수 없습니다.');
    return { data: W.normalizeWatchlist(JSON.parse(decodeBase64Utf8(payload.content))), sha: payload.sha };
  };
  const draw = () => {
    const deleted = E.isDeleted(exclusions.data, row.key);
    const starred = Boolean(watchlist.items[row.key]);
    const editable = Boolean(verifiedToken) && token() === verifiedToken;
    star.textContent = starred ? '★ 찜 해제' : '☆ 찜 추가';
    star.setAttribute('aria-pressed', String(starred));
    star.classList.toggle('active', starred);
    star.disabled = busy || !editable || !ready || !exclusions.ready || deleted;
    remove.textContent = deleted ? '후보 목록에 복구' : '후보 목록에서 삭제';
    remove.disabled = busy || !editable || !exclusions.ready;
    for (const id of ['game-sync', 'game-token-save', 'game-token-clear']) el(id).disabled = busy;
  };
  const refresh = async () => {
    if (busy) return;
    busy = true;
    ready = false;
    verifiedToken = '';
    status.textContent = '찜과 삭제 상태를 확인하는 중…';
    draw();
    const value = token();
    const results = await Promise.allSettled([read(), exclusions.load(), E.verifyOwner(fetch, value)]);
    if (results[0].status === 'fulfilled') {
      watchlist = results[0].value.data;
      ready = true;
      cache();
    } else {
      try { watchlist = W.normalizeWatchlist(JSON.parse(localStorage.getItem(cacheKey) || '{}')); } catch (_) {}
    }
    if (results[2].status === 'fulfilled' && results[2].value && token() === value) verifiedToken = value;
    busy = false;
    const notice = !ready || !exclusions.ready ? '동기화 실패 · 기존 표시를 유지합니다. 새로고침해 주세요.'
      : E.isDeleted(exclusions.data, row.key) ? '후보 목록에서 삭제된 게임입니다. 본문과 찜·메모는 보존됩니다.'
      : verifiedToken ? '목록과 같은 찜·삭제 상태입니다. 변경은 GitHub에 저장됩니다.'
      : value ? '열쇠의 소유자·쓰기 권한을 확인하지 못했습니다. 열쇠를 확인해 주세요.'
      : '등록된 열쇠 없음 · 편집하려면 GitHub 열쇠를 등록하세요.';
    status.textContent = notice;
    draw();
  };
  star.addEventListener('click', async () => {
    if (star.disabled) return;
    busy = true;
    draw();
    status.textContent = '찜을 GitHub에 저장하는 중…';
    const value = verifiedToken;
    const adding = !watchlist.items[row.key];
    try {
      if (!await E.verifyOwner(fetch, value) || token() !== value) throw new Error('편집 권한을 확인해 주세요.');
      const deletion = await exclusions.load();
      if (!deletion.ready || E.isDeleted(exclusions.data, row.key)) throw new Error('삭제 상태가 변경되었거나 확인되지 않습니다. 새로고침해 주세요.');
      for (let attempt = 0; attempt < 2; attempt += 1) {
        // Always merge only this game's operation into the latest remote document.
        const latest = await read();
        const next = W.cloneWatchlist(latest.data);
        if (adding) {
          if (!next.items[row.key]) next.items[row.key] = { added: new Date().toISOString(), note: '' };
          if (!next.order.includes(row.key)) next.order.push(row.key);
        } else {
          delete next.items[row.key];
          next.order = next.order.filter(key => key !== row.key);
        }
        if (token() !== value) throw new Error('열쇠가 변경되었습니다.');
        const res = await fetch(api, { method: 'PUT', headers: { ...headers(value), 'Content-Type': 'application/json' },
          body: JSON.stringify({ branch, sha: latest.sha,
            message: `chore(watchlist): ${adding ? '★' : '☆ 해제'} ${row.title.replace(/[\r\n]/g, ' ').slice(0, 150)}`,
            content: encodeBase64Utf8(JSON.stringify(next, null, 2) + '\n') }) });
        if (res.status === 409 && attempt === 0) continue;
        if (!res.ok) throw new Error(`찜 저장 실패 (HTTP ${res.status})`);
        watchlist = next;
        cache();
        status.textContent = adding ? '찜을 GitHub에 저장했습니다.' : '찜을 해제하고 GitHub에 저장했습니다.';
        return;
      }
    } catch (error) { status.textContent = `${error.message} · 저장 완료를 확인하지 못했습니다. 새로고침해 주세요.`; }
    finally { busy = false; draw(); }
  });
  remove.addEventListener('click', async () => {
    if (remove.disabled) return;
    const deleting = !E.isDeleted(exclusions.data, row.key);
    if (!window.confirm(`${row.title}\n${deleting ? '공개 후보 목록에서 삭제할까요? 원본 문서와 찜·메모는 보존됩니다.' : '후보 목록에 복구할까요?'}`)) return;
    busy = true;
    draw();
    status.textContent = '후보 목록 변경을 저장하는 중…';
    try {
      await exclusions.change(row, deleting);
      status.textContent = deleting ? '후보 목록에서 삭제했습니다. 본문과 찜·메모는 보존됩니다.' : '후보 목록에 복구했습니다.';
    } catch (error) { status.textContent = error.message; }
    finally { busy = false; draw(); }
  });
  el('game-sync').addEventListener('click', refresh);
  el('game-token-save').addEventListener('click', async () => {
    if (busy) return;
    const input = el('game-token');
    const value = input.value.trim();
    if (!value) { status.textContent = 'GitHub 열쇠를 입력하세요.'; return; }
    try { localStorage.setItem(tokenKey, value); input.value = ''; await refresh(); }
    catch (_) { status.textContent = '브라우저에 열쇠를 저장하지 못했습니다. 저장소 설정을 확인하세요.'; }
  });
  el('game-token-clear').addEventListener('click', async () => {
    if (busy) return;
    try { localStorage.removeItem(tokenKey); el('game-token').value = ''; await refresh(); }
    catch (_) { status.textContent = '열쇠 사용 중지에 실패했습니다. 브라우저 설정을 확인하세요.'; }
  });
  window.addEventListener('storage', event => {
    if ([tokenKey, cacheKey, 'discovery-excluded-games-cache-v1', null].includes(event.key)) refresh();
  });
  window.addEventListener('pageshow', event => { if (event.persisted) refresh(); });
  panel.hidden = false;
  await refresh();
}
