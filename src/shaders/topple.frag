#version 300 es
// topple.frag — Bak-Tang-Wiesenfeld chip-firing rule (one pass)
// State: R32F texture, one float per cell = grain count
// Rule: if cell >= 4, topple 1 grain to each of 4 neighbors
// Multiple passes per frame required for large piles to stabilize.
// Boundary cells are sinks (drain to 0).
precision highp float;

in  vec2      vUv;
uniform sampler2D u_state;
uniform vec2      u_texel;       // 1/width, 1/height
uniform float     u_rain_rate;   // grains/cell/pass (rain mode)
uniform int       u_mode;        // 0=deterministic, 1=rain
uniform float     u_rand_seed;

out vec4 fragColor;

float rand(vec2 co, float seed) {
    return fract(sin(dot(co + seed, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    // Own grain count
    float own = texture(u_state, vUv).r;

    // Neighbor counts — edges are zero-valued sinks
    float nN = (vUv.y + u_texel.y <= 1.0) ? texture(u_state, vUv + vec2( 0,  u_texel.y)).r : 0.0;
    float nS = (vUv.y - u_texel.y >= 0.0) ? texture(u_state, vUv + vec2( 0, -u_texel.y)).r : 0.0;
    float nE = (vUv.x + u_texel.x <= 1.0) ? texture(u_state, vUv + vec2( u_texel.x,  0)).r : 0.0;
    float nW = (vUv.x - u_texel.x >= 0.0) ? texture(u_state, vUv + vec2(-u_texel.x,  0)).r : 0.0;

    // This cell fires floor(own/4) times, each firing distributes 1 grain to each neighbor
    float fires   = floor(own / 4.0);

    // Each neighbor contributes 1 grain per topple they make
    float inflow  = floor(nN / 4.0) + floor(nS / 4.0)
                  + floor(nE / 4.0) + floor(nW / 4.0);

    float next = own - 4.0 * fires + inflow;

    // Rain mode: random single-grain additions each pass
    if (u_mode == 1) {
        if (rand(vUv, u_rand_seed) < u_rain_rate) next += 1.0;
    }

    // Boundary sink
    bool isBoundary = vUv.x < u_texel.x         || vUv.x > 1.0 - u_texel.x ||
                      vUv.y < u_texel.y         || vUv.y > 1.0 - u_texel.y;
    if (isBoundary) next = 0.0;

    fragColor = vec4(max(next, 0.0), 0.0, 0.0, 1.0);
}
