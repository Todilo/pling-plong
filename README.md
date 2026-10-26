# pling · plong

Two people, one keyboard, one Court. Nothing to install, nothing to build: an HTML file, a
stylesheet, one JS file.

## Play it

Open `index.html` — from a static server, from GitHub Pages, or by double-clicking the file
in a modern browser.

## Controls

| Left Player | Right Player |
| --- | --- |
| `W` up, `S` down | `↑` up, `↓` down |

Both keys at once means *still*, not jitter.

| Both players | |
| --- | --- |
| any key | Serve from the title card |
| `Esc` | Pause / resume |
| `M` | Mute the Court |
| `R` | Restart the Match, even mid-Rally |

## Rules

A Serve puts the Ball in play at the centre. The first Rally to end wins a Point; the first
player to seven Points wins the Match, and a Match can never end level. The Serve always goes
back to the player who just lost one, so neither side gets to sit at the back of the Court
forever.

## Notes

- No libraries, no fonts, no images, no audio files. The Court is drawn with Canvas primitives,
  the blips are synthesised on the spot.
- The vocabulary in [`GLOSSARY.md`](GLOSSARY.md) is the game's own — the code and the README use
  it, and the two decisions in [`docs/adr/`](docs/adr/) record the parts that a later reader would
  otherwise wonder about.
- Sound is a nicety: if the browser refuses, the game plays on in silence.

Licensed under the MIT License — see [`LICENSE`](LICENSE).
