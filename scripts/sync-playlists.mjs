import { readFile, writeFile } from 'node:fs/promises';
import { FEED_URL, mergeFeed, recentItems } from '../data.mjs';
const response = await fetch(FEED_URL, { signal: AbortSignal.timeout(20000), headers: { Accept: 'application/json' } });
if (!response.ok) throw new Error(`Playlist source returned ${response.status}; previous data is retained.`);
const incoming = await response.json();
recentItems(incoming);
const previous = JSON.parse(await readFile('playlists.json', 'utf8'));
const items = mergeFeed(previous, incoming);
if (JSON.stringify(items) === JSON.stringify(previous.items)) console.log('No playlist changes.');
else {
  await writeFile('playlists.json', JSON.stringify({ room: 'm112', updatedAtUtc: new Date().toISOString(), items }, null, 2) + '\n');
  console.log(`Updated ${items.length} playlists in the current 30-day window.`);
}
