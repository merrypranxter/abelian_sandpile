// single-source.glsl — dump N grains on one cell, stabilize → classic fractal
// Initial condition: all zeros except center cell = N.
// Let topple.frag iterate until quiescent (all cells < 4).
//
// The final stable configuration is THE famous fractal mandala.
// At N = 2^20 = 1,048,576 the pattern exhibits near-perfect 4-fold symmetry
// with fractal-like self-similarity at all scales.
//
// Key fact: the final state is independent of toppling order (Abelian property).
// You can topple in any sequence and always arrive at the same stable picture.
//
// Initialization (JS):
//   const data = new Float32Array(G * G);
//   data[Math.floor(G/2)*G + Math.floor(G/2)] = N;
//   sandpile.upload(data);
//
// Typical N values (all give recognizable fractals):
//   2^17 = 131,072
//   2^18 = 262,144
//   2^19 = 524,288
//   2^20 = 1,048,576  ← canonical million-grain mandala
