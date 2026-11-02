// Updates public/explored.json: the End areas players have already mapped,
// read from the community webmap's tiles.
//
//   npm run explored            only asks what changed since the last update
//   npm run explored -- --all   also looks for newly mapped regions (done automatically once a day)
//   npm run explored -- --full  re-reads everything from scratch
//
// The webmap is run by a friend of the project, so this is deliberately gentle:
// one request at a time with a pause between them, "only if changed since last
// time" requests that cost the server an empty reply when nothing has changed,
// and it stops at the first sign of trouble without touching the data.
//
// The webmap sends no CORS headers, so the browser can't read its tiles
// directly; this runs in Node and the app loads the result from its own origin.
//
// Tiles are 512px PNGs named by level of detail and the block coordinates of
// their corner: at level n one pixel is 2^n blocks. The coarsest level (9) is
// checked first to find where anything changed, then only those areas are read
// at level 4, where one pixel is 16 blocks: exactly one chunk, which is the unit
// the map is drawn in.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const FILE = 'public/explored.json';
const TILE_PX = 512;
const COARSE = 9;
const FINE = 4;
/** How far out to look, in coarse tiles each way (4 x 262,144 blocks). */
const COARSE_REACH = 4;
// Unmapped pixels are pure black; mapped void is a dark purple (10, 0, 23).
const MAPPED_MIN = 4;
/** Pause between requests, in milliseconds. */
const PAUSE = 500;
const USER_AGENT = 'aomc-elytra-hunt explored-area updater (+https://github.com/AOMC-Server/aomc-elytra-hunt)';

const full = process.argv.includes('--full');
/** Hour of the day (UTC) at which a routine run also looks at regions that were empty last time. */
const WIDE_HOUR = 3;
const saved = !full && existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : null;
// Data saved at a different level of detail cannot be updated in place: start again.
const previous = saved && saved.blocksPerPixel === 2 ** FINE ? saved : null;
if (saved && !previous) console.log('The saved data is at a different level of detail. Re-reading everything.');
// Ask only for tiles modified since the last update. A minute of slack covers clock differences.
const since = previous?.fetchedAt ? new Date(Date.parse(previous.fetchedAt) - 60_000).toUTCString() : null;
const startedAt = new Date().toISOString();
// Most of the 64 overview tiles are empty, and asking about those every hour would be most of the
// traffic for nothing. Routine runs only ask about the tiles that had data last time; a wide run
// (once a day, or with --all) asks about all of them, so newly mapped regions are still found.
const known = previous?.overviewTiles ? new Set(previous.overviewTiles) : null;
const wide = full || !known || process.argv.includes('--all') || new Date().getUTCHours() === WIDE_HOUR;

const tileBlocks = (lod) => TILE_PX * 2 ** lod;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const counts = { requests: 0, unchanged: 0, missing: 0, downloaded: 0, bytes: 0 };

/** A tile's image, 'unchanged' if not modified since the last update, or null if nobody has mapped anything there. */
async function fetchTile(lod, x, z) {
  if (counts.requests) await sleep(PAUSE);
  counts.requests++;
  const headers = { 'User-Agent': USER_AGENT };
  if (since) headers['If-Modified-Since'] = since;
  const res = await fetch(`https://a.map.diorite.xyz/map/the_end/${lod}/${x}_${z}.png`, { headers });
  if (res.status === 304) return counts.unchanged++, 'unchanged';
  if (res.status === 404) return counts.missing++, null;
  if (!res.ok) throw new Error(`Tile ${lod}/${x}_${z}: HTTP ${res.status}. Stopping; nothing was changed.`);
  const data = Buffer.from(await res.arrayBuffer());
  counts.downloaded++;
  counts.bytes += data.length;
  const tile = PNG.sync.read(data);
  if (tile.width !== TILE_PX || tile.height !== TILE_PX) throw new Error(`Tile ${lod}/${x}_${z}: unexpected size`);
  return tile;
}

const brightness = (tile, x, y) => {
  const i = (y * TILE_PX + x) * 4;
  return Math.max(tile.data[i], tile.data[i + 1], tile.data[i + 2]);
};

// Mapped pixels as runs per row. Pixel coordinates are block / 32, so they can be negative.
const bpp = 2 ** FINE;
const rows = new Map();
if (previous) {
  const r = previous.runs;
  for (let i = 0; i < r.length; ) {
    const runs = [];
    for (let k = 0; k < r[i + 1]; k++) runs.push([r[i + 2 + k * 2], r[i + 3 + k * 2]]);
    rows.set(r[i], runs);
    i += 2 + r[i + 1] * 2;
  }
}

