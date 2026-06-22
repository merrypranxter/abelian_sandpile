#version 300 es
// post-process.frag — bloom, chromatic aberration, vignette, gamma
precision highp float;

in  vec2      vUv;
uniform sampler2D u_tex;
uniform float     u_bloom;
uniform float     u_chromatic;
uniform float     u_vignette;

out vec4 fragColor;

vec3 chromaShift(sampler2D tex, vec2 uv, float str) {
    vec2 d = (uv - 0.5) * str * 0.014;
    float r = texture(tex, uv + d).r;
    float g = texture(tex, uv    ).g;
    float b = texture(tex, uv - d).b;
    return vec3(r, g, b);
}

vec3 bloom(sampler2D tex, vec2 uv, float str) {
    if (str < 0.01) return texture(tex, uv).rgb;
    vec2 ts  = 1.0 / vec2(textureSize(tex, 0));
    vec3 acc = vec3(0);
    for (int x = -2; x <= 2; x++)
        for (int y = -2; y <= 2; y++) {
            vec3 s = texture(tex, uv + vec2(float(x), float(y)) * ts * 3.5).rgb;
            acc   += max(s - 0.45, vec3(0));
        }
    return texture(tex, uv).rgb + acc / 25.0 * str * 5.5;
}

void main() {
    vec3 col = chromaShift(u_tex, vUv, u_chromatic);
    col = mix(col, bloom(u_tex, vUv, u_bloom), 0.55);

    // Vignette
    float d = length(vUv - 0.5);
    col *= 1.0 - pow(d * 1.4, 2.0) * u_vignette;

    // Gamma
    col = pow(max(col, vec3(0.0)), vec3(1.0 / 1.15));
    fragColor = vec4(col, 1.0);
}
