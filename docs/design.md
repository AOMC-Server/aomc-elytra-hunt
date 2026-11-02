# Design rules

[Back to the README](../README.md)

How the app's interface is put together. Before adding something, find the
pattern below that fits and reuse it. If nothing fits, add the new pattern here
in the same change, so there is still only one way to do each thing.

## Layout

- **Collapsible sections:** a plain `<details>`. It gets a rule above and a
  bold title; while open, a rule below shows where it ends. No outlines or
  bars. The base `details` and `summary` styles do all of this: do not restyle
  a section by id. A section inside another is
  indented, with a lighter title, so the levels are told apart. A folded
  section may show what it is set to in a `.fold-note` line under its title.
  The one exception to "no outlines": a section that is its panel's main
  action (`details.action`) has its title outlined like the main button. Its
  contents still open plainly beneath.
- **Groups of settings:** each group is its own collapsible section, named
  for what uses it, with a one-line hint saying so. Groups are equals: none is
  left permanently open above the others, and opening one closes the others
  (give them the same `name`).
- **Cards:** a bordered box is for a choice between ways of doing something
  (as in Share progress). The recommended one has the accent border, the
  others a plain one.
- **Spacing:** containers space their children with `gap: 8px`. Do not add
  margins on top of it.
- **Fields:** stacked by default. Put two in a `.row` to share a line.
- **Buttons in a group:** two even columns, not a ragged wrap.

## Emphasis

- **Accent colour:** one thing per panel, the action or card a newcomer should
  pick. Everything else is neutral, and turns accent on hover. Where two
  buttons are alternatives of equal standing (the two searches), they look
  the same and the accent marks the one the player picked last.
- **Fields and buttons:** a field is sunk into the panel (the page's dark
  background); a button stands out from it (lighter). The panel's main action
  is outlined in the accent colour over a faint wash of it, never a solid
  block.
- **Small fallbacks:** a way round a control that is not working is a
  `button.textlink` inside a hint under it ("Not going through? Post it on
  GitHub yourself."), never a second full button.
- **Destructive actions:** `button.danger`, on a line of its own under a rule,
  with a hint saying what is lost. Its confirmation says it cannot be undone.
- **Colours:** only the variables at the top of `src/style.css`.
- **Never colour alone.** Anything told apart by colour also differs in shape,
  a letter or a label, so it reads the same for someone who cannot tell the
  colours apart.

## Words

- **Hints:** one short sentence under the thing it explains. Say what happens,
  not how it works.
- **Titles:** a few plain words.
- **A list is headed by its count.** Where a line of counts sits above a list
  ("4,240 ships · 112 routes · 52 looted"), that line is the list's heading:
  style it as one, and do not add a title that says the same thing.
- **No hint that restates its label.** If the title or the field already
  says it, leave the hint out.
- **End Spawn**, not 0,0, for the place. Use 0,0 only where a coordinate is
  meant.
- **One name per thing:** a button is called the same in the app, the help and
  the guide.

## Features

- **Undo or confirm, never both, never neither.** Something done all the time
  that the app can fully take back (ticking a ship off, reordering, adding a
  ship) has no confirmation and is covered by the undo arrows. Something rare
  that the app cannot fully take back, or that reaches outside it (resetting
  looted marks, deleting a custom route, ending a route, changing the seed,
  sending something in), asks first and has no undo.
- **Controls do not vanish when pressed.** A control with nothing to do just
  now stays in place, faded (as "End route here" is before any ship is looted),
  so nobody wonders where it went. Hide a control
  only when it can never apply (as on a custom route).
- **One way to do each thing.** If a new control repeats an existing one,
  remove the old one or do not add the new one.
- **Rare settings** go under Advanced. Tools for working on the app go under
  Dev mode, and are not documented for players.
- **When a control is added, renamed or removed,** update the in-app help
  (`index.html`) and `docs/guide.md` in the same change.
