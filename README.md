# Abelian Sandpile

A WebGL2 GPGPU simulation of the **Abelian sandpile model** (Bak-Tang-Wiesenfeld chip-firing). Drop grains on a grid; any cell with 4+ topples one to each neighbor. The final state is a fractal mandala — and it doesn't matter in what order the topplings happen. That's what "Abelian" means.

> *The order of toppling does not matter. The fractal does not care.*

## Running

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## What Is the Abelian Sandpile?

Each cell holds grain count. When a cell reaches ≥4 it **topples** — loses 4 grains, each neighbor gains 1. Repeat until stable. The final configuration is provably independent of toppling order (Dhar 1990). With 2^20 = 1,048,576 grains on a single cell, the stable state is a fractal mandala with near-perfect 4-fold symmetry that emerges from the rule alone.

## Architecture

State is a 512×512 (or larger) `R32F` texture. `topple.frag` runs **K passes per frame** via FBO ping-pong:

```
read FBO → topple.frag → write FBO → swap → repeat K times
```

Then `color.frag` maps grain counts to palette, and `post-process.frag` adds bloom/chroma/vignette.

## Project Structure

```
src/
  js/
    main.js          — WebGL2 setup, render loop, all UI
    fbo-pingpong.js  — R32F grain-state FBO pair with swap()
    color-maps.js    — buildRamp(), buildClassic4(), regime presets
    source.js        — optional image source texture
  shaders/
    topple.frag      — BTW chip-firing rule (1 pass)
    color.frag       — grain count → palette
    post-process.frag— bloom, chromatic ab., vignette, gamma
    modes/
      single-source.glsl   — N grains on center cell
      rain.glsl            — continuous random drops (SOC)
      identity.glsl        — sandpile group identity element
      boundary-shapes.glsl — non-square domain shapes
docs/
  math-reference.md  — BTW rule, Abelian property, SOC, group identity
  visual-targets.md  — per-regime look descriptions
```

## Aesthetic Regimes

| Regime | Mode | Look |
|--------|------|------|
| **million_grain_mandala** | single | Purple-amber 4-tone fractal, 1M grains |
| **avalanche_rain** | rain | Cyan avalanche wavefronts on dark blue |
| **identity_glyph** | identity | Purple-pink group identity mandala |
| **psychedelic_recount** | single | Full neon ramp on 500k-grain mandala |

## The Math

The topple rule `new = own − 4·⌊own/4⌋ + Σ⌊neighbor/4⌋` is applied thousands of times per frame. The simulation exploits the Abelian property — because toppling order doesn't matter, parallel GPU passes all converge to the same answer. See [`docs/math-reference.md`](docs/math-reference.md).

## Distinct From

- **`cellular_automata`** — specific chip-firing rule, not life-like rules
- **`dla_clustering`** — redistribution (toppling), not aggregation

## Ecosystem

Pairs with `apollonian_gasket`, `fractals`. GPGPU ping-pong kit reusable by `cellular_automata`, `reaction_diffusion`.
