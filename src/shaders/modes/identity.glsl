// identity.glsl — the sandpile group identity element
//
// The set of stable configurations (grain counts 0-3 everywhere) on a
// finite grid forms an abelian group under the operation:
//   A + B = stabilize(A + B)
//
// The identity element e of this group satisfies: A + e = A for all A.
// It has a remarkable fractal structure — not at all the zero configuration.
//
// Exact computation of e requires:
//   1. Compute the maximal stable configuration (3 everywhere)
//   2. Stabilize it (runs for a very long time)
//   3. The resulting stable config is e
//
// Or equivalently: e = stabilize(stable_max + stable_max) - stabilize(stable_max)
//   where subtraction is component-wise.
//
// For our real-time implementation we approximate with a large single-source
// pile (~3 * (min(w,h)/4)^2 grains) which produces visually similar
// self-similar fractal patterns.
//
// The true identity on a 500x500 grid looks like a central fractal
// flanked by repeating "tiles" of self-similar sub-patterns.
