// color-maps.js — palette definitions + regime presets for abelian_sandpile

// Classic 4-tone palette: maps grain counts {0,1,2,3} to flat colors
export const CLASSIC_4 = [
  [0x2d, 0x0a, 0x31],  // 0 grains — deep purple
  [0xff, 0x6b, 0x35],  // 1 grain  — orange
  [0xff, 0xcf, 0x6b],  // 2 grains — gold
  [0xff, 0xff, 0xff],  // 3 grains — white
];

// Neon ramp for psychedelic mode — full 256 stops sampled by grain/3
export const NEON_RAMP = [
  '#000000','#1a0033','#3d00cc','#7000ff','#cc00ff',
  '#ff00cc','#ff0066','#ff4400','#ffaa00','#ffff00','#ffffff'
];

export const REGIMES = {
  million_grain_mandala: {
    mode: 'single_source',
    total_grains: 1<<20,  // 1,048,576
    palette: 'classic',
    passes_per_frame: 64,
    bloom: 0.35,
    chromatic: 0.05,
    vignette: 0.55,
    drop_rate: 0.01,
  },
  avalanche_rain: {
    mode: 'rain',
    total_grains: 0,
    palette: 'neon',
    passes_per_frame: 32,
    bloom: 0.6,
    chromatic: 0.3,
    vignette: 0.3,
    drop_rate: 0.02,
  },
  identity_glyph: {
    mode: 'identity',
    total_grains: 1<<18,
    palette: 'classic',
    passes_per_frame: 128,
    bloom: 0.25,
    chromatic: 0.08,
    vignette: 0.6,
    drop_rate: 0.01,
  },
  psychedelic_recount: {
    mode: 'single_source',
    total_grains: 1<<19,
    palette: 'neon',
    passes_per_frame: 64,
    bloom: 0.7,
    chromatic: 0.4,
    vignette: 0.2,
    drop_rate: 0.01,
  },
};

export function buildRamp(gl, hexColors) {
  const N = 256;
  const data = new Uint8Array(N * 4);
  const stops = hexColors.map(h => [
    parseInt(h.slice(1,3),16),
    parseInt(h.slice(3,5),16),
    parseInt(h.slice(5,7),16)
  ]);
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const seg = t * (stops.length - 1);
    const lo = Math.floor(seg);
    const hi = Math.min(lo + 1, stops.length - 1);
    const f = seg - lo;
    data[i*4+0] = Math.round(stops[lo][0]*(1-f)+stops[hi][0]*f);
    data[i*4+1] = Math.round(stops[lo][1]*(1-f)+stops[hi][1]*f);
    data[i*4+2] = Math.round(stops[lo][2]*(1-f)+stops[hi][2]*f);
    data[i*4+3] = 255;
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, N, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

export function buildClassic4(gl) {
  const N = 256;
  const data = new Uint8Array(N * 4);
  for (let i = 0; i < N; i++) {
    // Map 0..255 -> 4 bands (0..63, 64..127, 128..191, 192..255)
    const band = Math.min(3, Math.floor(i / 64));
    data[i*4+0] = CLASSIC_4[band][0];
    data[i*4+1] = CLASSIC_4[band][1];
    data[i*4+2] = CLASSIC_4[band][2];
    data[i*4+3] = 255;
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, N, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}
