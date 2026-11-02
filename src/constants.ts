// Fixed numbers and texts used across the app.



/** The latest finished runs of the job that checks the webmap for changes, as GitHub reports them to anyone. */
export const WEBMAP_CHECKS_URL =
  'https://api.github.com/repos/AOMC-Server/aomc-elytra-hunt/actions/workflows/update-webmap.yml/runs?status=success&per_page=1';
/**
 * Most ship cities one search may bring in. Batching and drawing slow down with every city, and beyond
 * this the page would hang for many seconds, so a wider search is refused with advice to narrow it.
 */
export const MAX_SEARCH_CITIES = 25000;
/** Ship cities per square block, measured over the first 100,000 blocks of the default world. */
export const SHIP_DENSITY = 4.6e-7;
/** Batches shown per page of the list. */
export const PAGE_SIZE = 5;
/** Largest batch a player can ask for. Routes much longer than this get slow to work out. */
export const MAX_BATCH_SIZE = 500;
/** A city this close (in blocks) to one found already looted counts as possibly looted. */
export const POSSIBLE_RADIUS = 2000;
export const POSSIBLE_NOTE = 'possibly looted: near a ship found already looted';
export const NEAR_SPAWN_NOTE = 'possibly looted: within 10,000 blocks of End Spawn, where most ships were emptied long ago';
/** Why each kind of "possibly looted" is said, in a sentence a player can read, keyed by how its note starts. */
export const POSSIBLE_WHY: [string, string][] = [
  ['possibly looted: within', 'Within 10,000 blocks of End Spawn, where most ships were emptied long ago.'],
  ['possibly looted: near a ship', 'Within 2,000 blocks of a ship found already looted.'],
  ['possibly looted: on a possible', 'On a guessed flight path of an earlier hunter.'],
];

export const REMOVED_NOTE = 'removed from its route by hand';
export const MAPPED_NOTE = 'has a ship, but already on the webmap';
export const EXTRA_NOTE = 'outside the search area, added with Add +1 ship to route';
/** How far past the search area "+1 city" will look from a route's last stop, in blocks. */
export const BEYOND_BLOCKS = 4000;
/**
 * The same, where the cities have to be generated on the spot (another seed, or past the pre-generated
 * area). Kept small so the press stays instant: this far takes a few hundredths of a second.
 */
export const BEYOND_LIVE_BLOCKS = 2500;

// ---------- derived data ----------

/**
 * Batching cost grows with cities times batch size. Above this it is handed to a worker, so the page
 * stays responsive; below it the answer is instant and worked out on the spot.
 */
export const BATCH_IN_PLACE_LIMIT = 150_000;

// The line under the map saying how to move it is for newcomers: once the map has been used, it goes for good.
export const MAP_HINT_KEY = 'end-cities:map-hint-seen';

/** Said on the map whenever routes are regrouped under the player, since their numbers change. */
export const RENUMBERED_NOTE = "Routes renumbered. Old waypoints won't match.";

/** How fast a player covers ground with an elytra and rockets, a little under the 33.5 blocks a second of a rocket's boost. */
export const FLIGHT_BLOCKS_PER_SECOND = 30;
/** How long a player is taken to spend at each ship, in minutes. */
export const MINUTES_PER_SHIP = 1.5;