// Pass 1: which fine tiles sit under a coarse tile that changed.
const fineTiles = new Set();
/** Overview tiles that have any data, remembered for the next routine run. */
const overviewTiles = [];
const fineSize = tileBlocks(FINE);
for (let tz = -COARSE_REACH; tz < COARSE_REACH; tz++) {
  for (let tx = -COARSE_REACH; tx < COARSE_REACH; tx++) {
    const ox = tx * tileBlocks(COARSE);
    const oz = tz * tileBlocks(COARSE);
    if (!wide && !known.has(`${ox},${oz}`)) continue;
    const tile = await fetchTile(COARSE, ox, oz);
    if (tile) overviewTiles.push(`${ox},${oz}`);
    if (!tile || tile === 'unchanged') continue;
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        // Thin trails fade when scaled down, so any non-black pixel counts here.
        if (brightness(tile, x, y) === 0) continue;
        const bx = ox + x * 2 ** COARSE;
        const bz = oz + y * 2 ** COARSE;
        fineTiles.add(`${Math.floor(bx / fineSize) * fineSize},${Math.floor(bz / fineSize) * fineSize}`);
      }
    }
  }
}
console.log(wide ? 'Wide run: asking about every overview tile.' : `Routine run: asking about the ${known.size} overview tiles that had data.`);
console.log(
  fineTiles.size
    ? `${fineTiles.size} areas to check in detail`
    : 'No overview tile has changed since the last update.',
);

// Pass 2: re-read the detailed tiles that changed, replacing just their part of the mask.
let replaced = 0;
let done = 0;
for (const key of fineTiles) {
  const [ox, oz] = key.split(',').map(Number);
  const tile = await fetchTile(FINE, ox, oz);
  if (++done % 20 === 0) console.log(`${done}/${fineTiles.size}`);
  if (!tile || tile === 'unchanged') continue;
  replaced++;
  const px0 = ox / bpp;
  const px1 = px0 + TILE_PX;
  for (let y = 0; y < TILE_PX; y++) {
    const pz = oz / bpp + y;
    // Drop what was known for this tile's stretch of the row, keeping anything either side of it.
    const kept = [];
    for (const [s, l] of rows.get(pz) ?? []) {
      if (s < px0) kept.push([s, Math.min(s + l, px0) - s]);
      if (s + l > px1) kept.push([Math.max(s, px1), s + l - Math.max(s, px1)]);
    }
    let start = -1;
    for (let x = 0; x <= TILE_PX; x++) {
      const on = x < TILE_PX && brightness(tile, x, y) >= MAPPED_MIN;
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        kept.push([px0 + start, x - start]);
        start = -1;
      }
    }
    if (kept.length) rows.set(pz, kept);
    else rows.delete(pz);
  }
}

// Flat [row, runCount, start, length, start, length, ...], rows and runs sorted, touching runs merged.
const flat = [];
let mapped = 0;
let x0 = Infinity, x1 = -Infinity;
const sortedRows = [...rows.keys()].sort((a, b) => a - b);
for (const pz of sortedRows) {
  const merged = [];
  for (const [s, l] of rows.get(pz).sort((a, b) => a[0] - b[0])) {
    const last = merged[merged.length - 1];
    if (last && last[0] + last[1] >= s) last[1] = Math.max(last[1], s + l - last[0]);
    else merged.push([s, l]);
  }
  flat.push(pz, merged.length, ...merged.flat());
  for (const [, l] of merged) mapped += l;
  x0 = Math.min(x0, merged[0][0]);
  x1 = Math.max(x1, merged[merged.length - 1][0] + merged[merged.length - 1][1]);
}
const bounds = sortedRows.length
  ? { x0: x0 * bpp, z0: sortedRows[0] * bpp, x1: x1 * bpp, z1: (sortedRows[sortedRows.length - 1] + 1) * bpp }
  : null;

console.log(
  `${counts.requests} requests: ${counts.unchanged} unchanged, ${counts.missing} empty, ` +
    `${counts.downloaded} downloaded (${Math.round(counts.bytes / 1024)} KB).`,
);
// A routine run only saw the tiles it already knew about, so the list carries over unchanged.
const tiles = wide ? overviewTiles.sort() : previous.overviewTiles;
const sameMap = previous && JSON.stringify(previous.runs) === JSON.stringify(flat);
const sameTiles = previous && JSON.stringify(previous.overviewTiles) === JSON.stringify(tiles);
if (sameMap && sameTiles && !counts.downloaded) {
  // Leave the file alone, so an update with nothing new makes no change to commit.
  console.log('The mapped area is the same as before. Nothing written.');
} else {
  // The timestamp moves on whenever tiles were downloaded, even if the mapped area came out the same,
  // so those tiles are not fetched again next time. If only the tile list is new, it stays put.
  const fetchedAt = sameMap && !counts.downloaded ? previous.fetchedAt : startedAt;
  writeFileSync(FILE, JSON.stringify({ blocksPerPixel: bpp, fetchedAt, bounds, overviewTiles: tiles, runs: flat }) + '\n');
  const area = ((mapped * bpp * bpp) / 1e6).toFixed(0);
  console.log(`${replaced} areas re-read. Mapped: about ${area} million square blocks. Wrote ${FILE}`);
}
