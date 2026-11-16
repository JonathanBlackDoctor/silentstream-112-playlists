export const FEED_URL = 'https://m112.silentstream.win/archive/playlists.json';
const DAY = 86_400_000;

export function dateRange(now = new Date()) {
  const today = new Date(+now + 9 * 3_600_000).toISOString().slice(0, 10);
  const from = new Date(Date.parse(today + 'T00:00:00Z') - 29 * DAY).toISOString().slice(0, 10);
  return { from, to: today };
}

export function recentItems(payload, now = new Date()) {
  if (payload?.room !== 'm112' || !Array.isArray(payload.items)) throw new Error('112호 목록 형식을 확인해 주세요.');
  const { from, to } = dateRange(now);
  const dates = new Set();
  return payload.items.filter(item => {
    if (!item || item.status !== 'ready' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || item.date < from || item.date > to) return false;
    const date = new Date(item.date + 'T00:00:00Z');
    if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== item.date) return false;
    try {
      const url = new URL(item.url);
      return url.origin === 'https://www.youtube.com' && url.pathname === '/playlist' && !url.username && !url.password && /^[A-Za-z0-9_-]+$/.test(url.searchParams.get('list') || '');
    } catch { return false; }
  }).sort((a, b) => b.date.localeCompare(a.date)).filter(item => {
    if (dates.has(item.date)) return false;
    dates.add(item.date);
    return true;
  }).map(({ date, url }) => ({ date, status: 'ready', url: `https://www.youtube.com/playlist?list=${new URL(url).searchParams.get('list')}` }));
}

export function mergeFeed(previous, incoming, now = new Date()) {
  // Validate the incoming source before retaining any cached rows.
  recentItems(incoming, now);
  const rows = new Map(recentItems(previous, now).map(item => [item.date, item]));
  for (const item of recentItems(incoming, now)) rows.set(item.date, item);
  return recentItems({ room: 'm112', items: [...rows.values()] }, now);
}
