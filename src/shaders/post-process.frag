#version 300 es
// post-process.frag — bloom, chromatic aberration, vignette, gamma
precision highp float;

in  vec2      vUv;
uniform sampler2D u_tex;
uniform float     u_bloom;
uniform float     u_chromatic;
uniform float     u_vignette;

out vec4 fragColor;

vec3 chromaticAberration(sampler2D tex, vec2 uv, float s) {
  vec2 dir = (uv - 0.5) * s * 0.02;
  return vec3(
    texture(tex, uv + dir      ).r,
    texture(tex, uv            ).g,
    texture(tex, uv - dir      ).b
  );
}

vec3 bloom(sampler2D tex, vec2 uv, float strength) {
  if (strength < 0.01) return texture(tex, uv).rgb;
  vec2 ts  = 1.0 / vec2(textureSize(tex, 0));
  vec3 acc = vec3(0);
  for (int x = -2; x <= 2; x++)
    for (int y = -2; y <= 2; y++) {
      vec3 s = texture(tex, uv + vec2(float(x), float(y)) * ts * 4.0).rgb;
      acc += max(s - 0.3, vec3(0));
    }
  acc /= 25.0;
  return texture(tex, uv).rgb + acc * strength * 5.5;
}

void main() {
  vec3 col = chromaticAberration(u_tex, vUv, u_chromatic);
  col      = mix(col, bloom(u_tex, vUv, u_bloom), 0.6);
  float d  = length(vUv - 0.5);
  col     *= 1.0 - pow(d * 1.35, 2.1) * u_vignette;
  col      = pow(max(col, vec3(0)), vec3(1.0/1.12));
  fragColor = vec4(col, 1.0);
}
