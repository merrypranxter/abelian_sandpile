// single-source.glsl — initial condition: N grains on one cell
//
// The classic BTW experiment.
// Drop a mountain (e.g. 2^20 = 1,048,576 grains) on the center cell.
// Let topple.frag run until quiescent.
//
// Result: a striking fractal mandala with 4-fold symmetry,
// whose boundary is a diamond and whose interior is a self-similar
// fractal of regions colored by grain count {0,1,2,3}.
//
// The diamond boundary grows as O(sqrt(N));
// at N=1,048,576 it spans approximately 512 cells on a side.
//
// Initialization (CPU-side, src/js/source.js):
//   data[cy * w + cx] = totalGrains;
//
// Large piles require thousands of topple passes before they stabilize.
// At 64 passes/frame a 1M-grain pile takes ~500 frames (~8s at 60fps).
