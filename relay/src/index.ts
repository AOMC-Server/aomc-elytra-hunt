// Relay for the AOMC Elytra Hunt app. Runs as a Cloudflare Worker and does two jobs:
//
//  - turns a player's looted-cities submission into a GitHub issue, so players
//    don't need a GitHub account;
//  - once an hour, starts the repository's "Update webmap data" workflow.
//    GitHub's own timer for scheduled workflows is unreliable; Cloudflare's is punctual.
// The GitHub token lives here as a secret and is never sent
// to the browser. Setup steps are in relay/README.md.

import { issueFor, issueForShip, overCap, parseShipReport, parseSubmission } from './validate';

interface Env {
  /**
   * Fine-grained GitHub token for the one repository, with "Issues: read and write" (to file
   * submissions) and "Actions: read and write" (to start the webmap update). Set with `wrangler secret put`.
   */
  GITHUB_TOKEN: string;
  /** owner/name of the repository to file issues in. */
  REPO: string;
  /** The site allowed to call this relay, e.g. https://aomc-server.github.io */
  ALLOWED_ORIGIN: string;
  /** File name of the workflow to start on the timer. */
  WORKFLOW: string;
}

const MAX_BYTES = 100_000;
/** One submission per visitor address per this many seconds. */
const COOLDOWN_SECONDS = 60;
/** A ship report is one click, and a player may have several to make. */
const SHIP_COOLDOWN_SECONDS = 10;

/** Ask GitHub to run the webmap update workflow now. */
async function startWebmapUpdate(env: Env): Promise<void> {
  const res = await fetch(`https://api.github.com/repos/${env.REPO}/actions/workflows/${env.WORKFLOW}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'aomc-looted-relay',
    },
    body: JSON.stringify({ ref: 'main' }),
  });
  // Shows up in `npx wrangler tail` and the Cloudflare dashboard's logs.
  if (!res.ok) console.error(`Could not start ${env.WORKFLOW}: HTTP ${res.status} ${await res.text()}`);
  else console.log(`Started ${env.WORKFLOW}`);
}

export default {
  // Runs on the timer set under [triggers] in wrangler.toml.
  async scheduled(_event: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<void> {
    ctx.waitUntil(startWebmapUpdate(env));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? '';
    // Local development servers are allowed alongside the real site.
    const allowed = origin === env.ALLOWED_ORIGIN || /^http:\/\/localhost(:\d+)?$/.test(origin);
    const cors: Record<string, string> = {
      'Access-Control-Allow-Origin': allowed ? origin : env.ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    };
    const reply = (status: number, body: object) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return reply(405, { error: 'Send a POST request.' });
    if (!allowed) return reply(403, { error: 'This relay only accepts submissions from the app.' });

    const text = await request.text();
    if (text.length > MAX_BYTES) return reply(413, { error: 'That submission is too large.' });
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return reply(400, { error: 'Expected JSON.' });
    }
    // Two kinds of message arrive here: a list of looted cities, or a report on a single ship.
    const isShipReport = (json as { kind?: unknown } | null)?.kind === 'ship';
    const parsed = isShipReport ? parseShipReport(json) : parseSubmission(json);
    if (!parsed.ok) return reply(400, { error: parsed.error });
    const issueBody = isShipReport
      ? issueForShip(parsed.value as Parameters<typeof issueForShip>[0])
      : issueFor(parsed.value as Parameters<typeof issueFor>[0]);

    // A short cooldown per visitor address, remembered in Cloudflare's cache, so the repo can't be flooded.
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const cache = (caches as unknown as { default: Cache }).default;
    // Looted lists and ship reports are limited separately, so reporting a ship does not block a submission.
    const marker = new Request(`https://cooldown.invalid/${isShipReport ? 'ship' : 'looted'}/${encodeURIComponent(ip)}`);
    if (await cache.match(marker)) {
      return reply(429, { error: isShipReport ? 'Please wait a few seconds before reporting again.' : 'Please wait a minute before submitting again.' });
    }

    // A cap on everything the relay files, whoever sends it, so that many addresses at once cannot
    // flood the repository either. The count comes from GitHub itself: the issues are the record.
    const github = {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'aomc-looted-relay',
    };
    const recent = await fetch(
      `https://api.github.com/repos/${env.REPO}/issues?state=all&sort=created&direction=desc&per_page=100`,
      { headers: github },
    );
    // If the count cannot be had, nothing is filed: better to turn a player away than to lose the cap.
    if (!recent.ok) return reply(502, { error: 'Could not file the submission. Please try again later.' });
    const capped = overCap((await recent.json()) as Parameters<typeof overCap>[0], Date.now());
    if (capped) {
      console.log(`Over the ${capped} cap: turned a submission away`);
      return reply(429, {
        error:
          capped === 'hour'
            ? 'A lot has been sent in lately. Please try again in an hour.'
            : 'A lot has been sent in today. Please try again tomorrow.',
      });
    }

    const res = await fetch(`https://api.github.com/repos/${env.REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'aomc-looted-relay',
      },
      body: JSON.stringify(issueBody),
    });
    if (!res.ok) return reply(502, { error: 'Could not file the submission. Please try again later.' });

    const wait = isShipReport ? SHIP_COOLDOWN_SECONDS : COOLDOWN_SECONDS;
    await cache.put(marker, new Response('1', { headers: { 'Cache-Control': `max-age=${wait}` } }));
    const issue = (await res.json()) as { number: number };
    return reply(200, { ok: true, issue: issue.number });
  },
};
