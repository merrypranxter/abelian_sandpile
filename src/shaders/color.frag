#version 300 es
// color.frag — grain count → palette lookup
// Two modes:
//   classic 4-tone: discrete {0,1,2,3} -> 4 flat colors (canonical BTW look)
//   neon ramp:      continuous ramp sampled by t = grains/3
// Cells with 3 grains (on the topple threshold) get an extra glow pulse.
precision highp float;

in  vec2      vUv;
uniform sampler2D u_state;      // grain count per cell
uniform sampler2D u_palette;    // 256px continuous ramp
uniform sampler2D u_classic4;   // 4px discrete color map
uniform float     u_glow;       // glow strength on near-topple cells
uniform int       u_use_classic;// 1 = discrete 4-tone, 0 = continuous
uniform float     u_time;

out vec4 fragColor;

void main() {
    float g = texture(u_state, vUv).r;
    vec3  col;

    if (u_use_classic == 1) {
        // Clamp to [0,3], map to [0,1] for nearest-sampled 4px texture
        float t = clamp(g, 0.0, 3.0) / 3.0;
        col = texture(u_classic4, vec2(t, 0.5)).rgb;
    } else {
        float t = clamp(g / 3.0, 0.0, 1.0);
        float drift = sin(u_time * 0.5 + g * 2.1) * 0.04;
        col = texture(u_palette, vec2(clamp(t + drift, 0.0, 1.0), 0.5)).rgb;
    }

    // Highlight cells that are sitting at 3 grains (maximum stable)
    float atMax = (g >= 2.9 && g < 4.0) ? 1.0 : 0.0;
    col += col * atMax * u_glow * (0.8 + 0.2 * sin(u_time * 3.0));

    fragColor = vec4(col, 1.0);
}
