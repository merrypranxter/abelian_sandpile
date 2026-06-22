#version 300 es
// color.frag — map grain counts to palette colors
//
// Classic 4-tone: {0,1,2,3} map to 4 flat colors (the BTW canonical palette).
// Neon ramp: log-scaled grain count drives a full 256-stop gradient; active
// cells (>=4, currently toppling) get a bright flash.
precision highp float;

in  vec2      vUv;
uniform sampler2D u_state;
uniform sampler2D u_palette;
uniform float     u_palette_mode; // 0 = classic 4-tone, 1 = neon ramp
uniform float     u_time;

out vec4 fragColor;

void main() {
  float g = texture(u_state, vUv).r;
  float t;

  if (u_palette_mode < 0.5) {
    // Classic: floor to {0,1,2,3} then normalize
    float band = clamp(floor(g), 0.0, 3.0);
    t = band / 3.0;
  } else {
    // Neon: soft log mapping so higher stacks glow brighter
    float gC = min(g, 48.0);
    t = gC / 48.0;
    t = pow(t, 0.55);
    // Shimmer on active cells
    t += step(4.0, g) * sin(u_time * 4.0 + t * 15.0) * 0.07;
    t = clamp(t, 0.0, 1.0);
  }

  vec3 col = texture(u_palette, vec2(t, 0.5)).rgb;

  // Active cell highlight: cells with >=4 grains are currently toppling
  float active = step(4.0, g);
  col = mix(col, min(col * 2.5 + 0.15, vec3(1.0)), active * 0.5);

  fragColor = vec4(col, 1.0);
}
