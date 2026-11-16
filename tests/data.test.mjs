import test from 'node:test';
import assert from 'node:assert/strict';
import { dateRange, recentItems, mergeFeed } from '../data.mjs';
const now = new Date('2026-11-16T05:00:00Z');
const item = (date, id = 'PL_example') => ({ date, status: 'ready', url: `https://www.youtube.com/playlist?list=${id}` });
const feed = items => ({ room: 'm112', items });
test('Korea date rollover controls the inclusive 30-day window', () => {
  assert.deepEqual(dateRange(now), { from: '2026-10-18', to: '2026-11-16' });
  assert.deepEqual(dateRange(new Date('2026-11-16T15:00:00Z')), { from: '2026-10-19', to: '2026-11-17' });
});
test('keep the oldest included day and exclude past/future days', () => {
  assert.deepEqual(recentItems(feed([item('2026-10-17'), item('2026-10-18'), item('2026-11-16'), item('2026-11-17')]), now).map(x => x.date), ['2026-11-16', '2026-10-18']);
});
test('reject unsafe URLs, malformed source and incomplete playlists', () => {
  const rows = [item('2026-11-16'), { ...item('2026-11-15'), url: 'javascript:alert(1)' }, { ...item('2026-11-14'), url: 'https://www.youtube.com.evil.test/playlist?list=PLx' }, { ...item('2026-11-13'), status: 'creating' }, { ...item('2026-11-12'), url: 'https://evil@www.youtube.com/playlist?list=PLx' }];
  assert.equal(recentItems(feed(rows), now).length, 1);
  assert.throws(() => recentItems({ room: 'm113', items: [] }, now));
});
test('merge retains month history and takes corrected URLs from the new feed', () => {
  const result = mergeFeed(feed([item('2026-10-19'), item('2026-11-13', 'PL_old')]), feed([item('2026-11-13', 'PL_new'), item('2026-11-16')]), now);
  assert.deepEqual(result.map(x => x.date), ['2026-11-16', '2026-11-13', '2026-10-19']);
  assert.ok(result[1].url.endsWith('PL_new'));
  assert.throws(() => mergeFeed(feed(result), { items: [] }, now));
});
