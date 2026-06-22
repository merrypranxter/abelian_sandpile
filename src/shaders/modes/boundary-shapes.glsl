// boundary-shapes.glsl — non-square sink boundaries
//
// The shape of the absorbing boundary dramatically affects the fractal form.
// Square boundary -> 4-fold diamond fractal (the classic)
// Circular boundary -> rotationally symmetric fractal, more like a mandala
// Hexagonal boundary -> 6-fold fractal (rarer, beautiful)
//
// Implementation options:
//   Option A: modify cell() in topple.frag to treat out-of-boundary texels
//             as sinks regardless of their texture value.
//   Option B: initialize a "mask" texture (1=active, 0=sink) and multiply
//             each topple output by the mask.
//
// The mask approach is cleanest for arbitrary shapes:
//   if (mask(uv) == 0) { fragColor = vec4(0); return; }
//
// Circular mask (CPU-side):
//   for each (x,y): mask = (dx*dx + dy*dy <= r*r) ? 1 : 0
//
// Hexagonal mask:
//   |x| + |y|*sqrt(3)/2 <= r (axial coordinates)
//
// The source.js initCircleBoundary() function implements circular domain.
