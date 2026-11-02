# Guide

[Back to the README](../README.md)

Everything the app can do, in more detail than the quick start.

## Searching and settings

- **Find ships** searches a band around End Spawn, and shows its range.
- **Search near me**, the other search button, brings out two boxes for your
  coordinates. **Search** searches around them and opens the nearest route.
  Left empty, it searches around the middle of the map, where the crosshair
  is; the boxes show that position in grey. Afterwards the place searched
  stays in the boxes, and a number appears under them: how far around it
  looked, which you can change. **Show on map** moves the map to the
  coordinates without searching. **Set to crosshair** puts the position
  at the middle of the map into the boxes and marks it as yours. **Clear position**, under the two buttons
  whenever there is a position to clear, empties the boxes, clears the markers
  and returns the map to End Spawn.
- **Back to last search** returns to what you had before.

**Settings**, grouped by what they apply to:

**Routes**, for both searches:

- **Ships per route:** 27 fills one shulker box; 1 to 500 works.
- **Route shape:** compact clusters, or lines heading outward. For lines you can
  set how far a line may stray from straight.
- **Longest flight between ships:** no hop in a route is longer than this.
  Ships that can't be reached in a full route are left without a route. If no
  route of the chosen size fits, smaller ones are made, down to 2 ships.
- **Leave out ships that are possibly looted.**

**Find ships: search area:**

- **From / To:** how far from End Spawn to look, measured along the longer axis. A
  search covering more than 25,000 ships is refused with a prompt to narrow it.
- **Quadrants:** which quarters of the map to search.
- **Angle:** stay near the diagonals or the axes, or search every direction.

**Advanced:**

- **Include ships already on the webmap:** normally left out, since someone
  has been there.
- **Move the map with one finger:** shown on touch screens only. Normally two
  fingers move the map and one scrolls the page.
- **World seed:** for another world. Everything specific to the About Oliver
  server (webmap, shared looted list) is hidden for other seeds.

## Routes

An open route shows roughly how long it takes: the flying at 30 blocks a
second with rockets, plus a minute and a half at each ship, to the nearest 5 minutes.

Routes are ordered by total flying: from 0,0 (or your coordinates, in a search
near them) to the route's first ship, plus the route itself.

### Getting a route into your map mod

- **Chat, one ship at a time:** in the End, press **copy** beside a ship, paste
  into chat and send. Xaero's Minimap shows a shared waypoint with an Add
  button; JourneyMap makes the coordinates clickable. With your username
  entered the lines are whispers only you see. A **copy** button stays lit once
  used.
- **Xaero's waypoint file, all at once:** open **Upload all at once, with the
  waypoint file**, press **Copy waypoints**, close Minecraft, and paste at the
  end of the file in `.minecraft/xaero/minimap/<your server>/dim%1/`. Back the
  file up first. No file there yet? Use **Download one**.
- **JourneyMap** can import Xaero's waypoints with **Import External**. Other
  mods that read coordinates from chat may work; that is untested.

### Working through a route

- **Next ship** marks the ship you are at as looted and moves on. **Looted by
  someone else** does the same when the elytra was already gone.
- The checkboxes, **Mark all looted** and **Clear all** work too.
- The undo and redo arrows cover looted marks, ships added and changes of
  order, for the open route.
- A finished route drops out of the list when you leave it, and the remaining
  ships are regrouped by themselves. This waits while another route is
  part-way through, so that one is never broken up.

### Changing a route

- **Add +1 ship to route** adds the nearest ship without a route to the end.
  It looks up to 4,000 blocks past the search area (2,500 with another seed or
  beyond 100,000 blocks out), and skips ships left out as on the webmap or
  possibly looted.
- Right-click a ship, or press **⋯** on its row, for **Add to route**, **Remove
  from route** and **Put back in its route**.
- **End route here**, under the list beside **Add +1 ship to route**, stops a
  route part-way. The ships you looted are put
  away, the ones you did not reach are grouped into new routes, and nothing
  else is marked as looted. The routes are numbered afresh, so waypoints
  already in your map mod stop matching their route numbers; the map says so
  whenever that happens.
- Drag a ship up or down the list to reorder; on a touch screen use **Move up**
  and **Move down** from its **⋯** menu. **Original order** undoes reordering
  and keeps ships you added, at the end.
- **Custom routes:** right-click a ship and choose **Start a custom route with
  this ship**, then add others. They sit above the generated routes.

## Looted by someone else, and possibly looted

Mark a ship **looted by someone else** when its elytra was gone before you got
there. These marks are sent with **Share progress**. Your own show as a tan ⊠ (a cross in a box)
until they are on the shared list; from then on the ship is just a looted
ship on the map, for you and everyone else. The shared list still records
which ships were found that way, and the guesses below still use it.

A ship is **possibly looted** (a small grey ring on the map) when it is within
2,000 blocks of one of those, or within 10,000 blocks of End Spawn, where most
ships were emptied long ago. An open route with such ships has a **why?**
link that explains the reasons that apply. For the first kind, the flag is
lifted if a ship between the two (within 500 blocks of the line
joining them) was looted the ordinary way: the earlier hunter did not come that
way.

**Earlier flight path.** When three or more ships looted by someone else lie
in a line, a dashed tan line is drawn through them and 2,000 blocks past each
end. Ships within 1,000 blocks of it count as possibly looted.

- The ships must each be within 4,000 blocks of another, and stray from the
  line by no more than a fifth of its length.
- At least two must be ships a player marked as looted by someone else. Up to
  two ships on the community webmap can then count as well, if they sit on
  the same line within 4,000 blocks of a marked ship. The webmap alone never
  makes a path: its players' flights are already known, and the guess is about
  hunters who did not share a map.
- Confidence is **medium** for three or four ships, **high** for five or more.
- One ship found intact along the line is ignored. Two or more lower the
  confidence a step, and the line is dropped below medium, or when intact
  ships number half the already-looted ones.
- The line, the rings and the note about them only show once you zoom in
  (about 30,000 blocks across or closer). The `?` in a route's list always
  shows.
- These are rules of thumb, not measured probabilities.

## Sharing

- **Adding a route to the webmap:** once you have looted some of a route, **Add
  what you explored to the webmap**, under its list of ships, gives the area to export
  from Xaero's World Map as two corners, A and B, that you can copy as
  waypoints: Xaero shows no coordinates while you select, so the waypoints
  mark where to drag. The area need not be exact. On Xaero's export
  screen, set **Multiple Unscaled Images** to ON before confirming. Whatever you did not explore
  comes out black, and the webmap keeps what it already has there.
- **Webmap:** areas on the [community webmap](https://map.diorite.xyz/?dim=the_end)
  are left out of the routes once the app's copy of it refreshes (hourly).
- **Looted list:** **Submit looted for everyone** sends your marks for review;
  once accepted they show as looted for all players. The username is
  optional: give one and the map shows it beside your ships ("Looted by
  Steve_01"); leave it empty and they just say "Looted". **Export looted** and
  **Import looted** move them between browsers or friends. If sending does
  not go through, **Post it on GitHub** copies your list and opens a new GitHub
  issue to paste it into (this needs a GitHub account). The report window has
  the same link.
- **Reports:** right-click a ship and choose **Report incorrect…** if it has no
  ship, there is no city, or a doubtful ship was there after all. Accepted
  reports apply to everyone.

## The map

- Drag to pan; scroll or use the slider to zoom. On a touch screen, two fingers
  move the map and one finger scrolls the page.
- On a wide screen, drag the dividers either side of the map to resize the
  panels; double-click one to reset it.
