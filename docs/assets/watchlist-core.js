(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.WatchlistCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function cleanNote(value) {
    return String(value == null ? '' : value).replace(/[\r\n]+/g, ' ').trim().slice(0, 60);
  }

  function normalizeWatchlist(input) {
    const source = input && typeof input === 'object' ? input : {};
    const rawItems = source.items && typeof source.items === 'object' && !Array.isArray(source.items) ? source.items : {};
    const items = {};
    Object.entries(rawItems).forEach(([key, value]) => {
      if (!key || !value || typeof value !== 'object') return;
      items[key] = {
        added: typeof value.added === 'string' && value.added ? value.added : new Date(0).toISOString(),
        note: cleanNote(value.note),
      };
    });
    const order = [];
    const seen = new Set();
    (Array.isArray(source.order) ? source.order : []).forEach(key => {
      if (items[key] && !seen.has(key)) {
        order.push(key);
        seen.add(key);
      }
    });
    Object.keys(items).forEach(key => {
      if (!seen.has(key)) {
        order.push(key);
        seen.add(key);
      }
    });
    return { version: 1, order, items };
  }

  function cloneWatchlist(input) {
    return normalizeWatchlist(JSON.parse(JSON.stringify(normalizeWatchlist(input))));
  }

  function mergeWatchlists(remoteInput, localInput, dirtyKeysInput, orderDirty) {
    const remote = cloneWatchlist(remoteInput);
    const local = cloneWatchlist(localInput);
    const dirtyKeys = new Set(dirtyKeysInput || []);
    dirtyKeys.forEach(key => {
      if (local.items[key]) remote.items[key] = { ...local.items[key] };
      else delete remote.items[key];
    });
    if (orderDirty) {
      const localKeys = local.order.filter(key => remote.items[key]);
      const seen = new Set(localKeys);
      remote.order = localKeys.concat(remote.order.filter(key => remote.items[key] && !seen.has(key)));
    }
    return normalizeWatchlist(remote);
  }

  function reorderVisible(fullOrderInput, visibleKeysInput, nextVisibleInput) {
    const fullOrder = [...fullOrderInput];
    const visible = new Set(visibleKeysInput);
    const nextVisible = nextVisibleInput.filter(key => visible.has(key));
    if (nextVisible.length !== visible.size) return fullOrder;
    let cursor = 0;
    return fullOrder.map(key => visible.has(key) ? nextVisible[cursor++] : key);
  }

  function rowCompare(a, b, sortKey) {
    if (sortKey === 'personal') return (b.personalScore || 0) - (a.personalScore || 0)
      || (a.personalRank || Number.MAX_SAFE_INTEGER) - (b.personalRank || Number.MAX_SAFE_INTEGER)
      || String(a.title).localeCompare(String(b.title), 'ko');
    if (sortKey === 'priority') return (a.priorityRank == null ? 9 : a.priorityRank) - (b.priorityRank == null ? 9 : b.priorityRank)
      || (b.ratingValue || 0) - (a.ratingValue || 0)
      || String(a.title).localeCompare(String(b.title), 'ko');
    if (sortKey === 'rating') return (b.ratingValue || 0) - (a.ratingValue || 0)
      || (a.priorityRank == null ? 9 : a.priorityRank) - (b.priorityRank == null ? 9 : b.priorityRank)
      || String(a.title).localeCompare(String(b.title), 'ko');
    if (sortKey === 'year') return (a.year || 9999) - (b.year || 9999)
      || String(a.title).localeCompare(String(b.title), 'ko');
    return String(a.title).localeCompare(String(b.title), 'ko');
  }

  function groupRows(rowsInput, watchlistInput, sortKey, ascending) {
    const rows = [...rowsInput];
    const watchlist = normalizeWatchlist(watchlistInput);
    const starred = key => Boolean(watchlist.items[key]);
    const direction = ascending === false ? -1 : 1;
    const regularSort = list => list.sort((a, b) => direction * rowCompare(a, b, sortKey));

    const started = regularSort(rows.filter(row => row.patchStatus === 'wip'));
    const star = rows.filter(row => starred(row.key) && row.patchStatus !== 'wip' && row.patchStatus !== 'released');
    const orderIndex = new Map(watchlist.order.map((key, index) => [key, index]));
    star.sort((a, b) => (orderIndex.get(a.key) ?? Number.MAX_SAFE_INTEGER) - (orderIndex.get(b.key) ?? Number.MAX_SAFE_INTEGER));
    const rest = regularSort(rows.filter(row => row.patchStatus !== 'wip' && !(starred(row.key) && row.patchStatus !== 'released')));
    return { started, star, rest };
  }

  function compareKeysFromHash(hash) {
    const raw = String(hash || '').replace(/^#/, '');
    if (!raw.startsWith('compare=')) return [];
    const result = [];
    const seen = new Set();
    raw.slice(8).split(',').forEach(part => {
      if (!part || result.length >= 4) return;
      let key = '';
      try { key = decodeURIComponent(part); } catch (_) { return; }
      if (key && !seen.has(key)) {
        result.push(key);
        seen.add(key);
      }
    });
    return result;
  }

  function compareHash(keys) {
    return '#compare=' + keys.slice(0, 4).map(key => encodeURIComponent(key)).join(',');
  }

  return {
    cleanNote,
    normalizeWatchlist,
    cloneWatchlist,
    mergeWatchlists,
    reorderVisible,
    groupRows,
    compareKeysFromHash,
    compareHash,
  };
});
