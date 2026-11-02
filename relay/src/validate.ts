// Checks a looted-cities submission before it becomes a GitHub issue.
// Kept free of Worker-specific code so it can be tested on its own.

/** GitHub rejects issue bodies over 65,536 characters; this many cities stays well inside that. */
export const MAX_CITIES = 4000;
const MAX_NAME = 32;

export interface Submission {
  name: string;
  cities: string[];
  /** The ones among `cities` that the player found already looted by someone else. */
  already: string[];
}

export type Parsed = { ok: true; value: Submission } | { ok: false; error: string };

export function parseSubmission(input: unknown): Parsed {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Expected a JSON object.' };
  const { name, cities, already } = input as { name?: unknown; cities?: unknown; already?: unknown };
  if (!Array.isArray(cities) || cities.length === 0) return { ok: false, error: 'No cities to submit.' };
  if (cities.length > MAX_CITIES) return { ok: false, error: `Too many cities at once (the limit is ${MAX_CITIES}).` };
  const clean = new Set<string>();
  for (const c of cities) {
    // Block coordinates only: "x,z" with nothing else, so no text can be smuggled into the issue.
    if (typeof c !== 'string' || !/^-?\d{1,8},-?\d{1,8}$/.test(c)) return { ok: false, error: 'Cities must look like "x,z".' };
    clean.add(c);
  }
  const prior = new Set<string>();
  for (const c of Array.isArray(already) ? already : []) if (typeof c === 'string' && clean.has(c)) prior.add(c);
  // The name is shown in the issue title: keep only characters a Minecraft username can have.
  const who = typeof name === 'string' ? name.replace(/[^A-Za-z0-9_]/g, '').slice(0, MAX_NAME) : '';
  return { ok: true, value: { name: who || 'anonymous', cities: [...clean], already: [...prior] } };
}

/** Label put on every submission, so they are easy to find among other issues. It must exist in the repository. */
export const LABEL = 'map-submission';

export function issueFor(s: Submission): { title: string; body: string; labels: string[] } {
  const prior = new Set(s.already);
  return {
    labels: [LABEL],
    title: `Looted cities from ${s.name} (${s.cities.length})`,
    body: [
      `Submitted through the app by **${s.name}**. Not verified.`,
      ...(prior.size
        ? ['', `${prior.size} of these were found already looted by someone else (rows ending in \`already\`).`]
        : []),
      '',
      'To add these to the shared list, run `npm run looted -- --issue <this issue number>`, then commit and push.',
      '',
      '```csv',
      'x,z',
      ...s.cities.map((c) => (prior.has(c) ? `${c},already` : c)),
      '```',
    ].join('\n'),
  };
}

/** What a player found at a city: its ship, the city with no ship, or no city at all. */
export type ShipResult = 'found' | 'missing' | 'no-city';
const SHIP_RESULTS: ShipResult[] = ['found', 'missing', 'no-city'];

/** A player's report on one city. */
export interface ShipReport {
  name: string;
  city: string;
  result: ShipResult;
  /** Whether the app had already marked this city's ship as uncertain when the report was made. */
  uncertain: boolean;
}

export const SHIP_LABEL = 'ship-report';

export function parseShipReport(input: unknown): { ok: true; value: ShipReport } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Expected a JSON object.' };
  const { name, city, result, uncertain } = input as { name?: unknown; city?: unknown; result?: unknown; uncertain?: unknown };
  if (typeof city !== 'string' || !/^-?\d{1,8},-?\d{1,8}$/.test(city)) return { ok: false, error: 'The city must look like "x,z".' };
  if (!SHIP_RESULTS.includes(result as ShipResult)) return { ok: false, error: 'Say what was found: the ship, no ship, or no city.' };
  const who = typeof name === 'string' ? name.replace(/[^A-Za-z0-9_]/g, '').slice(0, 32) : '';
  return { ok: true, value: { name: who || 'anonymous', city, result: result as ShipResult, uncertain: uncertain === true } };
}

export function issueForShip(r: ShipReport): { title: string; body: string; labels: string[] } {
  const [x, z] = r.city.split(',');
  const headline = { found: 'ship found', missing: 'no ship', 'no-city': 'no End City' }[r.result];
  const detail = {
    found: 'The player found a ship at this city. Accepting this clears its "ship uncertain" mark.',
    missing: 'The player found the city but no ship. Accepting this removes the city from the routes for everyone.',
    'no-city': 'The player found no End City here at all. Accepting this removes it from the routes for everyone.',
  }[r.result];
  return {
    labels: [SHIP_LABEL],
    title: `Ship report: ${headline} at x: ${x}, z: ${z}`,
    body: [
      `Reported through the app by **${r.name}**. Not verified.`,
      '',
      detail,
      '',
      // Says whether the app saw this coming: a way to tell if the "ship uncertain" mark is earning its keep.
      r.uncertain
        ? 'The app **had marked this ship as uncertain** (a tight fit against another part of the city).'
        : 'The app had **not** marked this ship as uncertain.',
      '',
      'To accept, reply to this issue with `/merge`. To reject, close it.',
      '',
      // Read back by scripts/merge-ship-report.mjs.
      `ship-report: ${r.result} ${r.city}`,
    ].join('\n'),
  };
}

/** The most issues the relay will file in an hour and in a day, whoever sends them. */
export const MAX_PER_HOUR = 30;
export const MAX_PER_DAY = 100;

/**
 * Whether the relay has filed as many issues as it will for now. `issues` are the repository's most
 * recently created issues by the relay's own account, as GitHub lists them; of those, only the ones
 * labelled as submissions are counted, not anything else the maintainer files with the same token's account.
 */
export function overCap(issues: { created_at: string; labels: ({ name?: string } | string)[] }[], now: number): 'hour' | 'day' | null {
  const ours = issues.filter((i) =>
    i.labels.some((l) => [LABEL, SHIP_LABEL].includes(typeof l === 'string' ? l : (l.name ?? ''))),
  );
  const within = (ms: number) => ours.filter((i) => now - Date.parse(i.created_at) < ms).length;
  if (within(60 * 60 * 1000) >= MAX_PER_HOUR) return 'hour';
  if (within(24 * 60 * 60 * 1000) >= MAX_PER_DAY) return 'day';
  return null;
}
