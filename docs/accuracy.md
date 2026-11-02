# How do we know the positions are right?

[Back to the README](../README.md)

The app does not look End Cities up anywhere. It works them out from the world
seed, using the same steps the game does, in code ported from
[cubiomes](https://github.com/Cubitect/cubiomes), an open-source C library that
reimplements Minecraft's world generation. Three things have to be right for a
city to show up in a route.

**1. Where a city can be.** The End is divided into regions of 20 by 20 chunks.
Each region has one candidate chunk, chosen from the seed. (cubiomes:
`getStructurePos` and the End City entry in `finders.c`.)

**2. Whether a city actually generates there.** The candidate must be in the
End midlands or highlands, and the ground under the city must be at least
y = 60, which depends on the island shapes, the terrain noise and which way the
city is rotated. (cubiomes: `isViableStructurePos`, `isViableEndCityTerrain`,
and `getEndHeightNoise` / `sampleNoiseColumnEnd` in `biomenoise.c`.)

**3. Whether it has a ship.** Elytra only generate in End ships, and not every
city has one. The app builds each city's layout piece by piece and checks
whether a ship is part of it. (cubiomes: `getEndCityPieces`.)

## What it was checked against

**City positions** were compared with cubiomes (version `e61f905`, Minecraft
1.21 rules) city by city, and are identical everywhere tried:

| Area | Seed | End Cities |
|---|---|---|
| Within about 22,400 blocks of 0,0 | the server's | 1,735 |
| Within about 12,800 blocks of 0,0 | two unrelated seeds | 593 and 594 |
| Around 96,000 blocks out | the server's | 39 |
| Everything the community webmap covers, out to about 600,000 blocks west | the server's | 36,419 |

**Ships** are a different story: cubiomes as published gets some wrong, which
was found by visiting cities in the game. The app now follows the game. See the
next section.

The first three areas, and a strip from the far end of the last, are kept as
automated tests (`npm test`) for positions and ships, against cubiomes with the
corrections below applied. So are the cities that were checked in game.

## Where the app differs from cubiomes, and why

Four differences, all about ships. The first three are in
[`cubiomes-fixes.patch`](../scripts/reference/cubiomes-fixes.patch), and were
reported to cubiomes by someone else before we found them (cubiomes issue 155);
[cubiomes-notes.md](cubiomes-notes.md) has the details.

- **Where bridges leave a tower.** A thin tower picks one of its floors for its
  bridges to leave from. cubiomes hangs the bridges on the tower's top floor
  whatever was picked. When the picked floor is lower, that puts the bridge,
  and a ship at its end, 4 or 8 blocks too high, clear of parts of the city
  that it collides with in the game. The game discards a ship that collides,
  so cubiomes reports ships that do not exist (and misses a few that do).
- **What a bridge's end piece hangs from.** When a bridge ends in a ship,
  cubiomes hangs the bridge's final end piece from the ship, where the game
  hangs it from the last piece of the bridge. That moves the end piece, which
  now and then changes whether something collides. This one came from the
  upstream report, and was then checked in game at two cities where it
  changes the answer.
- **A tag stored too small.** cubiomes keeps one internal value (a tag used to
  decide whether overlapping parts of a city are allowed) in 8 bits, where the
  game uses a full 32-bit number. Rarely, that lets a ship through that the
  game would reject.
- **Ships too far from their city.** The game builds no part of a structure
  more than 8 chunks from the chunk it starts in. A ship at the end of a long
  run of bridges can lie beyond that, and is cut off or missing. The app counts
  a ship only if its elytra (which hangs at a known spot inside the ship) is
  within reach. cubiomes does not consider this.

Within 100,000 blocks on the server's seed, the bridge corrections and the
reach rule change the answer for 289 of 34,409 cities: 225 ships that were
predicted are not there, and 64 that were not predicted are.

One more thing differs in how cubiomes is built, not in its logic: far from
0,0 a few results depend on doing arithmetic in 32-bit floats exactly as Java
does. cubiomes has to be built with `-ffp-contract=off` to match; the app
rounds explicitly.

## How the corrections were found

A player reported a city with no ship at x: -554792, z: 8712, where the app and
cubiomes both predicted one. A single-player world with the server's seed (Java
26.2) showed the same, so the cause was in the prediction, not on the server.
Cities were then checked one by one in that world
([issue #11](https://github.com/AOMC-Server/aomc-elytra-hunt/issues/11)):

| City | cubiomes as published | App now | In game |
|---|---|---|---|
| x: -554792, z: 8712 | ship | no ship | no ship |
| x: 5176, z: -44680 | ship | no ship | no ship |
| x: -22328, z: -43464 | ship | no ship | no ship |
| x: 66584, z: -25784 | ship | no ship | no ship |
| x: -44424, z: 49352 | ship | no ship | no ship |
| x: -38344, z: 55752 | ship | no ship | no ship |
| x: 25336, z: 79064 | ship | no ship | no ship |
| x: 12888, z: 93800 | ship | no ship | no ship |
| x: 63448, z: -49224 | ship | ship | ship |
| x: 81672, z: 39480 | ship | ship | ship |
| x: -7944, z: 1976 | ship | ship | ship |
| x: 62152, z: 360 (ship wholly out of reach) | ship | no ship | no ship |
| x: -70328, z: -4088 (ship wholly out of reach) | ship | no ship | no ship |
| x: -546776, z: 5576 (ship partly out of reach, elytra one chunk too far) | ship | no ship | half a ship, no elytra |
| x: 26008, z: -53384 (bridge end piece) | ship | no ship | no ship |
| x: -37752, z: -26824 (bridge end piece) | no ship | ship | ship |

The bridge correction was worked out from the first six results that came in.
It then gave the right answer for the other five bridge cities before their
results were known. The reach rule was proposed before any of its three
cities was visited.

The corrections rest on these checks and on reading how the game is known to
behave, not on the game's source code. Of the 190 cities players have marked
looted, the app agrees there is a ship at 188. The other two are the first and
last cities in the table: both were ticked off by a player who had been there,
and neither had an elytra.

## What has not been proven

- **Minecraft 26.x.** The comparison of positions is against cubiomes' 1.21
  rules. The in-game checks above were made on 26.2, and agree.
- **The reach rule, beyond three cities.** Two ships wholly out of reach and
  one cut in half with its elytra just out of reach were checked, and all
  three had no elytra. 157 ships within 100,000 blocks are left out by this
  rule.
- **Beyond the webmap's area.** The same code runs further out, and it accounts
  for the rings of empty void the End has beyond about 370,000 blocks, but
  nothing past roughly 600,000 blocks has been compared.
- **Looted or not.** The app knows where ships generate, not whether someone
  has already taken the elytra.

## Checking it yourself

[`scripts/reference/end-cities-ref.c`](../scripts/reference/end-cities-ref.c) is the small program used to get cubiomes'
answers; build instructions are at the top of the file, and it needs
[`cubiomes-fixes.patch`](../scripts/reference/cubiomes-fixes.patch) applied to cubiomes first. It prints
`chunkX chunkZ hasShip` for every city in a range of regions, which can be
compared with what the app finds for the same area. A city's block coordinates
are its chunk coordinates times 16, plus 8.

## Sources

- [cubiomes](https://github.com/Cubitect/cubiomes) by Cubitect, MIT licence:
  the reference implementation the generator was ported from and tested
  against.
- [End City](https://minecraft.wiki/w/End_City) and
  [Elytra](https://minecraft.wiki/w/Elytra) on the Minecraft Wiki, for how
  cities, ships and elytra work in the game.
- The tests in `tests/end-cities.test.ts` and the reference data in
  `tests/fixtures/`.
