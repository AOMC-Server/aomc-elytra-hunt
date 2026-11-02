# AOMC Elytra Hunt

Find Elytra on the About Oliver Minecraft Server.

**Use it here: https://aomc-server.github.io/aomc-elytra-hunt/**

A web app for hunting elytra on a Minecraft Java server. It works out where
every End City with a ship is from the world seed, and groups them into routes
you can load into Xaero's Minimap, JourneyMap or another map mod as waypoints.

## Using it

The same steps are in the app under **How to use**.

1. **Pick a route.** Route 1 takes the least flying.
   Pick one from the list, click a ship on the map, or open **Search near me**
   and type your x and z.
2. **Get the waypoints into your map mod.** Choose your mod and enter your
   username. Then, in the End, go down the route's list: press **copy** beside
   a ship, paste into chat, send, and add the waypoint that appears.
3. **Loot.** Press **Next ship** as you go. If the elytra was already gone,
   press **Looted by someone else** instead.
4. **Share where you have been.** Upload your map of the End to the
   [community webmap](https://map.diorite.xyz/?dim=the_end), or send your
   looted list from **Share progress**.

## On the map

| Mark | Meaning |
|---|---|
| Filled dot | A ship in a route, coloured by route |
| White circle | The ship you are up to in the open route |
| Green × | Looted |
| Tan ⊠, `!` in the list | One you marked as looted by someone else. Once it is on the shared list it shows as a plain green × |
| Small grey ring, `?` in the list | Possibly looted: near a ship someone else looted, or on a guessed flight path. A guess |
| Dashed tan line | A guess at where an earlier hunter flew |
| Grey □ | Ship or End City reported missing |
| Faint diamond | A ship that is not in any route |
| Green shading | Terrain already on the community webmap; ships there are left out |

Click a ship to open its route and see its details. Right-click it for more,
or press **⋯** on its row in the list; on a touch screen there is also
**options** in its details under the map.

## Things to know

- For Minecraft **Java Edition**, not Bedrock. It follows the 1.19–1.21 world
  generation rules and is in use on a 26.2 server.
- Only cities with a ship are shown, since only ships hold elytra.
- The app knows where ships generate, not whether someone has taken the
  elytra. "On the webmap" means someone has been near, not that it was looted.
- Ship predictions were corrected against the game itself; see
  [How do we know the positions are right?](docs/accuracy.md)
- Your looted marks and settings are saved in your browser only, until you
  share them.

## More

- [Guide](docs/guide.md): every setting and tool, and the rules behind
  "possibly looted" and the flight-path guess.
- [How do we know the positions are right?](docs/accuracy.md): what the
  results were checked against, and what has not been proven.
- [Notes on the cubiomes differences](docs/cubiomes-notes.md): where the
  ship predictions depart from cubiomes, and what is already reported there.
- [Development](docs/development.md): running it locally, the data files and
  the submission relay.
- [Design rules](docs/design.md): the patterns the interface sticks to.

## Credits

Built with Claude Code.

See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
