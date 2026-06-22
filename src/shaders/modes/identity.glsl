// identity.glsl — render the sandpile group identity element
//
// The set of stable sandpiles on a finite grid forms a GROUP under addition
// modulo stabilization. The identity element of this group is a highly
// structured fractal-like pattern that is NOT all-zeros.
//
// To compute it, start with the all-3 configuration (maximum stable)
// and stabilize it:
//
//   initial[i] = 3  for all interior cells
//   apply topple rule until quiescent
//   result is the identity element
//
// The identity element has uncanny properties:
//   - It is symmetric (4-fold rotational symmetry)
//   - It contains regions of all four stable states (0,1,2,3)
//   - Adding it to any other sandpile returns that sandpile unchanged
//   - It looks like a Buddhist mandala or integrated circuit
//
// Initialization (JS):
//   const data = new Float32Array(G * G);
//   for (let i = 0; i < G*G; i++) data[i] = 6.0;  // max-fill, will relax to identity
//   sandpile.upload(data);
//   // Then let topple.frag stabilize — takes thousands of passes
