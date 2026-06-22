// rain.glsl — continuous random grain drops; power-law avalanches
//
// Self-organized criticality (SOC): when a sandpile is driven slowly
// (one grain at a time added to a random site), it self-organizes to a
// critical state where avalanches of all sizes occur with power-law
// frequency: P(size=s) ~ s^(-tau), tau ~= 1.0 on a 2D lattice.
//
// The pile never settles — it stays perpetually near the critical point.
// Large avalanches look like neon lightning storms spreading across the grid.
//
// Implementation:
//   In topple.frag, when u_rain_mode = 1.0:
//     hash(uv + time_seed) < drop_rate  ->  add 1 grain to this cell
//
// Visual target:
//   Active cells (>= 4 grains) glow bright in the neon palette.
//   Most of the grid is quiet (0-3 grains) at any moment.
//   Occasionally a large avalanche propagates across the entire grid —
//   that's the power-law tail.
//
// drop_rate ~= 0.01 gives moderate activity.
// Raise to 0.05-0.10 for continuous chaos.
