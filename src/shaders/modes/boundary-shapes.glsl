// boundary-shapes.glsl — non-square domains → different fractal edge shapes
//
// The fractal shape of the final sandpile is determined by the boundary (sink).
// Changing the boundary from a square to a circle, hexagon, or custom shape
// produces qualitatively different fractal edges while the interior structure
// remains governed by the same topple rule.
//
// Implementation: in topple.frag, the boundary condition is:
//   if (cell is outside domain) -> set to 0 (sink)
//
// Boundary functions (inject via uniform or #define):
//
//   SQUARE (default):
//     isSink = uv.x < texel.x || uv.x > 1-texel.x || ...
//
//   CIRCLE:
//     float r = length(uv - 0.5) * 2.0;
//     isSink = r > 0.97;
//
//   HEXAGON:
//     vec2 p = abs(uv - 0.5);
//     float hex = max(p.x + p.y * 0.577, p.y * 1.155);
//     isSink = hex > 0.47;
//
//   DIAMOND:
//     float diamond = abs(uv.x-0.5) + abs(uv.y-0.5);
//     isSink = diamond > 0.47;
//
// To activate: add a u_domain_shape uniform (0=square,1=circle,2=hex,3=diamond)
// and branch in topple.frag.
