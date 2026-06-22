#version 300 es
// topple.frag — Abelian Sandpile / BTW chip-firing rule
//
// State texture: R32F, each texel = grain count at that cell.
//
// Rule: if grains[i] >= 4, fire one grain to each of 4 neighbors.
//   new[i] = grains[i] - 4*(grains[i]>=4) + sum(neighbor j fires into i)
//
// "Abelian" property: the final stable configuration is independent
// of the order in which topplings occur. This shader runs one pass;
// run it K times per frame to converge large piles.
precision highp float;

in  vec2  vUv;
uniform sampler2D u_state;
uniform vec2      u_texel;      // 1/gridSize
uniform float     u_time;
uniform float     u_drop_rate;
uniform float     u_rain_mode;  // 1 = random grain drops each pass

out vec4 fragColor;

float cell(vec2 uv) {
  // Out-of-bounds cells are sinks (absorbing boundary)
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  return texture(u_state, uv).r;
}

// Fast hash for rain mode
float hash21(vec2 p, float seed) {
  p  = fract(p * vec2(127.34, 311.71));
  p += dot(p, p + seed + 31.3);
  return fract(p.x * p.y);
}

void main() {
  float g  = cell(vUv);
  float gN = cell(vUv + vec2(0.0,   u_texel.y));
  float gS = cell(vUv + vec2(0.0,  -u_texel.y));
  float gE = cell(vUv + vec2( u_texel.x, 0.0));
  float gW = cell(vUv + vec2(-u_texel.x, 0.0));

  // Does this cell topple?
  float fires = step(4.0, g);

  // Does each neighbor fire into this cell?
  float inN = step(4.0, gN);
  float inS = step(4.0, gS);
  float inE = step(4.0, gE);
  float inW = step(4.0, gW);

  float newG = g - 4.0*fires + inN + inS + inE + inW;

  // Rain mode: add a single grain with probability u_drop_rate per texel per pass
  if (u_rain_mode > 0.5) {
    float h = hash21(vUv, mod(u_time * 57.3, 1000.0));
    if (h < u_drop_rate) newG += 1.0;
  }

  fragColor = vec4(max(newG, 0.0), 0.0, 0.0, 1.0);
}
