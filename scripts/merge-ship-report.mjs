// Records a player's report about a ship in public/ship-reports.json.
//
//   npm run ship-report -- --issue 12
//   npm run ship-report -- missing -554792,8712
//   npm run ship-report -- found 12040,-11832
//   npm run ship-report -- no-city 30000,-4000
//
// "missing" (city there, no ship) and "no-city" (no End City at all) both drop
// the city out of the routes for everyone; they are kept apart because they point
// to different problems. "found" cities lose their "ship uncertain" mark. A newer report for
// the same city replaces an older one. Commit and push the result to publish it.

import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'public/ship-reports.json';
const REPO = 'AOMC-Server/aomc-elytra-hunt';
const args = process.argv.slice(2);

/** [kind, "x,z"] pairs to record. */
const reports = [];
if (args[0] === '--issue') {
  const res = await fetch(`https://api.github.com/repos/${REPO}/issues/${args[1]}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'aomc-merge-ship-report',
      ...(process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`Issue ${args[1]}: HTTP ${res.status}`);
  // The relay writes one line of the form "ship-report: missing -554792,8712".
  for (const m of ((await res.json()).body ?? '').matchAll(/^ship-report: (missing|found|no-city) (-?\d+,-?\d+)$/gm)) reports.push([m[1], m[2]]);
} else if (['missing', 'found', 'no-city'].includes(args[0]) && /^-?\d+,-?\d+$/.test(args[1] ?? '')) {
  reports.push([args[0], args[1]]);
}
if (!reports.length) {
  console.error('Usage: npm run ship-report -- --issue <number>\n       npm run ship-report -- <missing|found|no-city> <x,z>');
  process.exit(1);
}

const data = JSON.parse(readFileSync(FILE, 'utf8'));
const lists = { missing: new Set(data.missing ?? []), found: new Set(data.found ?? []), 'no-city': new Set(data.noCity ?? []) };
const wording = { missing: 'city with no ship', found: 'ship found', 'no-city': 'no End City' };
for (const [kind, city] of reports) {
  // A newer report for a city replaces whatever was recorded for it before.
  for (const list of Object.values(lists)) list.delete(city);
  lists[kind].add(city);
  console.log(`${city}: ${wording[kind]}`);
}
writeFileSync(
  FILE,
  JSON.stringify({
    updatedAt: new Date().toISOString(),
    missing: [...lists.missing].sort(),
    found: [...lists.found].sort(),
    noCity: [...lists['no-city']].sort(),
  }) + '\n',
);
console.log(`${lists.missing.size} with no ship, ${lists['no-city'].size} with no city, ${lists.found.size} confirmed. Wrote ${FILE}`);
