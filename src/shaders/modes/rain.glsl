// rain.glsl — continuous random grain additions → self-organized criticality
// Each pass: each cell receives a grain with probability p (u_rain_rate).
// System self-tunes to the critical point — avalanche sizes follow a power law.
//
// At criticality, the probability of an avalanche of size s:
//   P(s) ∝ s^⁻¹·²⁶ (Dhar 1990, exact exponent in 2D)
//
// Visually: most of the time the grid is still; occasionally a topple
// cascades through thousands of cells. Active cells (3 grains, about to
// topple) glow brightest in the color.frag — you can see the avalanche wavefront.
//
// No explicit initialization needed — start from empty or any state.
// The system drives itself to criticality regardless of initial conditions.
//
// Shader handled in topple.frag u_mode == 1 branch.
// JS: set mode = 'rain', rain_rate = 0.001–0.01.
