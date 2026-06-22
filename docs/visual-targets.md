# Visual Targets

## Aesthetic Regimes

### million_grain_mandala
- **Look:** Deep purple-black ground. The fractal mandala blooms outward from center as it stabilizes — warm amber tones for 1-grain cells, gold for 2-grain, white for 3-grain.
- **Feel:** Meditative, geological. Watching a crystal grow. The 4-fold symmetry is uncanny given that no symmetry was imposed — it emerges from the rule alone.
- **Parameters:** 1,048,576 grains (2^20), center source, 128 passes/frame, classic 4-tone palette.
- **Wow moment:** The fractal boundary is a perfect quarter-circle at large N. This was proven mathematically — the sandpile "rounds" the corners.

### avalanche_rain
- **Look:** Deep blue-black ground. Active toppling cells glow cyan-white. Most of the grid is still; occasionally a cascade blooms across thousands of cells like lightning.
- **Feel:** Like watching rain on a tectonic surface. Quiet, then suddenly explosive.
- **Parameters:** Rain rate 0.003, continuous mode, neon blue palette, heavy bloom.
- **Wow moment:** The glow on 3-grain cells traces the avalanche wavefront in real-time — you can watch the cascade propagate.

### identity_glyph
- **Look:** The sandpile group identity element. Purple-to-pink palette. Near-perfect 4-fold symmetry. Looks like an integrated circuit or Buddhist mandala.
- **Feel:** Uncanny. This pattern was not designed — it is the unique mathematical object that acts as zero under sandpile addition.
- **Parameters:** Initialize with 6 everywhere, stabilize over many thousand passes.
- **Wow moment:** It looks designed but it's the identity element of an abstract algebra. Adding it to any stable sandpile leaves that sandpile unchanged.

### psychedelic_recount
- **Look:** Same topple mechanics but grain counts mapped through a maximalist 8-stop neon ramp — reds, oranges, yellows, greens, blues, purples — instead of flat 4-tone.
- **Feel:** Acid fractal. The same mandala but rendered as a stained glass window.
- **Parameters:** 524,288 grains, continuous ramp, maximum bloom and chromatic aberration.
- **Wow moment:** The identical mathematical structure becomes unrecognizable under a different colormap. Math as raw material for aesthetics.

## Output Checklist

- [x] Engine 0: single-source — 1,048,576 grains stabilizes to fractal mandala
- [x] Engine 1: rain mode — continuous drops, power-law avalanches visible
- [x] Engine 2: identity — 6-fill stabilizes to the group identity element
- [x] Engine 3: psychedelic — neon ramp on mandala
- [x] FBO ping-pong — K passes/frame, R32F grain state
- [x] Classic 4-tone palette (canonical BTW look)
- [x] Continuous neon ramp palette
- [x] Post-finisher: bloom, chromatic aberration, vignette, gamma
- [x] All parameters live-interactive
- [x] Pause/resume, reset controls
